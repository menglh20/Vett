"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { WebHeader } from "@/components/web/WebHeader";
import { ProfileRadarChart } from "@/components/shared/RadarChart";
import { FitnessProgressBar } from "@/components/shared/FitnessProgressBar";
import type { ProfileResponse, TrendingProduct, HistoryItem } from "@/lib/types";

function getMatchColor(pct: number) {
  return pct >= 70 ? "#14B8BB" : pct >= 40 ? "#F59E0B" : "#EF4444";
}
function getRiskDotColor(r: string) {
  const m: Record<string, string> = { R1: "#CCCCCC", R2: "#A6A6A6", R3: "#808080", R4: "#5A5A5A", R5: "#333333" };
  return m[r] ?? "#808080";
}
function getObservedLevelColor(level: string) {
  return level === "High" ? "#14B8BB" : level === "Medium" ? "#F59E0B" : "#EF4444";
}

export default function WebDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("vett_investor_id") ?? "";
    fetch(`/api/profile?investor_id=${id}`).then(r => r.json()).then(setProfile);
    fetch(`/api/products/trending?investor_id=${id}`).then(r => r.json()).then(d => setTrending(d.products));
    fetch(`/api/check/history?investor_id=${id}`).then(r => r.json()).then(d => setHistory(d.items.slice(0, 4)));
  }, []);

  const radarData = (profile?.dimensions ?? []).map(d => ({
    dimension: d.name, selfAssessed: d.selfValue, observed: d.observedValue,
  }));

  const filteredTrending = trending.filter(p =>
    p.ticker.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="dashboard" />
      <div className="max-w-[1200px] mx-auto px-10 py-8">
        <div className="grid gap-8" style={{ gridTemplateColumns: "40% 60%" }}>

          {/* ── Left column ── */}
          <div className="space-y-6">
            {/* Fitness score card */}
            <div className="rounded-3xl p-8" style={{ backgroundColor: "#F5F5F5" }}>
              <div className="flex items-baseline mb-4">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "72px", fontWeight: 700, color: "#0A0A0A", lineHeight: "1" }}>
                  {profile?.fitnessScore ?? "—"}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 400, color: "#888888", marginLeft: "8px" }}>/100</span>
              </div>
              <FitnessProgressBar value={profile?.fitnessScore ?? 0} height={8} />
              <p className="mt-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", lineHeight: "1.5" }}>
                {profile ? "You tend to be more conservative than you think." : "Loading…"}
              </p>
            </div>

            {/* Radar chart */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
              <ProfileRadarChart data={radarData} height={240} />
            </div>

            {/* 5 dimension summaries */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
              <div className="space-y-3">
                {(profile?.dimensions ?? []).map(dim => (
                  <div key={dim.name} className="flex items-center justify-between">
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 500, color: "#333333" }}>{dim.name}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{dim.selfAssessed}</span>
                      <span style={{ color: "#CCCCCC" }}>→</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getObservedLevelColor(dim.observed) }} />
                        <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: "#333333" }}>{dim.observed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => router.push("/web/profile")} className="w-full text-center transition-colors"
              style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#14B8BB")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888888")}>
              View full profile →
            </button>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#888888" }} />
              <input type="text" placeholder="Search by ticker or name..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 focus:outline-none"
                style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", height: "48px", backgroundColor: "#F5F5F5", borderRadius: "12px", color: "#111111" }} />
            </div>

            {/* Trending table */}
            <div>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Trending</h2>
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
                    {filteredTrending.map((p, i) => (
                      <tr key={p.ticker} onClick={() => router.push(`/web/check/${p.ticker}`)} className="cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderBottom: i < filteredTrending.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: "#0A0A0A" }}>{p.ticker}</span></td>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{p.name}</span></td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", backgroundColor: "#F0F0F0", color: "#333333", width: "fit-content" }}>
                            <div className="rounded-full" style={{ width: "7px", height: "7px", backgroundColor: getRiskDotColor(p.riskLevel) }} />
                            {p.riskLevel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: getMatchColor(p.matchPercentage) }}>{p.matchPercentage}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent history table */}
            <div>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Recent History</h2>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #EEEEEE" }}>
                <table className="w-full">
                  <thead style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #EEEEEE" }}>
                    <tr>
                      {["Ticker", "Product Name", "Date", "Match"].map(h => (
                        <th key={h} className="px-5 py-3 text-left" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, color: "#666666" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={`${h.ticker}-${h.date}`} onClick={() => router.push(`/web/check/${h.ticker}`)} className="cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderBottom: i < history.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: "#0A0A0A" }}>{h.ticker}</span></td>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{h.name}</span></td>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", color: "#AAAAAA" }}>{h.date}</span></td>
                        <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: getMatchColor(h.matchPercentage) }}>{h.matchPercentage}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => router.push("/web/history")} className="mt-3 w-full text-center transition-colors"
                style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#14B8BB")}
                onMouseLeave={e => (e.currentTarget.style.color = "#888888")}>
                View all →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
