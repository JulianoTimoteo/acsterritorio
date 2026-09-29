/**
 * Camada de acesso aos dados operacionais.
 * Todo acesso passa por aqui: metadados de sincronização, isolamento por
 * unidade, verificação de permissão e enfileiramento para a nuvem.
 */
import {
  bancoLocal,
  type EntidadeNome,
  type MetaRegistro,
  type OperacaoFila,
  type Family,
  type Resident,
  type Visit,
  type Appointment,
  type Transferencia,
} from "./localDatabase";
import { novoId } from "@/security/crypto";
import { deviceId } from "@/devices/deviceManager";
import { objetoSeguro } from "@/security/sanitization";
import { exigir, type ContextoAcesso, type Permissao } from "@/auth/permissions";

export type Contexto = ContextoAcesso & { userId: string; unitId: string };

const PERMISSAO_LEITURA: Record<EntidadeNome, Permissao> = {
  families: "patients.read",
  residents: "patients.read",
  visits: "visits.read",
  appointments: "appointments.read",
  transferencias: "patients.read",
};

const PERMISSAO_ESCRITA: Record<EntidadeNome, { create: Permissao; update: Permissao; remove: Permissao }> = {
  families: { create: "patients.create", update: "patients.update", remove: "patients.delete" },
  residents: { create: "patients.create", update: "patients.update", remove: "patients.delete" },
  visits: { create: "visits.create", update: "visits.update", remove: "visits.delete" },
  appointments: {
    create: "appointments.create",
    update: "appointments.update",
    remove: "appointments.delete",
  },
  transferencias: { create: "patients.update", update: "patients.update", remove: "patients.update" },
};

function tabela(entidade: EntidadeNome) {
  return bancoLocal[entidade] as any;
}

async function enfileirar(
  ctx: Contexto,
  entity: EntidadeNome,
  entityId: string,
  operation: OperacaoFila["operation"],
  version: number,
) {
  const op: OperacaoFila = {
    operationId: novoId(),
    entity,
    entityId,
    operation,
    payloadVersion: version,
    createdAt: new Date().toISOString(),
    deviceId: deviceId(),
    userId: ctx.userId,
    unitId: ctx.unitId,
    attempts: 0,
    status: "PENDING",
    nextAttemptAt: null,
    lastError: null,
  };
  await bancoLocal.sync_queue.add(op);
}

/* ------------------------------- leitura ------------------------------- */

export async function listar<T extends MetaRegistro>(
  ctx: Contexto,
  entidade: EntidadeNome,
  filtro?: (r: T) => boolean,
): Promise<T[]> {
  exigir(ctx, PERMISSAO_LEITURA[entidade]);
  const todos: T[] = await tabela(entidade).where("unitId").equals(ctx.unitId).toArray();
  return todos.filter((r) => !r.deleted && (!filtro || filtro(r)));
}

export async function obter<T extends MetaRegistro>(
  ctx: Contexto,
  entidade: EntidadeNome,
  id: string,
): Promise<T | undefined> {
  exigir(ctx, PERMISSAO_LEITURA[entidade]);
  const reg: T | undefined = await tabela(entidade).get(id);
  // Isolamento lógico: um registro de outra unidade nunca é devolvido.
  if (!reg || reg.unitId !== ctx.unitId || reg.deleted) return undefined;
  return reg;
}

/* ------------------------------- escrita ------------------------------- */

export async function criar<T extends MetaRegistro>(
  ctx: Contexto,
  entidade: EntidadeNome,
  dados: Omit<T, keyof MetaRegistro> & Partial<MetaRegistro>,
): Promise<T> {
  exigir(ctx, PERMISSAO_ESCRITA[entidade].create);
  const agora = new Date().toISOString();
  const registro = {
    ...objetoSeguro(dados as Record<string, any>),
    id: novoId(),
    unitId: ctx.unitId,
    createdBy: ctx.userId,
    createdAt: agora,
    updatedAt: agora,
    updatedBy: ctx.userId,
    deviceId: deviceId(),
    version: 1,
    deleted: false,
    deletedAt: null,
    syncStatus: "PENDING",
  } as unknown as T;
  await tabela(entidade).put(registro);
  await enfileirar(ctx, entidade, registro.id, "CREATE", 1);
  return registro;
}

export async function atualizar<T extends MetaRegistro>(
  ctx: Contexto,
  entidade: EntidadeNome,
  id: string,
  mudancas: Partial<T>,
): Promise<T> {
  exigir(ctx, PERMISSAO_ESCRITA[entidade].update);
  const atual: T | undefined = await tabela(entidade).get(id);
  if (!atual || atual.unitId !== ctx.unitId) throw new Error("Registro não encontrado nesta unidade.");
  const atualizado = {
    ...atual,
    ...objetoSeguro(mudancas as Record<string, any>),
    id: atual.id,
    unitId: atual.unitId,
    createdBy: atual.createdBy,
    createdAt: atual.createdAt,
    updatedAt: new Date().toISOString(),
    updatedBy: ctx.userId,
    deviceId: deviceId(),
    version: atual.version + 1,
    syncStatus: "PENDING",
  } as T;
  await tabela(entidade).put(atualizado);
  await enfileirar(ctx, entidade, id, "UPDATE", atualizado.version);
  return atualizado;
}

