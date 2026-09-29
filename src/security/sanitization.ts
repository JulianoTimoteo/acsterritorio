/**
 * Sanitização de entradas. O app nunca usa innerHTML; ainda assim toda entrada
 * livre é normalizada antes de ir para o banco local ou para a sincronização.
 */

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function textoSeguro(valor: unknown, max = 500): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(CONTROLE, "").trim().slice(0, max);
}

export function textoSeguroOuNulo(valor: unknown, max = 500): string | null {
  const t = textoSeguro(valor, max);
  return t.length ? t : null;
}

/** Limpa recursivamente strings de um objeto de formulário. */
export function objetoSeguro<T extends Record<string, any>>(obj: T, max = 2000): T {
  const out: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = textoSeguro(v, max);
    else if (v && typeof v === "object" && !(v instanceof Date)) out[k] = objetoSeguro(v, max);
    else out[k] = v;
  }
  return out as T;
}

/**
 * Registro técnico sem dados sensíveis: apenas entidade e identificador técnico.
 * Ex.: logTecnico("SYNC_ERROR", "family", id)
 */
export function logTecnico(evento: string, entidade?: string, entidadeId?: string) {
  const partes = [evento];
  if (entidade) partes.push(`entity=${entidade}`);
  if (entidadeId) partes.push(`entityId=${entidadeId}`);
  // eslint-disable-next-line no-console
  console.info(partes.join(" "));
}
