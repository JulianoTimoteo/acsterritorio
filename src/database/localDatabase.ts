/**
 * Banco local do aparelho (IndexedDB via Dexie).
 * É o banco PRINCIPAL do aplicativo: tudo é gravado aqui primeiro.
 * A nuvem (Firebase) recebe apenas cópias criptografadas.
 */
import Dexie, { type Table } from "dexie";

export const SCHEMA_VERSION = 2;

/** Metadados de sincronização presentes em todo registro operacional. */
export type MetaRegistro = {
  id: string;
  unitId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deviceId: string;
  version: number;
  deleted: boolean;
  deletedAt?: string | null;
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
};

export type Family = MetaRegistro & {
  nome: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  cep?: string | null;
  risco: "baixo" | "medio" | "alto";
  situacao: string;
  telefone?: string | null;
  user_id: string;
  latitude?: number | null;
  longitude?: number | null;
  micro_area?: string | null;
  unidade?: string | null;
  observacoes?: string | null;
  /** Família que saiu para outra unidade: continua guardada, mas sai da lista. */
  arquivada?: boolean;
  arquivada_em?: string | null;
  motivo_arquivamento?: string | null;
};

export type Resident = MetaRegistro & {
  family_id: string;
  nome: string;
  data_nascimento?: string | null;
  parentesco?: string | null;
  sexo?: string | null;
  cns?: string | null;
  cpf?: string | null;
  peso?: number | null;
  telefone?: string | null;
  acamado: boolean;
  gestante: boolean;
  condicoes: string[];
  user_id: string;
  observacoes?: string | null;
};

export type Visit = MetaRegistro & {
  family_id: string;
  agendada_em: string;
  realizada_em?: string | null;
  status: string;
  motivo?: string | null;
  anotacoes?: string | null;
  resumo_ia?: string | null;
  pendencias?: string[] | null;
  proximos_passos?: string[] | null;
  user_id: string;
};

export type Appointment = MetaRegistro & {
  family_id?: string | null;
  resident_id?: string | null;
  titulo: string;
  especialidade?: string | null;
  tipo: string;
  descricao?: string | null;
  local?: string | null;
  data_hora: string;
  status: string;
  aviso_48h_em?: string | null;
  aviso_24h_em?: string | null;
  observacoes?: string | null;
  user_id: string;
};

export type Transferencia = MetaRegistro & {
  family_id: string;
  de_user_id: string;
  para_user_id?: string | null;
  destino_externo?: string | null;
  motivo?: string | null;
  status: string;
  respondida_em?: string | null;
};

export type EntidadeNome = "families" | "residents" | "visits" | "appointments" | "transferencias";

export type OperacaoFila = {
  operationId: string;
  entity: EntidadeNome;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payloadVersion: number;
  createdAt: string;
  deviceId: string;
  userId: string;
  unitId: string;
  attempts: number;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  nextAttemptAt?: string | null;
  lastError?: string | null;
};

export type Conflito = {
  id: string;
  entity: EntidadeNome;
  entityId: string;
  unitId: string;
  detectadoEm: string;
  local: any;
  remoto: any;
  resolvido: boolean;
  resolucao?: "local" | "remoto" | "mesclado" | null;
};

/** Chave/valor técnico do aparelho (sem dados de paciente). */
export type Meta = { chave: string; valor: any };

/** Auditoria de ações administrativas (sem dados sensíveis). */
export type Auditoria = {
  id: string;
  userId: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  timestamp: string;
  deviceId: string;
  unitId: string | null;
};

export class BancoLocal extends Dexie {
  families!: Table<Family, string>;
  residents!: Table<Resident, string>;
  visits!: Table<Visit, string>;
  appointments!: Table<Appointment, string>;
  transferencias!: Table<Transferencia, string>;
  sync_queue!: Table<OperacaoFila, string>;
  conflitos!: Table<Conflito, string>;
  meta!: Table<Meta, string>;
  auditoria!: Table<Auditoria, string>;

  constructor() {
    super("acs_local_v1");
    // Migrations: sempre adicione uma nova versão; nunca quebre bancos antigos.
    this.version(1).stores({
      families: "id, unitId, user_id, nome, deleted, syncStatus, updatedAt",
      residents: "id, unitId, family_id, user_id, deleted, syncStatus, updatedAt",
      visits: "id, unitId, family_id, user_id, status, agendada_em, deleted, syncStatus",
      appointments: "id, unitId, family_id, user_id, status, data_hora, deleted, syncStatus",
      transferencias: "id, unitId, family_id, de_user_id, para_user_id, status, deleted",
      sync_queue: "operationId, entity, entityId, status, createdAt",
      conflitos: "id, entity, entityId, unitId, resolvido",
      meta: "chave",
      auditoria: "id, userId, timestamp",
    });
    this.version(2).stores({
      families: "id, unitId, user_id, nome, deleted, arquivada, syncStatus, updatedAt",
    });
  }
}

export const bancoLocal = new BancoLocal();

export async function lerMeta<T = any>(chave: string): Promise<T | undefined> {
  const reg = await bancoLocal.meta.get(chave);
  return reg?.valor as T | undefined;
}

export async function gravarMeta(chave: string, valor: any) {
  await bancoLocal.meta.put({ chave, valor });
}
