import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { doc, getDoc, getDocFromCache, type DocumentReference } from "firebase/firestore";
import { comTempo } from "./comTempo";

/**
 * Projeto Firebase oficial do aplicativo: acscomunitario (acscomunitario-704be).
 * O Firebase é utilizado EXCLUSIVAMENTE para identidade:
 * autenticação, perfis, permissões, unidades e dispositivos.
 * Nenhum dado operacional (pacientes, visitas, consultas) é gravado aqui.
 * Analytics permanece desativado por privacidade.
 */
// Config web do Firebase é pública por design (protegida por regras e domínios
// autorizados). Pode ser sobrescrita via VITE_FIREBASE_* (ver .env.example).
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyA6o3njrrYE_lTgt2i307Si1hEXKnmm-Nc",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "acscomunitario-704be.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "acscomunitario-704be",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "acscomunitario-704be.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "500229700406",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:500229700406:web:5a8fde95ac9071a1c99197",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * Cache local de perfil/aparelho (só dados administrativos) + detecção automática
 * de long-polling, que evita esperas longas em redes móveis/proxies.
 */
function criarDb(): Firestore {
  if (typeof window === "undefined") return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app); // já inicializado (recarga a quente)
  }
}
const db = criarDb();

/** Lê um documento com limite de tempo; se a rede demorar, usa a cópia local. */
async function lerDocRapido(ref: DocumentReference) {
  try {
    return await comTempo(getDoc(ref));
  } catch (erro) {
    try {
      return await getDocFromCache(ref);
    } catch {
      throw erro;
    }
  }
}

export { app, auth, db, doc, lerDocRapido };
