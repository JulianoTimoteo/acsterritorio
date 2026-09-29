import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAcs } from "@/auth/AcsProvider";
import { DesbloquearUnidade } from "@/components/DesbloquearUnidade";
import { SyncStatus } from "@/components/SyncStatus";
import { logOut } from "@/lib/auth";

import {
  Activity,
  ArrowLeftRight,
  BellRing,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  CircleHelp,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
// Supabase import removed
import { Button } from "@/components/ui/button";
import { useEhAdmin } from "@/hooks/useAcesso";
import { SeloCampanha } from "@/components/SeloCampanha";
import { InstalarApp } from "@/components/InstalarApp";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";
import { TutorialPrimeiroUso } from "@/components/TutorialPrimeiroUso";
import { AlternarTema } from "@/components/AlternarTema";
import { abaLiberada } from "@/lib/abas";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Nota: TanStack Start processa beforeLoad antes da hidratação completa no cliente
    // Para Firebase (lado do cliente apenas), a verificação real de sessão ocorre no AuthenticatedLayout
    return {};
  },
  component: AuthenticatedLayout,
});

const LINKS = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/familias", label: "Famílias", icon: Users },
  { to: "/agenda", label: "Visitas", icon: CalendarCheck },
  { to: "/consultas", label: "Consultas", icon: ClipboardList },
  { to: "/mapa", label: "Mapa", icon: MapPin },
  { to: "/avisos", label: "Avisos", icon: BellRing },
  { to: "/transferencias", label: "Transferir", icon: ArrowLeftRight },
] as const;

/** Batimento cardíaco contínuo na aba aberta. */
const ABA_ATIVA = "text-primary bg-primary/5 font-bold aba-batendo";

