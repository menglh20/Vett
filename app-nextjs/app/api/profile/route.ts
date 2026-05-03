import { NextRequest, NextResponse } from "next/server";
import { computeSignals } from "@/lib/signals";
import { createServiceClient } from "@/lib/supabase";
import type { ProfileResponse, DimensionData, DimensionLevel } from "@/lib/types";

// ─── Value mappers (all return 0–100, higher = stronger on that axis) ───────

/** R1=20, R2=40, R3=60, R4=80, R5=100 */
function riskToValue(r: number | null): number {
  return (r ?? 3) * 20;
}

/** Stated horizon → 0–100 (longer = higher) */
function horizonToValue(h: string | null): number {
  const map: Record<string, number> = { "<6m": 20, "6m-1y": 40, "1-3y": 60, "3-5y": 80, "5y+": 95 };
  return map[h ?? "<6m"] ?? 20;
}

/** Median hold days → 0–100, on the same axis as horizon */
function holdDaysToValue(d: number): number {
  if (d < 30) return 10;
  if (d < 180) return 25;
  if (d < 365) return 45;
  if (d < 1095) return 65;
  if (d < 1825) return 80;
  return 95;
}

/** Investment experience years → 0–100 base score */
function expToValue(years: number | null): number {
  if (years === null || years <= 0) return 20;
  if (years === 1) return 35;
  if (years <= 3) return 55;
  if (years <= 5) return 75;
  return 90;
}

/** Financial literacy → bonus added to experience score */
function litBonus(lit: string | null): number {
  if (lit === "high") return 10;
  if (lit === "low") return -10;
  return 0;
}

/** Stated max loss percentage → 0–100 (higher tolerance = higher comfort) */
function lossToValue(loss: number | null): number {
  const map: Record<number, number> = { 0: 20, 5: 40, 10: 60, 20: 80, 50: 95 };
  return map[loss ?? 10] ?? 60;
}

/** Short-term cash need → 0–100 (higher = better liquidity buffer) */
function cashNeedToValue(need: boolean): number {
  return need ? 30 : 80;
}

