"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WebHeader } from "@/components/web/WebHeader";
import { ProfileRadarChart } from "@/components/shared/RadarChart";
import { FitnessProgressBar } from "@/components/shared/FitnessProgressBar";
import type { ProfileResponse } from "@/lib/types";

export default function WebProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("vett_investor_id") ?? "";
    fetch(`/api/profile?investor_id=${id}`).then(r => r.json()).then(setProfile);
  }, []);

  const radarData = (profile?.dimensions ?? []).map(d => ({
    dimension: d.name, selfAssessed: d.selfValue, observed: d.observedValue,
  }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="none" />
      <div className="max-w-[1200px] mx-auto px-10 py-8">
        <button onClick={() => router.push("/web/dashboard")} className="mb-6 p-2 hover:opacity-70 rounded-full transition-opacity">
          <ArrowLeft className="w-5 h-5" style={{ color: "#888888" }} />
        </button>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "32px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px" }}>Your Behavioral Profile</h1>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", color: "#888888", marginBottom: "32px" }}>
          Detailed comparison of your self-assessment vs. observed behavior
        </p>

        <div className="grid gap-8" style={{ gridTemplateColumns: "45% 55%" }}>
          {/* Left column */}
          <div className="space-y-6">
            {/* Fitness score */}
            <div className="rounded-3xl p-8" style={{ backgroundColor: "#F5F5F5" }}>
              <div className="flex items-baseline mb-4">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "72px", fontWeight: 700, color: "#0A0A0A", lineHeight: "1" }}>
                  {profile?.fitnessScore ?? "—"}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 400, color: "#888888", marginLeft: "8px" }}>/100</span>
              </div>
              <FitnessProgressBar value={profile?.fitnessScore ?? 0} height={8} />
              <p className="mt-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", lineHeight: "1.5" }}>
                {profile?.headline ?? "Loading…"}
              </p>
            </div>

            {/* Behavioral summary */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 700, color: "#0A0A0A", marginBottom: "12px" }}>Behavioral Summary</h2>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#555555", lineHeight: "1.7" }}>
                {profile?.summary ?? "Loading…"}
              </p>
            </div>

            {/* Radar chart */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#0A0A0A", marginBottom: "16px" }}>Self vs. Observed Behavior</h2>
              <ProfileRadarChart data={radarData} height={300} />
            </div>
          </div>

          {/* Right column: dimension cards */}
          <div className="space-y-4">
            {(profile?.dimensions ?? []).map(dim => (
              <div key={dim.name} className="rounded-2xl p-6" style={{ backgroundColor: "#FAFAFA" }}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "18px", fontWeight: 700, color: "#0A0A0A" }}>{dim.name}</h3>
                  <div className="rounded-full" style={{ width: "8px", height: "8px", backgroundColor: dim.dotColor }} />
                </div>
                {/* Self bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-2">
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>You said:</span>
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: "#333333" }}>{dim.selfAssessed}</span>
                  </div>
                  <div className="w-full rounded-full" style={{ height: "8px", backgroundColor: "#E5E5E5" }}>
                    <div className="rounded-full" style={{ width: `${dim.selfValue}%`, height: "100%", backgroundColor: "#CCCCCC" }} />
                  </div>
                </div>
                {/* Observed bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>Data shows:</span>
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: "#333333" }}>{dim.observed}</span>
                  </div>
                  <div className="w-full rounded-full" style={{ height: "8px", backgroundColor: "#E5E5E5" }}>
                    <div className="rounded-full" style={{ width: `${dim.observedValue}%`, height: "100%", backgroundColor: "#14B8BB" }} />
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#555555", lineHeight: "1.6" }}>{dim.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => router.push("/web/step/1")} style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#14B8BB")}
            onMouseLeave={e => (e.currentTarget.style.color = "#888888")}>
            Retake Assessment →
          </button>
        </div>
      </div>
    </div>
  );
}
