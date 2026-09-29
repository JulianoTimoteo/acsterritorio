import { useState } from "react";
import { Activity, Eye, EyeOff, KeyRound, Lock, LogOut, Ribbon } from "lucide-react";
import { campanhaDoMes } from "@/lib/tema";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Senha da unidade: transforma-se na chave que protege os dados no aparelho e
 * na nuvem. Nunca é enviada a nenhum servidor — só a "impressão digital" dela.
 */
export function DesbloquearUnidade({ onSair }: { onSair: () => void }) {
  const { desbloquear, perfil } = useAcs();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("Use uma senha com pelo menos 8 caracteres.");
    if (confirmar && senha !== confirmar) return toast.error("As senhas não conferem.");
    setCarregando(true);
    try {
      await desbloquear(senha);
      toast.success("Aparelho liberado.");
    } catch (erro: any) {
      toast.error(erro?.message || "Senha da unidade incorreta.");
    } finally {
      setCarregando(false);
      setSenha("");
      setConfirmar("");
    }
  }

  const [ver, setVer] = useState(false);
  const campanha = campanhaDoMes();
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };
  const campo = (id: string, rotulo: string, valor: string, set: (v: string) => void) => (
    <div className="group relative">
      <Lock aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <Input
        id={id}
        placeholder=" "
        type={ver ? "text" : "password"}
        autoComplete="off"
        value={valor}
        onChange={(e) => set(e.target.value)}
        className="peer h-14 rounded-xl border-border/70 bg-background/60 pl-11 pr-11 pt-4 text-base backdrop-blur transition-all focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
      />
      <Label htmlFor={id} className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all peer-focus:top-3.5 peer-focus:text-[11px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[11px]">
        {rotulo}
      </Label>
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary">
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary/40 to-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="relative z-10 w-full max-w-md">
        <motion.div variants={item} className="mb-4 flex items-center justify-center gap-2 font-[Sora,sans-serif] text-xl font-bold tracking-tight text-primary">
          <Activity aria-hidden className="size-6" /> ACS Território
        </motion.div>
        <motion.div variants={item} className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-primary shadow-[0_0_24px_-6px_var(--primary)] backdrop-blur">
            <Ribbon aria-hidden className="size-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{campanha.nome}</span>
            <span className="text-xs font-medium text-foreground/70">· {campanha.causa}</span>
          </div>
        </motion.div>
        <motion.form variants={item} onSubmit={enviar} className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-2 text-center">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <KeyRound className="size-6" />
            </span>
            <h1 className="font-[Sora,sans-serif] text-2xl font-bold tracking-tight sm:text-3xl">Senha da equipe</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ela protege os dados dos moradores neste aparelho e nas cópias de segurança. Use a mesma
              senha em todos os celulares da sua equipe{perfil?.unidade ? ` (${perfil.unidade})` : ""}.
              Guarde bem: sem ela, nem nós conseguimos abrir os dados.
            </p>
          </div>
          {campo("senha-unidade", "Senha da equipe (mín. 8 caracteres)", senha, setSenha)}
          {campo("senha-unidade-2", "Repita (apenas na primeira vez)", confirmar, setConfirmar)}
          <Button type="submit" disabled={carregando} className="h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-mes)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]">
            {carregando ? "Verificando…" : "Liberar aparelho"}
          </Button>
          <button type="button" onClick={onSair} className="flex w-full items-center justify-center gap-2 text-sm font-light text-primary underline-offset-4 hover:underline">
            <LogOut className="size-4" /> Sair
          </button>
        </motion.form>
      </motion.div>
    </main>
  );
}
