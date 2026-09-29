/**
 * Matriz de permissões granulares.
 * A interface esconde o que não é permitido, mas a verificação real
 * acontece também na camada de dados (repositories/syncEngine).
 */

export const FUNCOES = ["master", "admin", "supervisor", "agente", "consulta"] as const;
export type Funcao = (typeof FUNCOES)[number];

export const FUNCAO_LABEL: Record<Funcao, string> = {
  master: "Master",
  admin: "Administrador",
  supervisor: "Supervisor",
  agente: "Agente",
  consulta: "Consulta",
};

export const PERMISSOES = [
  "patients.read",
  "patients.create",
  "patients.update",
  "patients.delete",
  "visits.read",
  "visits.create",
  "visits.update",
  "visits.delete",
  "appointments.read",
  "appointments.create",
  "appointments.update",
  "appointments.delete",
  "reports.read",
  "users.manage",
  "units.manage",
  "devices.manage",
  "sync.manage",
] as const;
export type Permissao = (typeof PERMISSOES)[number];

const AGENTE: Permissao[] = [
  "patients.read",
  "patients.create",
  "patients.update",
  "visits.read",
  "visits.create",
  "visits.update",
  "visits.delete",
  "appointments.read",
  "appointments.create",
  "appointments.update",
  "appointments.delete",
  "reports.read",
  "sync.manage",
];

const SUPERVISOR: Permissao[] = [...AGENTE, "patients.delete", "devices.manage"];
const ADMIN: Permissao[] = [...SUPERVISOR, "users.manage", "units.manage"];

export const MATRIZ: Record<Funcao, readonly Permissao[]> = {
  master: PERMISSOES,
  admin: ADMIN,
  supervisor: SUPERVISOR,
  agente: AGENTE,
  consulta: ["patients.read", "visits.read", "appointments.read", "reports.read"],
};

export type ContextoAcesso = {
  funcao: Funcao;
  permissoes?: Permissao[] | null;
  aprovado: boolean;
  unitId?: string | null;
  bloqueado?: boolean;
};

export function pode(ctx: ContextoAcesso | null | undefined, permissao: Permissao): boolean {
  if (!ctx || ctx.bloqueado) return false;
  if (ctx.funcao !== "master" && !ctx.aprovado) return false;
  const extras = ctx.permissoes ?? [];
  return MATRIZ[ctx.funcao]?.includes(permissao) || extras.includes(permissao);
}

/** Garante a permissão na camada de serviço; lança erro amigável quando negada. */
export function exigir(ctx: ContextoAcesso | null | undefined, permissao: Permissao) {
  if (!pode(ctx, permissao)) {
    throw new Error("Você não tem permissão para realizar esta ação.");
  }
}

/** O MASTER é definido por perfil formal; este e-mail é apenas a semente inicial. */
export const EMAIL_MASTER = "jtsdowload@gmail.com";

/** Funções com acesso às telas administrativas. */
export function ehAdministrativo(funcao: Funcao | null | undefined) {
  return funcao === "master" || funcao === "admin" || funcao === "supervisor";
}

