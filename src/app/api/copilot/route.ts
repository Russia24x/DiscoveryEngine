// POST /api/copilot — AI Research Copilot (v2.0)
// Uses z-ai-web-dev-sdk (backend only) to answer questions about a project
// using its full CryptoSieve analysis as context.
import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "symbol and question required" }, { status: 400 });
    }

    // Gather full project context.
    const { inputs } = await collectUniverse({ useLive: false });
    const input = inputs.find((i) => i.symbol === symbol.toUpperCase());
    if (!input) {
      return NextResponse.json({ error: `symbol ${symbol} not in universe` }, { status: 404 });
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

    // Build a compact context summary for the LLM.
    const context = {
      project: {
        symbol: input.symbol,
        name: input.name,
        sector: input.sector,
        chain: input.chain,
        price: input.priceUsd,
        marketCap: input.marketCap,
        fdv: input.fdv,
      },
      scores: {
        pq: scores.components.pq,
        tq: scores.components.tq,
        va: scores.components.va,
        v: scores.components.v,
        r: scores.components.r,
        iaRaw: scores.iaRaw,
        confidence: scores.confidence,
        iaEffective: scores.iaEffective,
        marketRegime: scores.marketRegime,
        iaFinal: scores.iaFinal,
        decision: scores.decision,
      },
      ranks: {
        fundamental: rankedRow?.fundamentalRank,
        confidence: rankedRow?.confidenceRank,
        effective: rankedRow?.effectiveRank,
        market: rankedRow?.marketRank,
      },
      vae: scores.vae,
      supply: scores.supply,
      gates: scores.gates.map((g: any) => ({ label: g.label, passed: g.passed })),
      decisionExplanation: scores.decisionExplanation,
      thesis: {
        title: thesis.title,
        whyWorks: thesis.whyWorks,
        mustStayTrue: thesis.mustStayTrue,
        whatBreaks: thesis.whatBreaks,
        intactPct: thesis.intactPct,
      },
      tokenomics: {
        verdict: tokenomics.verdict,
        dilution12mPct: tokenomics.dilution12mPct,
        absorptionRatio: tokenomics.absorptionRatio,
        peakPressure: tokenomics.peakPressureMonth?.netPressurePctOfFloat,
      },
      capitalFlow: {
        composite: capitalFlow.compositeScore,
        verdict: capitalFlow.verdict,
        signals: capitalFlow.signals.map((s) => ({ label: s.label, direction: s.direction, signal: s.signal })),
      },
      catalyst: {
        riskLevel: catalyst.verdict.riskLevel,
        triggeredKills: catalyst.triggeredKills,
        watchKills: catalyst.watchKills,
        nextCatalyst: catalyst.nextCatalyst?.title,
        killConditions: catalyst.killConditions.map((k) => ({ label: k.label, status: k.currentStatus })),
      },
      evidence: {
        total: evidence.summary.total,
        positive: evidence.summary.positive,
        negative: evidence.summary.negative,
        strongest: evidence.summary.strongestClaim?.title,
        contradictions: evidence.contradictions.length,
      },
    };

    // Construct the LLM prompt.
    const systemPrompt = `You are CryptoSieve AI, a crypto investment research copilot.
You analyze projects using the CryptoSieve Decision Engine framework:
  Gate → PQ → TQ → VA → V → R → IA_raw → C → IA_effective → M → IA_final

Core principles (FRAMEWORK.md):
- Evidence > Narrative. Every claim must trace to data.
- Project Quality ≠ Token Quality ≠ Investment Attractiveness.
- A great project + a bad token = a bad investment.
- Decisions are explainable: PASS / INVESTIGATE / REJECT with for/against/triggers.
- The thesis is living: what must stay true, what breaks it.

Respond concisely (max 250 words). Use the provided project context.
If data is insufficient, say so. Be direct, analytical, and honest about risks.
Format with short paragraphs and bullet points where helpful.`;

    const userPrompt = `Project context (JSON):
${JSON.stringify(context, null, 2)}

Question: ${question}

Answer based strictly on the provided context. If the answer isn't in the context, say "I don't have enough data to answer that."`;

    // Dynamically import the SDK (backend only).
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const answer = completion.choices[0]?.message?.content ?? "No response from AI.";

    return NextResponse.json({
      ok: true,
      answer,
      contextSize: JSON.stringify(context).length,
    });
  } catch (e: any) {
    console.error("[copilot] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "copilot failed", ok: false },
      { status: 500 }
    );
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
