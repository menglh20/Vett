import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CheckLLMInput {
  investor: {
    self_risk_level: number | null;
    stated_horizon: string | null;
    stated_max_loss: number | null;
    has_short_term_cash_need: boolean;
    actual_tolerance: number | null;
    financial_literacy: string | null;
    investment_experience_years: number | null;
  };
  signals: {
    holdingDeviation: { level: string; medianHoldDays: number };
    panicSelling: { level: string; smallDipSellRate: number; panicSourceRate: number };
    externalDependency: { level: string; selfBuyRate: number };
    liquidityConflict: { level: string; illiquidBuyRate: number };
    transactionCount: number;
  };
  product: {
    ticker: string;
    name: string;
    risk_level: number;
    product_type: string;
    is_long_term: boolean;
    is_illiquid: boolean;
  };
}

export type FlagIcon = "clock" | "trending-down" | "users" | "alert";

export interface CheckLLMOutput {
  score: number;
  tier: "fit" | "caution" | "mismatch";
  flags: { label: string; explanation: string; iconType: FlagIcon }[];
  aiExplanation: string;
  reflectionQuestions: string[];
  suggestions: string[];
  confidence: "low" | "medium" | "high";
  dataBasis: string;
}

// ─── System prompt (cacheable) ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Vett, an investment-decision fitness checker. Given a user's stated preferences, observed trading behavior, and a specific product, output a structured fitness check.

# Core principles (must follow)
1. Every conclusion must be grounded in the authorized data and observable behavioral facts. Never speculate beyond what the data shows.
2. Use "we've detected" / "your data shows" framing. Never write "you will" or "you should".
3. Describe behaviors and patterns. Never label the person (write "we've detected exits during dips", not "you are a panic seller").
4. Light, gentle humor is allowed in at most one sentence per output. Never sarcasm or mockery.
5. For mismatch results, the aiExplanation must end with a constructive next step.
6. Speak in probabilities and patterns, not certainties or predictions.

# Forbidden
- No buy/sell/hold/avoid recommendations.
- No price or return predictions.
- No urgency language ("act now", "don't miss", "opportunity").
- No labeling the user.

# Match score logic
- Anchor on |product.risk_level − investor.actual_tolerance| (or self_risk_level if actual_tolerance is null): a 0-step gap is +0, each step ≈ -20.
- Apply behavioral penalties when relevant:
  - holdingDeviation.level high/medium and product.is_long_term → meaningful penalty.
  - panicSelling.level high/medium and product.risk_level ≥ 4 → meaningful penalty.
  - externalDependency.level high/medium → small penalty.
  - liquidityConflict.level high/medium and product.is_illiquid → meaningful penalty.
- Floor at 5, cap at 100.
- score ≥ 70 → tier "fit"; 40-69 → "caution"; < 40 → "mismatch".

# Output (use the submit_check_result tool)
- score: integer 0-100
- tier: "fit" | "caution" | "mismatch"
- flags: 0-3 specific behavioral flags. Each {label, explanation, iconType}. iconType ∈ "clock" (holding/time), "trending-down" (volatility/loss), "users" (social/external), "alert" (liquidity/general).
- aiExplanation: 3-5 sentences referencing user's specific data points (e.g., "we've detected 4 exits during dips under 8%"). Word limits — fit ≤ 80, caution ≤ 100, mismatch ≤ 120. Mismatch must end with a constructive next step.
- reflectionQuestions: 2-3 self-reflection prompts (questions the user should ask themselves before proceeding).
- suggestions: 2-3 concrete protective actions if the user still wants to proceed (e.g., "Set a stop-loss at 15% before buying", "Wait 24 hours before deciding", "Consider dollar-cost averaging instead of lump sum").
- confidence: "low" if transactionCount < 10, "medium" if 10-30, "high" if > 30.
- dataBasis: short phrase, e.g., "Based on 6 months of data." or "Based on 38 transactions over 12 months.".

