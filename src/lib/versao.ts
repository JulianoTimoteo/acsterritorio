import { VERSAO_COMPILADA } from "./versao-atual";

/** Versão embutida nesta compilação do app. */
export const APP_VERSION: string = VERSAO_COMPILADA;

const CHAVE_VERSAO = "acs:versao";
const CHAVE_RECARGA = "acs:ultima-recarga";
/** Evita laço de recarga: no máximo uma atualização forçada por minuto. */
const INTERVALO_MINIMO = 60_000;

/** Lê a versão publicada no servidor, ignorando qualquer cache. */
export async function versaoPublicada(): Promise<string | null> {
  try {
    const resposta = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as { version?: string };
    return typeof dados.version === "string" ? dados.version : null;
  } catch {
    return null;
  }
}

/** Apaga caches do navegador e service workers antigos. */
async function limparCaches() {
  try {
    if ("caches" in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
    }
    if ("serviceWorker" in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map((r) => r.unregister()));
    }
  } catch {
    /* falha ao limpar cache não deve travar o app */
  }
}

/** Força o cliente a buscar a versão nova (limpa cache e recarrega). */
export async function forcarAtualizacao(versao?: string) {
  const agora = Date.now();
  const ultima = Number(localStorage.getItem(CHAVE_RECARGA) ?? 0);
  if (agora - ultima < INTERVALO_MINIMO) return;
  localStorage.setItem(CHAVE_RECARGA, String(agora));
  if (versao) localStorage.setItem(CHAVE_VERSAO, versao);
  await limparCaches();
  window.location.reload();
}

/**
 * Verifica se o servidor já tem uma versão diferente da que está rodando.
 * Retorna a versão nova quando houver divergência.
 */
export async function verificarVersao(): Promise<string | null> {
  const remota = await versaoPublicada();
  if (!remota) return null;
  if (remota === APP_VERSION) {
    localStorage.setItem(CHAVE_VERSAO, remota);
    return null;
  }
  return remota;
}

/**
 * Checagem feita no carregamento: se o código em execução é de uma versão
 * antiga (arquivo em cache), limpa tudo e recarrega automaticamente.
 */
export async function verificarVersaoNoCarregamento(): Promise<void> {
  const nova = await verificarVersao();
  if (nova) await forcarAtualizacao(nova);
}
