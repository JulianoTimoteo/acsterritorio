/**
 * Cartão visível apenas para o master: cria/garante a conta de gestão
 * admin@santavitoria.com no Firebase, sem encerrar a sessão atual.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ShieldPlus, Loader2 } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAcs } from "@/auth/AcsProvider";
import { db } from "@/lib/firebase";
import { EMAIL_GESTOR, provisionarGestor } from "@/lib/provisionarGestor";

export function CriarGestor({ aoConcluir }: { aoConcluir?: () => void }) {
  const { perfil } = useAcs();
  const [ocupado, setOcupado] = useState(false);

  if (perfil?.funcao !== "master") return null;

  async function criar() {
    setOcupado(true);
    try {
      const { criado, uid } = await provisionarGestor(perfil?.unitId ?? null);
      await addDoc(collection(db, "admin_logs"), {
        action: criado ? "criar_gestor" : "atualizar_gestor",
        actor_id: perfil?.id ?? null,
        target_id: uid,
        details: { email: EMAIL_GESTOR },
        created_at: new Date().toISOString(),
      }).catch(() => undefined);
      toast.success(criado ? "Conta de gestão criada." : "Conta de gestão já existia e foi ativada.");
      aoConcluir?.();
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      const texto = erro instanceof Error ? erro.message : "";
      toast.error(
        codigo === "auth/operation-not-allowed"
          ? "Ative o login por e-mail e senha no Firebase para criar esta conta."
          : codigo === "auth/unauthorized-domain"
            ? "Autorize este endereço do aplicativo no Firebase antes de criar a conta."
            : codigo === "permission-denied" || /insufficient permissions/i.test(texto)
              ? "As regras de segurança do banco ainda não permitem criar contas. Publique as regras atualizadas e tente de novo."
              : texto || "Não foi possível criar a conta de gestão.",
      );
    } finally {

      setOcupado(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
          <ShieldPlus className="size-4" /> Conta de gestão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cria a conta <span className="font-medium text-foreground">{EMAIL_GESTOR}</span> com
          acesso administrativo à unidade: aprova pessoas, autoriza aparelhos e acompanha o
          histórico. Ela não enxerga nem altera a sua conta.
        </p>
        <Button onClick={() => void criar()} disabled={ocupado} className="gap-2">
          {ocupado ? <Loader2 className="size-4 animate-spin" /> : <ShieldPlus className="size-4" />}
          Criar conta de gestão
        </Button>
      </CardContent>
    </Card>
  );
}
