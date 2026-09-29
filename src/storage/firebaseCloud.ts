/**
 * Nuvem da equipe no Firebase (projeto acscomunitario-704be).
 *
 * Os registros continuam sendo gravados primeiro no aparelho. Quando há
 * internet, o pacote JÁ CRIPTOGRAFADO é guardado no Cloud Firestore:
 *
 *   nuvem_arquivos/{nome}            metadados (unidade, agente, tamanho)
 *   nuvem_arquivos/{nome}/partes/{i} conteúdo cifrado, dividido em partes
 *
 * O Firebase nunca recebe dados legíveis: só quem tem a senha da unidade abre.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { ArquivoRemoto, StorageProvider } from "./storageProvider";

const COLECAO = "nuvem_arquivos";
const TAMANHO_PARTE = 700_000; // Firestore aceita até ~1 MB por documento

let contexto: { unitId: string | null; userId: string | null } = { unitId: null, userId: null };

export function definirContextoNuvem(unitId: string | null, userId: string | null) {
  contexto = { unitId, userId };
}

function idDoc(nome: string) {
  return nome.replace(/[/#?[\]]/g, "_");
}

function unidadeDoNome(nome: string): string {
  const m = /^acs-u(.+?)-/.exec(nome);
  return m?.[1] ?? contexto.unitId ?? "geral";
}

function traduzir(erro: unknown): never {
  const codigo = (erro as { code?: string })?.code ?? "";
  if (codigo === "permission-denied")
    throw new Error("A nuvem recusou o acesso. Confira se sua conta está vinculada a esta unidade.");
  if (codigo === "unavailable")
    throw new Error("Sem conexão com a nuvem. Os dados continuam salvos neste aparelho.");
  throw erro instanceof Error ? erro : new Error("Falha na comunicação com a nuvem.");
}

async function gravar(nome: string, conteudo: string, unitId: string, tipo: "sync" | "transferencia") {
  const id = idDoc(nome);
  const ref = doc(db, COLECAO, id);
  const anterior = await getDoc(ref).catch(() => null);
  const partesAntigas = Number(anterior?.data()?.partes ?? 0);
  const partes: string[] = [];
  for (let i = 0; i < conteudo.length; i += TAMANHO_PARTE) {
    partes.push(conteudo.slice(i, i + TAMANHO_PARTE));
  }
  if (!partes.length) partes.push("");

  // Lotes pequenos para respeitar o limite de 10 MB por gravação.
  for (let i = 0; i < partes.length; i += 8) {
    const lote = writeBatch(db);
    partes.slice(i, i + 8).forEach((p, j) => {
      lote.set(doc(db, COLECAO, id, "partes", String(i + j)), { unitId, dados: p });
    });
    await lote.commit();
  }
  const final = writeBatch(db);
  for (let i = partes.length; i < partesAntigas; i++) {
    final.delete(doc(db, COLECAO, id, "partes", String(i)));
  }
  final.set(ref, {
    nome,
    unitId,
    tipo,
    userId: auth.currentUser?.uid ?? contexto.userId ?? "",
    partes: partes.length,
    tamanho: conteudo.length,
    modificadoEm: new Date().toISOString(),
  });
  await final.commit();
}

async function ler(nome: string): Promise<string | null> {
  const id = idDoc(nome);
  const meta = await getDoc(doc(db, COLECAO, id));
  if (!meta.exists()) return null;
  const total = Number(meta.data().partes ?? 0);
  const textos: string[] = [];
  for (let i = 0; i < total; i++) {
    const p = await getDoc(doc(db, COLECAO, id, "partes", String(i)));
    textos.push(String(p.data()?.dados ?? ""));
  }
  return textos.join("");
}

/** Grava um pacote de transferência para a unidade de destino. */
export async function enviarPacoteNaUnidade(unitId: string, nome: string, conteudo: string) {
  try {
    await gravar(nome, conteudo, unitId, "transferencia");
  } catch (e) {
    traduzir(e);
  }
}

/** Lê um pacote de transferência da unidade informada. */
export async function baixarPacoteDaUnidade(_unitId: string, nome: string) {
  try {
    return await ler(nome);
  } catch (e) {
    traduzir(e);
  }
}

export const firebaseProvider: StorageProvider = {
  id: "firebase",
  nome: "Nuvem da equipe",

  conectado() {
    return !!auth.currentUser;
  },

  async conectar() {
    if (!auth.currentUser) throw new Error("Entre na sua conta para usar a nuvem da equipe.");
  },

  async desconectar() {},

  async listar(prefixo) {
    try {
      const snap = await getDocs(
        query(collection(db, COLECAO), where("unitId", "==", unidadeDoNome(prefixo))),
      );
      const lista: ArquivoRemoto[] = [];
      snap.forEach((d) => {
        const x = d.data();
        if (typeof x.nome === "string" && x.nome.includes(prefixo)) {
          lista.push({ id: d.id, nome: x.nome, tamanho: x.tamanho, modificadoEm: x.modificadoEm });
        }
      });
      return lista;
    } catch (e) {
      traduzir(e);
    }
  },

  async baixar(nome) {
    try {
      return await ler(nome);
    } catch (e) {
      traduzir(e);
    }
  },

  async enviar(nome, conteudo) {
    try {
      await gravar(nome, conteudo, unidadeDoNome(nome), "sync");
    } catch (e) {
      traduzir(e);
    }
  },

  async espacoUsado(prefixo) {
    const arquivos = await this.listar(prefixo);
    return arquivos.reduce((t, a) => t + (a.tamanho || 0), 0);
  },
};
