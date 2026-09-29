import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão das páginas: mesmo tamanho de título, mesma distância
 * entre os elementos e um espaço fixo à direita para o botão principal.
 */
export function PageHeader({
  titulo,
  descricao,
  icone: Icone,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icone && (
          <span
            aria-hidden="true"
            className="mt-0.5 hidden shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary sm:inline-flex"
          >
            <Icone className="size-5" />
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="font-[Sora,sans-serif] text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {titulo}
          </h1>
          {descricao && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              {descricao}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
      )}
    </header>
  );
}
