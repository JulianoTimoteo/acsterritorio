import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useFamilies } from "@/hooks/useAcsData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { CampoBusca } from "@/components/CampoBusca";
import { fullAddress, RISCO_LABEL, RiscoNivel } from "@/lib/acs";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";


const MapView = lazy(() => import("@/components/MapView"));

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa da área — ACS Território" },
      {
        name: "description",
        content: "Mapa com os domicílios acompanhados, destacando as famílias de maior risco.",
      },
      { property: "og:title", content: "Mapa da área — ACS Território" },
      { property: "og:description", content: "Domicílios acompanhados no mapa do território." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mapa,
});

function Mapa() {
  const { data: families = [], isLoading } = useFamilies();
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(
    () =>
      families.filter((f) =>
        `${f.nome} ${f.logradouro} ${f.bairro ?? ""} ${f.micro_area ?? ""}`
          .toLowerCase()
          .includes(busca.toLowerCase()),
      ),
    [families, busca],
  );

  if (isLoading) return <div className="flex h-[50dvh] items-center justify-center"><HeartbeatLoader size="lg" /></div>;


  const semLocal = filtradas.filter((f: any) => f.latitude == null || f.longitude == null);

  return (
    <div className="page-fade-in space-y-6">
      <PageHeader
        titulo="Mapa da área"
        descricao="Localização dos domicílios acompanhados."
        icone={MapPin}
      >
        <CampoBusca
          valor={busca}
          aoMudar={setBusca}
          placeholder="Filtrar por família, rua ou micro-área"
          className="w-full sm:w-80"
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/60 px-4 py-3 text-xs font-medium text-muted-foreground">
        {Object.entries(RISCO_LABEL).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-full ring-2 ring-background"
              style={{
                background: k === "alto" ? "#d64545" : k === "medio" ? "#e0a800" : "#0f9b8e",
              }}
            />
            {label}
          </span>
        ))}
      </div>


      <ClientOnly
        fallback={
          <div className="flex h-[50dvh] min-h-[300px] max-h-[600px] w-full items-center justify-center rounded-xl border bg-muted/30">
            <HeartbeatLoader />
          </div>
        }

      >
        <Suspense
          fallback={<div className="flex h-[50dvh] min-h-[300px] max-h-[600px] w-full items-center justify-center rounded-xl border bg-muted/30"><HeartbeatLoader /></div>}
        >
          <MapView families={filtradas} />
        </Suspense>
      </ClientOnly>

      {semLocal.length > 0 && (
        <Card className="glass-card border-none">
          <CardContent className="pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 text-primary" /> Sem localização no mapa
            </p>
            <ul className="space-y-2 text-sm">
              {semLocal.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{f.nome}</strong> — {fullAddress(f)}
                  </span>
                  <Badge variant="outline">Localizar no cadastro</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
