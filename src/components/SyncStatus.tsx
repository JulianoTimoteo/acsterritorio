import { Cloud, CloudOff, CloudUpload, RefreshCw, ShieldAlert, TriangleAlert } from "lucide-react";
import { useAcs } from "@/auth/AcsProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { logOut } from "@/lib/auth";

const TEXTO: Record<string, { rotulo: string; cor: string }> = {
  READY: { rotulo: "Tudo salvo", cor: "text-emerald-600" },
  SYNCING: { rotulo: "Sincronizando…", cor: "text-primary" },
  OFFLINE: { rotulo: "Sem internet — trabalhando no aparelho", cor: "text-amber-600" },
  SYNC_ERROR: { rotulo: "Falha ao sincronizar", cor: "text-destructive" },
  CONFLICT: { rotulo: "Há diferenças para revisar", cor: "text-amber-600" },
  STORAGE_NOT_CONFIGURED: { rotulo: "Cópia na nuvem não configurada", cor: "text-muted-foreground" },
  DEVICE_REVOKED: { rotulo: "Aparelho bloqueado pelo administrador", cor: "text-destructive" },
};

export function SyncStatus({ className }: { className?: string }) {
  const {
    estado,
    pendentes,
    ultimaSync,
    detalheSync,
    sincronizarAgora,
    conectarProvedor,
    online,
  } = useAcs();
  const info = TEXTO[estado] ?? TEXTO.READY;
  const Icone =
    estado === "OFFLINE"
      ? CloudOff
      : estado === "SYNCING"
        ? RefreshCw
        : estado === "SYNC_ERROR" || estado === "DEVICE_REVOKED"
          ? ShieldAlert
          : estado === "CONFLICT"
            ? TriangleAlert
            : pendentes > 0
              ? CloudUpload
              : Cloud;

  async function executar() {
    try {
      if (estado === "STORAGE_NOT_CONFIGURED") {
        await conectarProvedor("firebase");
        toast.success("Nuvem conectada e envio concluído.");
        return;
      }
      await sincronizarAgora();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível conectar ao nuvem da equipe.";
      toast.error(mensagem);
    }
  }

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
      <Icone className={cn("size-4 shrink-0", info.cor, estado === "SYNCING" && "animate-spin")} />
      <span className={cn("truncate", info.cor)}>
        {info.rotulo}
        {pendentes > 0 ? ` · ${pendentes} para enviar` : ""}
      </span>
      {online && estado !== "SYNCING" && (
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void executar()}>
          {estado === "STORAGE_NOT_CONFIGURED" ? "Conectar nuvem" : "Sincronizar"}
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void logOut().then(() => { window.location.href = "/auth"; })}>
        <LogOut className="size-3.5" /> Sair
      </Button>
      {detalheSync && estado !== "READY" && (
        <span className="basis-full text-muted-foreground">{detalheSync}</span>
      )}
      {ultimaSync && (
        <span className="hidden text-muted-foreground lg:inline">
          {new Date(ultimaSync).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </span>
      )}
    </div>
  );
}
