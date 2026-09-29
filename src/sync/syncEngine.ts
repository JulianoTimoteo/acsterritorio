/**
 * SYNC ENGINE
 *
 * Fluxo: banco local -> fila -> compressão -> criptografia -> provedor de nuvem.
 * Cada aparelho publica apenas o seu próprio pacote (nunca sobrescreve o de
 * outro aparelho) e lê os pacotes dos demais aparelhos da mesma unidade.
 * Conflitos nunca são descartados: viram registros na tela de conflitos.
 */
import {
  bancoLocal,
  type EntidadeNome,
  type MetaRegistro,
  type OperacaoFila,
} from "@/database/localDatabase";
import { cifrar, decifrar, novoId, type PacoteCifrado } from "@/security/crypto";
import { deviceId, marcarSync, lerDispositivo } from "@/devices/deviceManager";
import { logTecnico } from "@/security/sanitization";
import type { StorageProvider } from "@/storage/storageProvider";

export const ENTIDADES: EntidadeNome[] = [
  "families",
  "residents",
  "visits",
  "appointments",
  "transferencias",
];

export type EstadoSync =
  | "READY"
  | "OFFLINE"
  | "SYNCING"
  | "SYNC_ERROR"
  | "CONFLICT"
  | "STORAGE_NOT_CONFIGURED"
  | "DEVICE_REVOKED";

export type ResultadoSync = {
  estado: EstadoSync;
  enviados: number;
  recebidos: number;
  conflitos: number;
  erro?: string;
};

function mensagemSeguraDoErro(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : "";
  if (/permissão de edição|conta selecionada é diferente|marque a permissão|pop-ups|janela do Google|A nuvem recusou|Sem conexão com a nuvem|Entre na sua conta/i.test(mensagem)) {
    return mensagem;
  }
  if (/expirada|conecte novamente/i.test(mensagem)) {
    return "Sua sessão expirou. Entre novamente para enviar a cópia.";
  }
  if (/pasta compartilhada.*não foi encontrada/i.test(mensagem)) {
    return "A pasta compartilhada não foi encontrada ou esta conta não tem acesso a ela.";
  }
  if (/\(403\)/.test(mensagem)) {
    return "A conta conectada não tem permissão para gravar na pasta compartilhada.";
  }
  if (/\(429\)/.test(mensagem)) {
    return "A nuvem está ocupada. O aplicativo tentará novamente em instantes.";
  }
  return "Não foi possível enviar a cópia à nuvem. Os dados continuam salvos neste aparelho.";
}

type Envelope = {
  formato: "ACS_BACKUP";
  version: 1;
  unitId: string;
  deviceId: string;
  createdAt: string;
  registros: Record<string, MetaRegistro[]>;
};

function nomeArquivo(unitId: string, device: string) {
  return `acs-u${unitId}-d${device}.acsenc`;
}

function prefixo(unitId: string) {
  return `acs-u${unitId}-`;
}

/* ------------------------- compressão (gzip) ------------------------- */

async function comprimir(texto: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return texto;
  const cs = new CompressionStream("gzip");
  const stream = new Blob([texto]).stream().pipeThrough(cs);
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return `gz:${btoa(bin)}`;
}

async function descomprimir(valor: string): Promise<string> {
  if (!valor.startsWith("gz:")) return valor;
  const bin = atob(valor.slice(3));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Response(stream).text();
}

/* ----------------------------- envio ----------------------------- */

