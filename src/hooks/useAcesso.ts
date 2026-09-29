/**
 * Dados administrativos (perfis, permissões, unidades, auditoria) — Firebase.
 * Nenhum dado de paciente passa por aqui.
 */
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useAcs, type Perfil } from "@/auth/AcsProvider";
import { ehAdministrativo, EMAIL_MASTER } from "@/auth/permissions";

export function usePerfil() {
  const { perfil, carregando } = useAcs();
  return { data: perfil as Perfil | null, isLoading: carregando };
}

export function useEhAdmin() {
  const { perfil } = useAcs();
  return { data: !!perfil && ehAdministrativo(perfil.funcao), isLoading: false };
}

export function useUsuarios(habilitado: boolean) {
  const { perfil } = useAcs();
  return useQuery({
    enabled: habilitado && !!perfil && ehAdministrativo(perfil.funcao),
    queryKey: ["usuarios", perfil?.funcao, perfil?.unitId],
    queryFn: async () => {
      const base = collection(db, "profiles");
      // Um admin de unidade só enxerga a própria unidade; o master enxerga tudo.
      const q =
        perfil?.funcao === "master"
          ? query(base)
          : query(base, where("unitId", "==", perfil?.unitId ?? "__nenhuma__"));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => {
          const dados = d.data() as any;
          return { id: d.id, ...dados, admin: ehAdministrativo(dados.funcao) };
        })
        // A conta master é invisível para qualquer outra pessoa.
        .filter(
          (u) =>
            perfil?.funcao === "master" ||
            (u.funcao !== "master" && (u.email || "").toLowerCase() !== EMAIL_MASTER),
        ) as any[];
    },
  });
}

export function useAgentes() {
  const { perfil } = useAcs();
  return useQuery({
    enabled: !!perfil?.unitId,
    queryKey: ["agentes", perfil?.unitId],
    queryFn: async () => {
      const q = query(
        collection(db, "profiles"),
        where("unitId", "==", perfil?.unitId),
        where("aprovado", "==", true),
      );
      const snap = await getDocs(q);
      return snap.docs
        .filter((d) => d.id !== perfil?.id)
        .map((d) => ({ id: d.id, nome: d.data().nome, micro_area: d.data().micro_area })) as any[];
    },
  });
}

/** Agentes aprovados de qualquer unidade (usado nas transferências entre unidades). */
export function useAgentesDaUnidade(unitId?: string | null) {
  return useQuery({
    enabled: !!unitId,
    queryKey: ["agentes-unidade", unitId],
    queryFn: async () => {
      const q = query(
        collection(db, "profiles"),
        where("unitId", "==", unitId),
        where("aprovado", "==", true),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        nome: (d.data() as any).nome as string | undefined,
        funcao: (d.data() as any).funcao as string | undefined,
      }));
    },
  });
}

export function useLogsAdmin() {
  const { data: ehAdmin } = useEhAdmin();
  return useQuery({
    enabled: !!ehAdmin,
    queryKey: ["admin_logs"],
    queryFn: async () => {
      const q = query(collection(db, "admin_logs"), orderBy("created_at", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });
}
