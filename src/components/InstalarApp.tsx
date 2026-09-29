import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Botão "Instalar aplicativo".
 * Usa o prompt nativo quando disponível (Android/Chrome/Edge) e mostra
 * instruções no iOS (Safari não expõe beforeinstallprompt).
 */
export function InstalarApp({
  className,
  variant = "secondary",
  size = "sm",
  rotulo = "Instalar app",
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  rotulo?: string;
}) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error propriedade só existe no Safari iOS
      window.navigator.standalone === true;
    setInstalado(standalone);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIos(isIos);

    // Verificação de primeira vez (sessionStorage para não ser irritante toda hora)
    const checkFirstTime = () => {
      const shown = sessionStorage.getItem("pwa_prompt_shown");
      if (!shown && !standalone) {
        if (isIos) {
          setTimeout(() => setAjuda(true), 3000);
        }
        sessionStorage.setItem("pwa_prompt_shown", "true");
      }
    };

    checkFirstTime();

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
      
      const shown = sessionStorage.getItem("pwa_prompt_shown_native");
      if (!shown && !standalone) {
        setTimeout(() => {
          (e as PromptEvent).prompt();
        }, 3000);
        sessionStorage.setItem("pwa_prompt_shown_native", "true");
      }
    };

    const onInstalled = () => {
      setInstalado(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalado) return null;
  // Apenas renderiza o botão se houver suporte ou for iOS
  if (!prompt && !ios) return null;

  async function instalar() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      return;
    }
    setAjuda(true);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={instalar}
        className={cn("min-h-11 gap-2", className)}
      >
        <Download className="size-4 shrink-0" />
        <span className="truncate">{rotulo}</span>
      </Button>

      <Dialog open={ajuda} onOpenChange={setAjuda}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-[Sora,sans-serif]">Instalar no iPhone</DialogTitle>
            <DialogDescription>
              Em poucos toques o ACS Território fica na tela de início, como um aplicativo.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</div>
              <div className="flex items-start gap-2">
                <Share className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</div>
              <div className="flex items-start gap-2">
                <Plus className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Role e escolha <strong>Adicionar à Tela de Início</strong>.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</div>
              <div className="flex items-start gap-2">
                <Download className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Confirme em <strong>Adicionar</strong>. Pronto!
                </span>
              </div>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
