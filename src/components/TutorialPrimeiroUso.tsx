import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BellRing,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAcs } from "@/auth/AcsProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const CHAVE_TUTORIAL = "acs.tutorial-abas.ocultar";

const PASSOS_COMUNS = [
  {
    titulo: "Painel",
    descricao: "Mostra um resumo do território, visitas próximas e avisos importantes do dia.",
    icone: LayoutDashboard,
  },
  {
    titulo: "Famílias",
    descricao: "Cadastre domicílios, moradores, contatos, condições de saúde e nível de risco.",
    icone: Users,
  },
  {
    titulo: "Visitas",
    descricao: "Agende visitas domiciliares e registre o atendimento depois que ele for realizado.",
    icone: CalendarCheck,
  },
  {
    titulo: "Consultas",
    descricao: "Organize consultas e exames com data, horário, especialidade, local e situação.",
    icone: ClipboardList,
  },
  {
    titulo: "Mapa",
    descricao: "Veja os domicílios da sua área e localize rapidamente as famílias acompanhadas.",
    icone: MapPin,
  },
  {
    titulo: "Avisos",
    descricao: "Acompanhe os lembretes de consultas e exames com 48 e 24 horas de antecedência.",
    icone: BellRing,
  },
  {
    titulo: "Transferir",
    descricao: "Encaminhe uma família para outro agente ou registre quando ela sair da área.",
    icone: ArrowLeftRight,
  },
] as const;

type TutorialPrimeiroUsoProps = {
  abrirSolicitado?: number;
};

export function TutorialPrimeiroUso({ abrirSolicitado = 0 }: TutorialPrimeiroUsoProps) {
  const { perfil } = useAcs();
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [naoMostrar, setNaoMostrar] = useState(false);

  const passos = useMemo(
    () =>
      perfil?.funcao === "master" || perfil?.funcao === "admin" || perfil?.funcao === "supervisor"
        ? [
            ...PASSOS_COMUNS,
            {
              titulo: "Administração",
              descricao: "Aprove usuários, autorize aparelhos e acompanhe o histórico da unidade.",
              icone: ShieldCheck,
            },
          ]
        : [...PASSOS_COMUNS],
    [perfil?.funcao],
  );

  const chaveUsuario = perfil ? `${CHAVE_TUTORIAL}.${perfil.id}` : null;

  useEffect(() => {
    if (!chaveUsuario) return;
    if (localStorage.getItem(chaveUsuario) !== "sim") setAberto(true);
  }, [chaveUsuario]);

  useEffect(() => {
    if (abrirSolicitado <= 0) return;
    setPasso(0);
    setNaoMostrar(false);
    setAberto(true);
  }, [abrirSolicitado]);

  function alterarAbertura(valor: boolean) {
    setAberto(valor);
    if (!valor && naoMostrar && chaveUsuario) localStorage.setItem(chaveUsuario, "sim");
  }

  function concluir() {
    if (naoMostrar && chaveUsuario) localStorage.setItem(chaveUsuario, "sim");
    setAberto(false);
  }

  const atual = passos[passo] ?? passos[0];
  if (!atual) return null;
  const Icone = atual.icone;
  const ultimo = passo === passos.length - 1;

  return (
    <Dialog open={aberto} onOpenChange={alterarAbertura}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 sm:max-w-md">
        <div className="bg-primary/8 px-6 pb-5 pt-7 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Icone className="size-7" aria-hidden="true" />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <p className="text-xs font-bold uppercase text-primary">Guia de primeiro uso</p>
            <DialogTitle className="font-[Sora,sans-serif] text-2xl">{atual.titulo}</DialogTitle>
            <DialogDescription className="mx-auto min-h-12 max-w-sm text-sm leading-relaxed">
              {atual.descricao}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 pb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Etapa {passo + 1} de {passos.length}</span>
              <span>{Math.round(((passo + 1) / passos.length) * 100)}%</span>
            </div>
            <Progress value={((passo + 1) / passos.length) * 100} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm leading-snug">
            <Checkbox
              checked={naoMostrar}
              onCheckedChange={(valor) => setNaoMostrar(valor === true)}
              aria-label="Não mostrar este tutorial novamente"
            />
            <span>Não mostrar este tutorial novamente neste aparelho.</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasso((valor) => Math.max(0, valor - 1))}
              disabled={passo === 0}
            >
              <ChevronLeft className="size-4" /> Voltar
            </Button>
            <Button
              type="button"
              onClick={() => (ultimo ? concluir() : setPasso((valor) => valor + 1))}
            >
              {ultimo ? "Concluir" : "Próximo"}
              {!ultimo && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}