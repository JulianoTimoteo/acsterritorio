/**
 * Alternador de tema claro/escuro. Guarda a escolha neste aparelho.
 */
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHAVE = "acs.tema";

export function AlternarTema({ className }: { className?: string }) {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE);
    const preferido =
      salvo === "escuro" ||
      (!salvo && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setEscuro(preferido);
    document.documentElement.classList.toggle("dark", preferido);
  }, []);

  function alternar() {
    const proximo = !escuro;
    setEscuro(proximo);
    document.documentElement.classList.toggle("dark", proximo);
    localStorage.setItem(CHAVE, proximo ? "escuro" : "claro");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={alternar}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className={cn("min-h-11 min-w-11", className)}
    >
      {escuro ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </Button>
  );
}
