/**
 * Fila de visitas do mês.
 * Mostra as famílias que ainda não receberam visita neste mês, colocando no topo
 * as que também ficaram sem visita no mês passado. Ao tocar em "Visitado",
 * a família vai para o fim da fila e conta como visitada no mês corrente.
 */
import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations } from "@/hooks/useAcsData";
import type { Family, Visit } from "@/lib/database";

function chaveMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function mesDaVisita(v: Visit) {
  const iso = v.realizada_em || v.agendada_em;
  return iso ? iso.slice(0, 7) : "";
}

export function FilaVisitasMes({
  families,
  visits,
}: {
  families: Family[];
  visits: Visit[];
}) {
  const { user } = useAcs();
  const { criarVisita } = useAcsMutations();
  const [salvando, setSalvando] = useState<string | null>(null);

  const agora = new Date();
  const mesAtual = chaveMes(agora);
  const mesPassado = chaveMes(new Date(agora.getFullYear(), agora.getMonth() - 1, 1));

  const fila = useMemo(() => {
    const realizadas = visits.filter((v) => v.status === "realizada");
    const doMes = new Map<string, string>();
    const doMesPassado = new Set<string>();
    for (const v of realizadas) {
      const mes = mesDaVisita(v);
      if (mes === mesAtual) {
        const anterior = doMes.get(v.family_id);
        const quando = v.realizada_em || v.agendada_em || "";
        if (!anterior || quando > anterior) doMes.set(v.family_id, quando);
      }
      if (mes === mesPassado) doMesPassado.add(v.family_id);
    }

    return families
      .map((f) => ({
        familia: f,
        visitadaEm: doMes.get(f.id) ?? null,
        atrasada: !doMesPassado.has(f.id),
      }))
      .sort((a, b) => {
        // 1) pendentes antes das visitadas
        if (!!a.visitadaEm !== !!b.visitadaEm) return a.visitadaEm ? 1 : -1;
        if (a.visitadaEm && b.visitadaEm) return a.visitadaEm.localeCompare(b.visitadaEm);
        // 2) entre as pendentes, quem ficou sem visita no mês passado vem primeiro
        if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
        return (a.familia.nome || "").localeCompare(b.familia.nome || "");
      });
  }, [families, visits, mesAtual, mesPassado]);

  const pendentes = fila.filter((i) => !i.visitadaEm).length;

  async function marcarVisitado(familyId: string) {
    setSalvando(familyId);
    try {
      const agoraIso = new Date().toISOString();
      await criarVisita({
        family_id: familyId,
        agendada_em: agoraIso,
        realizada_em: agoraIso,
        status: "realizada",
        motivo: "Visita mensal",
        anotacoes: null,
        user_id: user?.id ?? "",
      });
      toast.success("Visita registrada. A família foi para o fim da fila.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a visita.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Card className="glass-card overflow-hidden border-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 p-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base font-bold">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          Fila de visitas do mês
        </CardTitle>
        <Badge variant="secondary" className="shrink-0">
          {pendentes} pendente{pendentes === 1 ? "" : "s"}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {fila.length === 0 ? (
          <EmptyState
            icone={ClipboardCheck}
            titulo="Nenhuma família cadastrada"
            descricao="Cadastre as famílias da sua micro-área para montar a fila de visitas do mês."
          />
        ) : (
          <ul className="space-y-2.5">
            {fila.map(({ familia, visitadaEm, atrasada }) => (
              <li
                key={familia.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 transition-colors hover:bg-card"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to="/familias/$id"
                    params={{ id: familia.id }}
                    className="truncate font-medium underline-offset-4 hover:underline"
                  >
                    {familia.nome || "Família"}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {visitadaEm
                      ? "Visitada neste mês"
                      : atrasada
                        ? "Sem visita no mês passado — prioridade"
                        : "Aguardando visita deste mês"}
                  </p>
                </div>
                {visitadaEm ? (
                  <Badge className="shrink-0 gap-1">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" /> Visitado
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={atrasada ? "default" : "outline"}
                    className="shrink-0"
                    disabled={salvando === familia.id}
                    onClick={() => void marcarVisitado(familia.id)}
                  >
                    {salvando === familia.id ? "Registrando…" : "Visitado"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
