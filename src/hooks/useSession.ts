import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

/** Extensão do tipo User para manter compatibilidade com o código anterior que esperava .id */
export type User = FirebaseUser & { id: string };

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Adaptamos o User do Firebase para ter a propriedade .id (que mapeamos para .uid)
        const adaptedUser = Object.assign(firebaseUser, { id: firebaseUser.uid }) as User;
        setUser(adaptedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