function AuthenticatedLayout() {
  const {
    user,
    carregando: sessionLoading,
    perfil,
    chave,
    dispositivo,
    falhaPerfil,
    recarregarPerfil,
  } = useAcs();

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const carregandoPerfil = sessionLoading;
  const { data: ehAdmin } = useEhAdmin();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [abrirTutorial, setAbrirTutorial] = useState(0);

  useEffect(() => {
    if (!sessionLoading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, sessionLoading, navigate]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const todosLinks = ehAdmin
    ? [...LINKS, { to: "/admin", label: "Admin", icon: ShieldCheck } as const]
    : LINKS;
  // O administrador pode liberar apenas algumas abas para cada pessoa.
  const links = todosLinks.filter((l) => abaLiberada(perfil?.abas, l.to));

  // Bloqueia acesso direto (pelo endereço) a abas não liberadas ou administrativas.
  useEffect(() => {
    if (!perfil || !links.length) return;
    const caminho = location.pathname;
    const protegida = todosLinks.some((l) => caminho.startsWith(l.to)) || caminho.startsWith("/admin");
    const permitida = links.some((l) => caminho.startsWith(l.to));
    if (protegida && !permitida) navigate({ to: links[0].to, replace: true });
  }, [location.pathname, perfil, links, todosLinks, navigate]);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logOut();
    navigate({ to: "/auth", replace: true });
  }

  if (sessionLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <HeartbeatLoader size="lg" />
      </div>
    );
  }

  if (!carregandoPerfil && perfil && !perfil.aprovado && !ehAdmin) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center">
        <HeartbeatLoader size="lg" className="rounded-full bg-primary/5 p-8" />

        <div className="space-y-2">
          <h1 className="font-[Sora,sans-serif] text-2xl font-bold sm:text-3xl">
            Cadastro em análise
          </h1>
          <p className="mx-auto max-w-md text-base text-muted-foreground sm:text-lg">
            Sua conta foi criada com sucesso! O acesso aos dados dos pacientes será liberado após a
            aprovação de um administrador do território.
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={sair} className="min-w-32">
          <LogOut className="size-4" /> Sair
        </Button>
      </main>
    );
  }

  if (!user || !perfil) {
    if (user && falhaPerfil) {
      return (
        <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center">
          <ShieldCheck className="size-10 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="font-[Sora,sans-serif] text-2xl font-bold">Não foi possível abrir sua conta</h1>
            <p className="max-w-md text-muted-foreground">{falhaPerfil}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void recarregarPerfil()}>
              <RefreshCw className="size-4" /> Tentar novamente
            </Button>
            <Button variant="outline" onClick={sair}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </main>
      );
    }
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <HeartbeatLoader size="lg" />
      </div>
    );
  }

  if (dispositivo?.status === "revogado") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-[Sora,sans-serif] text-2xl font-bold">Aparelho bloqueado</h1>
        <p className="max-w-md text-muted-foreground">
          Este celular foi bloqueado por um administrador. Fale com a coordenação da sua unidade.
        </p>
        <Button variant="outline" onClick={sair}>
          <LogOut className="size-4" /> Sair
        </Button>
      </main>
    );
  }

  if (dispositivo?.status === "pendente") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <ShieldCheck className="size-10 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="font-[Sora,sans-serif] text-2xl font-bold">
            Aparelho aguardando liberação
          </h1>
          <p className="max-w-md text-muted-foreground">
            Um administrador da sua unidade precisa autorizar este aparelho antes do acesso aos
            dados.
          </p>
        </div>
        <Button variant="outline" onClick={sair}>
          <LogOut className="size-4" /> Sair
        </Button>
      </main>
    );
  }

  if (perfil && !chave) {
    return <DesbloquearUnidade onSair={sair} />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Banner de instalação PWA proativo em dispositivos móveis */}
      <div className="md:hidden">
        <InstalarApp
          className="w-full rounded-none border-x-0 border-t-0 bg-primary text-primary-foreground hover:bg-primary/90"
          rotulo="Instalar ACS Território no celular"
        />
      </div>

      <header className="vidro sticky top-0 z-30 rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)] hover:translate-y-0">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 md:flex md:justify-between">
          <Link
            to="/painel"
            className="flex min-w-0 items-center gap-2 font-[Sora,sans-serif] font-bold text-primary"
          >
            <Activity className="size-5 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm sm:text-base">ACS Território</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground",
                )}
                activeProps={{
                  className: `${ABA_ATIVA} shadow-[0_2px_0_0_currentColor]`,
                  "aria-current": "page",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <SyncStatus className="hidden md:flex" />
            <NotificationBell />
            <SeloCampanha compacto className="hidden lg:inline-flex" />
            <InstalarApp className="hidden sm:inline-flex" rotulo="Instalar" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAbrirTutorial((valor) => valor + 1)}
              aria-label="Abrir tutorial das abas"
              title="Tutorial das abas"
              className="min-h-11 min-w-11"
            >
              <CircleHelp className="size-5" aria-hidden="true" />
            </Button>
            <AlternarTema />
            <Button
              variant="ghost"
              size="sm"
              onClick={sair}
              aria-label="Sair da conta"
              className="min-h-11 px-2 sm:px-3"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6" id="main-content">
        <SyncStatus className="mb-3 md:hidden" />
        <div className="sm:hidden">
          <InstalarApp className="mb-4 w-full" size="default" rotulo="Instalar aplicativo" />
        </div>

        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <HeartbeatLoader size="lg" />
          </div>
        ) : (
          <div key={location.pathname} className="page-transition focus:outline-none" tabIndex={-1}>
            <Outlet />
          </div>
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navegação móvel"
      >
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="group relative flex min-h-[4rem] flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-2 text-[10px] leading-tight text-muted-foreground transition-all duration-300"
            activeProps={{
              className: ABA_ATIVA,
              "aria-current": "page",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-primary transition-transform duration-300 group-[.font-bold]:scale-x-100" />
            <l.icon
              className="size-5 shrink-0 transition-transform duration-300 group-active:scale-90 group-[.font-bold]:scale-110"
              aria-hidden="true"
            />
            <span className="w-full truncate px-0.5 text-center transition-transform duration-300 group-[.font-bold]:translate-y-[-1px]">
              {l.label}
            </span>
          </Link>
        ))}
      </nav>
      <TutorialPrimeiroUso abrirSolicitado={abrirTutorial} />
    </div>
  );
}
