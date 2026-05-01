"use client";
import { useEffect, useState } from "react";
import { WebHeader } from "@/components/web/WebHeader";
import { ProfileRadarChart } from "@/components/shared/RadarChart";
import type { AdvisorClient, AdvisorResponse } from "@/lib/types";

function getMismatchColor(score: number) { return score >= 70 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#14B8BB"; }

export default function WebAdvisorPage() {
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [selected, setSelected] = useState<AdvisorClient | null>(null);

  useEffect(() => {
    fetch("/api/advisor/clients").then(r => r.json()).then((d: AdvisorResponse) => {
      setClients(d.clients);
      setSelected(d.clients[0] ?? null);
    });
  }, []);

  if (!selected) return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="advisor" />
      <div className="flex items-center justify-center h-64">
        <p style={{ fontFamily: "var(--font-outfit)", color: "#888888" }}>Loading clients…</p>
      </div>
    </div>
  );

  const radarData = selected.radarData.map(d => ({
    dimension: d.dimension, selfAssessed: d.rated, observed: d.actual,
  }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="advisor" />
      <div className="max-w-[1200px] mx-auto px-10 py-8">
        <div className="grid gap-8" style={{ gridTemplateColumns: "32% 68%" }}>

          {/* Client list */}
          <div>
            <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Client Portfolio</h2>
            <div className="space-y-3">
              {clients.map(client => (
                <div key={client.id} onClick={() => setSelected(client)} className="rounded-xl p-4 cursor-pointer transition-all"
                  style={{ border: selected.id === client.id ? "2px solid #14B8BB" : "1px solid #EEEEEE", backgroundColor: selected.id === client.id ? "#F0FEFF" : "#FFFFFF" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: "#0A0A0A", marginBottom: "4px" }}>{client.name}</h3>
                      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>{client.topSignal}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: client.dotColor }} />
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#0A0A0A" }}>{client.mismatchScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client detail */}
          <div className="space-y-6">
            {/* Header card */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#F5F5F5" }}>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "24px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px" }}>{selected.name}</h2>
              <div className="flex items-center gap-4 mb-4">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "48px", fontWeight: 700, color: getMismatchColor(selected.mismatchScore), lineHeight: "1" }}>{selected.mismatchScore}</span>
                <div>
                  <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#0A0A0A" }}>Mismatch Score</p>
                  <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>{selected.topSignal}</p>
                </div>
              </div>
              <div className="w-full rounded-full" style={{ height: "6px", backgroundColor: "#E5E5E5" }}>
                <div className="rounded-full" style={{ width: `${selected.mismatchScore}%`, height: "100%", backgroundColor: getMismatchColor(selected.mismatchScore) }} />
              </div>
            </div>

            {/* Radar */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
              <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Behavioral Profile</h3>
              <ProfileRadarChart data={radarData} height={260} />
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Stated Risk", value: selected.statedRisk },
                { label: "Observed Risk", value: selected.observedRisk },
                { label: "Median Hold", value: selected.medianHold },
                { label: "Panic Sell Rate", value: selected.panicSellRate },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-4" style={{ border: "1px solid #EEEEEE" }}>
                  <p style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888", marginBottom: "4px" }}>{item.label}</p>
                  <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: "#0A0A0A" }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* AI Briefing */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#F5F5F5" }}>
              <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 700, color: "#0A0A0A", marginBottom: "12px" }}>Advisor Briefing</h3>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333", lineHeight: "1.6" }}>{selected.briefing}</p>
            </div>

            {/* Conversation starters */}
            <div>
              <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 700, color: "#0A0A0A", marginBottom: "12px" }}>Suggested Conversation Starters</h3>
              <div className="space-y-3">
                {selected.conversationStarters.map((prompt, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ border: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}>
                    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333", lineHeight: "1.5" }}>"{prompt}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
