import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations } from "@/hooks/useAcsData";
import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crosshair, MapPinned } from "lucide-react";
import { lerGps } from "@/lib/gps";

const MiniMapa = lazy(() => import("@/components/MiniMapa"));

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buscarCep,
  procurarEndereco,
  RISCO_LABEL,
  type Family,
  type LocalEncontrado,
} from "@/lib/acs";

type FormState = {
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  micro_area: string;
  telefone: string;
  risco: string;
  observacoes: string;
  latitude: number | null;
  longitude: number | null;
};

function initial(family?: Family): FormState {
  return {
    nome: family?.nome ?? "",
    logradouro: family?.logradouro ?? "",
    numero: family?.numero ?? "",
    complemento: family?.complemento ?? "",
    bairro: family?.bairro ?? "",
    cidade: family?.cidade ?? "",
    cep: family?.cep ?? "",
    micro_area: family?.micro_area ?? "",
    telefone: family?.telefone ?? "",
    risco: family?.risco ?? "baixo",
    observacoes: family?.observacoes ?? "",
    latitude: family?.latitude ?? null,
    longitude: family?.longitude ?? null,
  };
}

export function FamilyDialog({
  open,
  onOpenChange,
  family,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  family?: Family;
  onCreated?: (family: Family) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const userId = user?.id ?? "";
  const { criarFamilia, atualizarFamilia } = useAcsMutations();
  const [form, setForm] = useState<FormState>(initial(family));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [opcoes, setOpcoes] = useState<LocalEncontrado[]>([]);
  const [lendoGps, setLendoGps] = useState(false);
  const [precisao, setPrecisao] = useState<number | null>(null);

  async function usarGps() {
    setLendoGps(true);
    setPrecisao(null);
    try {
      const leitura = await lerGps({ segundos: 12 }, (parcial) => {
        setPrecisao(Math.round(parcial.precisao));
        setForm((f) => ({ ...f, latitude: parcial.latitude, longitude: parcial.longitude }));
      });
      setPrecisao(Math.round(leitura.precisao));
      setForm((f) => ({ ...f, latitude: leitura.latitude, longitude: leitura.longitude }));
      setOpcoes([]);
      toast.success(
        `Posição do aparelho marcada (precisão de cerca de ${Math.round(leitura.precisao)} m). Toque em "Recalibrar" para melhorar.`,
      );
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler o GPS.");
    } finally {
      setLendoGps(false);
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function completarPorCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const dados = await buscarCep(cep);
      if (!dados) return;
      setForm((f) => ({
        ...f,
        logradouro: f.logradouro || dados.logradouro,
        bairro: f.bairro || dados.bairro,
        cidade: f.cidade || dados.cidade,
      }));
    } catch {
      /* sem internet: seguimos com o que foi digitado */
    }
  }

  async function localizar() {
    if (![form.logradouro, form.cidade, form.cep].some((v) => v.trim())) {
      return toast.error("Preencha a rua, a cidade ou o CEP primeiro.");
    }
    setLocating(true);
    setOpcoes([]);
    try {
      await completarPorCep();
      const achados = await procurarEndereco({
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        cep: form.cep,
      });
      if (!achados.length) {
        toast.error("Endereço não encontrado. Confira a rua, o número e a cidade.");
        return;
      }
      setForm((f) => ({ ...f, latitude: achados[0].latitude, longitude: achados[0].longitude }));
      setOpcoes(achados.slice(1));
      toast.success("Endereço localizado. Arraste o ponto até a porta da casa, se precisar.");
    } catch {
      toast.error("Não foi possível consultar o mapa agora. Verifique sua conexão.");
    } finally {
      setLocating(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome da família.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        nome: form.nome.trim(),
        logradouro: form.logradouro.trim().toUpperCase(),
        bairro: form.bairro.trim().toUpperCase(),
        cidade: form.cidade.trim().toUpperCase(),
        user_id: userId,
      };
      if (family) {
        await atualizarFamilia(family.id, payload);
      } else {
        const criada = await criarFamilia(payload);
        onCreated?.(criada);
      }

      await queryClient.invalidateQueries({ queryKey: ["families"] });
      if (family) await queryClient.invalidateQueries({ queryKey: ["family", family.id] });
      toast.success(family ? "Família atualizada." : "Família cadastrada.");
      onOpenChange(false);
      if (!family) setForm(initial());
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
          <DialogTitle className="font-[Sora,sans-serif]">
            {family ? "Editar família" : "Nova família"}
          </DialogTitle>
          <DialogDescription>Endereço, contato e nível de risco do domicílio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da família *</Label>
            <Input
              id="nome"
              maxLength={120}
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="logradouro">Rua</Label>
              <Input
                id="logradouro"
                maxLength={160}
                value={form.logradouro}
                onChange={(e) => set("logradouro", e.target.value.toUpperCase())}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                maxLength={20}
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                maxLength={80}
                value={form.complemento}
                onChange={(e) => set("complemento", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                maxLength={80}
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                maxLength={80}
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                maxLength={12}
                inputMode="numeric"
                value={form.cep}
                onChange={(e) => set("cep", e.target.value)}
                onBlur={() => void completarPorCep()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                maxLength={20}
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="micro">Micro-área</Label>
              <Input
                id="micro"
                maxLength={20}
                value={form.micro_area}
                onChange={(e) => set("micro_area", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nível de risco</Label>
            <Select value={form.risco} onValueChange={(v) => set("risco", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RISCO_LABEL).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              maxLength={1000}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                {form.latitude != null
                  ? `Localizado: ${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}`
                  : "Sem localização no mapa"}
                {precisao != null && (
                  <span className="block text-xs">Precisão de cerca de {precisao} m</span>
                )}
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={localizar}
                  disabled={locating}
                  className="w-full sm:w-auto"
                >
                  <MapPinned className="size-4" /> {locating ? "Procurando…" : "Localizar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={usarGps}
                  disabled={lendoGps}
                  className="w-full sm:w-auto"
                >
                  <Crosshair className="size-4" />
                  {lendoGps ? "Lendo GPS…" : form.latitude != null ? "Recalibrar GPS" : "Usar meu GPS"}
                </Button>
              </div>
            </div>

            {form.latitude != null && form.longitude != null && (
              <>
                <Suspense
                  fallback={
                    <div className="h-52 w-full animate-pulse rounded-lg border bg-muted" />
                  }
                >
                  <MiniMapa
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onMover={(lat, lng) =>
                      setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
                    }
                  />
                </Suspense>
                <p className="text-xs text-muted-foreground">
                  Toque no mapa ou arraste o ponto para marcar a porta exata da casa.
                </p>
              </>
            )}

            {opcoes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Não é esse lugar? Escolha outro resultado:</p>
                {opcoes.map((o) => (
                    <Button
                    key={`${o.latitude},${o.longitude}`}
                    type="button"
                      variant="outline"
                      size="sm"
                    onClick={() => {
                      setForm((f) => ({ ...f, latitude: o.latitude, longitude: o.longitude }));
                      setOpcoes((lista) => lista.filter((x) => x !== o));
                    }}
                      className="h-auto w-full justify-start whitespace-normal py-2 text-left text-xs"
                  >
                    {o.rotulo}
                    </Button>
                ))}
              </div>
            )}
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
