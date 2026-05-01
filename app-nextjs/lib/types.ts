// ─── Enums / Literals ───────────────────────────────────────────────────────

export type ResultTier = "fit" | "caution" | "mismatch";
export type DimensionLevel = "High" | "Medium" | "Low";
export type RiskLevel = "R1" | "R2" | "R3" | "R4" | "R5";

// ─── Behavioral Signals ─────────────────────────────────────────────────────

export interface BehavioralSignals {
  medianHoldDays: number;
  panicSellRate: number;       // 0–1
  externalDecisionPct: number; // 0–1
  liquidityConflict: boolean;
  transactionCount: number;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface DimensionData {
  name: string;
  selfAssessed: DimensionLevel;
  selfValue: number;           // 0–100 for radar chart
  observed: DimensionLevel;
  observedValue: number;       // 0–100 for radar chart
  explanation: string;
  dotColor: string;
}

export interface ProfileResponse {
  fitnessScore: number;
  summary: string;
  signals: BehavioralSignals;
  dimensions: DimensionData[];
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface TrendingProduct {
  ticker: string;
  name: string;
  riskLevel: RiskLevel;
  matchPercentage: number;
}

export interface TrendingResponse {
  products: TrendingProduct[];
}

// ─── Check Result ────────────────────────────────────────────────────────────

export interface Flag {
  label: string;
  explanation: string;
  iconType: "clock" | "trending-down" | "users" | "alert";
}

export interface Alternative {
  ticker: string;
  name: string;
  riskLevel: RiskLevel;
  matchPercentage: number;
}

export interface CheckResponse {
  ticker: string;
  productName: string;
  productRiskLevel: RiskLevel;
  score: number;
  tier: ResultTier;
  flags: Flag[];
  aiExplanation: string;
  reflectionQuestions: string[];
  suggestions: string[];
  alternatives: Alternative[];
  confidence: string;
  dataBasis: string;
}

// ─── Articles ────────────────────────────────────────────────────────────────

export interface Article {
  slug: string;
  title: string;
  category: string;
  tag: string;
  preview: string;
  readTime: string;
  content?: string;
}

export interface ArticlesResponse {
  articles: Article[];
  categories: string[];
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryItem {
  date: string;
  ticker: string;
  name: string;
  riskLevel: RiskLevel;
  matchPercentage: number;
}

export interface HistoryResponse {
  items: HistoryItem[];
}

// ─── Advisor ─────────────────────────────────────────────────────────────────

export interface AdvisorClient {
  id: string;
  name: string;
  mismatchScore: number;
  topSignal: string;
  dotColor: string;
  briefing: string;
  conversationStarters: string[];
  statedRisk: string;
  observedRisk: string;
  medianHold: string;
  panicSellRate: string;
  externalDecision: string;
  radarData: { dimension: string; rated: number; actual: number }[];
}

export interface AdvisorResponse {
  clients: AdvisorClient[];
}
