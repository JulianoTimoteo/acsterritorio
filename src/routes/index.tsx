/**
 * https://github.com/JulianoTimoteo/agroflux
 * Aplicativo ACS Território conectado exclusivamente ao Firebase oficial.
 */
import { createFileRoute, Link } from "@tanstack/react-router";

import { Activity, CalendarCheck, ClipboardList, MapPin, BellRing, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/hooks/useSession";
import { SeloCampanha } from "@/components/SeloCampanha";
import { InstalarApp } from "@/components/InstalarApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACS Território — app do agente comunitário de saúde" },
      {
        name: "description",
        content:
          "Cadastre famílias e moradores, organize visitas domiciliares, veja o mapa da sua área e receba avisos 48h e 24h antes das consultas.",
      },
      { property: "og:title", content: "ACS Território — app do agente comunitário de saúde" },
      {
        property: "og:description",
        content:
          "Cadastre famílias e moradores, organize visitas domiciliares, veja o mapa da sua área e receba avisos 48h e 24h antes das consultas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const RECURSOS = [
  {
    icon: Users,
    titulo: "Cadastro de famílias",
    texto: "Rua, número, bairro, telefone, moradores, condições de saúde e observações.",
  },
  {
    icon: CalendarCheck,
    titulo: "Agenda de visitas",
    texto: "Programe as visitas domiciliares e registre tudo o que já foi realizado.",
  },
  {
    icon: MapPin,
    titulo: "Mapa da área",
    texto: "Veja seus domicílios no mapa, com destaque para as famílias de maior risco.",
  },
  {
    icon: ClipboardList,
    titulo: "Consultas e exames",
    texto: "Datas de exames, especialidade, local e situação de cada agendamento.",
  },
  {
    icon: BellRing,
    titulo: "Avisos 48h e 24h",
    texto: "O painel alerta com antecedência para você lembrar o paciente a tempo.",
  },
  {
    icon: Activity,
    titulo: "Indicadores do território",
    texto: "Gestantes, idosos, acamados e hipertensos contados automaticamente.",
  },
];

function Index() {
  const { user } = useSession();

  return (
    <main className="min-h-[100dvh] bg-background">
      <InstalarApp
        className="w-full rounded-none border-x-0 border-t-0 bg-primary text-primary-foreground hover:bg-primary/90 md:hidden"
        rotulo="Instalar ACS Território no celular"
      />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <span className="flex items-center gap-2 font-[Sora,sans-serif] text-lg font-bold text-primary">
            <Activity className="size-5" /> ACS Território
          </span>
          <div className="flex items-center gap-3">
            <SeloCampanha compacto className="hidden sm:inline-flex" />
            <Button asChild size="sm">
              <Link to={user ? "/painel" : "/auth"}>{user ? "Abrir painel" : "Entrar"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-16">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="inline-block rounded-full border-2 border-primary-deep/40 bg-primary px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            Feito para o dia a dia na comunidade
          </p>
          <SeloCampanha className="sm:hidden" compacto />
        </div>
        <h1 className="max-w-3xl font-[Sora,sans-serif] text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
          Todo o seu território de saúde organizado em um único aplicativo
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:mt-5 sm:text-lg">
          Cadastre as famílias da sua micro-área, agende e registre visitas, acompanhe consultas e
          exames e receba avisos com 48 e 24 horas de antecedência.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={user ? "/painel" : "/auth"}>
              {user ? "Ir para o painel" : "Começar agora"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
          <InstalarApp
            size="lg"
            variant="secondary"
            rotulo="Instalar aplicativo"
            className="w-full sm:w-auto"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r) => (
            <Card key={r.titulo} className="border-border/70">
              <CardContent className="pt-6">
                <r.icon className="size-6 text-primary" />
                <h2 className="mt-4 font-[Sora,sans-serif] text-base font-semibold">{r.titulo}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{r.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        ACS Território — apoio ao trabalho do agente comunitário de saúde.
      </footer>
    </main>
  );
}
