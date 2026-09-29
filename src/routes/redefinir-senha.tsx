import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartbeatLoader } from "@/components/HeartbeatLoader";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — ACS Território" },
      {
        name: "description",
        content: "Crie uma nova senha de acesso à sua conta de agente comunitário de saúde.",
      },
      { property: "og:title", content: "Redefinir senha — ACS Território" },
      {
        property: "og:description",
        content: "Crie uma nova senha para voltar a acessar o ACS Território.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres.");
    if (senha !== confirmacao) return toast.error("As senhas não conferem.");

    const codigo = new URLSearchParams(window.location.search).get("oobCode");
    if (!codigo) return toast.error("O link de recuperação é inválido ou está incompleto.");
    setLoading(true);
    try {
      await verifyPasswordResetCode(auth, codigo);
      await confirmPasswordReset(auth, codigo, senha);
      toast.success("Senha alterada! Você já pode entrar no aplicativo.");
      window.location.assign("/auth");
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "";
      toast.error(
        /expired|invalid-action-code/i.test(mensagem)
          ? "O link expirou. Peça uma nova recuperação de senha."
          : "Não foi possível alterar a senha. Solicite um novo link.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 font-[Sora,sans-serif] text-lg font-bold text-primary"
        >
          {loading ? (
            <HeartbeatLoader size="sm" className="size-5" />
          ) : (
            <Activity aria-hidden="true" className="size-5" />
          )}
          ACS Território
        </Link>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold font-[Sora,sans-serif]">Nova senha</h1>
            <CardDescription>
              Escolha uma senha com no mínimo 8 caracteres, que você não use em outros sites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova">Nova senha</Label>
                <Input
                  id="nova"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirma">Repita a nova senha</Label>
                <Input
                  id="confirma"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando…" : "Salvar nova senha"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth">Voltar para o login</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
