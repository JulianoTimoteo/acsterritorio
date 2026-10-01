/**
 * Unidades (agências) — dados administrativos no Firebase.
 * Cada unidade tem UM gestor responsável. Um gestor cuida de uma unidade por vez.
 * A senha de acesso da unidade nunca é gravada na nuvem: apenas a impressão
 * digital dela (para validar) e uma cópia no aparelho de quem a criou.
 */
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { impressaoDaChave, novoId } from "@/security/crypto";

export type Unidade = {
  id: string;
  nome: string;
  gestorId: string | null;
  criadaPor: string;
  keyFingerprint?: string | null;
  criadaEm: string;
};

const COLECAO = "units";

function chaveLocalSenha(unitId: string) {
  return `acs.unidade.${unitId}.senha`;
}

export function senhaGuardada(unitId: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(chaveLocalSenha(unitId));
}

export async function listarUnidades(): Promise<Unidade[]> {
  const snap = await getDocs(collection(db, COLECAO));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Unidade[];
}

export async function criarUnidade(nome: string, senha: string, gestorId: string) {
  if (nome.trim().length < 3) throw new Error("Dê um nome com pelo menos 3 letras à unidade.");
  if (senha.length < 8) throw new Error("A senha da unidade precisa ter pelo menos 8 caracteres.");
  const existentes = await listarUnidades();
  if (existentes.some((u) => u.gestorId === gestorId)) {
    throw new Error("Cada gestor pode administrar apenas uma unidade por vez.");
  }
  const id = `unidade-${novoId().slice(0, 8)}`;
  const unidade: Unidade = {
    id,
    nome: nome.trim(),
    gestorId,
    criadaPor: gestorId,
    keyFingerprint: await impressaoDaChave(senha, id),
    criadaEm: new Date().toISOString(),
  };
  await setDoc(doc(db, COLECAO, id), unidade);
  if (typeof window !== "undefined") localStorage.setItem(chaveLocalSenha(id), senha);
  // O criador passa a gerenciar a unidade que acabou de abrir.
  await updateDoc(doc(db, "profiles", gestorId), { unitId: id, unidade: unidade.nome });
  return unidade;
}

/**
 * Passa a unidade para outro gestor já cadastrado.
 * Se o novo gestor já cuidava de outra unidade, essa unidade anterior vai
 * automaticamente para o gestor que fez a entrega — ninguém fica com duas.
 */
export async function transferirUnidade(unitId: string, novoGestorId: string, executorId: string) {
  const alvo = await getDoc(doc(db, COLECAO, unitId));
  if (!alvo.exists()) throw new Error("Unidade não encontrada.");
  const unidade = alvo.data() as Unidade;

  const gestorAntigoId = unidade.gestorId;

  const todas = await listarUnidades();
  const unidadeDoNovoGestor = todas.find((u) => u.gestorId === novoGestorId && u.id !== unitId);

  await updateDoc(doc(db, COLECAO, unitId), { gestorId: novoGestorId });
  
  // Garantir que o perfil do novo gestor existe, se não, deve lançar erro ao invés de prosseguir silenciosamente.
  // Como ele foi escolhido na lista, ele deve existir, mas é mais seguro.
  await updateDoc(doc(db, "profiles", novoGestorId), { unitId, unidade: unidade.nome });

  if (unidadeDoNovoGestor) {
    if (gestorAntigoId) {
      await updateDoc(doc(db, COLECAO, unidadeDoNovoGestor.id), { gestorId: gestorAntigoId });
      
      const snapAntigo = await getDoc(doc(db, "profiles", gestorAntigoId));
      if (snapAntigo.exists()) {
        await updateDoc(doc(db, "profiles", gestorAntigoId), {
          unitId: unidadeDoNovoGestor.id,
          unidade: unidadeDoNovoGestor.nome,
        });
      }
    }
  } else {
    if (gestorAntigoId) {
      const snapAntigo = await getDoc(doc(db, "profiles", gestorAntigoId));
      if (snapAntigo.exists()) {
        await updateDoc(doc(db, "profiles", gestorAntigoId), { unitId: null, unidade: null });
      }
    }
  }

  return unidadeDoNovoGestor ?? null;
}
