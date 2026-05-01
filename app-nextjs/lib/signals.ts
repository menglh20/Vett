import { createServiceClient } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SignalLevel = "low" | "medium" | "high";

export interface SignalResult {
  level: SignalLevel;
  score: number; // 0 | 15 | 25
  value: number; // raw metric
  detail: string;
}

export interface SignalEngineOutput {
  holdingDeviation: SignalResult;
  panicSelling: SignalResult;
  externalDependency: SignalResult;
  liquidityConflict: SignalResult;
  fitnessScore: number;
  tier: "fit" | "caution" | "mismatch";
}

// ─── Score mapping ──────────────────────────────────────────────────────────

function levelToScore(level: SignalLevel): number {
  return level === "low" ? 25 : level === "medium" ? 15 : 0;
}

// ─── Horizon → reasonable hold-day range ────────────────────────────────────

const HORIZON_RANGES: Record<string, [number, number]> = {
  "<6m": [30, 180],
  "6m-1y": [120, 365],
  "1-3y": [200, 1000],
  "3-5y": [500, 1800],
  "5y+": [800, Infinity],
};

// ─── Illiquid product types ─────────────────────────────────────────────────

const ILLIQUID_TYPES = ["fund", "private_equity", "savings_insurance"];

// ─── Median helper ──────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Signal 1: Holding period deviation ─────────────────────────────────────

function computeHoldingDeviation(
  statedHorizon: string | null,
  holdDays: number[]
): SignalResult {
  const medianHold = median(holdDays);
  const range = HORIZON_RANGES[statedHorizon ?? "<6m"] ?? HORIZON_RANGES["<6m"];
  const lowerBound = range[0];

  if (holdDays.length === 0) {
    return { level: "low", score: 25, value: 0, detail: "No sell transactions to evaluate." };
  }

  // Extreme deviation: actual < lower_bound / 10
  const extremeDeviation = lowerBound > 0 && medianHold < lowerBound / 10;

  let level: SignalLevel;
  if (extremeDeviation || medianHold < lowerBound * 0.3) {
    level = "high";
  } else if (medianHold < lowerBound) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score: levelToScore(level),
    value: medianHold,
    detail: `Median hold: ${Math.round(medianHold)} days (expected range: ${range[0]}–${range[1] === Infinity ? "∞" : range[1]} days).`,
  };
}

// ─── Signal 2: Panic sell tendency ──────────────────────────────────────────

function computePanicSelling(
  sells: { market_change_pct: number | null; sell_decision_source: string | null }[]
): SignalResult {
  if (sells.length === 0) {
    return { level: "low", score: 25, value: 0, detail: "No sell transactions to evaluate." };
  }

  // Sells during a dip (-10% to 0%)
  const lossSells = sells.filter((s) => s.market_change_pct !== null && s.market_change_pct < 0);
  const smallDipSells = lossSells.filter(
    (s) => s.market_change_pct! >= -10 && s.market_change_pct! < 0
  );
  const smallDipRate = lossSells.length > 0 ? smallDipSells.length / lossSells.length : 0;

  // Panic decision source as auxiliary confirmation
  const panicCount = sells.filter((s) => s.sell_decision_source === "panic").length;
  const panicRate = panicCount / sells.length;

  // Combined metric: average of small-dip rate and panic rate
  const combined = (smallDipRate + panicRate) / 2;

  let level: SignalLevel;
  if (combined > 0.5 || smallDipRate > 0.5) {
    level = "high";
  } else if (combined > 0.25 || smallDipRate > 0.25) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score: levelToScore(level),
    value: Math.round(smallDipRate * 100),
    detail: `${Math.round(smallDipRate * 100)}% of loss-sells triggered by small dips; ${Math.round(panicRate * 100)}% labeled as panic.`,
  };
}

// ─── Signal 3: External dependency ──────────────────────────────────────────

function computeExternalDependency(
  buys: { decision_source: string | null }[]
): SignalResult {
  if (buys.length === 0) {
    return { level: "low", score: 25, value: 0, detail: "No buy transactions to evaluate." };
  }

  const externalCount = buys.filter(
    (b) => b.decision_source === "friend" || b.decision_source === "social_media"
  ).length;
  const rate = externalCount / buys.length;

  let level: SignalLevel;
  if (rate > 0.5) {
    level = "high";
  } else if (rate > 0.25) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score: levelToScore(level),
    value: Math.round(rate * 100),
    detail: `${Math.round(rate * 100)}% of buy decisions influenced by friends or social media.`,
  };
}

// ─── Signal 4: Liquidity conflict ───────────────────────────────────────────

function computeLiquidityConflict(
  hasShortTermNeed: boolean,
  recentBuys: { product_type: string }[]
): SignalResult {
  if (!hasShortTermNeed) {
    return { level: "low", score: 25, value: 0, detail: "No short-term cash need reported." };
  }

  const illiquidBuys = recentBuys.filter((b) => ILLIQUID_TYPES.includes(b.product_type));
  const rate = recentBuys.length > 0 ? illiquidBuys.length / recentBuys.length : 0;

  let level: SignalLevel;
  if (illiquidBuys.length > 0 && rate > 0.3) {
    level = "high";
  } else if (illiquidBuys.length > 0) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score: levelToScore(level),
    value: illiquidBuys.length,
    detail: hasShortTermNeed
      ? `Short-term cash need flagged; ${illiquidBuys.length} of ${recentBuys.length} recent buys are illiquid products.`
      : "No conflict detected.",
  };
}

