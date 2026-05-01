import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * Maps raw step answers (UI labels) → database column values.
 */
function mapAnswers(answers: Record<string, string>) {
  // Step 1: investment_goal
  const goalMap: Record<string, string> = {
    "Capital preservation": "capital_preservation",
    "Steady income": "steady_income",
    "Growth": "growth",
    "Aggressive growth": "aggressive_growth",
  };

  // Step 2: self_risk_level (R1–R5 → 1–5)
  const riskMap: Record<string, number> = {
    "R1: No loss at all": 1,
    "R2: Small dips, under 5%": 2,
    "R3: Moderate ups and downs": 3,
    "R4: Significant swings": 4,
    "R5: High volatility, no problem": 5,
  };

  // Step 3: stated_horizon
  const horizonMap: Record<string, string> = {
    "Less than a week": "<6m",
    "~ 1 month": "<6m",
    "~ 3 months": "<6m",
    "~ 6 months": "6m-1y",
    "~ 1 year": "6m-1y",
    "1-3 years": "1-3y",
    "3+ years": "3-5y",
  };

  // Step 4: investment_experience_years
  const expMap: Record<string, number> = {
    "None": 0,
    "Under 1 year": 1,
    "1-3": 2,
    "3-5": 4,
    "5+": 6,
  };

  // Step 5: stated_max_loss
  const lossMap: Record<string, number> = {
    "0%": 0,
    "5%": 5,
    "10%": 10,
    "20%": 20,
    "50%+": 50,
  };

  // Step 6: target_gain
  const gainMap: Record<string, string> = {
    "5%": "5",
    "10%": "10",
    "20%": "20",
    "50%": "50",
    "No fixed target": "none",
  };

  // Step 7: has_short_term_cash_need
  const cashNeedLabels = ["Funds I may need within 6 months"];

  return {
    investment_goal: goalMap[answers["1"]] ?? null,
    self_risk_level: riskMap[answers["2"]] ?? null,
    stated_horizon: horizonMap[answers["3"]] ?? null,
    investment_experience_years: expMap[answers["4"]] ?? null,
    stated_max_loss: lossMap[answers["5"]] ?? null,
    target_gain: gainMap[answers["6"]] ?? null,
    has_short_term_cash_need: cashNeedLabels.includes(answers["7"]),
  };
}

export async function POST(req: NextRequest) {
  const { investor_id, answers } = await req.json();

  if (!investor_id || !answers) {
    return NextResponse.json({ error: "investor_id and answers are required." }, { status: 400 });
  }

  const mapped = mapAnswers(answers);
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("investors")
    .update(mapped)
    .eq("investor_id", investor_id);

  if (error) {
    return NextResponse.json({ error: "Failed to save onboarding answers." }, { status: 500 });
  }

  return NextResponse.json({ message: "Onboarding answers saved." });
}
