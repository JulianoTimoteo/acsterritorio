import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations } from "@/hooks/useAcsData";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ClipboardList, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

import { useAppointments, useFamilies, useResidents } from "@/hooks/useAcsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { AVISO_LABEL, avisoDe, formatDateTime, TIPOS, type Appointment } from "@/lib/acs";
import { ListSkeleton } from "@/components/LoadingSkeletons";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";

export const Route = createFileRoute("/_authenticated/consultas")({
  head: () => ({
    meta: [
      { title: "Consultas e exames — ACS Território" },
      {
        name: "description",
        content:
          "Registre consultas médicas e exames dos pacientes com avisos de 48 e 24 horas antes.",
      },
      { property: "og:title", content: "Consultas e exames — ACS Território" },
      { property: "og:description", content: "Consultas e exames com avisos antecipados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Consultas,
});

function Consultas() {
  const { data: appointments = [], isLoading: loadingApps } = useAppointments();
  const { data: residents = [], isLoading: loadingRes } = useResidents();
  const { data: families = [], isLoading: loadingFam } = useFamilies();
  const queryClient = useQueryClient();
  const { atualizarConsulta } = useAcsMutations();
  const [open, setOpen] = useState(false);

  if (loadingApps || loadingRes || loadingFam) return <ListSkeleton />;

  const proximos = appointments
    .filter((a) => a.status === "pendente")
    .sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora));
  const encerrados = appointments.filter((a) => a.status !== "pendente");

  async function atualizar(a: Appointment, status: "realizado" | "cancelado") {
    try {
      await atualizarConsulta(a.id, { status });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Compromisso atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  }

  function descricao(a: Appointment) {
    const morador = residents.find((r) => r.id === a.resident_id)?.nome;
    const familia = families.find((f) => f.id === a.family_id)?.nome;
    return [morador, familia, a.especialidade, a.local].filter(Boolean).join(" • ");
  }

  return (
    <div className="page-fade-in space-y-6">
      <PageHeader
        titulo="Consultas e exames"
        descricao="Acompanhe os agendamentos dos pacientes com avisos de 48 e 24 horas."
        icone={ClipboardList}
      >
        <Button onClick={() => setOpen(true)} size="lg" className="w-full sm:w-auto">
          <Plus className="size-4" /> Novo agendamento
        </Button>
      </PageHeader>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">
            Agendados{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({proximos.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {proximos.length === 0 ? (
            <EmptyState
              icone={ClipboardList}
              titulo="Nenhum compromisso agendado"
              descricao="Cadastre a consulta ou o exame para receber o aviso antes da data."
            />
          ) : (
            <ul className="space-y-3">
              {proximos.map((a) => {
                const nivel = avisoDe(a.data_hora);
                return (
                  <li
                    key={a.id}
                    className="hover-lift flex flex-col gap-3 rounded-xl border bg-card/50 p-4 transition-colors hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.titulo}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDateTime(a.data_hora)}
                        {descricao(a) ? ` • ${descricao(a)}` : ""}
                      </p>
                      {nivel && (
                        <Badge
                          className="mt-2 shrink-0"
                          variant={nivel === "48h" ? "secondary" : "destructive"}
                        >
                          {AVISO_LABEL[nivel]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => atualizar(a, "realizado")}
                      >
                        <Check className="size-4" /> Concluído
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => atualizar(a, "cancelado")}
                      >
                        <X className="size-4" /> Cancelar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {encerrados.length === 0 ? (
            <EmptyState
              icone={Check}
              titulo="Nada no histórico ainda"
              descricao="Consultas concluídas ou canceladas aparecem nesta lista."
            />
          ) : (
            <ul className="divide-y text-sm">
              {encerrados.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <strong className="font-medium">{a.titulo}</strong> —{" "}
                    {formatDateTime(a.data_hora)}
                  </span>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AppointmentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AppointmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: families = [] } = useFamilies();
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarConsulta } = useAcsMutations();
  const [form, setForm] = useState({
    titulo: "",
    tipo: "consulta",
    family_id: "",
    resident_id: "",
    especialidade: "",
    local: "",
    data_hora: "",
    observacoes: "",
  });
  const { data: moradores = [] } = useResidents(form.family_id || undefined);
  const [saving, setSaving] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data_hora)
      return toast.error("Informe o título e a data do compromisso.");
    setSaving(true);
    try {
      const dataCompromisso = new Date(form.data_hora);
      await criarConsulta({
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        family_id: form.family_id || null,
        resident_id: form.resident_id || null,
        especialidade: form.especialidade || null,
        local: form.local || null,
        observacoes: form.observacoes || null,
        status: "pendente",
        data_hora: dataCompromisso.toISOString(),
        aviso_48h_em: new Date(dataCompromisso.getTime() - 48 * 3_600_000).toISOString(),
        aviso_24h_em: new Date(dataCompromisso.getTime() - 24 * 3_600_000).toISOString(),
        user_id: userId,
      });

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento criado.");
      onOpenChange(false);
      setForm({
        titulo: "",
        tipo: "consulta",
        family_id: "",
        resident_id: "",
        especialidade: "",
        local: "",
        data_hora: "",
        observacoes: "",
      });
    } catch (err) {
      toast.error("Erro ao salvar: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[Sora,sans-serif]">Novo agendamento</DialogTitle>
          <DialogDescription>
            Os avisos de 48h e 24h aparecem automaticamente no painel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              maxLength={120}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dh">Data e hora *</Label>
              <Input
                id="dh"
                type="datetime-local"
                value={form.data_hora}
                onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Família</Label>
              <Select
                value={form.family_id}
                onValueChange={(v) => setForm({ ...form, family_id: v, resident_id: "" })}
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
              <Label>Paciente</Label>
              <Select
                value={form.resident_id}
                onValueChange={(v) => setForm({ ...form, resident_id: v })}
                disabled={!form.family_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {moradores.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="esp">Especialidade</Label>
              <Input
                id="esp"
                maxLength={80}
                value={form.especialidade}
                onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                maxLength={120}
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aobs">Observações</Label>
            <Textarea
              id="aobs"
              maxLength={1000}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
