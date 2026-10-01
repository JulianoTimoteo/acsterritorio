/**
 * Aba "Unidades" da Administração.
 * O gestor cria a sua unidade e a senha de acesso dela (a senha só aparece
 * para quem criou, neste aparelho), e pode passar a unidade para outro gestor
 * já cadastrado. Ninguém cuida de duas unidades ao mesmo tempo.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Building2, Eye, EyeOff, Loader2, Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useAcs } from "@/auth/AcsProvider";
import { criarUnidade, listarUnidades, senhaGuardada, transferirUnidade } from "@/lib/unidades";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GerenciarUnidades() {
  const queryClient = useQueryClient();
  const { perfil, recarregarPerfil } = useAcs();
  const souMaster = perfil?.funcao === "master";
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState<string | null>(null);
  const [gestorEscolhido, setGestorEscolhido] = useState<Record<string, string>>({});

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: listarUnidades,
  });

  const { data: gestores = [] } = useQuery({
    queryKey: ["gestores", perfil?.unitId, perfil?.funcao],
    enabled: !!perfil,
    queryFn: async () => {
      const base = collection(db, "profiles");
      const q =
        perfil?.funcao === "master"
          ? query(base, where("funcao", "==", "admin"))
          : query(
              base,
              where("funcao", "==", "admin"),
              where("unitId", "==", perfil?.unitId ?? "__nenhuma__")
            );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, nome: (d.data() as any).nome as string | undefined }));
    },
  });

  const minhas = souMaster ? unidades : unidades.filter((u) => u.gestorId === perfil?.id);

  async function criar() {
    if (senha !== confirmar) return toast.error("As duas senhas precisam ser iguais.");
    setSalvando(true);
    try {
      await criarUnidade(nome, senha, perfil!.id);
      setNome("");
      setSenha("");
      setConfirmar("");
      await queryClient.invalidateQueries({ queryKey: ["unidades"] });
      await recarregarPerfil();
      toast.success("Unidade criada. Guarde bem a senha de acesso.");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível criar a unidade.");
    } finally {
      setSalvando(false);
    }
  }

  async function passarAdiante(unitId: string) {
    const novoGestor = gestorEscolhido[unitId];
    if (!novoGestor) return toast.error("Escolha o gestor que vai receber a unidade.");
    try {
      const trocada = await transferirUnidade(unitId, novoGestor, perfil!.id);
      await queryClient.invalidateQueries({ queryKey: ["unidades"] });
      await recarregarPerfil();
      toast.success(
        trocada
          ? `Unidade entregue. Você passou a cuidar de ${trocada.nome}.`
          : "Unidade entregue ao novo gestor.",
      );
    } catch (err: any) {
      toast.error(err.message || "Não foi possível passar a unidade.");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
            <Plus className="size-4" /> Criar unidade
          </CardTitle>
          <CardDescription>
            A senha de acesso protege os dados da unidade em todos os aparelhos e aparece apenas
            para você, neste celular.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="un-nome">Nome da unidade</Label>
            <Input 
              id="un-nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              autoComplete="off" 
              data-1p-ignore 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="un-senha">Senha de acesso</Label>
            <Input
              id="un-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              data-1p-ignore
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="un-conf">Repetir a senha</Label>
            <Input
              id="un-conf"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              data-1p-ignore
            />
          </div>
          <div className="sm:col-span-3">
            <Button onClick={criar} disabled={salvando} className="w-full sm:w-auto">
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
              Criar unidade
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-[Sora,sans-serif] text-base">Minhas unidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : minhas.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Você ainda não criou nenhuma unidade.
            </p>
          ) : (
            minhas.map((u) => {
              const senhaLocal = senhaGuardada(u.id);
              return (
                <div key={u.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <span className="font-semibold">{u.nome}</span>
                    {u.gestorId === perfil?.id && <Badge variant="secondary">Você gerencia</Badge>}
                  </div>
                  {senhaLocal && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      Senha de acesso:{" "}
                      <span className="font-mono">
                        {mostrarSenha === u.id ? senhaLocal : "••••••••"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mostrar ou esconder a senha"
                        onClick={() => setMostrarSenha(mostrarSenha === u.id ? null : u.id)}
                      >
                        {mostrarSenha === u.id ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={gestorEscolhido[u.id] ?? ""}
                      onValueChange={(v) => setGestorEscolhido({ ...gestorEscolhido, [u.id]: v })}
                    >
                      <SelectTrigger className="sm:w-72">
                        <SelectValue placeholder="Passar a unidade para outro gestor" />
                      </SelectTrigger>
                      <SelectContent>
                        {gestores.filter((g) => g.id !== perfil?.id).length === 0 ? (
                          <SelectItem value="vazio" disabled>
                            Nenhum outro gestor cadastrado
                          </SelectItem>
                        ) : (
                          gestores
                            .filter((g) => g.id !== perfil?.id)
                            .map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.nome || "Gestor"}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => void passarAdiante(u.id)}>
                      <UserCog className="size-4" /> Entregar unidade
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