/** Numeric value → DimensionLevel label */
function valueToLevel(value: number): DimensionLevel {
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ─── Tier label ─────────────────────────────────────────────────────────────

function tierLabel(tier: "fit" | "caution" | "mismatch"): string {
  return tier === "fit" ? "Fit" : tier === "caution" ? "Caution" : "Likely Mismatch";
}

// ─── Headline generation ────────────────────────────────────────────────────

/** Templates per dimension; tuple = [self > obs message, self < obs message] */
const HEADLINE_TEMPLATES: Record<string, [string, string]> = {
  "Risk Tolerance": [
    "You tend to be more conservative than you think.",
    "Your data shows more risk capacity than your self-rating suggests.",
  ],
  "Holding Patience": [
    "You say long-term but your data shows short hold periods.",
    "You hold positions longer than your stated horizon suggests.",
  ],
  "Decision Independence": [
    "Your buys are more externally influenced than you'd estimate.",
    "You're more independent in your decisions than you think.",
  ],
  "Volatility Comfort": [
    "You exit positions earlier than your loss tolerance suggests.",
    "You weather drawdowns better than your stated tolerance.",
  ],
  "Liquidity Readiness": [
    "You flagged short-term cash needs but still hold illiquid products.",
    "Your liquidity discipline is better than your stated need suggests.",
  ],
};

/** Pick the dimension with the largest meaningful gap. */
function generateHeadline(dimensions: DimensionData[]): string {
  // Skip dims where both self and obs are healthy (≥70) — no real concern
  const concerning = dimensions.filter(
    (d) => !(d.selfValue >= 70 && d.observedValue >= 70)
  );

  let topDim: DimensionData | null = null;
  let topGap = 0;
  for (const d of concerning) {
    const gap = Math.abs(d.selfValue - d.observedValue);
    if (gap > topGap) {
      topGap = gap;
      topDim = d;
    }
  }

  if (!topDim || topGap < 15) {
    return "Your self-assessment matches your behavior.";
  }

  const [overText, underText] = HEADLINE_TEMPLATES[topDim.name] ?? ["", ""];
  return topDim.selfValue > topDim.observedValue ? overText : underText;
}

// ─── Per-dimension explanation generators (3–4 branches each) ──────────────

const HORIZON_LOWER: Record<string, number> = {
  "<6m": 30, "6m-1y": 120, "1-3y": 200, "3-5y": 500, "5y+": 800,
};

function explainRiskTolerance(self: number | null, actual: number | null): string {
  if (actual == null && self == null) return "Risk tolerance data not yet available.";
  if (actual == null) return `Self-rated R${self}. Behavior-inferred tolerance not yet computed — needs more transaction history.`;
  if (self == null)   return `Behavior-inferred tolerance R${actual}; no self-rating on record yet.`;
  const gap = Math.abs(self - actual);
  if (gap === 0) return `Self-rated R${self}, and your behavior reflects exactly that — risk perception is well-calibrated.`;
  if (gap === 1) return `Self-rated R${self}, behavior-inferred R${actual} — a small gap, broadly aligned.`;
  if (self > actual) return `You self-rated R${self}, but your trading reads closer to R${actual} — your real appetite is more cautious than declared.`;
  return `You self-rated R${self}, but your trading reads closer to R${actual} — your data shows more risk capacity than your self-rating suggests.`;
}

function explainHoldingPatience(horizon: string | null, medianHold: number, totalSells: number): string {
  const h = horizon ?? "—";
  if (totalSells === 0) return `Stated horizon: ${h}. No completed sells yet — actual holding patience can't be measured from data.`;
  const md = Math.round(medianHold);
  const lower = HORIZON_LOWER[horizon ?? "<6m"] ?? 30;
  if (medianHold >= lower) return `Stated horizon ${h}; median hold ${md} days across ${totalSells} sell${totalSells === 1 ? "" : "s"} — your actual patience matches what you stated.`;
  if (medianHold >= lower * 0.5) return `Stated horizon ${h}, but median hold is ${md} days — somewhat shorter than the lower end of your stated range (${lower}+ days).`;
  if (medianHold >= lower / 10) return `Stated horizon ${h}, but median hold drops to ${md} days — well short of your stated range (${lower}+ days expected).`;
  return `Stated horizon ${h}, but median hold collapses to just ${md} days — an order of magnitude shorter than your stated range implies.`;
}

function explainDecisionIndependence(selfBuyRate: number, totalBuys: number): string {
  if (totalBuys === 0) return "No buy transactions yet — decision sources can't be measured.";
  const pct = Math.round(selfBuyRate * 100);
  if (selfBuyRate >= 0.7) return `${pct}% of your ${totalBuys} buys are self-directed — you research your own positions consistently.`;
  if (selfBuyRate >= 0.4) return `${pct}% of your ${totalBuys} buys are self-directed; the rest split between advisor, friends, and social media.`;
  if (selfBuyRate >= 0.2) return `Only ${pct}% of your ${totalBuys} buys are self-directed — most decisions trace back to advisor, friends, or social media.`;
  return `Just ${pct}% of your ${totalBuys} buys are self-directed — your trades are overwhelmingly externally driven.`;
}

function explainVolatilityComfort(maxLoss: number | null, smallDipRate: number, panicRate: number, totalSells: number): string {
  const ml = maxLoss ?? "?";
  if (totalSells === 0) return `Stated max loss tolerance: ${ml}%. No sell history yet — drawdown reaction can't be measured.`;
  const dip = Math.round(smallDipRate * 100);
  const panic = Math.round(panicRate * 100);
  const combined = (smallDipRate + panicRate) / 2;
  if (combined < 0.15) return `Stated max loss ${ml}%; only ${dip}% of loss-sells happen at small dips and ${panic}% are panic-driven — you weather drawdowns calmly.`;
  if (combined < 0.35) return `Stated max loss ${ml}%, but ${dip}% of loss-sells trigger at small dips (${panic}% labeled as panic) — your tolerance narrows in practice.`;
  return `Stated max loss ${ml}%, yet ${dip}% of loss-sells happen at small dips and ${panic}% are panic-driven — actual reactions are far more sensitive than declared.`;
}

function explainLiquidityReadiness(hasNeed: boolean, illiquidRate: number, totalBuys: number): string {
  if (!hasNeed) return "No short-term cash need flagged; your liquidity buffer is intact.";
  if (totalBuys === 0) return "Short-term cash need flagged, but no recent buys yet to evaluate against it.";
  const pct = Math.round(illiquidRate * 100);
  if (illiquidRate === 0) return "Short-term cash need flagged, and none of your recent buys are illiquid — you're managing the constraint.";
  if (illiquidRate <= 0.3) return `Short-term cash need flagged; ${pct}% of recent buys are illiquid — manageable but worth watching.`;
  return `Short-term cash need flagged, yet ${pct}% of recent buys are illiquid — a clear conflict between stated needs and actual buys.`;
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

    // Get investor self-reported + behavior-inferred data
    const { data: investor } = await supabase
      .from("investors")
      .select("self_risk_level, stated_horizon, stated_max_loss, has_short_term_cash_need, actual_tolerance, financial_literacy, investment_experience_years")
      .eq("investor_id", investorId)
      .single();

    if (!investor) {
      return NextResponse.json(MOCK_PROFILE);
    }

    // Compute all 4 signals + raw metrics
    const signals = await computeSignals(investorId);
    const m = signals.metrics;

    // ─── Map to 5 radar dimensions (temp.md model: self vs obs, gap = mismatch) ───

    // 1. Risk Tolerance: self_risk_level vs actual_tolerance
    const riskSelf = riskToValue(investor.self_risk_level);
    const riskObs = riskToValue(investor.actual_tolerance ?? investor.self_risk_level);

    // 2. Holding Patience: stated_horizon vs median hold_days
    const holdSelf = horizonToValue(investor.stated_horizon);
    const holdObs =
      m.totalSells > 0 ? holdDaysToValue(m.medianHoldDays) : holdSelf;

    // 3. Decision Independence: experience+literacy vs % self-directed buys
    const indepSelf = clamp(
      expToValue(investor.investment_experience_years) + litBonus(investor.financial_literacy),
      0,
      100
    );
    const indepObs = m.totalBuys > 0 ? Math.round(m.selfBuyRate * 100) : indepSelf;

    // 4. Volatility Comfort: stated_max_loss vs panic+drawdown reaction
    const volSelf = lossToValue(investor.stated_max_loss);
    const volObs =
      m.totalSells > 0
        ? Math.round(100 - ((m.smallDipSellRate + m.panicSourceRate) / 2) * 100)
        : 100;

    // 5. Liquidity Readiness: cash need vs illiquid buys when need is flagged
    const hasNeed = investor.has_short_term_cash_need ?? false;
    const liqSelf = cashNeedToValue(hasNeed);
    const liqObs = !hasNeed
      ? 100
      : m.totalBuys > 0
        ? Math.round(100 - m.illiquidBuyRate * 100)
        : liqSelf;

    const dimensions: DimensionData[] = [
      {
        name: "Risk Tolerance",
        selfAssessed: valueToLevel(riskSelf),
        selfValue: riskSelf,
        observed: valueToLevel(riskObs),
        observedValue: riskObs,
        explanation: explainRiskTolerance(investor.self_risk_level, investor.actual_tolerance ?? null),
        dotColor: gapColor(riskSelf, riskObs),
      },
      {
        name: "Holding Patience",
        selfAssessed: valueToLevel(holdSelf),
        selfValue: holdSelf,
        observed: valueToLevel(holdObs),
        observedValue: holdObs,
        explanation: explainHoldingPatience(investor.stated_horizon, m.medianHoldDays, m.totalSells),
        dotColor: gapColor(holdSelf, holdObs),
      },
      {
        name: "Decision Independence",
        selfAssessed: valueToLevel(indepSelf),
        selfValue: indepSelf,
        observed: valueToLevel(indepObs),
        observedValue: indepObs,
        explanation: explainDecisionIndependence(m.selfBuyRate, m.totalBuys),
        dotColor: gapColor(indepSelf, indepObs),
      },
      {
        name: "Volatility Comfort",
        selfAssessed: valueToLevel(volSelf),
        selfValue: volSelf,
        observed: valueToLevel(volObs),
        observedValue: volObs,
        explanation: explainVolatilityComfort(investor.stated_max_loss, m.smallDipSellRate, m.panicSourceRate, m.totalSells),
        dotColor: gapColor(volSelf, volObs),
      },
      {
        name: "Liquidity Readiness",
        selfAssessed: valueToLevel(liqSelf),
        selfValue: liqSelf,
        observed: valueToLevel(liqObs),
        observedValue: liqObs,
        explanation: explainLiquidityReadiness(hasNeed, m.illiquidBuyRate, m.totalBuys),
        dotColor: gapColor(liqSelf, liqObs),
      },
    ];

    const profile: ProfileResponse = {
      fitnessScore: signals.fitnessScore,
      headline: generateHeadline(dimensions),
      summary: generateSummary(signals, tierLabel(signals.tier)),
      signals: {
        medianHoldDays: Math.round(m.medianHoldDays),
        panicSellRate: m.smallDipSellRate,
        externalDecisionPct: 1 - m.selfBuyRate,
        liquidityConflict: signals.liquidityConflict.level !== "low",
        transactionCount: m.totalBuys + m.totalSells,
      },
      dimensions,
    };

    return NextResponse.json(profile);
  } catch (err) {
    console.error("Signal engine error:", err);
    return NextResponse.json(MOCK_PROFILE);
  }
}

