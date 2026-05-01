"use client";
import { useRouter } from "next/navigation";
import { Pencil, FileText, Link2 } from "lucide-react";

const OPTIONS = [
  { icon: <Pencil className="w-8 h-8" />, title: "Manual entry",    description: "Add a few past trades manually" },
  { icon: <FileText className="w-8 h-8" />, title: "Import CSV",    description: "Upload from your broker" },
  { icon: <Link2 className="w-8 h-8" />,   title: "Connect account", description: "Sync automatically" },
];

export default function ImportPage() {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      {/* All dots teal = complete */}
      <div className="flex justify-center gap-2 px-6 pt-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
          <div key={dot} className="w-2 h-2 rounded-full" style={{ backgroundColor: "#14B8BB" }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-24">
        <div className="mb-8">
          <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "32px", fontWeight: 700, color: "#0A0A0A", lineHeight: "1.15", marginBottom: "8px" }}>
            Connect your investment history
          </h2>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 400, color: "#888888" }}>
            This helps us compare what you say vs. what you actually do.
          </p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.title}
              onClick={() => router.push("/home")}
              className="w-full text-left transition-all"
              style={{ fontFamily: "var(--font-outfit)", padding: "20px", borderRadius: "14px", minHeight: "72px", backgroundColor: "#F5F5F5" }}
            >
              <div className="flex items-start gap-4">
                <div style={{ color: "#14B8BB", marginTop: "2px" }}>{opt.icon}</div>
                <div className="flex-1">
                  <div style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: "#111111", marginBottom: "4px" }}>
                    {opt.title}
                  </div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 400, color: "#888888" }}>
                    {opt.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-6 py-6" style={{ backgroundColor: "#FFFFFF" }}>
        <button
          onClick={() => router.push("/home")}
          className="w-full text-center underline mb-2"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 400, color: "#888888" }}
        >
          Skip for now
        </button>
        <p className="text-center" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 400, color: "#888888" }}>
          You can always connect later in Settings.
        </p>
      </div>
    </div>
  );
}
