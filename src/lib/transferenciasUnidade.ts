/**
 * Transferência de família entre UNIDADES diferentes.
 *
 * Regras:
 * - Dentro da mesma unidade o agente transfere livremente (ver TransferirFamilia).
 * - Entre unidades, os administradores das DUAS unidades precisam concordar.
 * - Depois do OK dos dois, os dados viajam em um pacote criptografado gravado
 *   na nuvem da equipe (Firebase), para a unidade de destino. O pacote só abre com o
 *   código de 4 dígitos gerado no pedido.
 * - A família não é apagada na unidade de origem: fica arquivada (invisível
 *   para o agente) e pode ser reativada se a família voltar.
 *
 * O Firebase guarda apenas identificadores e aprovações — nunca dados de paciente.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  cifrar,
  decifrar,
  derivarChaveDaUnidade,
  impressaoDaChave,
  novoId,
  type PacoteCifrado,
} from "@/security/crypto";
import { bancoLocal, gravarMeta, lerMeta, type MetaRegistro } from "@/database/localDatabase";
import { baixarPacoteDaUnidade, enviarPacoteNaUnidade } from "@/storage/firebaseCloud";
import { deviceId } from "@/devices/deviceManager";

export type StatusPedido =
  | "aguardando_gestores"
  | "aprovada"
  | "enviada"
  | "recebida"
  | "recusada";

export type PedidoUnidade = {
  id: string;
  familyId: string;
  origemUnitId: string;
  origemUserId: string;
  destinoUnitId: string;
  destinoUserId: string;
  status: StatusPedido;
  aprovacaoOrigem: boolean;
  aprovacaoDestino: boolean;
  codigoImpressao: string;
  arquivo: string;
  criadoEm: string;
  atualizadoEm?: string;
};

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  aguardando_gestores: "Aguardando os dois administradores",
  aprovada: "Liberada — falta enviar os dados",
  enviada: "Dados enviados — falta o código no destino",
  recebida: "Concluída",
  recusada: "Recusada",
};

const COLECAO = "transferencias_unidade";

function codigoDe4Digitos() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return String(n).padStart(4, "0");
}

async function chaveDoPacote(codigo: string, pedidoId: string) {
  return derivarChaveDaUnidade(codigo, `transfer:${pedidoId}`);
}

/** Cria o pedido e devolve o código de 4 dígitos (mostrado uma única vez). */
export async function criarPedidoUnidade(dados: {
  familyId: string;
  origemUnitId: string;
  origemUserId: string;
  destinoUnitId: string;
  destinoUserId: string;
}): Promise<{ pedido: PedidoUnidade; codigo: string }> {
  const id = novoId();
  const codigo = codigoDe4Digitos();
  const pedido: PedidoUnidade = {
    id,
    ...dados,
    status: "aguardando_gestores",
    aprovacaoOrigem: false,
    aprovacaoDestino: false,
    codigoImpressao: await impressaoDaChave(codigo, `transfer:${id}`),
    arquivo: `transfer-${id}.acsenc`,
    criadoEm: new Date().toISOString(),
  };
  await setDoc(doc(db, COLECAO, id), pedido);
  await gravarMeta(`transfer.${id}.codigo`, codigo);
  return { pedido, codigo };
}

/** Código guardado neste aparelho (quem criou o pedido pode consultar de novo). */
export async function codigoGuardado(pedidoId: string) {
  return lerMeta<string>(`transfer.${pedidoId}.codigo`);
}

