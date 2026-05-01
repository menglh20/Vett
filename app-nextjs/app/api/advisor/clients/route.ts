import { NextResponse } from "next/server";
import type { AdvisorResponse } from "@/lib/types";

const RADAR_BASE = [
  { dimension: "Risk",         rated: 80, actual: 40 },
  { dimension: "Hold",         rated: 90, actual: 30 },
  { dimension: "Independence", rated: 70, actual: 65 },
  { dimension: "Volatility",   rated: 60, actual: 25 },
  { dimension: "Liquidity",    rated: 50, actual: 80 },
];

const MOCK_ADVISOR: AdvisorResponse = {
  clients: [
    {
      id: "client-1",
      name: "Elena Rodriguez",
      mismatchScore: 81,
      topSignal: "Multi-factor risk",
      dotColor: "#EF4444",
      briefing:
        "Major disconnect across all dimensions. Urgent conversation needed about risk capacity vs tolerance. Elena rates herself as R4 but behaves like R2 in practice.",
      conversationStarters: [
        "I'd like to walk through your recent trades and decision patterns together.",
        "Let's restart with a comprehensive risk assessment based on your actual behavior.",
      ],
      statedRisk: "R4 (Aggressive)",
      observedRisk: "R2 (Conservative)",
      medianHold: "47 days",
      panicSellRate: "67%",
      externalDecision: "72%",
      radarData: RADAR_BASE,
    },
    {
      id: "client-2",
      name: "Sarah Chen",
      mismatchScore: 72,
      topSignal: "Panic sell tendency",
      dotColor: "#EF4444",
      briefing:
        "Client rates R4, behavior suggests R2. Recommend starting conversation with holding period data. Strong pattern of selling during minor corrections.",
      conversationStarters: [
        "Let's review what happened during the last market correction...",
        "I noticed your portfolio turnover is higher than expected. Can we discuss?",
      ],
      statedRisk: "R4 (Aggressive)",
      observedRisk: "R2 (Conservative)",
      medianHold: "52 days",
      panicSellRate: "58%",
      externalDecision: "45%",
      radarData: RADAR_BASE,
    },
    {
      id: "client-3",
      name: "Marcus Johnson",
      mismatchScore: 68,
      topSignal: "Social influence high",
      dotColor: "#F59E0B",
      briefing:
        "High external influence detected. 65% of trades within 48hrs of social media posts. Needs support developing independent research process.",
      conversationStarters: [
        "What research process do you use before making a purchase?",
        "Have you considered a waiting period before acting on recommendations?",
      ],
      statedRisk: "R3 (Moderate-Aggressive)",
      observedRisk: "R3 (Moderate-Aggressive)",
      medianHold: "89 days",
      panicSellRate: "32%",
      externalDecision: "65%",
      radarData: RADAR_BASE,
    },
    {
      id: "client-4",
      name: "Priya Patel",
      mismatchScore: 54,
      topSignal: "Liquidity mismatch",
      dotColor: "#F59E0B",
      briefing:
        "Claims long-term focus but frequently needs early access to funds. Consider liquid alternatives and building larger cash buffer.",
      conversationStarters: [
        "Let's map out your expected cash needs over the next 12 months...",
        "Would a hybrid portfolio with a larger cash buffer work better?",
      ],
      statedRisk: "R3 (Moderate-Aggressive)",
      observedRisk: "R2 (Conservative)",
      medianHold: "156 days",
      panicSellRate: "28%",
      externalDecision: "38%",
      radarData: RADAR_BASE,
    },
    {
      id: "client-5",
      name: "James Mitchell",
      mismatchScore: 38,
      topSignal: "Well-aligned behavior",
      dotColor: "#14B8BB",
      briefing:
        "Strong alignment between stated preferences and observed behavior. Portfolio structure matches risk profile accurately. Recommend periodic check-ins to maintain alignment.",
      conversationStarters: [
        "Your portfolio aligns well with your risk profile. Let's review your rebalancing schedule.",
        "Any changes in your financial goals we should discuss?",
      ],
      statedRisk: "R3 (Moderate-Aggressive)",
      observedRisk: "R3 (Moderate-Aggressive)",
      medianHold: "287 days",
      panicSellRate: "15%",
      externalDecision: "18%",
      radarData: RADAR_BASE,
    },
  ],
};

export async function GET() {
  return NextResponse.json(MOCK_ADVISOR);
}
