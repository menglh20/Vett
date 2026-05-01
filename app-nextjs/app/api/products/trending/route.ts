import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeSignals, computeMatchPercentage } from "@/lib/signals";
import type { TrendingResponse, RiskLevel } from "@/lib/types";

const TRENDING_TICKERS = ["NVDA", "AAPL", "TSLA", "VOO", "BND", "MSFT", "AMZN"];

const RISK_LABELS: Record<number, RiskLevel> = { 1: "R1", 2: "R2", 3: "R3", 4: "R4", 5: "R5" };

export async function GET(req: NextRequest) {
  const investorId = req.nextUrl.searchParams.get("investor_id");

  if (!investorId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(MOCK_TRENDING);
  }

  try {
    const supabase = createServiceClient();

    // Fetch products info from DB
    const { data: products } = await supabase
      .from("products")
      .select("ticker, name, risk_level, is_long_term, is_illiquid")
      .in("ticker", TRENDING_TICKERS);

    if (!products || products.length === 0) return NextResponse.json(MOCK_TRENDING);

    // Fetch user's actual_tolerance
    const { data: investor } = await supabase
      .from("investors")
      .select("actual_tolerance")
      .eq("investor_id", investorId)
      .single();

    const actualTolerance = investor?.actual_tolerance ?? 3;

    // Compute signals for matchPercentage
    const signals = await computeSignals(investorId);

    // Build trending list
    const trendingProducts = TRENDING_TICKERS.map((ticker) => {
      const p = products.find((pr) => pr.ticker === ticker);
      if (!p) return null;

      const match = computeMatchPercentage(
        { risk_level: p.risk_level, is_long_term: p.is_long_term, is_illiquid: p.is_illiquid },
        actualTolerance,
        signals
      );

      return {
        ticker: p.ticker,
        name: p.name,
        riskLevel: RISK_LABELS[p.risk_level] ?? "R3" as RiskLevel,
        matchPercentage: match,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ products: trendingProducts });
  } catch (err) {
    console.error("Trending API error:", err);
    return NextResponse.json(MOCK_TRENDING);
  }
}

// ─── Fallback mock ──────────────────────────────────────────────────────────

const MOCK_TRENDING: TrendingResponse = {
  products: [
    { ticker: "NVDA", name: "NVIDIA Corporation", riskLevel: "R4", matchPercentage: 42 },
    { ticker: "AAPL", name: "Apple Inc.", riskLevel: "R2", matchPercentage: 78 },
    { ticker: "TSLA", name: "Tesla, Inc.", riskLevel: "R5", matchPercentage: 28 },
    { ticker: "VOO", name: "Vanguard S&P 500 ETF", riskLevel: "R3", matchPercentage: 85 },
    { ticker: "BND", name: "Vanguard Total Bond Market ETF", riskLevel: "R1", matchPercentage: 92 },
    { ticker: "MSFT", name: "Microsoft Corporation", riskLevel: "R3", matchPercentage: 72 },
    { ticker: "AMZN", name: "Amazon.com Inc.", riskLevel: "R3", matchPercentage: 68 },
  ],
};
