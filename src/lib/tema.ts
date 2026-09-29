export type Campanha = {
  mes: number;
  nome: string;
  causa: string;
  fita: string;
  classe: string;
};

/** Campanhas de saúde brasileiras — uma cor por mês. */
export const CAMPANHAS: Campanha[] = [
  { mes: 1, nome: "Janeiro Branco", causa: "Saúde mental", fita: "Branca", classe: "mes-1" },
  { mes: 2, nome: "Fevereiro Roxo", causa: "Lúpus, Alzheimer e fibromialgia", fita: "Roxa", classe: "mes-2" },
  { mes: 3, nome: "Março Azul-Marinho", causa: "Câncer colorretal", fita: "Azul-marinho", classe: "mes-3" },
  { mes: 4, nome: "Abril Azul", causa: "Conscientização do autismo", fita: "Azul", classe: "mes-4" },
  { mes: 5, nome: "Maio Amarelo", causa: "Segurança no trânsito", fita: "Amarela", classe: "mes-5" },
  { mes: 6, nome: "Junho Vermelho", causa: "Doação de sangue", fita: "Vermelha", classe: "mes-6" },
  { mes: 7, nome: "Julho Amarelo", causa: "Hepatites virais", fita: "Amarela", classe: "mes-7" },
  { mes: 8, nome: "Agosto Dourado", causa: "Aleitamento materno", fita: "Dourada", classe: "mes-8" },
  { mes: 9, nome: "Setembro Amarelo", causa: "Prevenção do suicídio", fita: "Amarela", classe: "mes-9" },
  { mes: 10, nome: "Outubro Rosa", causa: "Câncer de mama", fita: "Rosa", classe: "mes-10" },
  { mes: 11, nome: "Novembro Azul", causa: "Saúde do homem", fita: "Azul", classe: "mes-11" },
  { mes: 12, nome: "Dezembro Vermelho", causa: "Prevenção do HIV/Aids", fita: "Vermelha", classe: "mes-12" },
];

export function campanhaDoMes(data: Date = new Date()): Campanha {
  return CAMPANHAS[data.getMonth()]!;
}

export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
