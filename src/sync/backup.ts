/**
 * Cópias de segurança.
 * - Backup criptografado (mesmo formato do pacote de sincronização).
 * - Cópia local em JSON guardada no próprio aparelho: a base do celular é
 *   sempre atualizada primeiro e, quando houver internet, a nuvem recebe.
 */
import { bancoLocal, gravarMeta, lerMeta, type MetaRegistro } from "@/database/localDatabase";
import { cifrar, decifrar, type PacoteCifrado } from "@/security/crypto";
import { ENTIDADES } from "./syncEngine";
import { deviceId } from "@/devices/deviceManager";

export type CopiaJson = {
  formato: "ACS_JSON";
  version: 1;
  unitId: string;
  deviceId: string;
  createdAt: string;
  registros: Record<string, MetaRegistro[]>;
};

async function coletar(unitId: string) {
  const registros: Record<string, MetaRegistro[]> = {};
  for (const entidade of ENTIDADES) {
    registros[entidade] = await (bancoLocal[entidade] as any)
      .where("unitId")
      .equals(unitId)
      .toArray();
  }
  return registros;
}

export async function gerarBackup(chave: CryptoKey, unitId: string): Promise<Blob> {
  const pacote = await cifrar(chave, {
    formato: "ACS_BACKUP",
    version: 1,
    unitId,
    deviceId: deviceId(),
    createdAt: new Date().toISOString(),
    registros: await coletar(unitId),
  });
  return new Blob([JSON.stringify(pacote)], { type: "application/octet-stream" });
}

/** Cópia em JSON do banco do celular — fica guardada no próprio aparelho. */
export async function gerarCopiaJson(unitId: string): Promise<CopiaJson> {
  return {
    formato: "ACS_JSON",
    version: 1,
    unitId,
    deviceId: deviceId(),
    createdAt: new Date().toISOString(),
    registros: await coletar(unitId),
  };
}

const CHAVE_COPIA = "copia.json.local";

/** Guarda a cópia JSON no aparelho (usada antes de cada envio para a nuvem). */
export async function salvarCopiaLocalJson(unitId: string) {
  const copia = await gerarCopiaJson(unitId);
  await gravarMeta(CHAVE_COPIA, copia);
  return copia;
}

export async function lerCopiaLocalJson(): Promise<CopiaJson | undefined> {
  return lerMeta<CopiaJson>(CHAVE_COPIA);
}

export async function baixarCopiaJson(unitId: string) {
  const copia = await salvarCopiaLocalJson(unitId);
  return new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" });
}

export async function restaurarBackup(chave: CryptoKey, unitId: string, arquivo: File) {
  const texto = await arquivo.text();
  const bruto = JSON.parse(texto);
  const conteudo =
    bruto?.formato === "ACS_JSON" ? bruto : await decifrar<any>(chave, bruto as PacoteCifrado);
  if (
    (conteudo?.formato !== "ACS_BACKUP" && conteudo?.formato !== "ACS_JSON") ||
    conteudo.version !== 1
  ) {
    throw new Error("Arquivo de backup incompatível.");
  }
  if (conteudo.unitId !== unitId) {
    throw new Error("Este backup pertence a outra unidade.");
  }
  let importados = 0;
  for (const entidade of ENTIDADES) {
    const lista: MetaRegistro[] = conteudo.registros?.[entidade] || [];
    for (const registro of lista) {
      const atual = await (bancoLocal[entidade] as any).get(registro.id);
      if (!atual || registro.version > atual.version) {
        await (bancoLocal[entidade] as any).put({ ...registro, syncStatus: "PENDING" });
        importados++;
      }
    }
  }
  return importados;
}
