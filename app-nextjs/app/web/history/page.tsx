"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WebHeader } from "@/components/web/WebHeader";
import type { HistoryItem, HistoryResponse } from "@/lib/types";

function getMatchColor(pct: number) { return pct >= 70 ? "#14B8BB" : pct >= 40 ? "#F59E0B" : "#EF4444"; }
function getRiskDotColor(r: string) {
  const m: Record<string, string> = { R1: "#CCCCCC", R2: "#A6A6A6", R3: "#808080", R4: "#5A5A5A", R5: "#333333" };
  return m[r] ?? "#808080";
}

export default function WebHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("vett_investor_id") ?? "";
    fetch(`/api/check/history?investor_id=${id}`).then(r => r.json()).then((d: HistoryResponse) => setItems(d.items));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="none" />
      <div className="max-w-[1200px] mx-auto px-10 py-8">
        <button onClick={() => router.push("/web/dashboard")} className="mb-6 p-2 hover:opacity-70 rounded-full transition-opacity">
          <ArrowLeft className="w-5 h-5" style={{ color: "#888888" }} />
        </button>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "32px", fontWeight: 700, color: "#0A0A0A", marginBottom: "24px" }}>Check History</h1>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #EEEEEE" }}>
          <table className="w-full">
            <thead style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #EEEEEE" }}>
              <tr>
                {["Date", "Ticker", "Product Name", "Risk", "Match"].map(h => (
                  <th key={h} className="px-5 py-3 text-left" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, color: "#666666" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.ticker}-${item.date}`} onClick={() => router.push(`/web/check/${item.ticker}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{item.date}</span></td>
                  <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: "#0A0A0A" }}>{item.ticker}</span></td>
                  <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#888888" }}>{item.name}</span></td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", backgroundColor: "#F0F0F0", color: "#333333", width: "fit-content" }}>
                      <div className="rounded-full" style={{ width: "7px", height: "7px", backgroundColor: getRiskDotColor(item.riskLevel) }} />
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><span style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: getMatchColor(item.matchPercentage) }}>{item.matchPercentage}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
