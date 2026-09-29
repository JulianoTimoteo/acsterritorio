import { createFileRoute } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { useAppointments, useResidents } from "@/hooks/useAcsData";
import { AvisosList } from "@/components/Avisos";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/acs";
import { ListSkeleton } from "@/components/LoadingSkeletons";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos de consultas — ACS Território" },
      {
        name: "description",
        content: "Alertas automáticos 48 e 24 horas antes das consultas e exames dos pacientes.",
      },
      { property: "og:title", content: "Avisos de consultas — ACS Território" },
      { property: "og:description", content: "Alertas 48h e 24h antes de consultas e exames." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avisos,
});

function Avisos() {
  const { data: appointments = [], isLoading: loadingApps } = useAppointments();
  const { data: residents = [], isLoading: loadingRes } = useResidents();

  if (loadingApps || loadingRes) return <ListSkeleton />;

  const proximos = appointments
    .filter((a) => a.status === "pendente" && new Date(a.data_hora) > new Date())
    .sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora));


  return (
    <div className="page-fade-in space-y-6">
      <PageHeader
        titulo="Avisos"
        descricao="Alertas automáticos com 48 e 24 horas de antecedência."
        icone={BellRing}
      />

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">Avisar agora</CardTitle>
          <CardDescription>Pacientes que precisam ser lembrados hoje.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <AvisosList appointments={appointments} residents={residents} />
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">
            Todos os próximos{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({proximos.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {proximos.length === 0 ? (
            <EmptyState
              icone={BellRing}
              titulo="Nenhum compromisso futuro"
              descricao="Cadastre consultas e exames para ser avisado antes da data."
            />
          ) : (
            <ul className="space-y-2.5">
              {proximos.map((a) => {
                const morador = residents.find((r) => r.id === a.resident_id);
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border bg-card/60 p-3 transition-colors hover:bg-card"
                  >
                    <p className="font-medium">{a.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {morador ? `${morador.nome} • ` : ""}
                      {formatDateTime(a.data_hora)}
                      {a.local ? ` • ${a.local}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
