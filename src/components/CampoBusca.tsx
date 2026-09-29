import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Campo de busca com lupa e botão para limpar o texto. */
export function CampoBusca({
  valor,
  aoMudar,
  placeholder,
  className,
  rotulo = "Buscar",
}: {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  className?: string;
  rotulo?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={rotulo}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-11 pl-9 pr-9"
      />
      {valor && (
        <button
          type="button"
          onClick={() => aoMudar("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
