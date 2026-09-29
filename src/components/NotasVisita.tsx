/**
 * Anotações livres da visita + resumo estruturado gerado por IA
 * (resumo, pendências e próximos passos).
 */
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAcsMutations } from "@/hooks/useAcsData";
import { resumirVisita, type ResumoVisita } from "@/lib/visitas.functions";
import type { Visit } from "@/lib/acs";

export function NotasVisita({
  visita,
  familia,
  open,
  onOpenChange,
}: {
  visita: Visit;
  familia?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { atualizarVisita } = useAcsMutations();
  const [notas, setNotas] = useState(visita.anotacoes ?? "");
  const [resumo, setResumo] = useState<ResumoVisita | null>(
    visita.resumo_ia
      ? {
          resumo: visita.resumo_ia,
          pendencias: visita.pendencias ?? [],
          proximos_passos: visita.proximos_passos ?? [],
        }
      : null,
  );
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function gerar() {
    if (notas.trim().length < 5) return toast.error("Escreva as anotações da visita primeiro.");
    setGerando(true);
    try {
      const r = await resumirVisita({
        data: { notas: notas.trim(), contexto: familia ? `Família: ${familia}` : undefined },
      });
      setResumo(r);
      toast.success("Resumo pronto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o resumo.");
    } finally {
      setGerando(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarVisita(visita.id, {
        anotacoes: notas.trim() || null,
        resumo_ia: resumo?.resumo ?? null,
        pendencias: resumo?.pendencias ?? null,
        proximos_passos: resumo?.proximos_passos ?? null,
      });
      toast.success("Anotações salvas.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar as anotações.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[Sora,sans-serif]">Anotações da visita</DialogTitle>
          <DialogDescription>
            Escreva livremente o que aconteceu. O resumo organiza pendências e próximos passos.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={7}
          placeholder="Ex.: Dona Maria sem remédio de pressão há 3 dias, filho com tosse, casa com água parada no quintal…"
        />

        <Button type="button" variant="secondary" onClick={gerar} disabled={gerando}>
          {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {gerando ? "Organizando…" : "Gerar resumo"}
        </Button>

        {resumo && (
          <div className="space-y-3 rounded-xl border bg-card/60 p-4 text-sm">
            {resumo.resumo && <p>{resumo.resumo}</p>}
            {resumo.pendencias.length > 0 && (
              <div>
                <p className="font-medium">Pendências</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {resumo.pendencias.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {resumo.proximos_passos.length > 0 && (
              <div>
                <p className="font-medium">Próximos passos</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {resumo.proximos_passos.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
