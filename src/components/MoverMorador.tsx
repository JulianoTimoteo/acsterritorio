/**
 * Move UM morador de família: casou, foi morar sozinho ou mudou de endereço.
 * Cria um novo cadastro de família com o endereço novo e leva o morador para lá,
 * sem apagar nada do cadastro antigo.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HousePlus } from "lucide-react";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import { useAcsMutations, useFamilies } from "@/hooks/useAcsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  residentId: string;
  residentNome: string;
  familyIdAtual: string;
};

export function MoverMorador({ residentId, residentNome, familyIdAtual }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAcs();
  const { criarFamilia, atualizarMorador } = useAcsMutations();
  const { data: families = [] } = useFamilies();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [destino, setDestino] = useState("");
  const [novo, setNovo] = useState({
    nome: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    micro_area: "",
  });

  async function moverParaExistente() {
    if (!destino) return toast.error("Escolha a família de destino.");
    setSalvando(true);
    try {
      await atualizarMorador(residentId, { family_id: destino });
      await queryClient.invalidateQueries();
      toast.success(`${residentNome} agora faz parte da outra família.`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível mover o morador.");
    } finally {
      setSalvando(false);
    }
  }

  async function moverParaNovaCasa() {
    if (!novo.nome.trim() || !novo.logradouro.trim()) {
      return toast.error("Informe o nome do novo cadastro e a rua.");
    }
    setSalvando(true);
    try {
      const familia = await criarFamilia({
        nome: novo.nome.trim().toUpperCase(),
        logradouro: novo.logradouro.trim().toUpperCase(),
        numero: novo.numero.trim() || null,
        bairro: novo.bairro.trim().toUpperCase() || null,
        cidade: novo.cidade.trim().toUpperCase() || null,
        micro_area: novo.micro_area.trim() || null,
        risco: "baixo",
        situacao: "ativa",
        user_id: user?.id ?? "",
      });
      await atualizarMorador(residentId, { family_id: familia.id });
      await queryClient.invalidateQueries();
      toast.success(`${residentNome} foi movido para o novo endereço.`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível criar o novo cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Mudar ${residentNome} de endereço`}
        title="Mudou de endereço"
        onClick={() => setOpen(true)}
      >
        <HousePlus className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[Sora,sans-serif]">Mudar {residentNome} de casa</DialogTitle>
            <DialogDescription>
              Use quando a pessoa casou, foi morar sozinha ou mudou de endereço. O cadastro antigo
              continua guardado.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="nova">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nova">Novo endereço</TabsTrigger>
              <TabsTrigger value="existente">Família já cadastrada</TabsTrigger>
            </TabsList>

            <TabsContent value="nova" className="space-y-3 pt-4">
              <div className="space-y-2">
                <Label htmlFor="mm-nome">Nome do novo cadastro *</Label>
                <Input
                  id="mm-nome"
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="mm-rua">Rua *</Label>
                  <Input
                    id="mm-rua"
                    value={novo.logradouro}
                    onChange={(e) => setNovo({ ...novo, logradouro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mm-num">Número</Label>
                  <Input
                    id="mm-num"
                    value={novo.numero}
                    onChange={(e) => setNovo({ ...novo, numero: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="mm-bairro">Bairro</Label>
                  <Input
                    id="mm-bairro"
                    value={novo.bairro}
                    onChange={(e) => setNovo({ ...novo, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mm-cidade">Cidade</Label>
                  <Input
                    id="mm-cidade"
                    value={novo.cidade}
                    onChange={(e) => setNovo({ ...novo, cidade: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mm-micro">Micro-área</Label>
                <Input
                  id="mm-micro"
                  value={novo.micro_area}
                  onChange={(e) => setNovo({ ...novo, micro_area: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button onClick={moverParaNovaCasa} disabled={salvando} className="w-full sm:w-auto">
                  {salvando ? "Salvando…" : "Criar cadastro e mover"}
                </Button>
              </DialogFooter>
              <p className="text-xs text-muted-foreground">
                Se a pessoa foi morar em outra unidade, crie o cadastro aqui e depois use
                “Transferir” na nova família para pedir a mudança de unidade.
              </p>
            </TabsContent>

            <TabsContent value="existente" className="space-y-3 pt-4">
              <div className="space-y-2">
                <Label>Família de destino</Label>
                <Select value={destino} onValueChange={setDestino}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent>
                    {families
                      .filter((f) => f.id !== familyIdAtual)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={moverParaExistente} disabled={salvando} className="w-full sm:w-auto">
                  {salvando ? "Movendo…" : "Mover morador"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