export async function listarPedidosDaUnidade(unitId: string): Promise<PedidoUnidade[]> {
  const base = collection(db, COLECAO);
  const [saida, entrada] = await Promise.all([
    getDocs(query(base, where("origemUnitId", "==", unitId))),
    getDocs(query(base, where("destinoUnitId", "==", unitId))),
  ]);
  const mapa = new Map<string, PedidoUnidade>();
  for (const s of [...saida.docs, ...entrada.docs]) mapa.set(s.id, s.data() as PedidoUnidade);
  return [...mapa.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function aprovarPedido(pedidoId: string, lado: "origem" | "destino") {
  const ref = doc(db, COLECAO, pedidoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Pedido não encontrado.");
  const pedido = snap.data() as PedidoUnidade;
  const aprovacaoOrigem = lado === "origem" ? true : pedido.aprovacaoOrigem;
  const aprovacaoDestino = lado === "destino" ? true : pedido.aprovacaoDestino;
  await updateDoc(ref, {
    aprovacaoOrigem,
    aprovacaoDestino,
    status: aprovacaoOrigem && aprovacaoDestino ? "aprovada" : "aguardando_gestores",
    atualizadoEm: new Date().toISOString(),
  });
}

export async function recusarPedido(pedidoId: string) {
  await updateDoc(doc(db, COLECAO, pedidoId), {
    status: "recusada",
    atualizadoEm: new Date().toISOString(),
  });
}

const ENTIDADES_FAMILIA = ["families", "residents", "visits", "appointments"] as const;

async function registrosDaFamilia(familyId: string) {
  const familia = await bancoLocal.families.get(familyId);
  if (!familia) throw new Error("Família não encontrada neste aparelho.");
  const registros: Record<string, MetaRegistro[]> = { families: [familia] };
  registros.residents = await bancoLocal.residents.where("family_id").equals(familyId).toArray();
  registros.visits = await bancoLocal.visits.where("family_id").equals(familyId).toArray();
  registros.appointments = await bancoLocal.appointments
    .where("family_id")
    .equals(familyId)
    .toArray();
  return registros;
}

/**
 * Envia os dados para a unidade de destino e arquiva a família na origem.
 * A família deixa de aparecer para o agente, mas nada é apagado.
 */
export async function enviarPacoteTransferencia(pedido: PedidoUnidade, codigo: string) {
  if (pedido.status !== "aprovada") {
    throw new Error("Os administradores das duas unidades ainda não liberaram esta transferência.");
  }
  if ((await impressaoDaChave(codigo, `transfer:${pedido.id}`)) !== pedido.codigoImpressao) {
    throw new Error("Código de 4 dígitos incorreto para este pedido.");
  }
  const registros = await registrosDaFamilia(pedido.familyId);
  const chave = await chaveDoPacote(codigo, pedido.id);
  const pacote = await cifrar(chave, {
    formato: "ACS_TRANSFER",
    version: 1,
    pedidoId: pedido.id,
    familyId: pedido.familyId,
    registros,
    createdAt: new Date().toISOString(),
  });
  await enviarPacoteNaUnidade(pedido.destinoUnitId, pedido.arquivo, JSON.stringify(pacote));

  const familia = await bancoLocal.families.get(pedido.familyId);
  if (familia) {
    const novaVersao = familia.version + 1;
    const atualizadoEm = new Date().toISOString();
    await bancoLocal.families.put({
      ...familia,
      arquivada: true,
      arquivada_em: atualizadoEm,
      motivo_arquivamento: "Transferida para outra unidade",
      version: novaVersao,
      updatedAt: atualizadoEm,
      deviceId: deviceId(),
      syncStatus: "PENDING",
    });
    await bancoLocal.sync_queue.add({
      operationId: novoId(),
      entity: "families",
      entityId: familia.id,
      operation: "UPDATE",
      payloadVersion: novaVersao,
      createdAt: atualizadoEm,
      deviceId: deviceId(),
      userId: pedido.origemUserId,
      unitId: pedido.origemUnitId,
      attempts: 0,
      status: "PENDING",
      nextAttemptAt: null,
      lastError: null,
    });
  }
  await updateDoc(doc(db, COLECAO, pedido.id), {
    status: "enviada",
    atualizadoEm: new Date().toISOString(),
  });
}

/**
 * Abre o pacote com o código de 4 dígitos e grava os dados na unidade de destino.
 * Se a família já existiu aqui antes, o cadastro é reativado e atualizado.
 */
export async function receberPacoteTransferencia(
  pedido: PedidoUnidade,
  codigo: string,
  destino: { unitId: string; userId: string },
): Promise<number> {
  if ((await impressaoDaChave(codigo, `transfer:${pedido.id}`)) !== pedido.codigoImpressao) {
    throw new Error("Código de 4 dígitos incorreto.");
  }
  const bruto = await baixarPacoteDaUnidade(pedido.destinoUnitId, pedido.arquivo);
  if (!bruto) throw new Error("O pacote ainda não chegou à nuvem desta unidade.");
  const chave = await chaveDoPacote(codigo, pedido.id);
  const conteudo = await decifrar<any>(chave, JSON.parse(bruto) as PacoteCifrado);
  if (conteudo?.formato !== "ACS_TRANSFER" || conteudo.version !== 1) {
    throw new Error("Pacote de transferência incompatível.");
  }

  const agora = new Date().toISOString();
  let total = 0;
  for (const entidade of ENTIDADES_FAMILIA) {
    const tabela = bancoLocal[entidade] as any;
    for (const registro of (conteudo.registros?.[entidade] || []) as MetaRegistro[]) {
      const atual = await tabela.get(registro.id);
      await tabela.put({
        ...registro,
        unitId: destino.unitId,
        user_id: destino.userId,
        arquivada: false,
        arquivada_em: null,
        motivo_arquivamento: null,
        updatedAt: agora,
        updatedBy: destino.userId,
        deviceId: deviceId(),
        version: Math.max(registro.version, atual?.version ?? 0) + 1,
        syncStatus: "PENDING",
      });
      total++;
    }
  }
  const operacoes = [];
  for (const entidade of ENTIDADES_FAMILIA) {
    const tabela = bancoLocal[entidade] as any;
    for (const registro of (conteudo.registros?.[entidade] || []) as MetaRegistro[]) {
      operacoes.push({
        operationId: novoId(),
        entity: entidade,
        entityId: registro.id,
        operation: "UPDATE" as const,
        payloadVersion: Math.max(registro.version, 0) + 1,
        createdAt: agora,
        deviceId: deviceId(),
        userId: destino.userId,
        unitId: destino.unitId,
        attempts: 0,
        status: "PENDING" as const,
        nextAttemptAt: null,
        lastError: null,
      });
    }
  }
  await bancoLocal.sync_queue.bulkPut(operacoes);
  await updateDoc(doc(db, COLECAO, pedido.id), {
    status: "recebida",
    atualizadoEm: agora,
  });
  return total;
}
