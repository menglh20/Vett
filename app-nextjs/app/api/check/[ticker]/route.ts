import { NextResponse } from "next/server";
import type { CheckResponse } from "@/lib/types";

// Mock data per ticker — replace with Layer 1 signal engine + Layer 3 LLM in Phase 3
const TICKER_OVERRIDES: Record<string, Partial<CheckResponse>> = {
  AAPL: { score: 78, tier: "fit", productName: "Apple Inc.", productRiskLevel: "R2" },
  VOO:  { score: 85, tier: "fit", productName: "Vanguard S&P 500 ETF", productRiskLevel: "R3" },
  BND:  { score: 92, tier: "fit", productName: "Vanguard Total Bond Market ETF", productRiskLevel: "R1" },
  MSFT: { score: 72, tier: "fit", productName: "Microsoft Corporation", productRiskLevel: "R3" },
  TSLA: { score: 28, tier: "mismatch", productName: "Tesla, Inc.", productRiskLevel: "R5" },
  AMZN: { score: 68, tier: "caution", productName: "Amazon.com Inc.", productRiskLevel: "R3" },
};

function buildMockResponse(ticker: string): CheckResponse {
  const override = TICKER_OVERRIDES[ticker.toUpperCase()] ?? {};
  const score = override.score ?? 42;
  const tier = override.tier ?? "caution";

  return {
    ticker: ticker.toUpperCase(),
    productName: override.productName ?? `${ticker.toUpperCase()} Corp`,
    productRiskLevel: override.productRiskLevel ?? "R4",
    score,
    tier,
    flags:
      tier === "fit"
        ? []
        : [
            {
              label: "Holding period conflict",
              explanation: "You say 3-5 years, your median hold is 47 days",
              iconType: "clock",
            },
            {
              label: "Volatility mismatch",
              explanation: "You've panic-sold 4 times on dips under 8%",
              iconType: "trending-down",
            },
            ...(tier === "mismatch"
              ? [
                  {
                    label: "Externally driven",
                    explanation: "60% of your buys are influenced by social media",
                    iconType: "users" as const,
                  },
                ]
              : []),
          ],
    aiExplanation:
      tier === "fit"
        ? `Your data shows strong alignment with ${ticker.toUpperCase()}'s profile. Your behavioral patterns are consistent with its risk and holding characteristics. Based on ${38} transactions. Confidence: medium.`
        : `We've detected that ${ticker.toUpperCase()}'s volatility pattern doesn't align with your demonstrated risk tolerance. While you've indicated comfort with ${override.productRiskLevel ?? "R4"}-level risk, your trading history shows a tendency to exit positions during market corrections averaging 8% or less. ${ticker.toUpperCase()} has experienced 12 corrections exceeding 10% in the past 18 months, which historically triggers your sell pattern. Based on 38 transactions. Confidence: medium.`,
    reflectionQuestions: [
      "What would make you sell this position?",
      "How will you feel if this drops 15% in the first week?",
      "Is this purchase based on your research or external influence?",
    ],
    suggestions: [
      "Set a stop-loss at 15% before buying",
      "Wait 24 hours before deciding",
      "Consider dollar-cost averaging instead of lump sum",
    ],
    alternatives: [
      { ticker: "VGT", name: "Vanguard Info Tech ETF", riskLevel: "R3", matchPercentage: 81 },
      { ticker: "QQQ", name: "Invesco QQQ Trust", riskLevel: "R3", matchPercentage: 78 },
      { ticker: "SCHG", name: "Schwab Growth ETF", riskLevel: "R3", matchPercentage: 74 },
    ],
    confidence: "medium",
    dataBasis: "Based on 6 months of data.",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  return NextResponse.json(buildMockResponse(ticker));
}