async function montarEnvelope(unitId: string): Promise<{ envelope: Envelope; ids: OperacaoFila[] }> {
  const fila = await bancoLocal.sync_queue
    .where("status")
    .anyOf("PENDING", "FAILED")
    .toArray();

  const registros: Record<string, MetaRegistro[]> = {};
  for (const entidade of ENTIDADES) {
    // Publicamos tudo que este aparelho modificou por último: garante que o
    // pacote do aparelho seja completo e idempotente.
    const todos = (await (bancoLocal[entidade] as any)
      .where("unitId")
      .equals(unitId)
      .toArray()) as MetaRegistro[];
    const meus = todos.filter((r) => r.deviceId === deviceId());
    if (meus.length) registros[entidade] = meus;
  }

  return {
    envelope: {
      formato: "ACS_BACKUP",
      version: 1,
      unitId,
      deviceId: deviceId(),
      createdAt: new Date().toISOString(),
      registros,
    },
    ids: fila,
  };
}

/* ---------------------------- recebimento ---------------------------- */

async function aplicarRemoto(entidade: EntidadeNome, remoto: MetaRegistro, unitId: string) {
  // Zero trust: um pacote nunca traz registro de outra unidade.
  if (remoto.unitId !== unitId) return { aplicado: false, conflito: false };

  const tabela = bancoLocal[entidade] as any;
  const local: MetaRegistro | undefined = await tabela.get(remoto.id);

  if (!local) {
    await tabela.put({ ...remoto, syncStatus: "SYNCED" });
    return { aplicado: true, conflito: false };
  }

  if (local.syncStatus === "SYNCED") {
    if (remoto.version > local.version) {
      await tabela.put({ ...remoto, syncStatus: "SYNCED" });
      return { aplicado: true, conflito: false };
    }
    return { aplicado: false, conflito: false };
  }

  // Alteração local ainda não sincronizada + alteração remota = conflito real.
  if (remoto.version >= local.version && remoto.updatedAt !== local.updatedAt) {
    const jaRegistrado = await bancoLocal.conflitos
      .where("entityId")
      .equals(remoto.id)
      .filter((c) => !c.resolvido)
      .first();
    if (!jaRegistrado) {
      await bancoLocal.conflitos.add({
        id: novoId(),
        entity: entidade,
        entityId: remoto.id,
        unitId,
        detectadoEm: new Date().toISOString(),
        local,
        remoto,
        resolvido: false,
      });
      await tabela.put({ ...local, syncStatus: "CONFLICT" });
    }
    return { aplicado: false, conflito: true };
  }

  return { aplicado: false, conflito: false };
}

/* ------------------------------ execução ------------------------------ */

let rodando = false;

