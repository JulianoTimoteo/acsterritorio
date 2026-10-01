import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Activity, Eye, EyeOff, Lock, Mail, Ribbon, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { signIn, signUp, resetPassword, signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { campanhaDoMes } from "@/lib/tema";
import { InstalarApp } from "@/components/InstalarApp";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";
import { useAcs } from "@/auth/AcsProvider";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ACS Território" },
      {
        name: "description",
        content: "Acesse sua conta de agente comunitário de saúde para gerir famílias e visitas.",
      },
      { property: "og:title", content: "Entrar — ACS Território" },
      {
        property: "og:description",
        content: "Acesse sua conta de agente comunitário de saúde para gerir famílias e visitas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, perfil, carregando: preparandoConta } = useAcs();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const campanha = campanhaDoMes();

  useEffect(() => {
    if (!preparandoConta && user && perfil) {
      toast.success(`Bem-vindo de volta, ${perfil.nome}!`, { duration: 3000 });
      navigate({ to: "/painel", replace: true });
    }
  }, [preparandoConta, user, perfil, navigate]);

  /** Traduz erros de autenticação para mensagens claras em português. */
  function mensagemErro(msg: string) {
    const m = (msg || "").toLowerCase();
    if (m.includes("network") || m.includes("failed to fetch"))
      return "Sem conexão com o servidor. Verifique sua internet e tente novamente em alguns instantes.";
    if (m.includes("user-not-found"))
      return 'Não existe conta com este e-mail neste aplicativo. Use "Criar conta" para cadastrá-la.';
    if (
      m.includes("wrong-password") ||
      m.includes("invalid-credential") ||
      m.includes("invalid login")
    )
      return 'E-mail ou senha incorretos. Se nunca criou a senha aqui, use "Esqueci minha senha".';
    if (m.includes("invalid-email")) return "E-mail inválido.";
    if (m.includes("too-many-requests"))
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    if (m.includes("email-already-in-use") || m.includes("already registered"))
      return "Este e-mail já possui conta. Faça login ou recupere a senha.";
    if (m.includes("weak-password") || m.includes("password"))
      return "A senha precisa ter ao menos 6 caracteres.";
    if (m.includes("operation-not-allowed"))
      return "O login por e-mail e senha está desativado no servidor. Entre com o Google.";
    if (m.includes("unauthorized-domain"))
      return "Este endereço do aplicativo ainda não está liberado para login. Peça ao responsável para autorizar o domínio nas configurações de acesso e tente novamente.";
    if (m.includes("popup-blocked"))
      return "O navegador bloqueou a janela do Google. Libere as janelas pop-up e tente de novo.";
    if (m.includes("popup-closed") || m.includes("cancelled-popup"))
      return "A janela do Google foi fechada antes de concluir a entrada.";
    return msg;
  }

  function mensagemDaExcecao(error: unknown) {
    if (error && typeof error === "object") {
      const dados = error as { code?: string; message?: string };
      return mensagemErro(dados.code || dados.message || "Falha na autenticação.");
    }
    return mensagemErro(String(error || "Falha na autenticação."));
  }

  /** Envia o e-mail com o link de criação de nova senha. */
  async function recuperarSenha() {
    if (!email.trim()) return toast.error("Digite seu e-mail para receber o link de recuperação.");
    setLoading(true);
    try {
      await resetPassword(email.trim());
      toast.success("Enviamos um link de recuperação para o seu e-mail.");
    } catch (error: unknown) {
      toast.error(mensagemDaExcecao(error));
    } finally {
      setLoading(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, senha);
    } catch (err: unknown) {
      toast.error(mensagemDaExcecao(err));
    } finally {
      setLoading(false);
    }
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, senha, nome);
      toast.success("Conta criada! Confirme o e-mail se for solicitado e faça login.");
    } catch (err: unknown) {
      toast.error(mensagemDaExcecao(err));
    } finally {
      setLoading(false);
    }
  }

  async function entrarComGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      toast.error(mensagemDaExcecao(err));
    } finally {
      setLoading(false);
    }
  }

  const [aba, setAba] = useState<"entrar" | "criar">("entrar");
  const [verSenha, setVerSenha] = useState(false);
  const ocupado = loading || !!(user && preparandoConta);
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const campo = (
    id: string,
    rotulo: string,
    Icone: typeof Mail,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    senhaCampo = false,
  ) => (
    <div className="group relative">
      <Icone
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
      <Input
        id={id}
        placeholder=" "
        {...props}
        type={senhaCampo ? (verSenha ? "text" : "password") : props.type}
        className="peer h-14 rounded-xl border-border/70 bg-background/60 pl-11 pr-11 pt-4 text-base backdrop-blur transition-all focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
      />
      <Label
        htmlFor={id}
        className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all peer-focus:top-3.5 peer-focus:text-[11px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[11px]"
      >
        {rotulo}
      </Label>
      {senhaCampo && (
        <button
          type="button"
          onClick={() => setVerSenha((v) => !v)}
          aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary"
        >
          {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  );

  const botaoPrincipal =
    "h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-mes)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]";

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary/40 to-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div variants={item}>
          <Link
            to="/"
            className="mb-4 flex items-center justify-center gap-2 font-[Sora,sans-serif] text-xl font-bold tracking-tight text-primary"
          >
            {loading ? <HeartbeatLoader size="sm" className="size-6" /> : <Activity aria-hidden className="size-6" />}
            ACS Território
          </Link>
        </motion.div>
        <motion.div variants={item} className="mb-6 flex justify-center">
          <div className="relative inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-primary shadow-[0_0_24px_-6px_var(--primary)] backdrop-blur">
            <Ribbon aria-hidden className="size-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{campanha.nome}</span>
            <span className="text-xs font-medium text-foreground/70">· {campanha.causa}</span>
          </div>
        </motion.div>

        <motion.section
          variants={item}
          className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          <motion.div variants={item} className="mb-6 text-center">
            <h1 className="font-[Sora,sans-serif] text-2xl font-bold tracking-tight sm:text-3xl">Acesso do agente</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Seus dados ficam visíveis somente para você.
            </p>
          </motion.div>

          <motion.div variants={item}>
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl border-border/70 bg-background/70 text-base font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
              onClick={entrarComGoogle}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="mr-1 size-5" aria-hidden>
                <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9l3.7-2.8z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4z" />
              </svg>
              {ocupado ? "Preparando sua conta…" : "Continuar com Google"}
            </Button>
          </motion.div>

          <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou use e-mail <span className="h-px flex-1 bg-border" />
          </div>

          <motion.div variants={item} role="tablist" className="relative mb-5 grid grid-cols-2 rounded-full bg-muted p-1">
            <motion.span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-md"
              animate={{ x: aba === "entrar" ? "0%" : "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
            {(["entrar", "criar"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={aba === v}
                onClick={() => setAba(v)}
                className={`relative z-10 min-h-11 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] ${aba === v ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {v === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {aba === "entrar" ? (
              <motion.form
                key="entrar"
                onSubmit={entrar}
                className="space-y-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                {campo("email", "E-mail", Mail, { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email" })}
                {campo("senha", "Senha", Lock, { required: true, value: senha, onChange: (e) => setSenha(e.target.value), autoComplete: "current-password" }, true)}
                <Button type="submit" className={botaoPrincipal} disabled={loading}>
                  {ocupado ? "Preparando sua conta…" : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={recuperarSenha}
                  disabled={loading}
                  className="w-full text-sm font-light text-primary underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="criar"
                onSubmit={cadastrar}
                className="space-y-4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {campo("nome", "Seu nome", User, { required: true, maxLength: 120, value: nome, onChange: (e) => setNome(e.target.value), autoComplete: "name" })}
                {campo("email2", "E-mail", Mail, { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email" })}
                {campo("senha2", "Senha (mín. 6 caracteres)", Lock, { required: true, minLength: 6, value: senha, onChange: (e) => setSenha(e.target.value), autoComplete: "new-password" }, true)}
                <Button type="submit" className={botaoPrincipal} disabled={loading}>
                  {loading ? "Criando conta…" : "Criar conta"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.div variants={item} className="mt-4 flex justify-center">
          <InstalarApp size="default" rotulo="Instalar aplicativo no celular" className="w-full" />
        </motion.div>
      </motion.div>
    </main>
  );
}
