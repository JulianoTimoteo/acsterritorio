/**
 * Mini mapa usado no cadastro da família: mostra o ponto encontrado
 * e permite arrastar o marcador até a porta exata da casa.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";

export default function MiniMapa({
  latitude,
  longitude,
  onMover,
}: {
  latitude: number;
  longitude: number;
  onMover: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const moverRef = useRef(onMover);
  moverRef.current = onMover;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { attributionControl: true }).setView([latitude, longitude], 18);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      className: "",
      html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:#0f9b8e;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const marker = L.marker([latitude, longitude], { draggable: true, icon }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      moverRef.current(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      moverRef.current(e.latlng.lat, e.latlng.lng);
    });
    markerRef.current = marker;
    mapRef.current = map;
    // Garante o desenho correto quando o mapa abre dentro de uma janela.
    setTimeout(() => map.invalidateSize(), 120);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 17));
  }, [latitude, longitude]);

  return <div ref={ref} className="h-52 w-full overflow-hidden rounded-lg border" />;
}
