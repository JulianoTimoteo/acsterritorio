import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Home,
  Users,
  HeartPulse,
  Baby,
  Accessibility,
  LayoutDashboard,
} from "lucide-react";
import { useAppointments, useFamilies, useResidents, useVisits } from "@/hooks/useAcsData";
import { AvisosCard } from "@/components/Avisos";
import { FaixaCampanha } from "@/components/SeloCampanha";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, idade } from "@/lib/acs";
import { useAcsMutations } from "@/hooks/useAcsData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import { FilaVisitasMes } from "@/components/FilaVisitasMes";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel do agente — ACS Território" },
      {
        name: "description",
        content: "Resumo do território: famílias, visitas do dia e avisos de consultas.",
      },
      { property: "og:title", content: "Painel do agente — ACS Território" },
      { property: "og:description", content: "Resumo do território e avisos de consultas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: families = [], isLoading: loadingFamilies } = useFamilies();
  const { data: residents = [], isLoading: loadingResidents } = useResidents();
  const { data: visits = [], isLoading: loadingVisits } = useVisits();
  const { data: appointments = [], isLoading: loadingAppointments } = useAppointments();
  const { atualizarVisita } = useAcsMutations();

  if (loadingFamilies || loadingResidents || loadingVisits || loadingAppointments) {
    return <DashboardSkeleton />;
  }

  const pendentes = visits
    .filter((v) => v.status === "pendente")
    .sort((a, b) => +new Date(a.agendada_em) - +new Date(b.agendada_em));
  const realizadas = visits.filter((v) => v.status === "realizada");
  const mesAtual = new Date().toISOString().slice(0, 7);
  const familiasVisitadasNoMes = new Set(
    realizadas
      .filter((v) => (v.realizada_em ?? v.agendada_em).slice(0, 7) === mesAtual)
      .map((v) => v.family_id),
  ).size;
  const percentualVisitado = families.length
    ? Math.round((familiasVisitadasNoMes / families.length) * 100)
    : 0;

  async function marcarRealizada(id: string) {
    try {
      await atualizarVisita(id, { status: "realizada", realizada_em: new Date().toISOString() });
      toast.success("Visita registrada no histórico.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a visita.");
    }
  }

  const stats = [
    { icon: Home, label: "Famílias", value: families.length },
    { icon: Users, label: "Moradores", value: residents.length },
    { icon: CalendarCheck, label: "Visitas pendentes", value: pendentes.length },
    { icon: HeartPulse, label: "Visitas realizadas", value: realizadas.length },
    { icon: Baby, label: "Gestantes", value: residents.filter((r: any) => r.gestante).length },
    {
      icon: Accessibility,
      label: "Idosos e acamados",
      value: residents.filter((r: any) => r.acamado || (idade(r.data_nascimento) ?? 0) >= 60).length,
    },
  ];

  return (
    <div className="page-fade-in space-y-6">
      <FaixaCampanha />
      <PageHeader
        titulo="Painel do território"
        descricao="Visão geral da sua micro-área e alertas importantes."
        icone={LayoutDashboard}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="hover-lift glass-card border-none transition-shadow focus-within:ring-2 focus-within:ring-ring/40"
          >
            <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center sm:p-5">
              <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                <s.icon className="size-5" aria-hidden="true" />
              </div>
              <p className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">
                {s.value}
              </p>
              <p className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground">
                {s.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card border-none">
        <CardContent className="space-y-2 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">Cobertura de visitas neste mês</span>
            <strong className="text-primary">{percentualVisitado}%</strong>
          </div>
          <progress
            className="h-2 w-full overflow-hidden rounded-full accent-primary"
            value={percentualVisitado}
            max={100}
            aria-label="Cobertura de visitas neste mês"
          />
          <p className="text-xs text-muted-foreground">{familiasVisitadasNoMes} de {families.length} famílias visitadas.</p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <AvisosCard appointments={appointments} residents={residents} />

        <Card className="glass-card overflow-hidden border-none">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 p-4 sm:px-6">
            <CardTitle className="font-[Sora,sans-serif] text-base font-bold">
              Próximas visitas
            </CardTitle>
            <Link
              to="/agenda"
              className="rounded-md text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {pendentes.length === 0 ? (
              <EmptyState
                icone={CalendarCheck}
                titulo="Nenhuma visita agendada"
                descricao="Quando você agendar uma visita, ela aparece aqui em ordem de data."
              />
            ) : (
              <ul className="space-y-2.5">
                {pendentes.slice(0, 6).map((v: any) => {
                  const f = families.find((x: any) => x.id === v.family_id);

                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 transition-colors hover:bg-card"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{f?.nome ?? "Família"}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {formatDateTime(v.agendada_em)}
                          {v.motivo ? ` • ${v.motivo}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" onClick={() => void marcarRealizada(v.id)}>Realizada</Button>
                        <Button asChild size="sm" variant="outline"><Link to="/agenda">Abrir</Link></Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <FilaVisitasMes families={families} visits={visits} />
    </div>
  );
}
