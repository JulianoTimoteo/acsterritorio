import { useEffect } from "react";
import { toast } from "sonner";
import { forcarAtualizacao, verificarVersao, verificarVersaoNoCarregamento } from "@/lib/versao";

const INTERVALO_CHECAGEM = 5 * 60_000; // 5 minutos

/**
 * Verifica a versão do app ao carregar (recarrega sozinho se estiver rodando
 * arquivos antigos de cache) e depois periodicamente, avisando o usuário.
 */
export function useVersaoApp() {
  useEffect(() => {
    let ativo = true;

    void verificarVersaoNoCarregamento();

    async function checar() {
      if (!ativo || document.hidden) return;
      const nova = await verificarVersao();
      if (!ativo || !nova) return;
      toast("Nova versão disponível", {
        id: "nova-versao",
        description: "Atualize para carregar as melhorias mais recentes.",
        duration: Infinity,
        action: { label: "Atualizar agora", onClick: () => void forcarAtualizacao(nova) },
      });
    }

    const intervalo = window.setInterval(() => void checar(), INTERVALO_CHECAGEM);
    const aoVoltar = () => {
      if (!document.hidden) void checar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, []);
}
