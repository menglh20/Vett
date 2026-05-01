import { NextRequest, NextResponse } from "next/server";
import { computeSignals, type SignalLevel } from "@/lib/signals";
import { createServiceClient } from "@/lib/supabase";
import type { ProfileResponse, DimensionData, DimensionLevel } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map signal level → dimension display level (inverted: high signal = low observed) */
function invertLevel(level: SignalLevel): DimensionLevel {
  return level === "high" ? "Low" : level === "medium" ? "Medium" : "High";
}

/** Map signal level → observed value for radar chart (inverted) */
function invertValue(level: SignalLevel): number {
  return level === "high" ? 20 : level === "medium" ? 50 : 80;
}

/** Map a self-reported number to a DimensionLevel */
function selfLevel(value: number): DimensionLevel {
  if (value >= 70) return "High";
  if (value >= 40) return "Medium";
  return "Low";
}

/** Dot color based on gap between self and observed */
function gapColor(selfVal: number, obsVal: number): string {
  const gap = Math.abs(selfVal - obsVal);
  if (gap <= 15) return "#14B8BB"; // teal — aligned
  if (gap <= 35) return "#F59E0B"; // amber — moderate gap
  return "#EF4444";                // coral — large gap
}

/** Risk level (1-5) → self value (0-100) */
function riskToSelf(risk: number | null): number {
  const r = risk ?? 3;
  return Math.round((r / 5) * 100);
}

/** Horizon → self value (0-100) */
function horizonToSelf(horizon: string | null): number {
  const map: Record<string, number> = { "<6m": 20, "6m-1y": 40, "1-3y": 60, "3-5y": 80, "5y+": 95 };
  return map[horizon ?? "<6m"] ?? 50;
}

/** Max loss → self value for volatility comfort */
function maxLossToSelf(loss: number | null): number {
  const map: Record<number, number> = { 0: 10, 5: 30, 10: 50, 20: 70, 50: 90 };
  return map[loss ?? 10] ?? 50;
}

/** Short-term cash need → self value for liquidity readiness */
function cashNeedToSelf(need: boolean): number {
  return need ? 70 : 30;
}

// ─── Tier label ─────────────────────────────────────────────────────────────

function tierLabel(tier: "fit" | "caution" | "mismatch"): string {
  return tier === "fit" ? "Fit" : tier === "caution" ? "Caution" : "Likely Mismatch";
}

// ─── Summary generation ─────────────────────────────────────────────────────

