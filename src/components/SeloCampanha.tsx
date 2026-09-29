import { Ribbon } from "lucide-react";
import { campanhaDoMes, MESES } from "@/lib/tema";
import { cn } from "@/lib/utils";

/** Selo da campanha de saúde do mês corrente. */
export function SeloCampanha({
  className,
  compacto = false,
}: {
  className?: string;
  compacto?: boolean;
}) {
  const campanha = campanhaDoMes();

  return (
    <div
      className={cn(
        "hover-lift inline-flex items-center gap-2 rounded-full border-2 border-primary-deep/40 bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-105",
        className,
      )}
      style={{ boxShadow: "var(--shadow-mes)" }}
      title={`${campanha.nome} — ${campanha.causa}`}
    >
      <Ribbon className="size-4 shrink-0" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-wide">{campanha.nome}</span>
      {!compacto && (
        <span className="hidden text-xs font-medium text-primary-foreground/85 sm:inline">
          · {campanha.causa}
        </span>
      )}
    </div>
  );
}

/** Faixa explicativa maior, para o topo do painel. */
export function FaixaCampanha({ className }: { className?: string }) {
  const campanha = campanhaDoMes();
  const mes = MESES[campanha.mes - 1];

  return (
    <section
      className={cn(
        "page-fade-in relative overflow-hidden rounded-2xl px-5 py-4 text-primary-foreground transition-all duration-500",
        className,
      )}
      style={{ backgroundImage: "var(--gradient-mes)", boxShadow: "var(--shadow-mes)" }}
    >
      <div className="relative flex items-center gap-3">
        <Ribbon className="size-6 shrink-0 opacity-90" aria-hidden />
        <div>
          <h2 className="font-[Sora,sans-serif] text-base font-semibold">{campanha.nome}</h2>
          <p className="text-sm opacity-85">
            Em {mes} o app veste a fita {campanha.fita.toLowerCase()} — {campanha.causa}.
          </p>
        </div>
      </div>
    </section>
  );
}
