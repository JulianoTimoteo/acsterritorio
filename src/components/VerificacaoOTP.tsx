/**
 * Verificação por código de 4 dígitos, em vidro (glassmorphism),
 * com animações Framer Motion e três estados: digitação, verificando e verificado.
 * Modular: basta informar `aoVerificar` (retorna true/false) e, se quiser, `aoConcluir`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type EstadoOTP = "digitando" | "verificando" | "verificado" | "erro";

type Props = {
  /** Quantidade de casas do código. Padrão: 4. */
  digitos?: number;
  titulo?: string;
  descricao?: string;
  className?: string;
  /** Deve devolver true quando o código está correto. */
  aoVerificar: (codigo: string) => Promise<boolean> | boolean;
  /** Chamado logo após a animação de sucesso. */
  aoConcluir?: (codigo: string) => void;
};

export function VerificacaoOTP({
  digitos = 4,
  titulo = "Confirme o código",
  descricao = "Digite o código de 4 dígitos que enviamos para você.",
  className,
  aoVerificar,
  aoConcluir,
}: Props) {
  const [valores, setValores] = useState<string[]>(() => Array(digitos).fill(""));
  const [estado, setEstado] = useState<EstadoOTP>("digitando");
  const campos = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setValores(Array(digitos).fill(""));
    setEstado("digitando");
  }, [digitos]);

  const verificar = useCallback(
    async (codigo: string) => {
      setEstado("verificando");
      try {
        const ok = await aoVerificar(codigo);
        setEstado(ok ? "verificado" : "erro");
        if (ok) window.setTimeout(() => aoConcluir?.(codigo), 900);
      } catch {
        setEstado("erro");
      }
    },
    [aoVerificar, aoConcluir],
  );

  function escrever(indice: number, bruto: string) {
    const apenasNumeros = bruto.replace(/\D/g, "");
    if (!apenasNumeros) return;
    const proximos = [...valores];
    for (let i = 0; i < apenasNumeros.length && indice + i < digitos; i += 1) {
      proximos[indice + i] = apenasNumeros[i]!;
    }
    setValores(proximos);
    if (estado === "erro") setEstado("digitando");
    const destino = Math.min(indice + apenasNumeros.length, digitos - 1);
    campos.current[destino]?.focus();
    const completo = proximos.join("");
    if (completo.length === digitos && !proximos.includes("")) void verificar(completo);
  }

  function teclar(indice: number, tecla: string) {
    if (tecla === "Backspace") {
      const proximos = [...valores];
      if (proximos[indice]) proximos[indice] = "";
      else if (indice > 0) {
        proximos[indice - 1] = "";
        campos.current[indice - 1]?.focus();
      }
      setValores(proximos);
      if (estado === "erro") setEstado("digitando");
    }
    if (tecla === "ArrowLeft" && indice > 0) campos.current[indice - 1]?.focus();
    if (tecla === "ArrowRight" && indice < digitos - 1) campos.current[indice + 1]?.focus();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("vidro w-full max-w-sm rounded-2xl p-6 text-center", className)}
    >
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ShieldCheck className="size-5" />
      </div>
      <h3 className="font-[Sora,sans-serif] text-lg font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>

      <AnimatePresence mode="wait" initial={false}>
        {estado === "verificado" ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mt-7 flex flex-col items-center gap-3"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 14 }}
              >
                <Check className="size-8" strokeWidth={3} />
              </motion.span>
            </span>
            <p className="text-sm font-semibold text-foreground">Verificado com sucesso</p>
          </motion.div>
        ) : estado === "verificando" ? (
          <motion.div
            key="carregando"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-7 flex flex-col items-center gap-3"
          >
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando…</p>
          </motion.div>
        ) : (
          <motion.div
            key="campos"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: estado === "erro" ? [0, -8, 8, -5, 0] : 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6"
          >
            <div className="flex justify-center gap-3">
              {valores.map((v, i) => (
                <motion.input
                  key={i}
                  ref={(el) => {
                    campos.current[i] = el;
                  }}
                  value={v}
                  onChange={(e) => escrever(i, e.target.value)}
                  onKeyDown={(e) => teclar(i, e.key)}
                  onFocus={(e) => e.currentTarget.select()}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`Dígito ${i + 1}`}
                  maxLength={digitos}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  whileFocus={{ scale: 1.06 }}
                  className={cn(
                    "vidro-campo size-14 rounded-xl text-center font-[Sora,sans-serif] text-2xl font-semibold text-foreground outline-none",
                    estado === "erro" && "border-destructive/60",
                  )}
                />
              ))}
            </div>
            {estado === "erro" ? (
              <p className="mt-4 text-sm font-medium text-destructive">
                Código incorreto. Tente novamente.
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default VerificacaoOTP;
