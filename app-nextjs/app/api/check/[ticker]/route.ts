import { NextRequest, NextResponse } from "next/server";
import { computeSignals, computeMatchPercentage } from "@/lib/signals";
import { createServiceClient } from "@/lib/supabase";
import { generateCheck, type CheckLLMInput } from "@/lib/llm";
import type { CheckResponse, RiskLevel, Alternative } from "@/lib/types";

// ─── Rule-based fallback (used when no key, no investor, or LLM fails) ──────

function buildFallback(ticker: string, productName?: string, productRisk?: number): CheckResponse {
  const upper = ticker.toUpperCase();
  const risk = productRisk ?? 3;
  return {
    ticker: upper,
    productName: productName ?? `${upper} (data unavailable)`,
    productRiskLevel: `R${risk}` as RiskLevel,
    score: 60,
    tier: "caution",
    flags: [],
    aiExplanation:
      "Live behavioral check is currently unavailable. We've shown a neutral placeholder until your trading data and the AI service are both reachable.",
    reflectionQuestions: [
      "What would make you sell this position?",
      "How will you feel if this drops 15% in the first week?",
      "Is this purchase based on your own research?",
    ],
    suggestions: [
      "Wait 24 hours before deciding",
      "Set a stop-loss before buying",
    ],
    alternatives: [],
    confidence: "low",
    dataBasis: "Live data unavailable.",
  };
}

// ─── Alternatives (rule-based, same product_type, top match%) ───────────────

async function getAlternatives(
  supabase: ReturnType<typeof createServiceClient>,
  currentTicker: string,
  productType: string,
  actualTolerance: number,
  signals: Awaited<ReturnType<typeof computeSignals>>
): Promise<Alternative[]> {
  const { data: candidates } = await supabase
    .from("products")
    .select("ticker, name, risk_level, is_long_term, is_illiquid")
    .eq("product_type", productType)
    .neq("ticker", currentTicker)
    .limit(25);

  if (!candidates || candidates.length === 0) return [];

  return candidates
    .map((p) => ({
      ticker: p.ticker as string,
      name: p.name as string,
      riskLevel: `R${p.risk_level}` as RiskLevel,
      matchPercentage: computeMatchPercentage(
        { risk_level: p.risk_level as number, is_long_term: p.is_long_term as boolean, is_illiquid: p.is_illiquid as boolean },
        actualTolerance,
        signals
      ),
    }))
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 3);
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const investorId = req.nextUrl.searchParams.get("investor_id");
  const upper = ticker.toUpperCase();

  if (
    !investorId ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(buildFallback(upper));
  }

  try {
    const supabase = createServiceClient();

    const [{ data: product }, { data: investor }] = await Promise.all([
      supabase
        .from("products")
        .select("ticker, name, risk_level, product_type, is_long_term, is_illiquid")
        .eq("ticker", upper)
        .single(),
      supabase
        .from("investors")
        .select(
          "self_risk_level, stated_horizon, stated_max_loss, has_short_term_cash_need, actual_tolerance, financial_literacy, investment_experience_years"
        )
        .eq("investor_id", investorId)
        .single(),
    ]);

    if (!product || !investor) {
      return NextResponse.json(
        buildFallback(upper, product?.name as string | undefined, product?.risk_level as number | undefined)
      );
    }

    const signals = await computeSignals(investorId);

    const llmInput: CheckLLMInput = {
      investor: {
        self_risk_level: investor.self_risk_level,
        stated_horizon: investor.stated_horizon,
        stated_max_loss: investor.stated_max_loss,
        has_short_term_cash_need: investor.has_short_term_cash_need ?? false,
        actual_tolerance: investor.actual_tolerance,
        financial_literacy: investor.financial_literacy,
        investment_experience_years: investor.investment_experience_years,
      },
      signals: {
        holdingDeviation: {
          level: signals.holdingDeviation.level,
          medianHoldDays: Math.round(signals.metrics.medianHoldDays),
        },
        panicSelling: {
          level: signals.panicSelling.level,
          smallDipSellRate: signals.metrics.smallDipSellRate,
          panicSourceRate: signals.metrics.panicSourceRate,
        },
        externalDependency: {
          level: signals.externalDependency.level,
          selfBuyRate: signals.metrics.selfBuyRate,
        },
        liquidityConflict: {
          level: signals.liquidityConflict.level,
          illiquidBuyRate: signals.metrics.illiquidBuyRate,
        },
        transactionCount: signals.metrics.totalBuys + signals.metrics.totalSells,
      },
      product: {
        ticker: product.ticker as string,
        name: product.name as string,
        risk_level: product.risk_level as number,
        product_type: product.product_type as string,
        is_long_term: product.is_long_term as boolean,
        is_illiquid: product.is_illiquid as boolean,
      },
    };

    let llmOutput;
    try {
      llmOutput = await generateCheck(investorId, llmInput);
    } catch (err) {
      console.error("[check] LLM call failed:", err);
      return NextResponse.json(
        buildFallback(upper, product.name as string, product.risk_level as number)
      );
    }

    const fallbackTolerance = investor.actual_tolerance ?? investor.self_risk_level ?? 3;
    const alternatives = await getAlternatives(
      supabase,
      product.ticker as string,
      product.product_type as string,
      fallbackTolerance,
      signals
    );

    const response: CheckResponse = {
      ticker: upper,
      productName: product.name as string,
      productRiskLevel: `R${product.risk_level}` as RiskLevel,
      score: llmOutput.score,
      tier: llmOutput.tier,
      flags: llmOutput.flags,
      aiExplanation: llmOutput.aiExplanation,
      reflectionQuestions: llmOutput.reflectionQuestions,
      suggestions: llmOutput.suggestions,
      alternatives,
      confidence: llmOutput.confidence,
      dataBasis: llmOutput.dataBasis,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[check] route error:", err);
    return NextResponse.json(buildFallback(upper));
  }
}
