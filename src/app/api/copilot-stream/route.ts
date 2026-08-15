// POST /api/copilot-stream — streaming AI Research Copilot using SSE.
import { collectUniverse } from "@/lib/datasources/registry";
import {
  benchmarkUniverse,
  buildCatalystReport,
  buildCapitalFlowProfile,
  buildEvidenceGraph,
  buildTokenomicsSchedule,
  rankUniverse,
  scoreProject,
} from "@/lib/engine";
import { generateDefaultThesis } from "@/lib/engine/thesis-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { symbol, question } = await req.json();
    if (!symbol || !question) {
      return new Response(JSON.stringify({ error: "symbol and question required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Gather full project context.
    const { inputs } = await collectUniverse({ useLive: false });
    const input = inputs.find((i) => i.symbol === symbol.toUpperCase());
    if (!input) {
      return new Response(JSON.stringify({ error: `symbol ${symbol} not in universe` }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const med = median(inputs.map((i) => (i as any).priceChange90d ?? 0)) || 0;
    const M = 1 + med / 400;
    const ranked = rankUniverse(inputs, M);
    const scores = scoreProject(input, M);
    const thesis = generateDefaultThesis(input, scores);
    const tokenomics = buildTokenomicsSchedule(input);
    const capitalFlow = buildCapitalFlowProfile(input);
    const catalyst = buildCatalystReport(input, scores, tokenomics);
    const evidence = buildEvidenceGraph(input, scores);
    const rankedRow = ranked.find((r) => r.symbol === input.symbol);

    const context = {
      project: { symbol: input.symbol, name: input.name, sector: input.sector, price: input.priceUsd, marketCap: input.marketCap },
      scores: {
        pq: scores.components.pq, tq: scores.components.tq, va: scores.components.va,
        v: scores.components.v, r: scores.components.r, iaRaw: scores.iaRaw,
        confidence: scores.confidence, iaEffective: scores.iaEffective, iaFinal: scores.iaFinal,
        decision: scores.decision,
      },
      ranks: { fundamental: rankedRow?.fundamentalRank, market: rankedRow?.marketRank },
      vae: scores.vae.vae,
      thesis: { title: thesis.title, intactPct: thesis.intactPct, whyWorks: thesis.whyWorks, whatBreaks: thesis.whatBreaks },
      tokenomics: { verdict: tokenomics.verdict.status, dilution: tokenomics.dilution12mPct, absorption: tokenomics.absorptionRatio },
      capitalFlow: { composite: capitalFlow.compositeScore, status: capitalFlow.verdict.status },
      catalyst: { riskLevel: catalyst.verdict.riskLevel, triggeredKills: catalyst.triggeredKills },
      evidence: { positive: evidence.summary.positive, negative: evidence.summary.negative, contradictions: evidence.contradictions.length },
    };

    const systemPrompt = `You are CryptoSieve AI, a crypto investment research copilot.
Analyze projects using the CryptoSieve Decision Engine framework.
Respond concisely (max 250 words). Be direct, analytical, and honest about risks.`;

    const userPrompt = `Project context (JSON):
${JSON.stringify(context, null, 2)}

Question: ${question}

Answer based strictly on the provided context.`;

    // Stream via SSE.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const ZAI = (await import("z-ai-web-dev-sdk")).default;
          const zai = await ZAI.create();

          const completion = await zai.chat.completions.create({
            messages: [
              { role: "assistant", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            thinking: { type: "disabled" },
            stream: true,
          });

          for await (const chunk of completion) {
            const content = (chunk as any).choices?.[0]?.delta?.content ?? "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: e?.message ?? "stream failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
