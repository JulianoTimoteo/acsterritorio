/**
 * Criptografia do aplicativo — Web Crypto API (AES-GCM 256) + PBKDF2.
 *
 * Regras:
 * - Nenhuma chave fica no código, no Firebase ou em texto aberto.
 * - A chave é derivada da "senha da unidade", informada uma única vez por aparelho.
 * - A CryptoKey é guardada de forma NÃO extraível no IndexedDB: o aparelho
 *   continua abrindo os dados offline, mas a senha nunca é armazenada.
 * - Base64/btoa NÃO são usados como segurança (apenas como transporte de bytes).
 */

const PBKDF2_ITERACOES = 310_000;

export type PacoteCifrado = {
  /** versão do formato do pacote */
  v: 1;
  alg: "AES-GCM";
  iv: string; // base64 (transporte)
  data: string; // base64 (transporte)
  checksum: string; // sha-256 do texto claro, em hex
};

/* ---------- utilidades de transporte (não são segurança) ---------- */

function bytesParaBase64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ParaBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(texto: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- derivação de chave ---------- */

/**
 * Deriva a chave da unidade a partir da senha da unidade.
 * O "salt" é público (identificador da unidade) — a força vem da senha + PBKDF2.
 */
export async function derivarChaveDaUnidade(senha: string, unitId: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(`acs-unit-v1:${unitId}`),
      iterations: PBKDF2_ITERACOES,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false, // NÃO extraível
    ["encrypt", "decrypt"],
  );
}

/** Impressão digital pública da chave — permite validar a senha sem revelá-la. */
export async function impressaoDaChave(senha: string, unitId: string) {
  return sha256Hex(`acs-fingerprint-v1:${unitId}:${await sha256Hex(senha.normalize("NFKC"))}`);
}

/* ---------- criptografia de conteúdo ---------- */

export async function cifrar(chave: CryptoKey, valor: unknown): Promise<PacoteCifrado> {
  const texto = JSON.stringify(valor);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    new TextEncoder().encode(texto),
  );
  return {
    v: 1,
    alg: "AES-GCM",
    iv: bytesParaBase64(iv),
    data: bytesParaBase64(new Uint8Array(cifrado)),
    checksum: await sha256Hex(texto),
  };
}

export async function decifrar<T>(chave: CryptoKey, pacote: PacoteCifrado): Promise<T> {
  if (!pacote || pacote.v !== 1 || pacote.alg !== "AES-GCM") {
    throw new Error("Formato de arquivo incompatível.");
  }
  let claro: string;
  try {
    const buf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ParaBytes(pacote.iv) },
      chave,
      base64ParaBytes(pacote.data),
    );
    claro = new TextDecoder().decode(buf);
  } catch {
    throw new Error("Não foi possível abrir o arquivo: senha da unidade incorreta ou arquivo adulterado.");
  }
  if ((await sha256Hex(claro)) !== pacote.checksum) {
    throw new Error("Arquivo com integridade inválida. A importação foi cancelada.");
  }
  return JSON.parse(claro) as T;
}

export function novoId() {
  return crypto.randomUUID();
}
