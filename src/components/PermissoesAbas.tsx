/** Escolha de quais abas do aplicativo uma pessoa pode ver. */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";
import { LayoutList } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { ABAS } from "@/lib/abas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PermissoesAbas({
  userId,
  nome,
  abasAtuais,
}: {
  userId: string;
  nome: string;
  abasAtuais?: string[] | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [escolhidas, setEscolhidas] = useState<string[]>(
    abasAtuais && abasAtuais.length ? [...abasAtuais] : ABAS.map((a) => a.to),
  );

  function alternar(caminho: string) {
    setEscolhidas((atual) =>
      atual.includes(caminho) ? atual.filter((c) => c !== caminho) : [...atual, caminho],
    );
  }

  async function salvar() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, "profiles", userId), { abas: escolhidas });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Abas atualizadas.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível salvar as abas.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <LayoutList className="size-3" /> Abas
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[Sora,sans-serif]">Abas de {nome}</DialogTitle>
            <DialogDescription>
              Marque o que esta pessoa pode abrir no aplicativo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ABAS.map((a) => (
              <label key={a.to} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={escolhidas.includes(a.to)}
                  onCheckedChange={() => alternar(a.to)}
                />
                {a.label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
