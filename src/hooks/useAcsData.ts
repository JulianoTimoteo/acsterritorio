/**
 * Dados operacionais: leem e escrevem SEMPRE no banco local do aparelho.
 * Nada de paciente vai para o Firebase. A nuvem recebe apenas pacotes
 * criptografados através do motor de sincronização.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { useAcs } from "@/auth/AcsProvider";
import {
  familias as repoFamilias,
  moradores as repoMoradores,
  visitas as repoVisitas,
  consultas as repoConsultas,
} from "@/database/repositories";
import type { Appointment, Family, Resident, Visit } from "@/lib/database";

type Resultado<T> = { data: T | undefined; isLoading: boolean; error: Error | null };

function usar<T>(fn: () => Promise<T>, deps: any[], ativo: boolean): Resultado<T> {
  const data = useLiveQuery(async () => {
    if (!ativo) return undefined;
    return fn();
  }, deps);
  return { data, isLoading: ativo && data === undefined, error: null };
}

export function useFamilies() {
  const { ctx } = useAcs();
  return usar<Family[]>(
    async () => (await repoFamilias.listar(ctx!)).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
    [ctx?.unitId, ctx?.userId],
    !!ctx,
  );
}

export function useFamily(id: string) {
  const { ctx } = useAcs();
  return usar<Family | undefined>(() => repoFamilias.obter(ctx!, id), [ctx?.unitId, id], !!ctx);
}

export function useResidents(familyId?: string) {
  const { ctx } = useAcs();
  return usar<Resident[]>(
    () => repoMoradores.listar(ctx!, familyId),
    [ctx?.unitId, familyId ?? "all"],
    !!ctx,
  );
}

export function useVisits(familyId?: string) {
  const { ctx } = useAcs();
  return usar<Visit[]>(
    async () =>
      (await repoVisitas.listar(ctx!, familyId)).sort((a, b) =>
        (b.agendada_em || "").localeCompare(a.agendada_em || ""),
      ),
    [ctx?.unitId, familyId ?? "all"],
    !!ctx,
  );
}

export function useAppointments(familyId?: string) {
  const { ctx } = useAcs();
  return usar<Appointment[]>(
    async () =>
      (await repoConsultas.listar(ctx!, familyId)).sort((a, b) =>
        (a.data_hora || "").localeCompare(b.data_hora || ""),
      ),
    [ctx?.unitId, familyId ?? "all"],
    !!ctx,
  );
}

/** Ações de escrita — todas passam pelas permissões e pela fila de sincronização. */
export function useAcsMutations() {
  const { ctx } = useAcs();
  const exigirCtx = () => {
    if (!ctx) throw new Error("Sua conta ainda não está liberada para registrar dados.");
    return ctx;
  };
  return {
    criarFamilia: (d: any) => repoFamilias.criar(exigirCtx(), d),
    atualizarFamilia: (id: string, d: any) => repoFamilias.atualizar(exigirCtx(), id, d),
    excluirFamilia: (id: string) => repoFamilias.excluir(exigirCtx(), id),
    criarMorador: (d: any) => repoMoradores.criar(exigirCtx(), d),
    atualizarMorador: (id: string, d: any) => repoMoradores.atualizar(exigirCtx(), id, d),
    excluirMorador: (id: string) => repoMoradores.excluir(exigirCtx(), id),
    criarVisita: (d: any) => repoVisitas.criar(exigirCtx(), d),
    atualizarVisita: (id: string, d: any) => repoVisitas.atualizar(exigirCtx(), id, d),
    excluirVisita: (id: string) => repoVisitas.excluir(exigirCtx(), id),
    criarConsulta: (d: any) => repoConsultas.criar(exigirCtx(), d),
    atualizarConsulta: (id: string, d: any) => repoConsultas.atualizar(exigirCtx(), id, d),
    excluirConsulta: (id: string) => repoConsultas.excluir(exigirCtx(), id),
  };
}