// ─── Match percentage calculation ───────────────────────────────────────────

interface ProductInfo {
  risk_level: number;
  is_long_term: boolean;
  is_illiquid: boolean;
}

export function computeMatchPercentage(
  product: ProductInfo,
  actualTolerance: number,
  signals: SignalEngineOutput
): number {
  // Base score: risk distance
  const base = 100 - Math.abs(product.risk_level - actualTolerance) * 20;

  let penalty = 0;

  // Signal 1 penalty: holding deviation + long-term product
  if (product.is_long_term) {
    if (signals.holdingDeviation.level === "high") penalty += 15;
    else if (signals.holdingDeviation.level === "medium") penalty += 8;
  }

  // Signal 2 penalty: panic selling + high-volatility product (risk ≥ 4)
  if (product.risk_level >= 4) {
    if (signals.panicSelling.level === "high") penalty += 15;
    else if (signals.panicSelling.level === "medium") penalty += 8;
  }

  // Signal 3 penalty: external dependency (always applies, lower weight)
  if (signals.externalDependency.level === "high") penalty += 10;
  else if (signals.externalDependency.level === "medium") penalty += 5;

  // Signal 4 penalty: liquidity conflict + illiquid product
  if (product.is_illiquid && signals.liquidityConflict.level !== "low") {
    if (signals.liquidityConflict.level === "high") penalty += 15;
    else penalty += 8;
  }

  return Math.max(base - penalty, 5);
}

// ─── Tier determination ─────────────────────────────────────────────────────

function determineTier(
  signals: [SignalResult, SignalResult, SignalResult, SignalResult],
  fitnessScore: number
): "fit" | "caution" | "mismatch" {
  const highCount = signals.filter((s) => s.level === "high").length;
  const mediumCount = signals.filter((s) => s.level === "medium").length;

  // Extreme deviation override (holding period < 1/10 of expected)
  const holdSignal = signals[0];
  const isExtreme = holdSignal.level === "high" && holdSignal.score === 0;

  if (highCount >= 3 || isExtreme) return "mismatch";
  if (highCount >= 1 || mediumCount > 2) return "caution";
  return "fit";
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: SignalEngineOutput;
  expiry: number;
}

const signalCache = new Map<string, CacheEntry>();

export function invalidateSignalCache(investorId: string) {
  signalCache.delete(investorId);
}

// ─── Main engine ────────────────────────────────────────────────────────────

export async function computeSignals(investorId: string): Promise<SignalEngineOutput> {
  // Check cache
  const cached = signalCache.get(investorId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  const supabase = createServiceClient();

  // Fetch investor profile
  const { data: investor } = await supabase
    .from("investors")
    .select("stated_horizon, has_short_term_cash_need, self_risk_level, stated_max_loss")
    .eq("investor_id", investorId)
    .single();

  // Fetch all transactions for this investor
  const { data: transactions } = await supabase
    .from("transactions")
    .select("action, hold_days, market_change_pct, decision_source, sell_decision_source, product_type")
    .eq("investor_id", investorId);

  const txns = transactions ?? [];
  const sells = txns.filter((t) => t.action === "sell");
  const buys = txns.filter((t) => t.action === "buy");

  // Signal 1: Holding deviation
  const holdDays = sells
    .map((s) => s.hold_days)
    .filter((d): d is number => d !== null);
  const holdingDeviation = computeHoldingDeviation(investor?.stated_horizon ?? null, holdDays);

  // Signal 2: Panic selling
  const panicSelling = computePanicSelling(
    sells.map((s) => ({
      market_change_pct: s.market_change_pct,
      sell_decision_source: s.sell_decision_source,
    }))
  );

  // Signal 3: External dependency
  const externalDependency = computeExternalDependency(
    buys.map((b) => ({ decision_source: b.decision_source }))
  );

  // Signal 4: Liquidity conflict
  const liquidityConflict = computeLiquidityConflict(
    investor?.has_short_term_cash_need ?? false,
    buys.map((b) => ({ product_type: b.product_type }))
  );

  // Fitness score: sum of 4 signal scores (each 0/15/25, max 100)
  const allSignals: [SignalResult, SignalResult, SignalResult, SignalResult] = [
    holdingDeviation,
    panicSelling,
    externalDependency,
    liquidityConflict,
  ];
  const fitnessScore = allSignals.reduce((sum, s) => sum + s.score, 0);
  const tier = determineTier(allSignals, fitnessScore);

  const result: SignalEngineOutput = {
    holdingDeviation,
    panicSelling,
    externalDependency,
    liquidityConflict,
    fitnessScore,
    tier,
  };

  // Store in cache
  signalCache.set(investorId, { data: result, expiry: Date.now() + CACHE_TTL });

  return result;
}
