/**
 * Resumo estruturado das anotações livres de uma visita, gerado por IA.
 * Recebe apenas o texto que o agente escreveu — nenhum dado é armazenado no servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Entrada = z.object({
  notas: z.string().min(5).max(6000),
  contexto: z.string().max(500).optional(),
});

export type ResumoVisita = {
  resumo: string;
  pendencias: string[];
  proximos_passos: string[];
};

export const resumirVisita = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Entrada.parse(d))
  .handler(async ({ data }): Promise<ResumoVisita> => {
    const chave = process.env["LOVABLE_API_KEY"];
    if (!chave) throw new Error("O recurso de resumo automático não está disponível agora.");

    const sistema =
      "Você organiza anotações de visitas domiciliares de agentes comunitários de saúde no Brasil. " +
      'Responda SOMENTE com JSON no formato {"resumo":string,"pendencias":string[],"proximos_passos":string[]}. ' +
      "Em proximos_passos sugira acompanhamentos práticos. Português simples, sem inventar informações.";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": chave,
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: sistema,
        input: `${data.contexto ? `Contexto: ${data.contexto}\n\n` : ""}Anotações da visita:\n${data.notas}`,
      }),
    });

    if (res.status === 429) throw new Error("Muitos pedidos agora. Tente de novo em instantes.");
    if (res.status === 402) throw new Error("Os créditos de IA acabaram. Recarregue para continuar.");
    if (res.status === 403) throw new Error("O resumo automático está bloqueado para esta conta.");
    if (!res.ok || !res.body) throw new Error("Não foi possível gerar o resumo agora.");

    // Lê a resposta em partes (streaming) e junta o texto final.
    const leitor = res.body.getReader();
    const dec = new TextDecoder();
    let buffer = "";
    let texto = "";
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const linhas = buffer.split("\n");
      buffer = linhas.pop() ?? "";
      for (const l of linhas) {
        if (!l.startsWith("data:")) continue;
        const dado = l.slice(5).trim();
        if (!dado || dado === "[DONE]") continue;
        try {
          const ev = JSON.parse(dado) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) texto += ev.delta;
        } catch {
          /* ignora linhas parciais */
        }
      }
    }
    texto = texto.replace(/^```(json)?|```$/g, "").trim() || "{}";
    let bruto: Partial<ResumoVisita> = {};
    try {
      bruto = JSON.parse(texto) as Partial<ResumoVisita>;
    } catch {
      bruto = { resumo: texto };
    }
    const lista = (v: unknown) =>
      Array.isArray(v) ? v.map((i) => String(i)).filter(Boolean).slice(0, 12) : [];
    return {
      resumo: String(bruto.resumo ?? "").trim(),
      pendencias: lista(bruto.pendencias),
      proximos_passos: lista(bruto.proximos_passos),
    };
  });
