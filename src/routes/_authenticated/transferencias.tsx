import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, X, Building2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import {
  transferencias as repoTransferencias,
  transferirFamiliaNaUnidade,
} from "@/database/repositories";
import { useFamilies } from "@/hooks/useAcsData";
import { STATUS_LABEL, useTransferencias } from "@/hooks/useTransferencias";
import {
  codigoGuardado,
  enviarPacoteTransferencia,
  listarPedidosDaUnidade,
  receberPacoteTransferencia,
  STATUS_PEDIDO_LABEL,
  type PedidoUnidade,
} from "@/lib/transferenciasUnidade";
import { VerificacaoOTP } from "@/components/VerificacaoOTP";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferências de famílias — ACS Território" },
      {
        name: "description",
        content:
          "Envie famílias para outro agente da sua unidade ou peça a transferência para outra unidade.",
      },
      { property: "og:title", content: "Transferências de famílias — ACS Território" },
      {
        property: "og:description",
        content: "Movimentação de famílias entre agentes e unidades de saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Transferencias,
});

function Transferencias() {
  const { user, ctx, perfil } = useAcs();
  const queryClient = useQueryClient();
  const { data: transferencias = [], isLoading } = useTransferencias();
  const { data: families = [] } = useFamilies();
  const [pedidoAtivo, setPedidoAtivo] = useState<{ pedido: PedidoUnidade; modo: "enviar" | "receber" } | null>(null);

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos-unidade", perfil?.unitId],
    enabled: !!perfil?.unitId,
    queryFn: () => listarPedidosDaUnidade(perfil!.unitId!),
  });

  const nomeFamilia = (id: string) =>
    families.find((f) => f.id === id)?.nome ?? "Família transferida";

  async function responder(id: string, aceitar: boolean) {
    try {
      if (aceitar) {
        const t = transferencias.find((x) => x.id === id);
        if (t && ctx && user?.id) {
          await transferirFamiliaNaUnidade(ctx, t.family_id, t.de_user_id, user.id);
        }
        await repoTransferencias.atualizar(ctx!, id, {
          status: "concluida",
          respondida_em: new Date().toISOString(),
        } as any);
      } else {
        await repoTransferencias.atualizar(ctx!, id, {
          status: "recusada",
          respondida_em: new Date().toISOString(),
        } as any);
      }
      toast.success(aceitar ? "Família recebida na sua área." : "Transferência recusada.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar.");
    }
  }

  async function confirmarCodigo(codigo: string) {
    if (!pedidoAtivo) return false;
    try {
      if (pedidoAtivo.modo === "enviar") {
        await enviarPacoteTransferencia(pedidoAtivo.pedido, codigo);
        toast.success("Dados enviados. A família ficou arquivada na sua lista.");
      } else {
        const total = await receberPacoteTransferencia(pedidoAtivo.pedido, codigo, {
          unitId: perfil!.unitId!,
          userId: user!.id,
        });
        toast.success(`${total} registro(s) recebidos na sua área.`);
      }
      await queryClient.invalidateQueries();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Não foi possível concluir.");
      return false;
    }
  }

  async function abrirEnvio(pedido: PedidoUnidade) {
    const salvo = await codigoGuardado(pedido.id);
    if (salvo) {
      setPedidoAtivo({ pedido, modo: "enviar" });
      return;
    }
    setPedidoAtivo({ pedido, modo: "enviar" });
  }

  const recebidas = transferencias.filter(
    (t) => t.para_user_id === user?.id && t.status === "pendente",
  );
  const historico = transferencias.filter((t) => !recebidas.includes(t));

  return (
    <div className="page-fade-in space-y-5">
      <PageHeader
        titulo="Transferências"
        descricao="Famílias que saíram da sua área ou que outro agente enviou para você."
        icone={ArrowLeftRight}
      />

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">
            Recebidas aguardando resposta{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({recebidas.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {recebidas.length === 0 ? (
            <EmptyState
              icone={ArrowLeftRight}
              titulo="Nenhuma transferência pendente"
              descricao="Quando outro agente enviar uma família para você, ela aparece aqui."
            />
          ) : (
            recebidas.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{nomeFamilia(t.family_id)}</p>
                  {t.motivo && <p className="text-sm text-muted-foreground">{t.motivo}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => responder(t.id, true)}
                  >
                    <Check className="size-4" /> Aceitar
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => responder(t.id, false)}
                  >
                    <X className="size-4" /> Recusar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
            <Building2 className="size-4" /> Entre unidades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {pedidos.length === 0 ? (
            <EmptyState
              icone={Building2}
              titulo="Nenhum pedido entre unidades"
              descricao="Abra a família, toque em “Transferir” e escolha “Outra unidade”."
            />
          ) : (
            pedidos.map((p) => {
              const souOrigem = p.origemUserId === user?.id;
              const souDestino = p.destinoUserId === user?.id;
              return (
                <div key={p.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{nomeFamilia(p.familyId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {souOrigem ? "Saindo da sua área" : "Chegando para você"} —{" "}
                      {STATUS_PEDIDO_LABEL[p.status]}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant={p.aprovacaoOrigem ? "secondary" : "outline"}>
                        Administrador de origem {p.aprovacaoOrigem ? "OK" : "pendente"}
                      </Badge>
                      <Badge variant={p.aprovacaoDestino ? "secondary" : "outline"}>
                        Administrador de destino {p.aprovacaoDestino ? "OK" : "pendente"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {souOrigem && p.status === "aprovada" && (
                      <Button size="sm" onClick={() => void abrirEnvio(p)}>
                        <KeyRound className="size-4" /> Enviar dados
                      </Button>
                    )}
                    {souDestino && p.status === "enviada" && (
                      <Button size="sm" onClick={() => setPedidoAtivo({ pedido: p, modo: "receber" })}>
                        <KeyRound className="size-4" /> Receber com código
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-[Sora,sans-serif] text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : historico.length === 0 ? (
            <EmptyState
              icone={Building2}
              titulo="Nenhuma movimentação registrada"
              descricao="Abra uma família e use “Transferir” para enviá-la a outro agente ou unidade."
            />
          ) : (
            historico.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {t.destino_externo ? (
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">{nomeFamilia(t.family_id)}</span>
                  <Badge variant={t.status === "recusada" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.destino_externo
                    ? `Enviada para ${t.destino_externo}`
                    : t.de_user_id === user?.id
                      ? "Enviada para outro agente"
                      : "Recebida de outro agente"}
                  {t.motivo ? ` — ${t.motivo}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Para enviar uma família, abra o cadastro dela em{" "}
        <Link to="/familias" className="underline">
          Famílias
        </Link>
        .
      </p>

      <Dialog open={!!pedidoAtivo} onOpenChange={(v) => !v && setPedidoAtivo(null)}>
        <DialogContent className="flex max-w-sm justify-center border-none bg-transparent p-0 shadow-none">
          {pedidoAtivo && (
            <VerificacaoOTP
              titulo={pedidoAtivo.modo === "enviar" ? "Confirmar envio" : "Receber família"}
              descricao="Digite o código de 4 dígitos gerado no pedido de transferência."
              aoVerificar={confirmarCodigo}
              aoConcluir={() => setPedidoAtivo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