export async function sincronizar(
  provider: StorageProvider | null,
  chave: CryptoKey | null,
  unitId: string | null,
): Promise<ResultadoSync> {
  if (!unitId || !chave || !provider) {
    return { estado: "STORAGE_NOT_CONFIGURED", enviados: 0, recebidos: 0, conflitos: 0 };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { estado: "OFFLINE", enviados: 0, recebidos: 0, conflitos: 0 };
  }
  if (rodando) return { estado: "SYNCING", enviados: 0, recebidos: 0, conflitos: 0 };

  rodando = true;
  let recebidos = 0;
  let conflitos = 0;

  try {
    const dispositivo = await lerDispositivo().catch(() => null);
    if (dispositivo?.status === "revogado") {
      return { estado: "DEVICE_REVOKED", enviados: 0, recebidos: 0, conflitos: 0 };
    }

    /* 0) CÓPIA LOCAL: o celular sempre é atualizado antes da nuvem. */
    const { salvarCopiaLocalJson } = await import("./backup");
    await salvarCopiaLocalJson(unitId).catch(() => undefined);

    /* 1) ENVIO */
    const { envelope, ids } = await montarEnvelope(unitId);
    await bancoLocal.sync_queue.bulkPut(ids.map((o) => ({ ...o, status: "SYNCING" as const })));

    const pacote = await cifrar(chave, await comprimir(JSON.stringify(envelope)));
    await provider.enviar(nomeArquivo(unitId, deviceId()), JSON.stringify(pacote));

    const agora = new Date().toISOString();
    await bancoLocal.sync_queue.bulkPut(
      ids.map((o) => ({ ...o, status: "SYNCED" as const, lastError: null })),
    );
    for (const entidade of ENTIDADES) {
      const tabela = bancoLocal[entidade] as any;
      const meus: MetaRegistro[] = await tabela.where("unitId").equals(unitId).toArray();
      await tabela.bulkPut(
        meus
          .filter((r) => r.deviceId === deviceId() && r.syncStatus === "PENDING")
          .map((r) => ({ ...r, syncStatus: "SYNCED" })),
      );
    }

    /* 2) RECEBIMENTO (incremental: só pacotes de outros aparelhos).
     * Uma falha aqui não desfaz o envio: o pacote deste aparelho já está na nuvem. */
    try {
      const arquivos = await provider.listar(prefixo(unitId));
      for (const arquivo of arquivos) {
        if (arquivo.nome === nomeArquivo(unitId, deviceId())) continue;
        try {
          const bruto = await provider.baixar(arquivo.nome);
          if (!bruto) continue;
          const cifrado = JSON.parse(bruto) as PacoteCifrado;
          const conteudo = await decifrar<string>(chave, cifrado);
          const remotoEnvelope: Envelope = JSON.parse(await descomprimir(conteudo));
          if (remotoEnvelope.formato !== "ACS_BACKUP" || remotoEnvelope.version !== 1) continue;
          if (remotoEnvelope.unitId !== unitId) continue;
          for (const entidade of ENTIDADES) {
            for (const registro of remotoEnvelope.registros[entidade] || []) {
              const r = await aplicarRemoto(entidade, registro, unitId);
              if (r.aplicado) recebidos++;
              if (r.conflito) conflitos++;
            }
          }
        } catch {
          logTecnico("SYNC_FILE_INVALID", "package", arquivo.id);
        }
      }
    } catch {
      logTecnico("SYNC_RECEIVE_ERROR");
    }

    await bancoLocal.meta.put({ chave: "sync.ultima", valor: agora });
    await marcarSync(agora);

    return {
      estado: conflitos > 0 ? "CONFLICT" : "READY",
      enviados: ids.length,
      recebidos,
      conflitos,
    };
  } catch (erro: unknown) {
    // Retry com backoff progressivo — o usuário nunca perde dados.
    const fila = await bancoLocal.sync_queue.where("status").equals("SYNCING").toArray();
    await bancoLocal.sync_queue.bulkPut(
      fila.map((o) => {
        const tentativas = o.attempts + 1;
        return {
          ...o,
          attempts: tentativas,
          status: "FAILED" as const,
          nextAttemptAt: new Date(Date.now() + Math.min(2 ** tentativas, 60) * 1000).toISOString(),
          lastError: "sync_failed",
        };
      }),
    );
    logTecnico("SYNC_ERROR");
    return {
      estado: "SYNC_ERROR",
      enviados: 0,
      recebidos,
      conflitos,
      erro: mensagemSeguraDoErro(erro),
    };
  } finally {
    rodando = false;
  }
}

/* --------------------------- conflitos --------------------------- */

export async function resolverConflito(conflitoId: string, escolha: "local" | "remoto") {
  const conflito = await bancoLocal.conflitos.get(conflitoId);
  if (!conflito) return;
  const tabela = bancoLocal[conflito.entity] as any;
  const vencedor = escolha === "local" ? conflito.local : conflito.remoto;
  const base = escolha === "local" ? conflito.remoto : conflito.local;
  await tabela.put({
    ...vencedor,
    version: Math.max(conflito.local.version, conflito.remoto.version) + 1,
    updatedAt: new Date().toISOString(),
    deviceId: deviceId(),
    syncStatus: "PENDING",
  });
  await bancoLocal.conflitos.update(conflitoId, { resolvido: true, resolucao: escolha });
  logTecnico("SYNC_CONFLICT_RESOLVED", conflito.entity, conflito.entityId);
  void base;
}

export async function contarConflitos() {
  return bancoLocal.conflitos.filter((c) => !c.resolvido).count();
}
