"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, TrendingDown, Users, AlertCircle } from "lucide-react";
import { WebHeader } from "@/components/web/WebHeader";
import type { CheckResponse, Flag } from "@/lib/types";

const ICON_MAP = {
  clock: <Clock className="w-5 h-5" />,
  "trending-down": <TrendingDown className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  alert: <AlertCircle className="w-5 h-5" />,
};

function getMatchColor(pct: number) { return pct >= 70 ? "#14B8BB" : pct >= 40 ? "#F59E0B" : "#EF4444"; }
function getRiskDotColor(r: string) {
  const m: Record<string, string> = { R1: "#CCCCCC", R2: "#A6A6A6", R3: "#808080", R4: "#5A5A5A", R5: "#333333" };
  return m[r] ?? "#808080";
}

export default function WebCheckPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const router = useRouter();
  const [data, setData] = useState<CheckResponse | null>(null);

  useEffect(() => {
    if (ticker) fetch(`/api/check/${ticker}`).then(r => r.json()).then(setData);
  }, [ticker]);

  if (!data) return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="none" />
      <div className="flex items-center justify-center h-64">
        <p style={{ fontFamily: "var(--font-outfit)", color: "#888888" }}>Analyzing {ticker}…</p>
      </div>
    </div>
  );

  const tierColor = data.score >= 70 ? "#14B8BB" : data.score >= 30 ? "#F59E0B" : "#EF4444";
  const tierLabel = data.tier === "fit" ? "Fit" : data.tier === "caution" ? "Caution" : "Mismatch";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="none" />
      <div className="max-w-[1200px] mx-auto px-10 py-6">
        <button onClick={() => router.push("/web/dashboard")} className="flex items-center gap-2 mb-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: "#888888" }} />
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>Back to Dashboard</span>
        </button>

        <div className="grid gap-8" style={{ gridTemplateColumns: "45% 55%" }}>
          {/* ── Left ── */}
          <div className="space-y-6">
            {/* Score card */}
            <div className="rounded-2xl p-8" style={{ backgroundColor: "#F5F5F5" }}>
              <div className="flex items-center gap-2 mb-6">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "24px", fontWeight: 700, color: "#0A0A0A" }}>{data.ticker}</span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>{data.productName}</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", backgroundColor: "#E5E5E5", color: "#333333" }}>
                  <div className="rounded-full" style={{ width: "7px", height: "7px", backgroundColor: getRiskDotColor(data.productRiskLevel) }} />
                  {data.productRiskLevel}
                </span>
              </div>
              <div className="text-center mb-6">
                <div style={{ fontFamily: "var(--font-outfit)", fontSize: "80px", fontWeight: 700, color: tierColor, lineHeight: "1" }}>{data.score}%</div>
                <div className="inline-block px-4 py-1.5 rounded-full mt-3" style={{ backgroundColor: tierColor }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{tierLabel}</span>
                </div>
              </div>
              <div className="w-full rounded-full mb-2" style={{ height: "8px", backgroundColor: "#E5E5E5" }}>
                <div className="rounded-full" style={{ width: `${data.score}%`, height: "100%", backgroundColor: tierColor }} />
              </div>
              <p className="text-center" style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>
                Decision Fitness Score: {data.score}/100
              </p>
            </div>

            {/* Flags */}
            {data.flags.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Mismatch Flags</h2>
                <div className="space-y-3">
                  {data.flags.map((flag: Flag, i: number) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl" style={{ border: "1px solid #EEEEEE", backgroundColor: "#FAFAFA" }}>
                      <div style={{ color: "#F59E0B", marginTop: "2px" }}>{ICON_MAP[flag.iconType]}</div>
                      <div>
                        <div style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#0A0A0A", marginBottom: "4px" }}>{flag.label}</div>
                        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{flag.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {data.suggestions.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>If you still want to proceed</h2>
                <div className="space-y-3">
                  {data.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
                      <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: "#14B8BB" }} />
                      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#333333" }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#AAAAAA" }}>
              {data.dataBasis} Confidence: {data.confidence}.
            </p>
          </div>

          {/* ── Right ── */}
          <div className="space-y-6">
            {/* AI Explanation */}
            <div>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>
                {data.tier === "fit" ? "Why this fits you" : "Why this might not fit you"}
              </h2>
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#F5F5F5" }}>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333", lineHeight: "1.6", marginBottom: "20px" }}>
                  {data.aiExplanation}
                </p>
                {data.reflectionQuestions.length > 0 && (
                  <>
                    <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#0A0A0A", marginBottom: "12px" }}>Reflection questions</h3>
                    <ol className="space-y-2">
                      {data.reflectionQuestions.map((q, i) => (
                        <li key={i} style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#666666", lineHeight: "1.5" }}>{i + 1}. {q}</li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>

            {/* Alternatives table */}
            {data.alternatives.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Better matches for you</h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #EEEEEE" }}>
                  <table className="w-full">
                    <thead style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #EEEEEE" }}>
                      <tr>
                        {["Ticker", "Product Name", "Risk", "Match"].map(h => (
                          <th key={h} className="px-5 py-3 text-left" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, color: "#666666" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.alternatives.map((alt, i) => (
                        <tr key={alt.ticker} onClick={() => router.push(`/web/check/${alt.ticker}`)} className="cursor-pointer hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: i < data.alternatives.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                          <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: "#0A0A0A" }}>{alt.ticker}</span></td>
                          <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{alt.name}</span></td>
                          <td className="px-5 py-3.5">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", backgroundColor: "#F0F0F0", color: "#333333", width: "fit-content" }}>
                              <div className="rounded-full" style={{ width: "7px", height: "7px", backgroundColor: getRiskDotColor(alt.riskLevel) }} />
                              {alt.riskLevel}
                            </span>
                          </td>
                          <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: getMatchColor(alt.matchPercentage) }}>{alt.matchPercentage}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button className="px-8 py-3 rounded-full transition-colors"
                style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, backgroundColor: "#111111", color: "#FFFFFF" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333333")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#111111")}>
                I understand the risks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
