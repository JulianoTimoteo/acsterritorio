import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Search, Share2, Loader2, LocateFixed } from "lucide-react";
import type { Family, RiscoNivel } from "@/lib/acs";
import { fullAddress, buscarLocalLivre, enderecoDeCoordenadas } from "@/lib/acs";

const CORES: Record<RiscoNivel, string> = {
  baixo: "#0f9b8e",
  medio: "#e0a800",
  alto: "#d64545",
};

function icone(risco: RiscoNivel) {
  const cor = CORES[risco] ?? CORES.baixo;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${cor};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function iconeEu() {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.25)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function iconeBusca() {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#7c3aed;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 16],
  });
}

export default function MapView({ families }: { families: Family[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.LayerGroup | null>(null);
  const buscaRef = useRef<L.LayerGroup | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [semPermissao, setSemPermissao] = useState(false);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ rotulo: string } | null>(null);
  const [semResultado, setSemResultado] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([-14.235, -51.925], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    meRef.current = L.layerGroup().addTo(map);
    buscaRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /**
   * Localização: nunca desiste. Se o GPS demorar ou falhar, tenta de novo
   * automaticamente a cada 30 segundos, sem mostrar erro de tempo esgotado.
   */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let watchId: number | null = null;
    let cancelado = false;

    const guardar = (p: GeolocationPosition) => {
      if (cancelado) return;
      setSemPermissao(false);
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? 0 });
    };

    const tentar = () => {
      if (cancelado) return;
      navigator.geolocation.getCurrentPosition(
        guardar,
        (e) => {
          if (e.code === e.PERMISSION_DENIED) setSemPermissao(true);
          // Tempo esgotado ou sinal fraco: apenas tenta de novo no próximo ciclo.
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 25000 },
      );
    };

    watchId = navigator.geolocation.watchPosition(
      guardar,
      (e) => {
        if (e.code === e.PERMISSION_DENIED) setSemPermissao(true);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 25000 },
    );
    tentar();
    const ciclo = window.setInterval(tentar, 30000);

    return () => {
      cancelado = true;
      window.clearInterval(ciclo);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Endereço da minha localização (atualiza quando eu me movo mais de ~30 m)
  const ultimoGeo = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!pos) return;
    const ant = ultimoGeo.current;
    const longe =
      !ant || Math.abs(ant.lat - pos.lat) > 0.0003 || Math.abs(ant.lng - pos.lng) > 0.0003;
    if (!longe) return;
    ultimoGeo.current = { lat: pos.lat, lng: pos.lng };
    let ativo = true;
    void enderecoDeCoordenadas(pos.lat, pos.lng).then((e) => {
      if (ativo && e) setEndereco(e);
    });
    return () => {
      ativo = false;
    };
  }, [pos]);

  // Marcador da minha localização
  useEffect(() => {
    const layer = meRef.current;
    if (!layer || !pos) return;
    layer.clearLayers();
    L.circle([pos.lat, pos.lng], {
      radius: Math.max(pos.acc, 15),
      color: "#2563eb",
      weight: 1,
      fillColor: "#2563eb",
      fillOpacity: 0.15,
    }).addTo(layer);
    L.marker([pos.lat, pos.lng], { icon: iconeEu() })
      .bindPopup("<strong>Você está aqui</strong>")
      .addTo(layer);
  }, [pos]);

  const enquadrar = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = families
      .filter((f) => f.latitude != null && f.longitude != null)
      .map((f) => [f.latitude as number, f.longitude as number]);
    if (pos) pts.push([pos.lat, pos.lng]);
    if (!pts.length) return;
    if (pts.length === 1) map.setView(pts[0], 16);
    else map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  }, [families, pos]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pontos = families.filter((f) => f.latitude != null && f.longitude != null);
    pontos.forEach((f) => {
      const popup = L.DomUtil.create("div");
      const title = L.DomUtil.create("strong", "", popup);
      title.textContent = f.nome;
      popup.appendChild(L.DomUtil.create("br", "", popup));
      popup.appendChild(document.createTextNode(fullAddress(f)));
      if (f.telefone) {
        popup.appendChild(L.DomUtil.create("br", "", popup));
        popup.appendChild(document.createTextNode(f.telefone));
      }

      L.marker([f.latitude as number, f.longitude as number], {
        icon: icone((f.risco || "baixo") as RiscoNivel),
      })
        .bindPopup(popup)
        .addTo(layer);
    });
    enquadrar();
  }, [families, enquadrar]);

  async function procurar(e: React.FormEvent) {
    e.preventDefault();
    const q = termo.trim();
    if (q.length < 3) return;
    setBuscando(true);
    setSemResultado(false);
    try {
      const achados = await buscarLocalLivre(q);
      const layer = buscaRef.current;
      if (!achados.length || !layer || !mapRef.current) {
        setResultado(null);
        setSemResultado(true);
        return;
      }
      const melhor = achados[0];
      layer.clearLayers();
      L.marker([melhor.latitude, melhor.longitude], { icon: iconeBusca() })
        .bindPopup(`<strong>${q}</strong><br/>${melhor.rotulo}`)
        .addTo(layer)
        .openPopup();
      mapRef.current.setView([melhor.latitude, melhor.longitude], 18);
      setResultado({ rotulo: melhor.rotulo });
    } finally {
      setBuscando(false);
    }
  }

  const linkMapa = pos
    ? `https://www.google.com/maps?q=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`
    : "";

  function compartilhar() {
    if (!pos) return;
    const texto = `Minha localização: ${endereco ?? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`}\n${linkMapa}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={procurar} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar endereço no mapa: Ricieire Gamboni, 72, Jardim Canadá"
            className="vidro-campo h-11 w-full rounded-xl border pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={buscando}
          className="inline-flex h-11 items-center gap-2 rounded-xl border bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Buscar
        </button>
      </form>
      {resultado && (
        <p className="text-xs text-muted-foreground">
          Local encontrado: <span className="text-foreground">{resultado.rotulo}</span>
        </p>
      )}
      {semResultado && (
        <p className="text-xs text-muted-foreground">
          Não encontramos esse endereço. Tente com a cidade no final, por exemplo “Ricieire Gamboni,
          72, Jardim Canadá, Santa Vitória”.
        </p>
      )}

      <div ref={ref} className="h-[clamp(280px,55dvh,620px)] w-full rounded-xl border" />

      <div className="rounded-xl border bg-card/60 px-4 py-3 text-sm">
        <p className="flex items-start gap-2">
          <LocateFixed className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">
              Sua localização agora
            </span>
            {pos ? (
              <span className="block">
                {endereco ?? "Procurando o endereço…"}
                <span className="block text-xs text-muted-foreground">
                  {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)} • precisão {Math.round(pos.acc)} m
                </span>
              </span>
            ) : (
              <span className="block animate-pulse text-muted-foreground">
                {semPermissao
                  ? "Libere a localização nas configurações do navegador para ver seu endereço."
                  : "Procurando o sinal do GPS… tentando de novo automaticamente."}
              </span>
            )}
          </span>
        </p>
        {pos && (
          <button
            type="button"
            onClick={compartilhar}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            <Share2 className="size-4" /> Compartilhar no WhatsApp
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            if (pos) mapRef.current?.setView([pos.lat, pos.lng], 17);
          }}
          disabled={!pos}
          className="rounded-md border px-2 py-1 font-medium text-foreground disabled:opacity-50"
        >
          Minha localização
        </button>
        <button
          type="button"
          onClick={enquadrar}
          className="rounded-md border px-2 py-1 font-medium text-foreground"
        >
          Ver toda a área
        </button>
      </div>
    </div>
  );
}
