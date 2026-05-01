"use client";
import { useRouter } from "next/navigation";
import { Pencil, FileText, Link2 } from "lucide-react";

const OPTIONS = [
  { icon: <Pencil className="w-6 h-6" />, title: "Manual entry", description: "Add a few past trades manually" },
  { icon: <FileText className="w-6 h-6" />, title: "Import CSV", description: "Upload an export from your broker" },
  { icon: <Link2 className="w-6 h-6" />, title: "Connect account", description: "Sync your transaction history automatically" },
];

export default function WebImportPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="w-full max-w-[560px]">
        <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "36px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px" }}>
          Connect your investment history
        </h2>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", marginBottom: "32px" }}>
          This helps us compare what you say vs. what you actually do.
        </p>
        <div className="space-y-3 mb-8">
          {OPTIONS.map(opt => (
            <button key={opt.title} onClick={() => router.push("/web/dashboard")} className="w-full text-left transition-all"
              style={{ fontFamily: "var(--font-outfit)", padding: "20px", borderRadius: "14px", backgroundColor: "#F5F5F5" }}>
              <div className="flex items-center gap-4">
                <div style={{ color: "#14B8BB" }}>{opt.icon}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: "#111111" }}>{opt.title}</div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>{opt.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => router.push("/web/dashboard")} className="w-full text-center"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", textDecoration: "underline" }}>
          Skip for now — use demo data
        </button>
      </div>
    </div>
  );
}
