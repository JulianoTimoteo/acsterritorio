/** Abas do aplicativo — usadas na navegação e na liberação de acesso por pessoa. */
export const ABAS = [
  { to: "/painel", label: "Painel" },
  { to: "/familias", label: "Famílias" },
  { to: "/agenda", label: "Visitas" },
  { to: "/consultas", label: "Consultas" },
  { to: "/mapa", label: "Mapa" },
  { to: "/avisos", label: "Avisos" },
  { to: "/transferencias", label: "Transferir" },
  { to: "/admin", label: "Admin" },
] as const;

export type AbaCaminho = (typeof ABAS)[number]["to"];

/** Quando a pessoa não tem lista própria, ela enxerga todas as abas do seu perfil. */
export function abaLiberada(abas: string[] | null | undefined, caminho: string) {
  if (!abas || abas.length === 0) return true;
  return abas.includes(caminho);
}
