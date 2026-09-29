import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/** Contas administrativas iniciais (sempre aprovadas). */
export const ADMIN_EMAILS = ["jtsdowload@gmail.com", "juliano.timoteo@hotmail.com"];
const EMAIL_MASTER = "jtsdowload@gmail.com";

export function ehEmailAdmin(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function funcaoInicial(email?: string | null) {
  const normalizado = (email || "").trim().toLowerCase();
  return normalizado === EMAIL_MASTER ? "master" : ehEmailAdmin(normalizado) ? "admin" : "agente";
}

/** Garante que o perfil exista no Firestore e aplique o papel de admin mestre. */
export async function garantirPerfil(user: User, nome?: string) {
  const admin = ehEmailAdmin(user.email);
  const referencia = doc(db, "profiles", user.uid);
  const existente = await getDoc(referencia);
  if (!existente.exists()) {
    await setDoc(referencia, {
      id: user.uid,
      nome: nome || user.displayName || user.email?.split("@")[0] || "",
      email: (user.email || "").toLowerCase(),
      aprovado: admin,
      funcao: funcaoInicial(user.email),
      unitId: admin ? "unidade-principal" : null,
      created_at: new Date().toISOString(),
    });
    return;
  }
  await setDoc(
    referencia,
    {
      nome: nome || user.displayName || user.email?.split("@")[0] || "",
      email: (user.email || "").toLowerCase(),
      ...(admin
        ? { aprovado: true, funcao: funcaoInicial(user.email), unitId: "unidade-principal" }
        : {}),
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function signIn(email: string, pass: string) {
  // O perfil é preparado uma única vez pelo AcsProvider (evita leituras/gravações duplicadas).
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
}

export async function signUp(email: string, pass: string, name: string) {
  const normalizado = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, normalizado, pass);
  await setDoc(doc(db, "profiles", cred.user.uid), {
    id: cred.user.uid,
    nome: name,
    email: normalizado,
    aprovado: ehEmailAdmin(normalizado),
    funcao: funcaoInicial(normalizado),
    unitId: ehEmailAdmin(normalizado) ? "unidade-principal" : null,
    created_at: new Date().toISOString(),
  });
  return cred;
}

export async function logOut() {
  return signOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}
