"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Home, User, BookOpen, HelpCircle } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FitnessProgressBar } from "@/components/shared/FitnessProgressBar";
import type { ProfileResponse, TrendingProduct, HistoryItem } from "@/lib/types";

function getMatchColor(pct: number) {
  if (pct >= 70) return "#14B8BB";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

function getRiskDotColor(r: string) {
  const map: Record<string, string> = { R1: "#CCCCCC", R2: "#A6A6A6", R3: "#808080", R4: "#5A5A5A", R5: "#333333" };
  return map[r] ?? "#808080";
}

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"trending" | "history">("trending");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("vett_investor_id") ?? "";
    fetch(`/api/profile?investor_id=${id}`).then(r => r.json()).then(setProfile);
    fetch(`/api/products/trending?investor_id=${id}`).then(r => r.json()).then(d => setTrending(d.products));
    fetch(`/api/check/history?investor_id=${id}`).then(r => r.json()).then(d => setHistory(d.items));
  }, []);

  const filteredTrending = trending.filter(
    p => p.ticker.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredHistory = history.filter(
    h => h.ticker.toLowerCase().includes(search.toLowerCase()) || h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="flex-shrink-0">
        <AppHeader />

        {/* Fitness Score */}
        <div className="px-6 pb-4">
          <div className="rounded-3xl p-5" style={{ backgroundColor: "#F5F5F5" }}>
            <div className="flex items-baseline mb-3">
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "52px", fontWeight: 700, color: "#0A0A0A", lineHeight: "1" }}>
                {profile?.fitnessScore ?? "—"}
              </span>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 400, color: "#888888", marginLeft: "4px" }}>/100</span>
            </div>
            <FitnessProgressBar value={profile?.fitnessScore ?? 0} />
            <p className="mt-3" style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 400, color: "#888888" }}>
              {profile ? profile.headline : "Loading your profile…"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#888888" }} />
            <input
              type="text"
              placeholder="Search by ticker or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 focus:outline-none"
              style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", height: "48px", backgroundColor: "#F5F5F5", borderRadius: "12px", color: "#111111" }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4 flex gap-2">
          {(["trending", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-6 py-2 rounded-full transition-colors capitalize"
              style={{
                fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600,
                backgroundColor: tab === t ? "#111111" : "#F5F5F5",
                color: tab === t ? "#FFFFFF" : "#333333",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20 px-6">
        <div className="space-y-3">
          {tab === "trending"
            ? filteredTrending.map(p => (
                <div
                  key={p.ticker}
                  onClick={() => router.push(`/check/${p.ticker}`)}
                  className="flex items-center justify-between p-4 cursor-pointer"
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #EEEEEE", minHeight: "76px" }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 600, color: "#0A0A0A" }}>{p.ticker}</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", backgroundColor: "#F0F0F0", color: "#333333" }}>
                        <div className="rounded-full" style={{ width: "8px", height: "8px", backgroundColor: getRiskDotColor(p.riskLevel) }} />
                        {p.riskLevel}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{p.name}</p>
                  </div>
                  <span
                    title={p.isEstimate ? "Estimate. Open this product to run the full AI check." : ""}
                    className="inline-flex items-center gap-1"
                    style={{
                      fontFamily: "var(--font-outfit)",
                      fontSize: "22px",
                      fontWeight: 700,
                      color: getMatchColor(p.matchPercentage),
                      opacity: p.isEstimate ? 0.55 : 1,
                    }}
                  >
                    {p.matchPercentage}%
                    {p.isEstimate && <HelpCircle className="w-3.5 h-3.5" />}
                  </span>
                </div>
              ))
            : filteredHistory.map(h => (
                <div
                  key={`${h.ticker}-${h.date}`}
                  onClick={() => router.push(`/check/${h.ticker}`)}
                  className="flex items-center justify-between p-4 cursor-pointer"
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #EEEEEE", minHeight: "76px" }}
                >
                  <div className="flex-1">
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 600, color: "#0A0A0A", display: "block", marginBottom: "2px" }}>{h.ticker}</span>
                    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{h.name}</p>
                    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#AAAAAA" }}>{h.date}</p>
                  </div>
                  <span
                    title={h.isEstimate ? "Estimate. Open this product to run the full AI check." : ""}
                    className="inline-flex items-center gap-1"
                    style={{
                      fontFamily: "var(--font-outfit)",
                      fontSize: "22px",
                      fontWeight: 700,
                      color: getMatchColor(h.matchPercentage),
                      opacity: h.isEstimate ? 0.55 : 1,
                    }}
                  >
                    {h.matchPercentage}%
                    {h.isEstimate && <HelpCircle className="w-3.5 h-3.5" />}
                  </span>
                </div>
              ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around" style={{ height: "56px", borderTop: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}>
        <button className="p-2"><Home className="w-6 h-6 fill-current" style={{ color: "#111111" }} /></button>
        <button className="p-2" onClick={() => router.push("/profile")}><User className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
        <button className="p-2" onClick={() => router.push("/explore")}><BookOpen className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
      </div>
    </div>
  );
}