function generateSummary(
  signals: Awaited<ReturnType<typeof computeSignals>>,
  tier: string
): string {
  const parts: string[] = [];

  if (signals.holdingDeviation.level !== "low") {
    parts.push(`Your actual median hold is ${Math.round(signals.holdingDeviation.value)} days, shorter than your stated horizon suggests.`);
  }
  if (signals.panicSelling.level !== "low") {
    parts.push(`${signals.panicSelling.value}% of your loss-sells happen during small market dips, indicating reactive selling patterns.`);
  }
  if (signals.externalDependency.level !== "low") {
    parts.push(`${signals.externalDependency.value}% of your buy decisions are influenced by external sources rather than independent research.`);
  }
  if (signals.liquidityConflict.level !== "low") {
    parts.push(`You indicated short-term cash needs but continue to purchase illiquid products.`);
  }
  if (parts.length === 0) {
    parts.push("Your trading behavior aligns well with your self-assessment across all dimensions.");
  }

  return `Overall result: ${tier}. ` + parts.join(" ");
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const investorId = req.nextUrl.searchParams.get("investor_id");

  if (!investorId) {
    return NextResponse.json({ error: "investor_id query param is required." }, { status: 400 });
  }

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(MOCK_PROFILE);
  }

  try {
    const supabase = createServiceClient();

    // Get investor self-reported data
    const { data: investor } = await supabase
      .from("investors")
      .select("self_risk_level, stated_horizon, stated_max_loss, has_short_term_cash_need")
      .eq("investor_id", investorId)
      .single();

    if (!investor) {
      return NextResponse.json(MOCK_PROFILE);
    }

    // Compute all 4 signals
    const signals = await computeSignals(investorId);

    // ─── Map to 5 dimensions ────────────────────────────────────────────

    const riskSelf = riskToSelf(investor.self_risk_level);
    const riskObs = invertValue(signals.panicSelling.level);

    const holdSelf = horizonToSelf(investor.stated_horizon);
    const holdObs = invertValue(signals.holdingDeviation.level);

    // Decision Independence: inverted external dependency
    const indepSelf = 75; // most people assume they're independent
    const indepObs = invertValue(signals.externalDependency.level);

    const volSelf = maxLossToSelf(investor.stated_max_loss);
    const volObs = invertValue(signals.panicSelling.level); // panic selling also reflects volatility comfort

    const liqSelf = cashNeedToSelf(investor.has_short_term_cash_need ?? false);
    const liqObs = invertValue(signals.liquidityConflict.level);

    const dimensions: DimensionData[] = [
      {
        name: "Risk Tolerance",
        selfAssessed: selfLevel(riskSelf),
        selfValue: riskSelf,
        observed: invertLevel(signals.panicSelling.level),
        observedValue: riskObs,
        explanation: signals.panicSelling.detail,
        dotColor: gapColor(riskSelf, riskObs),
      },
      {
        name: "Holding Patience",
        selfAssessed: selfLevel(holdSelf),
        selfValue: holdSelf,
        observed: invertLevel(signals.holdingDeviation.level),
        observedValue: holdObs,
        explanation: signals.holdingDeviation.detail,
        dotColor: gapColor(holdSelf, holdObs),
      },
      {
        name: "Decision Independence",
        selfAssessed: selfLevel(indepSelf),
        selfValue: indepSelf,
        observed: invertLevel(signals.externalDependency.level),
        observedValue: indepObs,
        explanation: signals.externalDependency.detail,
        dotColor: gapColor(indepSelf, indepObs),
      },
      {
        name: "Volatility Comfort",
        selfAssessed: selfLevel(volSelf),
        selfValue: volSelf,
        observed: invertLevel(signals.panicSelling.level),
        observedValue: volObs,
        explanation: `Your stated max loss tolerance is ${investor.stated_max_loss ?? 10}%, but ${signals.panicSelling.value}% of your loss-sells are triggered by small market dips.`,
        dotColor: gapColor(volSelf, volObs),
      },
      {
        name: "Liquidity Readiness",
        selfAssessed: selfLevel(liqSelf),
        selfValue: liqSelf,
        observed: invertLevel(signals.liquidityConflict.level),
        observedValue: liqObs,
        explanation: signals.liquidityConflict.detail,
        dotColor: gapColor(liqSelf, liqObs),
      },
    ];

    const profile: ProfileResponse = {
      fitnessScore: signals.fitnessScore,
      summary: generateSummary(signals, tierLabel(signals.tier)),
      signals: {
        medianHoldDays: Math.round(signals.holdingDeviation.value),
        panicSellRate: signals.panicSelling.value / 100,
        externalDecisionPct: signals.externalDependency.value / 100,
        liquidityConflict: signals.liquidityConflict.level !== "low",
        transactionCount: 0, // filled below
      },
      dimensions,
    };

    // Get transaction count
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("investor_id", investorId);
    profile.signals.transactionCount = count ?? 0;

    return NextResponse.json(profile);
  } catch (err) {
    console.error("Signal engine error:", err);
    return NextResponse.json(MOCK_PROFILE);
  }
}

// ─── Fallback mock data (when Supabase is not configured) ───────────────────

const MOCK_PROFILE: ProfileResponse = {
  fitnessScore: 62,
  summary:
    "Your biggest gap is between your stated holding patience and actual behavior — you say long-term but your median hold is 47 days. You also tend to exit positions early during small dips, suggesting your real volatility comfort is lower than you rated. On the positive side, your decision independence is strong — most of your trades are self-directed.",
  signals: {
    medianHoldDays: 47,
    panicSellRate: 0.45,
    externalDecisionPct: 0.6,
    liquidityConflict: false,
    transactionCount: 38,
  },
  dimensions: [
    { name: "Risk Tolerance", selfAssessed: "High", selfValue: 70, observed: "Medium", observedValue: 45, explanation: "You rated yourself as comfortable with aggressive positions, but you tend to sell at first signs of downturn.", dotColor: "#F59E0B" },
    { name: "Holding Patience", selfAssessed: "High", selfValue: 80, observed: "Low", observedValue: 35, explanation: "You said you invest long-term, but your average hold is 47 days.", dotColor: "#EF4444" },
    { name: "Decision Independence", selfAssessed: "High", selfValue: 75, observed: "High", observedValue: 70, explanation: "Your trades align with your stated preference for independent research.", dotColor: "#14B8BB" },
    { name: "Volatility Comfort", selfAssessed: "Medium", selfValue: 60, observed: "Low", observedValue: 30, explanation: "You underestimated how much market volatility would affect your decisions.", dotColor: "#F59E0B" },
    { name: "Liquidity Readiness", selfAssessed: "Medium", selfValue: 50, observed: "High", observedValue: 85, explanation: "You frequently need instant access, more than you initially indicated.", dotColor: "#F59E0B" },
  ],
};