# Suggested flag labels (reuse when applicable)
- "Holding period conflict"
- "Volatility mismatch"
- "Externally driven"
- "Liquidity conflict"
- "Risk level mismatch"`;

// ─── Tool schema ────────────────────────────────────────────────────────────

const CHECK_TOOL: Anthropic.Tool = {
  name: "submit_check_result",
  description: "Submit the structured investment-decision fitness check result.",
  input_schema: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      tier: { type: "string", enum: ["fit", "caution", "mismatch"] },
      flags: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            explanation: { type: "string" },
            iconType: { type: "string", enum: ["clock", "trending-down", "users", "alert"] },
          },
          required: ["label", "explanation", "iconType"],
        },
      },
      aiExplanation: { type: "string" },
      reflectionQuestions: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string" },
      },
      suggestions: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string" },
      },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      dataBasis: { type: "string" },
    },
    required: ["score", "tier", "flags", "aiExplanation", "reflectionQuestions", "suggestions", "confidence", "dataBasis"],
  },
};

// ─── L1 in-memory cache ─────────────────────────────────────────────────────

const L1_TTL = 30 * 60 * 1000; // 30 min
const l1Cache = new Map<string, { data: CheckLLMOutput; expiry: number }>();

// ─── L2 Supabase cache (24-hour TTL) ────────────────────────────────────────

const L2_TTL_HOURS = 24;

async function readDbCache(
  investorId: string,
  ticker: string
): Promise<CheckLLMOutput | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const supabase = createServiceClient();
    const cutoff = new Date(Date.now() - L2_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("check_results")
      .select("score, tier, flags, ai_explanation, reflection_questions, suggestions, confidence, data_basis")
      .eq("investor_id", investorId)
      .eq("ticker", ticker)
      .gte("created_at", cutoff)
      .maybeSingle();
    if (error || !data) return null;
    return {
      score: data.score as number,
      tier: data.tier as CheckLLMOutput["tier"],
      flags: data.flags as CheckLLMOutput["flags"],
      aiExplanation: data.ai_explanation as string,
      reflectionQuestions: data.reflection_questions as string[],
      suggestions: data.suggestions as string[],
      confidence: data.confidence as CheckLLMOutput["confidence"],
      dataBasis: data.data_basis as string,
    };
  } catch {
    return null;
  }
}

async function writeDbCache(
  investorId: string,
  ticker: string,
  out: CheckLLMOutput
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const supabase = createServiceClient();
    await supabase
      .from("check_results")
      .upsert(
        {
          investor_id: investorId,
          ticker,
          score: out.score,
          tier: out.tier,
          flags: out.flags,
          ai_explanation: out.aiExplanation,
          reflection_questions: out.reflectionQuestions,
          suggestions: out.suggestions,
          confidence: out.confidence,
          data_basis: out.dataBasis,
          created_at: new Date().toISOString(),
        },
        { onConflict: "investor_id,ticker" }
      );
  } catch (err) {
    console.error("[llm] writeDbCache failed:", err);
  }
}

// ─── Batch read for trending list ───────────────────────────────────────────

export async function readDbCacheBatch(
  investorId: string,
  tickers: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (tickers.length === 0) return result;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return result;
  try {
    const supabase = createServiceClient();
    const cutoff = new Date(Date.now() - L2_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("check_results")
      .select("ticker, score")
      .eq("investor_id", investorId)
      .in("ticker", tickers.map((t) => t.toUpperCase()))
      .gte("created_at", cutoff);
    for (const row of data ?? []) {
      result.set(row.ticker as string, row.score as number);
    }
  } catch (err) {
    console.error("[llm] readDbCacheBatch failed:", err);
  }
  return result;
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function generateCheck(
  investorId: string,
  input: CheckLLMInput
): Promise<CheckLLMOutput> {
  const ticker = input.product.ticker.toUpperCase();
  const cacheKey = `${investorId}:${ticker}`;

  // L1
  const cached = l1Cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.data;

  // L2
  const dbHit = await readDbCache(investorId, ticker);
  if (dbHit) {
    l1Cache.set(cacheKey, { data: dbHit, expiry: Date.now() + L1_TTL });
    return dbHit;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    temperature: 0,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [CHECK_TOOL],
    tool_choice: { type: "tool", name: "submit_check_result" },
    messages: [
      {
        role: "user",
        content: `Run the fitness check for the following input. Use the submit_check_result tool exactly once.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "submit_check_result") {
      const result = block.input as CheckLLMOutput;
      l1Cache.set(cacheKey, { data: result, expiry: Date.now() + L1_TTL });
      // Fire-and-forget DB write — don't block on it
      writeDbCache(investorId, ticker, result);
      return result;
    }
  }
  throw new Error("LLM did not return structured tool output");
}

export function invalidateCheckCache(investorId: string, ticker?: string) {
  if (ticker) {
    l1Cache.delete(`${investorId}:${ticker.toUpperCase()}`);
  } else {
    for (const key of l1Cache.keys()) {
      if (key.startsWith(`${investorId}:`)) l1Cache.delete(key);
    }
  }
}
