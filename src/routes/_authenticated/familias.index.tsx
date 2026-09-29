import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Phone, Plus, Users } from "lucide-react";
import { useFamilies, useResidents } from "@/hooks/useAcsData";
import { FamilyDialog } from "@/components/FamilyDialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CampoBusca } from "@/components/CampoBusca";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fullAddress, RISCO_LABEL, RiscoNivel } from "@/lib/acs";
import { ListSkeleton } from "@/components/LoadingSkeletons";

export const Route = createFileRoute("/_authenticated/familias/")({
  head: () => ({
    meta: [
      { title: "Famílias cadastradas — ACS Território" },
      {
        name: "description",
        content: "Cadastro de famílias com endereço, telefone, moradores e nível de risco.",
      },
      { property: "og:title", content: "Famílias cadastradas — ACS Território" },
      { property: "og:description", content: "Cadastro de famílias do território do ACS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Familias,
});

function Familias() {
  const navigate = useNavigate();
  const { data: todas = [], isLoading } = useFamilies();
  const families = todas.filter((f) => f.situacao !== "transferida");
  const { data: residents = [] } = useResidents();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);

  const lista = useMemo(
    () =>
      families.filter((f) =>
        `${f.nome} ${f.logradouro} ${f.numero ?? ""} ${f.bairro ?? ""} ${f.telefone ?? ""} ${f.micro_area ?? ""}`
          .toLowerCase()
          .includes(busca.toLowerCase()),
      ),
    [families, busca],
  );

  return (
    <div className="page-fade-in space-y-5">
      <PageHeader
        titulo="Famílias"
        descricao={
          families.length === 1
            ? "1 domicílio cadastrado na sua micro-área."
            : `${families.length} domicílios cadastrados na sua micro-área.`
        }
        icone={Users}
      >
        <Button onClick={() => setOpen(true)} size="lg" className="w-full sm:w-auto">
          <Plus className="size-4" /> Nova família
        </Button>
      </PageHeader>

      <CampoBusca
        valor={busca}
        aoMudar={setBusca}
        placeholder="Buscar por nome, rua, telefone ou micro-área"
      />

      {busca && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {lista.length} resultado(s) para “{busca}”.
        </p>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : lista.length === 0 ? (
        <EmptyState
          icone={Users}
          titulo={busca ? "Nenhuma família encontrada" : "Nenhuma família cadastrada"}
          descricao={
            busca
              ? "Tente escrever só parte do nome da rua ou do responsável."
              : "Cadastre a primeira família para começar a organizar o seu território."
          }
        >
          {!busca && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Cadastrar família
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((f) => {
            const membros = residents.filter((r) => r.family_id === f.id).length;
            return (
              <Link
                key={f.id}
                to="/familias/$id"
                params={{ id: f.id }}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="hover-lift glass-card h-full border-none transition-all">
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-[Sora,sans-serif] font-semibold leading-snug">{f.nome}</h2>
                      <Badge
                        variant={
                          f.risco === "alto"
                            ? "destructive"
                            : f.risco === "medio"
                              ? "default"
                              : "secondary"
                        }
                        className="shrink-0"
                      >
                        {RISCO_LABEL[f.risco as RiscoNivel]}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{fullAddress(f)}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" aria-hidden="true" /> {membros} morador(es)
                      </span>
                      {f.telefone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3.5" aria-hidden="true" /> {f.telefone}
                        </span>
                      )}
                      {f.micro_area && <span>Micro-área {f.micro_area}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}


      <FamilyDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(familia) =>
          void navigate({ to: "/familias/$id", params: { id: familia.id }, search: { novoMorador: true } })
        }
      />
    </div>
  );
}
