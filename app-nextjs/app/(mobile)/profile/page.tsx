"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, User, BookOpen } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { ProfileRadarChart } from "@/components/shared/RadarChart";
import type { ProfileResponse } from "@/lib/types";

function getLevelWidth(level: string) {
  return level === "High" ? "75%" : level === "Medium" ? "50%" : "25%";
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("vett_investor_id") ?? "";
    fetch(`/api/profile?investor_id=${id}`).then(r => r.json()).then(setProfile);
  }, []);

  const radarData = (profile?.dimensions ?? []).map(d => ({
    dimension: d.name,
    selfAssessed: d.selfValue,
    observed: d.observedValue,
  }));

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="flex-shrink-0">
        <AppHeader />
        <div className="px-6 pb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#FAFAFA" }}>
            <ProfileRadarChart data={radarData} height={260} />
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="flex-1 overflow-y-auto pb-28 px-6 space-y-4">
        {(profile?.dimensions ?? []).map(dim => (
          <div key={dim.name} className="rounded-2xl p-4" style={{ border: "1px solid #EEEEEE" }}>
            <div className="flex items-center gap-2 mb-3">
              <h3 style={{ fontFamily: "var(--font-outfit)", fontSize: "17px", fontWeight: 700, color: "#111111" }}>{dim.name}</h3>
              <div className="rounded-full" style={{ width: "10px", height: "10px", backgroundColor: dim.dotColor }} />
            </div>
            {/* Self */}
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>You said:</span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, color: "#333333" }}>{dim.selfAssessed}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: "#EEEEEE" }}>
                <div className="h-2 rounded-full" style={{ width: getLevelWidth(dim.selfAssessed), backgroundColor: "#BBBBBB" }} />
              </div>
            </div>
            {/* Observed */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#888888" }}>Data shows:</span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, color: "#333333" }}>{dim.observed}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: "#EEEEEE" }}>
                <div className="h-2 rounded-full" style={{ width: getLevelWidth(dim.observed), backgroundColor: "#14B8BB" }} />
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>{dim.explanation}</p>
          </div>
        ))}
      </div>

      {/* Fixed bottom */}
      <div className="absolute bottom-0 left-0 right-0" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="px-6 py-3" style={{ borderTop: "1px solid #EEEEEE" }}>
          <button
            onClick={() => router.push("/step/1")}
            className="w-full text-center underline"
            style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", color: "#888888" }}
          >
            Retake Assessment
          </button>
        </div>
        <div className="flex items-center justify-around" style={{ height: "56px", borderTop: "1px solid #EEEEEE" }}>
          <button className="p-2" onClick={() => router.push("/home")}><Home className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
          <button className="p-2"><User className="w-6 h-6 fill-current" style={{ color: "#111111" }} /></button>
          <button className="p-2" onClick={() => router.push("/explore")}><BookOpen className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
        </div>
      </div>
    </div>
  );
}
