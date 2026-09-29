/**
 * Guarda da chave da unidade.
 * A CryptoKey derivada fica salva de forma NÃO extraível no IndexedDB, então
 * o aparelho abre os dados offline sem nunca armazenar a senha digitada.
 */
import { bancoLocal, lerMeta, gravarMeta } from "@/database/localDatabase";
import { derivarChaveDaUnidade, impressaoDaChave } from "@/security/crypto";

const CHAVE_KEY = "unit.key";
const CHAVE_FP = "unit.key.fingerprint";
const CHAVE_UNIT = "unit.key.unitId";

let emMemoria: CryptoKey | null = null;

export async function chaveAtual(unitId: string): Promise<CryptoKey | null> {
  if (emMemoria) return emMemoria;
  const salvaUnit = await lerMeta<string>(CHAVE_UNIT);
  if (salvaUnit !== unitId) return null;
  const chave = await lerMeta<CryptoKey>(CHAVE_KEY);
  emMemoria = chave ?? null;
  return emMemoria;
}

export async function impressaoLocal(): Promise<string | undefined> {
  return lerMeta<string>(CHAVE_FP);
}

/**
 * Desbloqueia (ou define) a chave da unidade neste aparelho.
 * Quando a unidade já possui impressão digital registrada, a senha é validada
 * contra ela — assim uma senha errada não corrompe o banco.
 */
export async function desbloquearUnidade(
  senha: string,
  unitId: string,
  impressaoEsperada?: string | null,
): Promise<{ chave: CryptoKey; impressao: string }> {
  if (senha.length < 8) throw new Error("A senha da unidade deve ter pelo menos 8 caracteres.");
  const impressao = await impressaoDaChave(senha, unitId);
  if (impressaoEsperada && impressao !== impressaoEsperada) {
    throw new Error("Senha da unidade incorreta.");
  }
  const chave = await derivarChaveDaUnidade(senha, unitId);
  emMemoria = chave;
  await gravarMeta(CHAVE_KEY, chave);
  await gravarMeta(CHAVE_FP, impressao);
  await gravarMeta(CHAVE_UNIT, unitId);
  return { chave, impressao };
}

/** Esquece a chave deste aparelho (os dados locais permanecem criptografados). */
export async function esquecerChave() {
  emMemoria = null;
  await bancoLocal.meta.bulkDelete([CHAVE_KEY, CHAVE_FP, CHAVE_UNIT]);
}
