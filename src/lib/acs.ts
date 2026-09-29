import { auth } from "./firebase";
import type { Family, Resident, Visit, Appointment } from "./database";
export type { Family, Resident, Visit, Appointment };




export const RISCOS = ["baixo", "medio", "alto"] as const;
export type RiscoNivel = (typeof RISCOS)[number];

export const RISCO_LABEL: Record<RiscoNivel, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
};

export const TIPOS = [
  { value: "consulta", label: "Consulta médica" },
  { value: "exame", label: "Exame" },
  { value: "vacina", label: "Vacina" },
  { value: "odontologia", label: "Odontologia" },
  { value: "outro", label: "Outro" },
];

export const CONDICOES = [
  "Hipertensão",
  "Diabetes",
  "Asma",
  "Tuberculose",
  "Hanseníase",
  "Saúde mental",
  "Deficiência",
  "Idoso",
  "Criança < 2 anos",
  "Obesidade",
  "Desnutrição",
  "Cardiopatia",
  "AVC (sequelas)",
  "Doença renal",
  "Doença respiratória (DPOC)",
  "Câncer em tratamento",
  "Epilepsia",
  "HIV/Aids",
  "Dependência química",
  "Alcoolismo",
  "Tabagismo",
  "Puérpera",
  "Uso contínuo de medicação",
  "Vacinação em atraso",
];

export async function currentUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sessão expirada. Entre novamente.");
  return user.uid;
}


export function fullAddress(f: Family) {
  return [
    [f.logradouro, f.numero].filter(Boolean).join(", "),
    f.complemento,
    f.bairro,
    f.cidade,
    f.cep,
  ]
    .filter(Boolean)
    .join(" - ");
}

/** Janela de aviso: 48h e 24h antes do compromisso. */
export type AvisoNivel = "48h" | "24h" | "agora" | null;

export function avisoDe(dataHora: string): AvisoNivel {
  const diffH = (new Date(dataHora).getTime() - Date.now()) / 3_600_000;
  if (diffH < 0) return null;
  if (diffH <= 3) return "agora";
  if (diffH <= 24) return "24h";
  if (diffH <= 48) return "48h";
  return null;
}

export const AVISO_LABEL: Record<string, string> = {
  "48h": "Faltam menos de 48 horas",
  "24h": "Faltam menos de 24 horas",
  agora: "É hoje, nas próximas horas",
};

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function toInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function idade(dataNascimento?: string | null) {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return anos;
}

export type LocalEncontrado = {
  latitude: number;
  longitude: number;
  rotulo: string;
};

/** Consulta gratuita de CEP (ViaCEP) — devolve rua, bairro e cidade. */
export async function buscarCep(cep: string) {
  const limpo = (cep || "").replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
  if (!res.ok) return null;
  const j = (await res.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (j.erro) return null;
  return {
    logradouro: j.logradouro || "",
    bairro: j.bairro || "",
    cidade: j.localidade ? `${j.localidade}${j.uf ? " - " + j.uf : ""}` : "",
  };
}

async function nominatim(params: Record<string, string>): Promise<LocalEncontrado[]> {
  const busca = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
    countrycodes: "br",
    ...params,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${busca.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Não foi possível localizar o endereço.");
  const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return json.map((r) => ({
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    rotulo: r.display_name,
  }));
}

/**
 * Procura o endereço gratuitamente no OpenStreetMap (Nominatim).
 * Tenta primeiro com rua e número; se não achar, afrouxa a busca.
 */
export async function procurarEndereco(dados: {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
}): Promise<LocalEncontrado[]> {
  const rua = [dados.logradouro, dados.numero].filter(Boolean).join(", ");
  const cidade = dados.cidade || "";
  const cepLimpo = (dados.cep || "").replace(/\D/g, "");

  const tentativas: Record<string, string>[] = [];
  if (rua && cidade) tentativas.push({ street: rua, city: cidade, country: "Brasil" });
  if (cepLimpo.length === 8 && rua)
    tentativas.push({ street: rua, postalcode: cepLimpo, country: "Brasil" });
  const livre = [dados.logradouro, dados.numero, dados.bairro, dados.cidade, dados.cep]
    .filter(Boolean)
    .join(", ");
  if (livre) tentativas.push({ q: `${livre}, Brasil` });
  if (cepLimpo.length === 8) tentativas.push({ postalcode: cepLimpo, country: "Brasil" });

  for (const t of tentativas) {
    const r = await nominatim(t).catch(() => [] as LocalEncontrado[]);
    if (r.length) return r;
  }
  return [];
}

/** Compatibilidade: devolve apenas o primeiro resultado. */
export async function geocodeAddress(query: string) {
  const r = await nominatim({ q: query });
  if (!r.length) return null;
  return { latitude: r[0].latitude, longitude: r[0].longitude };
}

/** Busca livre no mapa: aceita "Rua Ricieire Gamboni, 72, Jardim Canadá". */
export async function buscarLocalLivre(texto: string): Promise<LocalEncontrado[]> {
  const q = (texto || "").trim();
  if (q.length < 3) return [];
  const tentativas: Record<string, string>[] = [
    { q: `${q}, Brasil` },
    { q },
  ];
  const partes = q.split(",").map((p) => p.trim()).filter(Boolean);
  if (partes.length > 1) tentativas.push({ q: `${partes[0]}, ${partes[partes.length - 1]}, Brasil` });
  if (partes.length) tentativas.push({ q: `${partes[0]}, Brasil` });
  for (const t of tentativas) {
    const r = await nominatim(t).catch(() => [] as LocalEncontrado[]);
    if (r.length) return r;
  }
  return [];
}

/** Converte coordenadas em endereço legível (OpenStreetMap). */
export async function enderecoDeCoordenadas(lat: number, lng: number): Promise<string | null> {
  const p = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${p.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as { display_name?: string } | null;
  return j?.display_name ?? null;
}
