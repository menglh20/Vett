"use client";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  riskLevel?: string;
}

export function AppHeader({ onBack, title, subtitle, riskLevel }: AppHeaderProps = {}) {
  if (onBack && title) {
    return (
      <div
        className="px-6 pt-4 pb-4 flex items-center gap-4"
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <button onClick={onBack} className="p-2 rounded-full" aria-label="Go back">
          <ArrowLeft className="w-6 h-6" style={{ color: "#888888" }} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "17px", fontWeight: 600, color: "#0A0A0A" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 400, color: "#888888" }}>
              {subtitle}
            </span>
          )}
          {riskLevel && (
            <span
              className="px-3 py-1 rounded-full"
              style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 400, backgroundColor: "#F0F0F0", color: "#333333" }}
            >
              {riskLevel}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
        Vett
      </p>
      <button className="p-1" aria-label="Menu">
        <MoreVertical className="w-6 h-6" style={{ color: "#888888" }} />
      </button>
    </div>
  );
}
