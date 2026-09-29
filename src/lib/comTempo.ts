/** Limita o tempo de espera de uma consulta de rede (evita login travado em internet fraca). */
export const LIMITE_CONSULTA_MS = 8000;

export function comTempo<T>(promessa: Promise<T>, ms = LIMITE_CONSULTA_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("tempo-esgotado")), ms);
    promessa.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}
