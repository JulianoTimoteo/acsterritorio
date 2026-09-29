import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estado vazio amigável: ícone, explicação curta e, quando útil, uma ação. */
export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  children,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      {Icone && (
        <span aria-hidden="true" className="rounded-full bg-primary/10 p-3 text-primary">
          <Icone className="size-6" />
        </span>
      )}
      <p className="font-[Sora,sans-serif] text-base font-semibold text-foreground">{titulo}</p>
      {descricao && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{descricao}</p>
      )}
      {children && <div className="pt-1">{children}</div>}
    </div>
  );
}
