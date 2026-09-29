/**
 * Cada aparelho é um banco de dados ambulante e possui identidade própria.
 * O DEVICE_ID é um UUID gerado localmente (nunca nome, e-mail ou telefone).
 * O registro do dispositivo fica no Firebase (escopo administrativo/identidade).
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db, lerDocRapido } from "@/lib/firebase";
import { novoId } from "@/security/crypto";

const CHAVE_DEVICE = "acs.device.id";
const CHAVE_NOME = "acs.device.nome";

export const VERSAO_APP = "2.0.0";

export type Dispositivo = {
  id: string;
  nome: string;
  userId: string;
  unitId: string | null;
  status: "ativo" | "pendente" | "revogado";
  versaoApp: string;
  ultimaSync: string | null;
  ultimaAtividade: string | null;
  criadoEm: string;
};

export function deviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(CHAVE_DEVICE);
  if (!id) {
    id = novoId();
    localStorage.setItem(CHAVE_DEVICE, id);
  }
  return id;
}

export function nomeDispositivo(): string {
  if (typeof window === "undefined") return "Servidor";
  const salvo = localStorage.getItem(CHAVE_NOME);
  if (salvo) return salvo;
  const ua = navigator.userAgent;
  const nome = /iPhone|iPad/.test(ua)
    ? "iPhone/iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "Navegador";
  localStorage.setItem(CHAVE_NOME, nome);
  return nome;
}

export function definirNomeDispositivo(nome: string) {
  localStorage.setItem(CHAVE_NOME, nome.slice(0, 60));
}

/**
 * Registra/atualiza este aparelho. Aparelhos novos entram como "pendente":
 * outro aparelho já autorizado da mesma unidade (ou um administrador)
 * precisa liberar o acesso aos dados da unidade.
 */
export async function registrarDispositivo(
  userId: string,
  unitId: string | null,
  autorizarAutomaticamente = false,
): Promise<Dispositivo> {
  const id = deviceId();
  const ref = doc(db, "devices", id);
  const atual = await lerDocRapido(ref);
  const agora = new Date().toISOString();

  if (!atual.exists()) {
    const novo: Dispositivo = {
      id,
      nome: nomeDispositivo(),
      userId,
      unitId,
      status: autorizarAutomaticamente ? "ativo" : "pendente",
      versaoApp: VERSAO_APP,
      ultimaSync: null,
      ultimaAtividade: agora,
      criadoEm: agora,
    };
    void setDoc(ref, novo).catch(() => undefined);
    return novo;
  }

  const dados = atual.data() as Dispositivo;
  const status = autorizarAutomaticamente && dados.status === "pendente" ? "ativo" : dados.status;
  void updateDoc(ref, {
    nome: nomeDispositivo(),
    userId,
    unitId: unitId ?? dados.unitId ?? null,
    status,
    versaoApp: VERSAO_APP,
    ultimaAtividade: agora,
  }).catch(() => undefined);
  return {
    ...dados,
    userId,
    unitId: unitId ?? dados.unitId ?? null,
    status,
    ultimaAtividade: agora,
  };
}

export async function lerDispositivo(id = deviceId()): Promise<Dispositivo | null> {
  const snap = await getDoc(doc(db, "devices", id));
  return snap.exists() ? (snap.data() as Dispositivo) : null;
}

export async function listarDispositivos(unitId?: string | null): Promise<Dispositivo[]> {
  const base = collection(db, "devices");
  const q = unitId ? query(base, where("unitId", "==", unitId)) : base;
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Dispositivo);
}

export async function autorizarDispositivo(id: string, unitId: string) {
  await updateDoc(doc(db, "devices", id), { status: "ativo", unitId });
}

export async function revogarDispositivo(id: string) {
  // Revogar interrompe a sincronização; os dados locais continuam no aparelho (criptografados).
  await updateDoc(doc(db, "devices", id), { status: "revogado" });
}

export async function marcarSync(quando = new Date().toISOString()) {
  try {
    await updateDoc(doc(db, "devices", deviceId()), {
      ultimaSync: quando,
      ultimaAtividade: quando,
    });
  } catch {
    /* offline: o carimbo local já é suficiente */
  }
}
