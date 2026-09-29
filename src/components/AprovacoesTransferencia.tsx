/**
 * Aprovação, pelos administradores, das transferências de família entre unidades.
 * Só depois do OK das duas unidades os dados podem viajar.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import {
  aprovarPedido,
  listarPedidosDaUnidade,
  recusarPedido,
  STATUS_PEDIDO_LABEL,
} from "@/lib/transferenciasUnidade";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AprovacoesTransferencia() {
  const queryClient = useQueryClient();
  const { perfil } = useAcs();
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-unidade", perfil?.unitId],
    enabled: !!perfil?.unitId,
    queryFn: () => listarPedidosDaUnidade(perfil!.unitId!),
  });

  async function responder(id: string, lado: "origem" | "destino", aprovar: boolean) {
    try {
      if (aprovar) await aprovarPedido(id, lado);
      else await recusarPedido(id);
      await queryClient.invalidateQueries({ queryKey: ["pedidos-unidade"] });
      toast.success(aprovar ? "Transferência autorizada." : "Transferência recusada.");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível responder.");
    }
  }

  const abertos = pedidos.filter(
    (p) => p.status === "aguardando_gestores" || p.status === "aprovada",
  );

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
          <ArrowLeftRight className="size-4" /> Famílias mudando de unidade
        </CardTitle>
        <CardDescription>
          Os administradores das duas unidades precisam autorizar antes de os dados seguirem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : abertos.length === 0 ? (
          <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
            Nenhum pedido aguardando autorização.
          </p>
        ) : (
          abertos.map((p) => {
            const lado: "origem" | "destino" =
              p.origemUnitId === perfil?.unitId ? "origem" : "destino";
            const jaAprovei = lado === "origem" ? p.aprovacaoOrigem : p.aprovacaoDestino;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">Pedido {p.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {lado === "origem" ? "Saindo da sua unidade" : "Chegando na sua unidade"} —{" "}
                    {STATUS_PEDIDO_LABEL[p.status]}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant={p.aprovacaoOrigem ? "secondary" : "outline"}>
                      Origem {p.aprovacaoOrigem ? "OK" : "pendente"}
                    </Badge>
                    <Badge variant={p.aprovacaoDestino ? "secondary" : "outline"}>
                      Destino {p.aprovacaoDestino ? "OK" : "pendente"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={jaAprovei}
                    onClick={() => void responder(p.id, lado, true)}
                  >
                    <Check className="size-4" /> {jaAprovei ? "Autorizado" : "Autorizar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void responder(p.id, lado, false)}
                  >
                    <X className="size-4" /> Recusar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
