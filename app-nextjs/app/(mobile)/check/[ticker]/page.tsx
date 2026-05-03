"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, TrendingDown, Users, AlertCircle } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FitnessProgressBar } from "@/components/shared/FitnessProgressBar";
import type { CheckResponse, Flag } from "@/lib/types";

const ICON_MAP = {
  clock: <Clock className="w-5 h-5" />,
  "trending-down": <TrendingDown className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  alert: <AlertCircle className="w-5 h-5" />,
};

const TIER_COLOR = { fit: "#14B8BB", caution: "#F59E0B", mismatch: "#EF4444" };
const TIER_LABEL = { fit: "Fit", caution: "Caution", mismatch: "Mismatch" };

function getRiskDotColor(r: string) {
  const map: Record<string, string> = { R1: "#CCCCCC", R2: "#A6A6A6", R3: "#808080", R4: "#5A5A5A", R5: "#333333" };
  return map[r] ?? "#808080";
}

export default function CheckPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const router = useRouter();
  const [data, setData] = useState<CheckResponse | null>(null);

  useEffect(() => {
    if (ticker) {
      const investorId = localStorage.getItem("vett_investor_id") ?? "";
      fetch(`/api/check/${ticker}?investor_id=${encodeURIComponent(investorId)}`)
        .then(r => r.json())
        .then(setData);
    }
  }, [ticker]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p style={{ fontFamily: "var(--font-outfit)", color: "#888888" }}>Analyzing {ticker}…</p>
      </div>
    );
  }

  const tierColor = TIER_COLOR[data.tier];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <div className="flex-shrink-0">
        <AppHeader
          onBack={() => router.push("/home")}
          title={data.ticker}
          subtitle={data.productName}
          riskLevel={data.productRiskLevel}
        />
        {/* Hero */}
        <div className="px-6 pt-6 pb-6 text-center">
          <div style={{ fontFamily: "var(--font-outfit)", fontSize: "52px", fontWeight: 700, color: "#0A0A0A", lineHeight: "1", marginBottom: "12px" }}>
            {data.score}%
          </div>
          <div className="inline-block px-4 py-2 rounded-full mb-2" style={{ backgroundColor: tierColor }}>
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
              {TIER_LABEL[data.tier]}
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>
            {data.tier === "fit" ? "This investment fits your behavioral profile." : "This investment may not match your behavioral pattern."}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-36">
        {/* Score bar */}
        <div className="px-6 pb-6">
          <div className="mb-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#333333" }}>
            Score: {data.score}/100
          </div>
          <FitnessProgressBar value={data.score} />
        </div>

        {/* Flags */}
        {data.flags.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#111111" }}>Flags</h2>
            <div className="space-y-3">
              {data.flags.map((flag: Flag, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: "32px", height: "32px", backgroundColor: tierColor }}>
                    <div style={{ color: "#FFFFFF" }}>{ICON_MAP[flag.iconType]}</div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1" style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: "#111111" }}>{flag.label}</div>
                    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>{flag.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        <div className="px-6 pb-6">
          <h2 className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#111111" }}>
            {data.tier === "fit" ? "Why this fits you" : "Why this might not fit you"}
          </h2>
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: "#F5F5F5" }}>
            <p className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#333333", lineHeight: "1.5" }}>
              {data.aiExplanation}
            </p>
            {data.reflectionQuestions.length > 0 && (
              <>
                <h3 className="mb-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: "#111111" }}>
                  Reflection questions
                </h3>
                <ol className="space-y-2">
                  {data.reflectionQuestions.map((q, i) => (
                    <li key={i} style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#333333", lineHeight: "1.5" }}>
                      {i + 1}. {q}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>
            {data.dataBasis} Confidence: {data.confidence}.
          </p>
        </div>

        {/* Suggestions */}
        {data.suggestions.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#111111" }}>
              If you still want to proceed
            </h2>
            <div className="space-y-3">
              {data.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
                  <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: "#888888" }} />
                  <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333" }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives */}
        {data.alternatives.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#111111" }}>
              Better matches in this category
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {data.alternatives.map(alt => (
                <div
                  key={alt.ticker}
                  className="flex-shrink-0 p-4 rounded-xl cursor-pointer"
                  style={{ width: "140px", border: "1px solid #EEEEEE" }}
                  onClick={() => router.push(`/check/${alt.ticker}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="rounded-full" style={{ width: "8px", height: "8px", backgroundColor: "#14B8BB" }} />
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "17px", fontWeight: 700, color: "#111111" }}>{alt.ticker}</span>
                  </div>
                  <p className="mb-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{alt.name}</p>
                  <div style={{ fontFamily: "var(--font-outfit)", fontSize: "22px", fontWeight: 700, color: "#14B8BB" }}>
                    {alt.matchPercentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed action buttons */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 space-y-3" style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #EEEEEE" }}>
        <button
          onClick={() => router.push("/home")}
          className="w-full transition-colors"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, height: "52px", backgroundColor: "#111111", color: "#FFFFFF", borderRadius: "9999px" }}
        >
          {data.tier === "fit" ? "Looks good" : "I'll reconsider"}
        </button>
        <button
          onClick={() => router.push("/home")}
          className="w-full transition-colors"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, height: "52px", backgroundColor: "transparent", color: "#111111", borderRadius: "9999px", border: "1px solid #333333" }}
        >
          Check another
        </button>
      </div>
    </div>
  );
}