/** Exclusão lógica (soft delete) — nada some silenciosamente da sincronização. */
export async function excluir(ctx: Contexto, entidade: EntidadeNome, id: string) {
  exigir(ctx, PERMISSAO_ESCRITA[entidade].remove);
  const atual: MetaRegistro | undefined = await tabela(entidade).get(id);
  if (!atual || atual.unitId !== ctx.unitId) throw new Error("Registro não encontrado nesta unidade.");
  const agora = new Date().toISOString();
  await tabela(entidade).put({
    ...atual,
    deleted: true,
    deletedAt: agora,
    updatedAt: agora,
    updatedBy: ctx.userId,
    deviceId: deviceId(),
    version: atual.version + 1,
    syncStatus: "PENDING",
  });
  await enfileirar(ctx, entidade, id, "DELETE", atual.version + 1);
}

/* ---------------------------- atalhos tipados ---------------------------- */

export const familias = {
  /** Famílias ativas da unidade (as arquivadas saíram para outra unidade). */
  listar: (ctx: Contexto) =>
    listar<Family>(ctx, "families", (f) => !f.arquivada && f.user_id === ctx.userId),
  listarArquivadas: (ctx: Contexto) =>
    listar<Family>(ctx, "families", (f) => !!f.arquivada && f.user_id === ctx.userId),
  obter: async (ctx: Contexto, id: string) => {
    const familia = await obter<Family>(ctx, "families", id);
    return familia?.user_id === ctx.userId ? familia : undefined;
  },
  criar: (ctx: Contexto, d: any) => criar<Family>(ctx, "families", d),
  atualizar: (ctx: Contexto, id: string, d: Partial<Family>) => atualizar<Family>(ctx, "families", id, d),
  excluir: (ctx: Contexto, id: string) => excluir(ctx, "families", id),
};

export const moradores = {
  listar: (ctx: Contexto, familyId?: string) =>
    listar<Resident>(ctx, "residents", (r) =>
      r.user_id === ctx.userId && (!familyId || r.family_id === familyId)),
  criar: (ctx: Contexto, d: any) => criar<Resident>(ctx, "residents", d),
  atualizar: (ctx: Contexto, id: string, d: Partial<Resident>) =>
    atualizar<Resident>(ctx, "residents", id, d),
  excluir: (ctx: Contexto, id: string) => excluir(ctx, "residents", id),
};

export const visitas = {
  listar: (ctx: Contexto, familyId?: string) =>
    listar<Visit>(ctx, "visits", (r) =>
      r.user_id === ctx.userId && (!familyId || r.family_id === familyId)),
  criar: (ctx: Contexto, d: any) => criar<Visit>(ctx, "visits", d),
  atualizar: (ctx: Contexto, id: string, d: Partial<Visit>) => atualizar<Visit>(ctx, "visits", id, d),
  excluir: (ctx: Contexto, id: string) => excluir(ctx, "visits", id),
};

export const consultas = {
  listar: (ctx: Contexto, familyId?: string) =>
    listar<Appointment>(ctx, "appointments", (r) =>
      r.user_id === ctx.userId && (!familyId || r.family_id === familyId)),
  criar: (ctx: Contexto, d: any) => criar<Appointment>(ctx, "appointments", d),
  atualizar: (ctx: Contexto, id: string, d: Partial<Appointment>) =>
    atualizar<Appointment>(ctx, "appointments", id, d),
  excluir: (ctx: Contexto, id: string) => excluir(ctx, "appointments", id),
};

export const transferencias = {
  listar: (ctx: Contexto) => listar<Transferencia>(ctx, "transferencias"),
  criar: (ctx: Contexto, d: any) => criar<Transferencia>(ctx, "transferencias", d),
  atualizar: (ctx: Contexto, id: string, d: Partial<Transferencia>) =>
    atualizar<Transferencia>(ctx, "transferencias", id, d),
};

/** Entrega uma família e todos os seus registros a outro ACS da mesma unidade. */
export async function transferirFamiliaNaUnidade(
  ctx: Contexto,
  familyId: string,
  responsavelAtualId: string,
  novoResponsavelId: string,
) {
  exigir(ctx, "patients.update");
  const familia = await bancoLocal.families.get(familyId);
  if (!familia || familia.unitId !== ctx.unitId || familia.user_id !== responsavelAtualId) {
    throw new Error("Família não encontrada na sua área.");
  }

  await atualizar<Family>(ctx, "families", familyId, {
    user_id: novoResponsavelId,
    situacao: "ativa",
  });
  const relacionadas = await Promise.all([
    bancoLocal.residents.where("family_id").equals(familyId).toArray(),
    bancoLocal.visits.where("family_id").equals(familyId).toArray(),
    bancoLocal.appointments.where("family_id").equals(familyId).toArray(),
  ]);
  for (const morador of relacionadas[0]) {
    await atualizar<Resident>(ctx, "residents", morador.id, { user_id: novoResponsavelId });
  }
  for (const visita of relacionadas[1]) {
    await atualizar<Visit>(ctx, "visits", visita.id, { user_id: novoResponsavelId });
  }
  for (const consulta of relacionadas[2]) {
    await atualizar<Appointment>(ctx, "appointments", consulta.id, { user_id: novoResponsavelId });
  }
}

export async function pendentes(): Promise<number> {
  return bancoLocal.sync_queue.where("status").anyOf("PENDING", "FAILED").count();
}
