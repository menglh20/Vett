"use client";
import { ArrowLeft, MoreVertical, LogOut, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface AppHeaderProps {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  riskLevel?: string;
}

export function AppHeader({ onBack, title, subtitle, riskLevel }: AppHeaderProps = {}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleImport() {
    setMenuOpen(false);
    router.push("/import");
  }

  function handleSignOut() {
    localStorage.removeItem("vett_investor_id");
    localStorage.removeItem("vett_onboarding");
    setMenuOpen(false);
    router.push("/login");
  }

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
      <div className="relative" ref={menuRef}>
        <button
          className="p-1"
          aria-label="Menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreVertical className="w-6 h-6" style={{ color: "#888888" }} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-2 overflow-hidden z-50"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EEEEEE",
              borderRadius: "12px",
              minWidth: "180px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            }}
          >
            <button
              onClick={handleImport}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors"
            >
              <Upload className="w-4 h-4" style={{ color: "#666666" }} />
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333" }}>
                Import data
              </span>
            </button>
            <div style={{ height: "1px", backgroundColor: "#F0F0F0" }} />
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors"
            >
              <LogOut className="w-4 h-4" style={{ color: "#666666" }} />
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#333333" }}>
                Sign out
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
