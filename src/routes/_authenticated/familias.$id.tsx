import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations } from "@/hooks/useAcsData";
import { useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { useAppointments, useFamily, useResidents, useVisits } from "@/hooks/useAcsData";
import { FamilyDialog } from "@/components/FamilyDialog";
import { TransferirFamilia } from "@/components/TransferirFamilia";
import { MoverMorador } from "@/components/MoverMorador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CONDICOES,
  currentUserId,
  formatDate,
  formatDateTime,
  fullAddress,
  idade,
  RISCO_LABEL,
  RiscoNivel,
} from "@/lib/acs";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";


export const Route = createFileRoute("/_authenticated/familias/$id")({
  validateSearch: z.object({ novoMorador: z.boolean().optional().catch(false) }),
  head: () => ({
    meta: [
      { title: "Ficha da família — ACS Território" },
      {
        name: "description",
        content: "Moradores, condições de saúde, visitas e consultas de uma família acompanhada.",
      },
      { property: "og:title", content: "Ficha da família — ACS Território" },
      { property: "og:description", content: "Moradores, visitas e consultas da família." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FamiliaDetalhe,
});

function FamiliaDetalhe() {
  const { id } = Route.useParams();
  const { novoMorador } = Route.useSearch();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarMorador, excluirMorador: excluirMoradorRepo } = useAcsMutations();
  const { data: family, isLoading } = useFamily(id);
  const { data: residents = [] } = useResidents(id);
  const { data: visits = [] } = useVisits(id);
  const { data: appointments = [] } = useAppointments(id);
  const [editOpen, setEditOpen] = useState(false);
  const [residentOpen, setResidentOpen] = useState(novoMorador === true);

  async function excluirMorador(residentId: string) {
    try {
      await excluirMoradorRepo(residentId);
      await queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast.success("Morador removido.");
    } catch (err) {
      toast.error("Erro ao excluir morador.");
    }
  }


  if (isLoading) return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <HeartbeatLoader size="lg" />
    </div>
  );

  if (!family) return <p className="text-sm text-muted-foreground">Família não encontrada.</p>;

  return (
    <div key={location.pathname} className="page-fade-in space-y-6">
      <Link
        to="/familias"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold font-[Sora,sans-serif] sm:text-3xl break-words">{family.nome}</h1>
          <p className="text-muted-foreground">{fullAddress(family)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Badge variant={family.risco === "alto" ? "destructive" : "secondary"}>
              {RISCO_LABEL[family.risco as RiscoNivel]}
            </Badge>
            {family.telefone && <Badge variant="outline">{family.telefone}</Badge>}
            {family.micro_area && <Badge variant="outline">Micro-área {family.micro_area}</Badge>}
          </div>
        </div>
        <div className="flex flex-row flex-wrap gap-2 sm:flex-nowrap">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
          <TransferirFamilia familyId={family.id} familyNome={family.nome} />
        </div>
      </div>

      {family.observacoes && (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            {family.observacoes}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-[Sora,sans-serif] text-base">Moradores</CardTitle>
          <Button size="sm" onClick={() => setResidentOpen(true)}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {residents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum morador cadastrado.</p>
          ) : (
            <ul className="space-y-3">
              {residents.map((r) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {r.nome}
                        {idade(r.data_nascimento) != null && (
                          <span className="text-muted-foreground">
                            {" "}
                            • {idade(r.data_nascimento)} anos
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[
                          r.parentesco,
                          r.sexo,
                          r.telefone,
                          r.cns ? `CNS ${r.cns}` : null,
                          r.peso != null ? `${r.peso} kg` : null,
                          r.data_nascimento ? `Nasc. ${formatDate(r.data_nascimento)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.gestante && <Badge variant="default">Gestante</Badge>}
                        {r.acamado && <Badge variant="destructive">Acamado</Badge>}
                        {r.condicoes.map((c) => (
                          <Badge key={c} variant="outline">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      {r.observacoes && (
                        <p className="mt-2 text-sm text-muted-foreground">{r.observacoes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <MoverMorador
                        residentId={r.id}
                        residentNome={r.nome}
                        familyIdAtual={family.id}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${r.nome}`}
                        onClick={() => excluirMorador(r.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-[Sora,sans-serif] text-base">Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma visita registrada. Agende pela página de visitas.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {visits.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 border-b pb-2">
                    <span className="min-w-0 flex-1 truncate">
                      {formatDateTime(v.realizada_em ?? v.agendada_em)}
                      {v.motivo ? ` • ${v.motivo}` : ""}
                    </span>
                    <Badge variant={v.status === "realizada" ? "default" : "secondary"} className="shrink-0">
                      {v.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-[Sora,sans-serif] text-base">Consultas e exames</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado para esta família.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {appointments.map((a) => (
                  <li key={a.id} className="border-b pb-2">
                    <p className="font-medium">{a.titulo}</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(a.data_hora)}
                      {a.local ? ` • ${a.local}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <FamilyDialog open={editOpen} onOpenChange={setEditOpen} family={family} />
      <ResidentDialog familyId={family.id} open={residentOpen} onOpenChange={setResidentOpen} />
    </div>
  );
}

function ResidentDialog({
  familyId,
  open,
  onOpenChange,
}: {
  familyId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarMorador, excluirMorador: excluirMoradorRepo } = useAcsMutations();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    data_nascimento: "",
    sexo: "",
    cns: "",
    peso: "",
    telefone: "",
    parentesco: "",
    gestante: false,
    acamado: false,
    condicoes: [] as string[],
    observacoes: "",
  });

  function toggleCondicao(c: string) {
    setForm((f) => ({
      ...f,
      condicoes: f.condicoes.includes(c)
        ? f.condicoes.filter((x) => x !== c)
        : [...f.condicoes, c],
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.data_nascimento || !form.sexo) {
      return toast.error("Informe nome, nascimento e sexo do morador.");
    }
    setSaving(true);
    try {
      await criarMorador({
        ...form,
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento,
        peso: form.peso ? Number(form.peso.replace(",", ".")) : null,
        family_id: familyId,
        user_id: userId,
      });

      await queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast.success("Morador cadastrado.");
      onOpenChange(false);
      setForm({
        nome: "",
        data_nascimento: "",
        sexo: "",
        cns: "",
        peso: "",
        telefone: "",
        parentesco: "",
        gestante: false,
        acamado: false,
        condicoes: [],
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
          <DialogTitle className="font-[Sora,sans-serif]">Novo morador</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rnome">Nome *</Label>
            <Input
              id="rnome"
              maxLength={120}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nasc">Nascimento *</Label>
              <Input
                id="nasc"
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo *</Label>
              <Select
                value={form.sexo}
                onValueChange={(sexo) => setForm({ ...form, sexo })}
              >
                <SelectTrigger id="sexo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parentesco</Label>
              <Input
                id="parent"
                maxLength={40}
                value={form.parentesco}
                onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtel">Telefone</Label>
              <Input
                id="rtel"
                maxLength={20}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cns">CNS</Label>
              <Input
                id="cns"
                maxLength={20}
                value={form.cns}
                onChange={(e) => setForm({ ...form, cns: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                inputMode="decimal"
                min="0"
                max="500"
                step="0.1"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.gestante}
                onCheckedChange={(v) => setForm({ ...form, gestante: v === true })}
              />
              Gestante
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.acamado}
                onCheckedChange={(v) => setForm({ ...form, acamado: v === true })}
              />
              Acamado
            </label>
          </div>
          <div className="space-y-2">
            <Label>Condições acompanhadas</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CONDICOES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.condicoes.includes(c)}
                    onCheckedChange={() => toggleCondicao(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="robs">Observações</Label>
            <Textarea
              id="robs"
              maxLength={1000}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
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
