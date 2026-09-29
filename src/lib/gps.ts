/**
 * Leitura de GPS com recalibragem: em vez de aceitar a primeira posição
 * (quase sempre imprecisa, vinda da antena ou do Wi-Fi), acompanha o aparelho
 * por alguns segundos e devolve a leitura com a melhor precisão.
 */
export type LeituraGps = {
  latitude: number;
  longitude: number;
  precisao: number;
  leituras: number;
};

export function gpsDisponivel() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function lerGps(
  { segundos = 10, precisaoDesejada = 12 }: { segundos?: number; precisaoDesejada?: number } = {},
  aoAtualizar?: (parcial: LeituraGps) => void,
): Promise<LeituraGps> {
  return new Promise((resolve, reject) => {
    if (!gpsDisponivel()) {
      reject(new Error("Este aparelho não oferece localização por GPS."));
      return;
    }

    let melhor: LeituraGps | null = null;
    let leituras = 0;
    let encerrado = false;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        leituras += 1;
        const atual: LeituraGps = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy ?? 9999,
          leituras,
        };
        if (!melhor || atual.precisao < melhor.precisao) melhor = atual;
        aoAtualizar?.({ ...melhor, leituras });
        if (melhor.precisao <= precisaoDesejada) finalizar();
      },
      (erro) => {
        if (melhor) return; // erros pontuais não invalidam boas leituras anteriores
        encerrar();
        reject(
          new Error(
            erro.code === erro.PERMISSION_DENIED
              ? "Permissão de localização negada. Libere o GPS para este site."
              : "Não foi possível ler o GPS agora. Saia de baixo de lajes e tente de novo.",
          ),
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: segundos * 1000 },
    );

    const tempo = window.setTimeout(finalizar, segundos * 1000);

    function encerrar() {
      if (encerrado) return;
      encerrado = true;
      window.clearTimeout(tempo);
      navigator.geolocation.clearWatch(id);
    }

    function finalizar() {
      if (encerrado) return;
      encerrar();
      if (melhor) resolve({ ...melhor, leituras });
      else reject(new Error("O GPS não respondeu a tempo. Tente novamente ao ar livre."));
    }
  });
}
