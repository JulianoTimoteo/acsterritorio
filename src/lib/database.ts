import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  limit
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Tipos operacionais vêm do banco local do aparelho (fonte única de verdade).
export type { Family, Resident, Visit, Appointment, Transferencia } from "@/database/localDatabase";

export type Profile = {
  id: string;
  nome: string;
  email: string;
  unidade?: string;
  micro_area?: string;
  aprovado: boolean;
  aprovado_em?: string;
  role?: 'admin' | 'agente';
};










export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};



/** Helpers genéricos para Firebase */

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export function subscribeCollection<T>(path: string, filters: any[], callback: (data: T[]) => void) {
  let q = query(collection(db, path));
  filters.forEach(f => {
    q = query(q, where(f.field, f.op, f.value));
  });
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
    callback(data);
  });
}
