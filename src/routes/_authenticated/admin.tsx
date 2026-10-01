import { useAcs } from "@/auth/AcsProvider";
import { ConfigurarNuvem } from "@/components/ConfigurarNuvem";
import { GerenciarUnidades } from "@/components/GerenciarUnidades";
import { AprovacoesTransferencia } from "@/components/AprovacoesTransferencia";
import { PermissoesAbas } from "@/components/PermissoesAbas";
import { EMAIL_MASTER } from "@/auth/permissions";
import {
  autorizarDispositivo,
  listarDispositivos,
  revogarDispositivo,
  type Dispositivo,
} from "@/devices/deviceManager";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  Loader2,
  History,
  Search,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { currentUserId } from "@/lib/acs";
import { useEhAdmin, useUsuarios, useLogsAdmin } from "@/hooks/useAcesso";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type UsuarioAdmin = {
  id: string;
  nome?: string;
  email?: string;
  aprovado?: boolean;
  admin?: boolean;
  unidade?: string;
  unitId?: string | null;
  abas?: string[] | null;
};

type LogAdmin = {
  id: string;
  created_at?: string;
  actor_id?: string;
  action?: string;
  target_id?: string;
  details?: unknown;
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — ACS Território" },
      {
        name: "description",
        content: "Aprove novos agentes e conceda acesso de administrador no ACS Território.",
      },
      { property: "og:title", content: "Administração — ACS Território" },
      {
        property: "og:description",
        content: "Aprovação de agentes e gestão de administradores do território.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const queryClient = useQueryClient();
  const { perfil: perfilAtual } = useAcs();
  const { data: ehAdmin, isLoading: carregandoPapel } = useEhAdmin();
  const { data: usuarios = [], isLoading } = useUsuarios(Boolean(ehAdmin));
  const { data: logs = [], isLoading: carregandoLogs } = useLogsAdmin();
  const { data: dispositivos = [], isLoading: carregandoDispositivos } = useQuery({
    queryKey: ["dispositivos", perfilAtual?.unitId, perfilAtual?.funcao],
    enabled: Boolean(ehAdmin && perfilAtual),
    queryFn: () =>
      listarDispositivos(perfilAtual?.funcao === "master" ? null : perfilAtual?.unitId),
  });
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  async function acao(id: string, fn: () => Promise<void>) {
    setOcupado(id);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["ehAdmin"] });
      await queryClient.invalidateQueries({ queryKey: ["admin_logs"] });
      await queryClient.invalidateQueries({ queryKey: ["gestores"] });
      toast.success("Permissões atualizadas.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setOcupado(null);
    }
  }

  if (carregandoPapel)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  if (!ehAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Esta área é restrita aos administradores do território.
        </CardContent>
      </Card>
    );
  }

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      u.email?.toLowerCase().includes(busca.toLowerCase()),
  );

  const pendentes = usuariosFiltrados.filter((u) => !u.aprovado);
  const aprovados = usuariosFiltrados.filter((u) => u.aprovado);

  async function mudarStatusDispositivo(dispositivo: Dispositivo, autorizar: boolean) {
    if (!dispositivo.unitId && !perfilAtual?.unitId) {
      toast.error("Vincule o usuário a uma unidade antes de autorizar o aparelho.");
      return;
    }
    await acao(`device:${dispositivo.id}`, async () => {
      if (autorizar) {
        await autorizarDispositivo(dispositivo.id, dispositivo.unitId || perfilAtual!.unitId!);
      } else {
        await revogarDispositivo(dispositivo.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    });
  }

  async function enviarRedefinicao(u: UsuarioAdmin) {
    if (!u.email) {
      toast.error("Este usuário não tem e-mail cadastrado.");
      return;
    }
    await acao(`reset:${u.id}`, async () => {
      const actorId = await currentUserId();
      await sendPasswordResetEmail(auth, u.email!);
      await addDoc(collection(db, "admin_logs"), {
        action: "redefinir_senha",
        actor_id: actorId,
        target_id: u.id,
        created_at: new Date().toISOString(),
      });
    });
  }

  function Linha({ u }: { u: UsuarioAdmin }) {
    const trabalhando = ocupado === u.id;
    const redefinindo = ocupado === `reset:${u.id}`;
    // A conta master não pode ser revogada nem rebaixada por ninguém.
    const protegido =
      (u as { funcao?: string }).funcao === "master" ||
      (u.email || "").toLowerCase() === EMAIL_MASTER;
    const souMaster = perfilAtual?.funcao === "master";
    const BotaoSenha = souMaster ? (
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        disabled={redefinindo}
        onClick={() => void enviarRedefinicao(u)}
      >
        {redefinindo ? <Loader2 className="size-3 animate-spin" /> : <KeyRound className="size-3" />}
        Redefinir senha
      </Button>
    ) : null;
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between bg-card hover:bg-accent/5 transition-colors">
        <div className="min-w-0">
          <p className="truncate font-semibold">{u.nome || "Sem nome"}</p>
          <p className="truncate text-sm text-muted-foreground">{u.email}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant={u.aprovado ? "secondary" : "destructive"} className="text-[10px]">
              {u.aprovado ? "Aprovado" : "Pendente"}
            </Badge>
            {u.admin && (
              <Badge
                variant="default"
                className="text-[10px] bg-primary/20 text-primary border-primary/30"
              >
                Admin
              </Badge>
            )}
            {u.unidade && (
              <Badge variant="outline" className="text-[10px]">
                {u.unidade}
              </Badge>
            )}
          </div>
        </div>
        {protegido ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Badge variant="outline" className="self-start text-[10px] sm:self-center">
              Conta protegida
            </Badge>
            {BotaoSenha}
          </div>
        ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {BotaoSenha}
          <PermissoesAbas userId={u.id} nome={u.nome || u.email || "usuário"} abasAtuais={u.abas} />
          <Button
            size="sm"
            variant={u.aprovado ? "outline" : "default"}
            className="h-8 text-xs gap-1.5"
            disabled={trabalhando}
            onClick={() =>
              acao(u.id, async () => {
                const actorId = await currentUserId();
                await updateDoc(doc(db, "profiles", u.id), {
                  aprovado: !u.aprovado,
                  aprovado_em: !u.aprovado ? new Date().toISOString() : null,
                  unitId: u.unitId ?? perfilAtual?.unitId ?? null,
                });
                await addDoc(collection(db, "admin_logs"), {
                  action: u.aprovado ? "revogar_aprovacao" : "definir_aprovacao",
                  actor_id: actorId,
                  target_id: u.id,
                  created_at: new Date().toISOString(),
                });
              })
            }
          >
            {trabalhando ? (
              <Loader2 className="size-3 animate-spin" />
            ) : u.aprovado ? (
              <UserX className="size-3" />
            ) : (
              <UserCheck className="size-3" />
            )}
            {u.aprovado ? "Revogar" : "Aprovar"}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            variant="outline"
            disabled={trabalhando}
            onClick={() =>
              acao(u.id, async () => {
                if (!u.admin) {
                  const jaExisteAdmin = usuarios.some(
                    (other) => other.id !== u.id && other.admin && other.unitId === u.unitId
                  );
                  if (jaExisteAdmin) {
                    throw new Error("Esta unidade já possui um gestor. Remova o gestor atual antes de promover outro.");
                  }
                }
                const actorId = await currentUserId();
                await updateDoc(doc(db, "profiles", u.id), {
                  funcao: u.admin ? "agente" : "admin",
                });
                await addDoc(collection(db, "admin_logs"), {
                  action: "definir_admin",
                  actorId,
                  target_id: u.id,
                  details: { admin: !u.admin },
                  created_at: new Date().toISOString(),
                });
              })
            }
          >
            {u.admin ? <ShieldOff className="size-3" /> : <ShieldCheck className="size-3" />}
            {u.admin ? "Remover Admin" : "Tornar Admin"}
          </Button>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[Sora,sans-serif] text-2xl font-bold tracking-tight">
            Administração
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de acessos, permissões e auditoria do território.
          </p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid gap-6">
            <ConfigurarNuvem />
            <AprovacoesTransferencia />

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-[Sora,sans-serif] text-base flex items-center justify-between">
                  Pedidos pendentes
                  <Badge variant="destructive">{pendentes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex py-4 justify-center">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                ) : pendentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    Nenhum pedido pendente.
                  </p>
                ) : (
                  pendentes.map((u) => <Linha key={u.id} u={u} />)
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-[Sora,sans-serif] text-base flex items-center justify-between">
                  Usuários aprovados
                  <Badge variant="secondary">{aprovados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aprovados.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum usuário aprovado.
                  </p>
                ) : (
                  aprovados.map((u) => <Linha key={u.id} u={u} />)
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-[Sora,sans-serif] text-base">Aparelhos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {carregandoDispositivos ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : dispositivos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum aparelho registrado.
                  </p>
                ) : (
                  dispositivos.map((dispositivo) => (
                    <div
                      key={dispositivo.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{dispositivo.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {dispositivo.id} · {dispositivo.status}
                        </p>
                      </div>
                      {dispositivo.status === "ativo" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={ocupado === `device:${dispositivo.id}`}
                          onClick={() => void mudarStatusDispositivo(dispositivo, false)}
                        >
                          Revogar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={ocupado === `device:${dispositivo.id}`}
                          onClick={() => void mudarStatusDispositivo(dispositivo, true)}
                        >
                          Autorizar
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="unidades" className="mt-4">
          <GerenciarUnidades />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-[Sora,sans-serif] text-base flex items-center gap-2">
                <History className="size-4" /> Histórico de Ações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carregandoLogs ? (
                <div className="flex py-10 justify-center">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Nenhum log registrado ainda.
                </p>
              ) : (
                <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[17px] before:w-[1px] before:bg-border">
                  {(logs as LogAdmin[]).map((log) => (
                    <div key={log.id} className="relative pl-10">
                      <div className="absolute left-2.5 top-1.5 size-4 rounded-full border-4 border-background bg-primary ring-4 ring-background" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {log.created_at
                            ? format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", {
                                locale: ptBR,
                              })
                            : "Data desconhecida"}
                        </span>
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">
                            {log.actor_id || "Sistema"}
                          </span>
                          {" executou "}
                          <span className="font-mono text-[11px] bg-secondary px-1.5 py-0.5 rounded">
                            {log.action}
                          </span>
                          {" em "}
                          <span className="font-semibold">{log.target_id || "Usuário"}</span>
                        </p>
                        {log.details != null && (
                          <p className="text-xs text-muted-foreground italic">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
