import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useSession } from "./useSession";
import type { Notification } from "@/lib/database";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const q = useQuery<Notification[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return queryClient.getQueryData<Notification[]>(["notifications", user?.id]) || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const fireQuery = query(
      collection(db, "notifications"),
      where("user_id", "==", user.id),
      orderBy("created_at", "desc")
    );
    const unsubscribe = onSnapshot(fireQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      queryClient.setQueryData(["notifications", user.id], data);
    });
    return () => unsubscribe();
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, "notifications", id), { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "notifications", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      if (!current) return;
      const unread = current.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  return {
    ...q,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount: q.data?.filter(n => !n.read).length || 0
  };
}
