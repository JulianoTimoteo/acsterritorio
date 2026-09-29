import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Building2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations } from "@/hooks/useAcsData";
import { transferencias as repoTransferencias } from "@/database/repositories";
import { useAgentes, useAgentesDaUnidade } from "@/hooks/useAcesso";
import { listarUnidades } from "@/lib/unidades";
import { criarPedidoUnidade } from "@/lib/transferenciasUnidade";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = { familyId: string; familyNome: string };

/**
 * Transferência de família.
 * - Para um agente da MESMA unidade: direto, sem autorização.
 * - Para OUTRA unidade: precisa do OK dos administradores das duas unidades.
 */
export function TransferirFamilia({ familyId, familyNome }: Props) {
  const queryClient = useQueryClient();
  const { user, ctx, perfil } = useAcs();
  const { data: agentes = [] } = useAgentes();
  const [open, setOpen] = useState(false);
  const [agente, setAgente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const [unidadeDestino, setUnidadeDestino] = useState("");
  const [agenteDestino, setAgenteDestino] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades"],
    queryFn: listarUnidades,
    enabled: open,
  });
  const { data: agentesDestino = [] } = useAgentesDaUnidade(unidadeDestino || null);

  useEffect(() => {
    if (!open) {
      setAgente("");
      setMotivo("");
      setUnidadeDestino("");
      setAgenteDestino("");
      setCodigoGerado(null);
    }
  }, [open]);

  async function enviarParaAgente() {
    if (!agente) return toast.error("Escolha o agente que vai receber a família.");
    setLoading(true);
    try {
      await repoTransferencias.criar(ctx!, {
        family_id: familyId,
        de_user_id: user?.id || "",
        para_user_id: agente,
        destino_externo: null,
        motivo: motivo || null,
        status: "pendente",
        respondida_em: null,
      });
      await queryClient.invalidateQueries();
      setOpen(false);
      toast.success("Transferência enviada ao agente da sua unidade.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar transferência.");
    } finally {
      setLoading(false);
    }
  }

  async function pedirTransferenciaDeUnidade() {
    if (!unidadeDestino) return toast.error("Escolha a unidade de destino.");
    if (!agenteDestino) return toast.error("Escolha o agente que vai receber na outra unidade.");
    setLoading(true);
    try {
      const { codigo } = await criarPedidoUnidade({
        familyId,
        origemUnitId: perfil!.unitId!,
        origemUserId: user!.id,
        destinoUnitId: unidadeDestino,
        destinoUserId: agenteDestino,
      });
      setCodigoGerado(codigo);
      await queryClient.invalidateQueries({ queryKey: ["pedidos-unidade"] });
      toast.success("Pedido criado. Agora os dois administradores precisam autorizar.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao pedir a transferência.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 sm:flex-none">
          <ArrowLeftRight className="size-4" /> Transferir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[Sora,sans-serif]">Transferir {familyNome}</DialogTitle>
          <DialogDescription>
            Moradores, visitas e consultas acompanham a família para o novo responsável.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="agente">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agente">Agente da minha unidade</TabsTrigger>
            <TabsTrigger value="unidade">Outra unidade</TabsTrigger>
          </TabsList>

          <TabsContent value="agente" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Agente que vai receber</Label>
              <Select value={agente} onValueChange={setAgente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente da sua unidade" />
                </SelectTrigger>
                <SelectContent>
                  {agentes.length === 0 ? (
                    <SelectItem value="vazio" disabled>
                      Nenhum outro agente aprovado nesta unidade
                    </SelectItem>
                  ) : (
                    agentes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome || "Agente"} {a.micro_area ? `— micro-área ${a.micro_area}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <MotivoCampo motivo={motivo} setMotivo={setMotivo} />
            <Button className="w-full" onClick={enviarParaAgente} disabled={loading}>
              {loading ? "Enviando…" : "Enviar transferência"}
            </Button>
          </TabsContent>

          <TabsContent value="unidade" className="space-y-4 pt-4">
            {codigoGerado ? (
              <div className="space-y-3 rounded-xl border p-4 text-center">
                <KeyRound className="mx-auto size-6 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Guarde este código. O agente da outra unidade vai precisar dele para abrir os
                  dados depois que os dois administradores autorizarem.
                </p>
                <p className="font-[Sora,sans-serif] text-4xl font-bold tracking-[0.4em] text-primary">
                  {codigoGerado}
                </p>
                <p className="text-xs text-muted-foreground">
                  Acompanhe o andamento na aba Transferir.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Unidade de destino</Label>
                  <Select value={unidadeDestino} onValueChange={setUnidadeDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.filter((u) => u.id !== perfil?.unitId).length === 0 ? (
                        <SelectItem value="vazio" disabled>
                          Nenhuma outra unidade cadastrada
                        </SelectItem>
                      ) : (
                        unidades
                          .filter((u) => u.id !== perfil?.unitId)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agente que vai receber</Label>
                  <Select value={agenteDestino} onValueChange={setAgenteDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente da outra unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentesDestino.length === 0 ? (
                        <SelectItem value="vazio" disabled>
                          Escolha a unidade primeiro
                        </SelectItem>
                      ) : (
                        agentesDestino.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome || "Agente"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  <Building2 className="mt-0.5 size-4 shrink-0" />
                  Os administradores das duas unidades precisam autorizar. Depois disso a família
                  fica arquivada aqui (nada é apagado) e os dados seguem para o novo agente.
                </p>
                <Button
                  className="w-full"
                  onClick={pedirTransferenciaDeUnidade}
                  disabled={loading}
                >
                  {loading ? "Enviando pedido…" : "Pedir transferência para outra unidade"}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MotivoCampo({
  motivo,
  setMotivo,
}: {
  motivo: string;
  setMotivo: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="motivo">Motivo (opcional)</Label>
      <Textarea
        id="motivo"
        placeholder="Mudança de endereço, troca de micro-área…"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
    </div>
  );
}
