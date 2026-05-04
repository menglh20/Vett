import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeSignals, computeMatchPercentage } from "@/lib/signals";
import { readDbCacheBatch } from "@/lib/llm";
import type { HistoryResponse, RiskLevel } from "@/lib/types";

const RISK_LABELS: Record<number, RiskLevel> = { 1: "R1", 2: "R2", 3: "R3", 4: "R4", 5: "R5" };

export async function GET(req: NextRequest) {
  const investorId = req.nextUrl.searchParams.get("investor_id");

  if (!investorId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(MOCK_HISTORY);
  }

  try {
    const supabase = createServiceClient();

    // Get user's actual_tolerance
    const { data: investor } = await supabase
      .from("investors")
      .select("actual_tolerance")
      .eq("investor_id", investorId)
      .single();

    if (!investor) return NextResponse.json(MOCK_HISTORY);

    // Get distinct product_types this user has transacted, with most recent date
    const { data: txns } = await supabase
      .from("transactions")
      .select("product_type, product_risk_level, date")
      .eq("investor_id", investorId)
      .order("date", { ascending: false });

    if (!txns || txns.length === 0) return NextResponse.json({ items: [] });

    // Deduplicate by product_type, keep most recent date
    const seen = new Map<string, { product_type: string; risk_level: number; date: string }>();
    for (const t of txns) {
      if (!seen.has(t.product_type)) {
        seen.set(t.product_type, {
          product_type: t.product_type,
          risk_level: t.product_risk_level,
          date: t.date,
        });
      }
    }

    // For each product_type, find a representative product from products table
    const productTypes = Array.from(seen.keys());
    const { data: products } = await supabase
      .from("products")
      .select("ticker, name, product_type, risk_level, is_long_term, is_illiquid")
      .in("product_type", productTypes);

    // Build a map: product_type → first matching product
    const productMap = new Map<string, typeof products extends (infer T)[] | null ? T : never>();
    for (const p of products ?? []) {
      if (!productMap.has(p.product_type)) {
        productMap.set(p.product_type, p);
      }
    }

    // Compute signals for matchPercentage fallback
    const signals = await computeSignals(investorId);
    const actualTolerance = investor.actual_tolerance ?? 3;

    // Pull any LLM-generated scores already stored for these tickers
    const candidateTickers = Array.from(seen.values())
      .map((entry) => productMap.get(entry.product_type)?.ticker ?? entry.product_type.toUpperCase());
    const llmScores = await readDbCacheBatch(investorId, candidateTickers);

    // Build history items — prefer LLM score when available, else rule-based
    const items = Array.from(seen.values())
      .map((entry) => {
        const product = productMap.get(entry.product_type);
        const riskLevel = product?.risk_level ?? entry.risk_level;
        const ticker = product?.ticker ?? entry.product_type.toUpperCase();

        const cachedScore = llmScores.get(ticker);
        const match =
          cachedScore !== undefined
            ? cachedScore
            : computeMatchPercentage(
                {
                  risk_level: riskLevel,
                  is_long_term: product?.is_long_term ?? false,
                  is_illiquid: product?.is_illiquid ?? false,
                },
                actualTolerance,
                signals
              );

        return {
          date: formatDate(entry.date),
          ticker,
          name: product?.name ?? entry.product_type.replace(/_/g, " "),
          riskLevel: RISK_LABELS[riskLevel] ?? "R3" as RiskLevel,
          matchPercentage: match,
          isEstimate: cachedScore === undefined,
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("History API error:", err);
    return NextResponse.json(MOCK_HISTORY);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Fallback mock ──────────────────────────────────────────────────────────

const MOCK_HISTORY: HistoryResponse = {
  items: [
    { date: "Apr 1, 2026",  ticker: "AAPL",  name: "Apple Inc.",                      riskLevel: "R2", matchPercentage: 78 },
    { date: "Mar 28, 2026", ticker: "VOO",   name: "Vanguard S&P 500 ETF",            riskLevel: "R3", matchPercentage: 85 },
    { date: "Mar 25, 2026", ticker: "TSLA",  name: "Tesla, Inc.",                     riskLevel: "R5", matchPercentage: 28 },
    { date: "Mar 20, 2026", ticker: "NVDA",  name: "NVIDIA Corporation",              riskLevel: "R4", matchPercentage: 42 },
    { date: "Mar 15, 2026", ticker: "MSFT",  name: "Microsoft Corporation",           riskLevel: "R3", matchPercentage: 72 },
    { date: "Mar 10, 2026", ticker: "BND",   name: "Vanguard Total Bond Market ETF",  riskLevel: "R1", matchPercentage: 92 },
    { date: "Mar 5, 2026",  ticker: "AMZN",  name: "Amazon.com Inc.",                 riskLevel: "R3", matchPercentage: 68 },
    { date: "Feb 28, 2026", ticker: "GOOGL", name: "Alphabet Inc.",                   riskLevel: "R3", matchPercentage: 65 },
    { date: "Feb 20, 2026", ticker: "META",  name: "Meta Platforms Inc.",             riskLevel: "R4", matchPercentage: 52 },
    { date: "Feb 15, 2026", ticker: "VTI",   name: "Vanguard Total Stock Market ETF", riskLevel: "R3", matchPercentage: 81 },
  ],
};
