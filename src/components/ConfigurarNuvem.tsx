import { useState } from "react";
import { CloudCog, Download, FileJson, HardDriveDownload, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAcs } from "@/auth/AcsProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { baixarCopiaJson, gerarBackup, restaurarBackup } from "@/sync/backup";

function mensagemDaNuvem(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : "";
  const codigo = (erro as { code?: string })?.code ?? "";
  if (/unauthorized-domain/i.test(codigo + mensagem)) {
    const dominio = typeof window !== "undefined" ? window.location.hostname : "este endereço";
    return `Este endereço (${dominio}) ainda não está liberado na conta do Firebase. Adicione-o à lista de domínios autorizados do login e tente de novo.`;
  }
  if (/popup.*block/i.test(codigo + mensagem))
    return "O navegador bloqueou a janela de acesso. Libere pop-ups e tente novamente.";
  if (/cancel|closed|fechad/i.test(codigo + mensagem))
    return "A conexão foi cancelada antes de terminar.";
  if (/network|fetch|offline/i.test(codigo + mensagem))
    return "Sem conexão com a nuvem. Verifique a internet e tente novamente.";
  return mensagem || "Não foi possível conectar à nuvem.";
}

function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Conexão com o nuvem da equipe da equipe e cópias de segurança. */
export function ConfigurarNuvem() {
  const { provedor, conectarProvedor, desconectarProvedor, chave, perfil, sincronizarAgora } =
    useAcs();
  const [ocupado, setOcupado] = useState(false);

  async function conectar() {
    setOcupado(true);
    try {
      await conectarProvedor("firebase");
      toast.success("Nuvem conectada e cópia criptografada enviada.");
    } catch (erro) {
      toast.error(mensagemDaNuvem(erro));
    } finally {
      setOcupado(false);
    }
  }

  async function baixarBackup() {
    if (!chave || !perfil?.unitId) return toast.error("Libere o aparelho com a senha da equipe.");
    baixarArquivo(
      await gerarBackup(chave, perfil.unitId),
      `backup-acs-${new Date().toISOString().slice(0, 10)}.acsenc`,
    );
    toast.success("Backup criptografado gerado.");
  }

  async function baixarJson() {
    if (!perfil?.unitId) return toast.error("Sua conta ainda não está vinculada a uma unidade.");
    baixarArquivo(
      await baixarCopiaJson(perfil.unitId),
      `copia-acs-${new Date().toISOString().slice(0, 10)}.json`,
    );
    toast.success("Cópia em JSON salva no aparelho.");
  }

  async function subirBackup(arquivo?: File | null) {
    if (!arquivo || !chave || !perfil?.unitId) return;
    try {
      const total = await restaurarBackup(chave, perfil.unitId, arquivo);
      toast.success(`${total} registro(s) restaurado(s).`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Arquivo inválido ou senha diferente.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
          <CloudCog className="size-4" /> Cópia de segurança
        </CardTitle>
        <CardDescription>
          Os dados ficam primeiro no seu aparelho. Quando houver internet, a cópia sobe para a
          nuvem da sua unidade, sempre embaralhada — só quem tem a senha da equipe consegue abrir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={baixarBackup}>
            <Download className="size-4" /> Baixar backup
          </Button>
          <Button variant="outline" size="sm" onClick={baixarJson}>
            <FileJson className="size-4" /> Cópia em JSON
          </Button>
          <Button asChild variant="outline" size="sm">
          <label>
            <input
              type="file"
              accept=".acsenc,.json"
              className="hidden"
              onChange={(e) => void subirBackup(e.target.files?.[0])}
            />
            <Upload className="size-4" /> Restaurar backup
          </label>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void sincronizarAgora()}>
            <HardDriveDownload className="size-4" /> Sincronizar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
