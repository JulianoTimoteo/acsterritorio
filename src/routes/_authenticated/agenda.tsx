import { useAcs } from "@/auth/AcsProvider";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Check, NotebookPen, Plus, X } from "lucide-react";
import { NotasVisita } from "@/components/NotasVisita";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

import { useFamilies, useVisits, useAcsMutations } from "@/hooks/useAcsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentUserId, formatDateTime, type Visit } from "@/lib/acs";
import { ListSkeleton } from "@/components/LoadingSkeletons";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";


export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de visitas — ACS Território" },
      {
        name: "description",
        content: "Agende visitas domiciliares e registre o histórico das visitas já realizadas.",
      },
      { property: "og:title", content: "Agenda de visitas — ACS Território" },
      { property: "og:description", content: "Visitas agendadas e histórico do território." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { data: visits = [], isLoading: loadingVisits } = useVisits();
  const { data: families = [], isLoading: loadingFamilies } = useFamilies();
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarVisita, atualizarVisita } = useAcsMutations();
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState<Visit | null>(null);

  if (loadingVisits || loadingFamilies) return <ListSkeleton />;

  const nome = (id: string) => families.find((f) => f.id === id)?.nome ?? "Família";
  const agendadas = visits
    .filter((v) => v.status === "pendente")
    .sort((a, b) => +new Date(a.agendada_em) - +new Date(b.agendada_em));
  const historico = visits.filter((v) => v.status !== "pendente");


  async function atualizar(v: Visit, status: "realizada" | "cancelada") {
    try {
      await atualizarVisita(v.id, {
        status,
        realizada_em: status === "realizada" ? new Date().toISOString() : null,
      });
    } catch (error: any) {
      return toast.error("Erro ao atualizar visita.");
    }

    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    toast.success(status === "realizada" ? "Visita registrada." : "Visita cancelada.");
  }

  return (
    <div className="page-fade-in space-y-6">
      <PageHeader
        titulo="Visitas domiciliares"
        descricao="Agende e registre suas visitas no território."
        icone={CalendarCheck}
      >
        <Button onClick={() => setOpen(true)} size="lg" className="w-full sm:w-auto">
          <Plus className="size-4" /> Agendar visita
        </Button>
      </PageHeader>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">
            Agendadas{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({agendadas.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {agendadas.length === 0 ? (
            <EmptyState
              icone={CalendarCheck}
              titulo="Nenhuma visita agendada"
              descricao="Use “Agendar visita” para marcar a próxima ida a um domicílio."
            />
          ) : (
            <ul className="space-y-3">
              {agendadas.map((v) => (
                <li
                  key={v.id}
                  className="hover-lift flex flex-col gap-3 rounded-xl border bg-card/50 p-4 transition-colors hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nome(v.family_id)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDateTime(v.agendada_em)}
                      {v.motivo ? ` • ${v.motivo}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => atualizar(v, "realizada")}
                    >
                      <Check className="size-4" /> Realizada
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 sm:flex-none"
                      onClick={() => setNotas(v)}
                    >
                      <NotebookPen className="size-4" /> Anotações
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => atualizar(v, "cancelada")}
                    >
                      <X className="size-4" /> Cancelar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {historico.length === 0 ? (
            <EmptyState
              icone={Check}
              titulo="Ainda não há visitas concluídas"
              descricao="Ao marcar uma visita como realizada, ela fica registrada aqui."
            />
          ) : (
            <ul className="divide-y text-sm">
              {historico.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <strong className="font-medium">{nome(v.family_id)}</strong> —{" "}
                    {formatDateTime(v.realizada_em ?? v.agendada_em)}
                    {v.anotacoes ? ` • ${v.anotacoes}` : ""}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setNotas(v)}>
                      <NotebookPen className="size-4" /> Anotações
                    </Button>
                    <Badge
                      className="capitalize"
                      variant={v.status === "realizada" ? "default" : "outline"}
                    >
                      {v.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>


      <VisitDialog open={open} onOpenChange={setOpen} />
      {notas && (
        <NotasVisita
          visita={notas}
          familia={nome(notas.family_id)}
          open={!!notas}
          onOpenChange={(v) => !v && setNotas(null)}
        />
      )}
    </div>
  );
}

function VisitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: families = [] } = useFamilies();
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarVisita, atualizarVisita } = useAcsMutations();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ family_id: "", agendada_em: "", motivo: "", anotacoes: "" });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.family_id || !form.agendada_em)
      return toast.error("Escolha a família e a data da visita.");
    setSaving(true);
    try {
      await criarVisita({
        family_id: form.family_id,
        agendada_em: new Date(form.agendada_em).toISOString(),
        motivo: form.motivo || null,
        anotacoes: form.anotacoes || null,
        status: "pendente",
        user_id: userId,
      });

      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      toast.success("Visita agendada.");
      onOpenChange(false);
      setForm({ family_id: "", agendada_em: "", motivo: "", anotacoes: "" });
    } catch (err) {
      toast.error("Erro ao salvar: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[Sora,sans-serif]">Agendar visita</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label>Família *</Label>
            <Select
              value={form.family_id}
              onValueChange={(v) => setForm({ ...form, family_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quando">Data e hora *</Label>
            <Input
              id="quando"
              type="datetime-local"
              value={form.agendada_em}
              onChange={(e) => setForm({ ...form, agendada_em: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input
              id="motivo"
              maxLength={120}
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anot">Anotações</Label>
            <Textarea
              id="anot"
              maxLength={1000}
              value={form.anotacoes}
              onChange={(e) => setForm({ ...form, anotacoes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
