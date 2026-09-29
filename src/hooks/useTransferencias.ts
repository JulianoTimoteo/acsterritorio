import { useLiveQuery } from "dexie-react-hooks";
import { useAcs } from "@/auth/AcsProvider";
import { transferencias as repo } from "@/database/repositories";

export type Transferencia = {
  id: string;
  family_id: string;
  de_user_id: string;
  para_user_id: string | null;
  destino_externo: string | null;
  motivo: string | null;
  status: string;
  respondida_em: string | null;
  created_at: string;
};

/** Transferências da unidade, guardadas no próprio aparelho. */
export function useTransferencias() {
  const { ctx } = useAcs();
  const data = useLiveQuery(async () => {
    if (!ctx) return undefined;
    const lista = await repo.listar(ctx);
    return lista.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [ctx?.unitId]);
  return { data: data as any as Transferencia[] | undefined, isLoading: !!ctx && data === undefined };
}

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando resposta",
  aceita: "Aceita",
  recusada: "Recusada",
  concluida: "Concluída",
};