// ─── Fallback mock data (when Supabase is not configured) ───────────────────

const MOCK_PROFILE: ProfileResponse = {
  fitnessScore: 62,
  headline: "You say long-term but your data shows short hold periods.",
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
    { name: "Risk Tolerance",        selfAssessed: "High",   selfValue: 80, observed: "Medium", observedValue: 60, explanation: "Self-rated R4; behavior-inferred tolerance R3.",                                                       dotColor: "#F59E0B" },
    { name: "Holding Patience",      selfAssessed: "High",   selfValue: 80, observed: "Low",    observedValue: 25, explanation: "Stated horizon: 3-5y. Median hold across 12 sells: 47 days.",                                          dotColor: "#EF4444" },
    { name: "Decision Independence", selfAssessed: "High",   selfValue: 75, observed: "Medium", observedValue: 60, explanation: "60% of your 20 buys are self-directed; the rest are influenced by advisor, friends, or social media.", dotColor: "#14B8BB" },
    { name: "Volatility Comfort",    selfAssessed: "Medium", selfValue: 60, observed: "Low",    observedValue: 35, explanation: "Stated max acceptable loss: 10%. 45% of loss-sells at small dips, 20% labeled as panic.",              dotColor: "#F59E0B" },
    { name: "Liquidity Readiness",   selfAssessed: "Medium", selfValue: 80, observed: "High",   observedValue: 100, explanation: "No short-term cash need flagged; liquidity buffer is intact.",                                         dotColor: "#F59E0B" },
  ],
};
