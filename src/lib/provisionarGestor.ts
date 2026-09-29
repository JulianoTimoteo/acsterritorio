/**
 * Criação da conta de gestão (admin@santavitoria.com) no Firebase.
 * Usa uma instância secundária do Firebase para NÃO derrubar a sessão do master.
 */
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { app as appPrincipal, db } from "@/lib/firebase";

export const EMAIL_GESTOR = "admin@santavitoria.com";
const SENHA_GESTOR = "admin1986@#";
const NOME_GESTOR = "Gestor Santa Vitória";
const APP_SECUNDARIO = "provisionamento";

type Resultado = { criado: boolean; uid: string };

export async function provisionarGestor(unitId: string | null): Promise<Resultado> {
  const secundario =
    getApps().find((a) => a.name === APP_SECUNDARIO) ??
    initializeApp(appPrincipal.options, APP_SECUNDARIO);
  const authSecundario = getAuth(secundario);

  let criado = false;
  try {
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(authSecundario, EMAIL_GESTOR, SENHA_GESTOR);
      criado = true;
      await updateProfile(cred.user, { displayName: NOME_GESTOR }).catch(() => undefined);
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo !== "auth/email-already-in-use") throw erro;
      cred = await signInWithEmailAndPassword(authSecundario, EMAIL_GESTOR, SENHA_GESTOR);
    }

    // O perfil é gravado pela sessão do master (que tem permissão total nas regras).
    await setDoc(
      doc(db, "profiles", cred.user.uid),
      {
        id: cred.user.uid,
        nome: NOME_GESTOR,
        email: EMAIL_GESTOR,
        funcao: "admin",
        aprovado: true,
        bloqueado: false,
        unitId: unitId ?? "unidade-principal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );

    return { criado, uid: cred.user.uid };
  } finally {
    await signOut(authSecundario).catch(() => undefined);
    const existente = getApps().find((a) => a.name === APP_SECUNDARIO);
    if (existente) await deleteApp(getApp(APP_SECUNDARIO)).catch(() => undefined);
  }
}
