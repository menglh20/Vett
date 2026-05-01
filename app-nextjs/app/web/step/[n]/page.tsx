"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const QUESTIONS = [
  { question: "What's your investment goal?", subtitle: "This helps us understand what matters most to you.", layout: "card" as const, options: [{ label: "Capital preservation" }, { label: "Steady income" }, { label: "Growth" }, { label: "Aggressive growth" }] },
  { question: "How would you rate your risk tolerance?", subtitle: "How much volatility can you handle?", layout: "card" as const, options: [{ label: "R1: No loss at all" }, { label: "R2: Small dips, under 5%" }, { label: "R3: Moderate ups and downs" }, { label: "R4: Significant swings" }, { label: "R5: High volatility, no problem" }] },
  { question: "How long do you typically hold an investment?", subtitle: "Think about your actual habit, not what you wish you'd do.", layout: "pill" as const, options: [{ label: "Less than a week" }, { label: "~ 1 month" }, { label: "~ 3 months" }, { label: "~ 6 months" }, { label: "~ 1 year" }, { label: "1-3 years" }, { label: "3+ years" }] },
  { question: "How many years of investment experience do you have?", subtitle: "Your experience level helps us calibrate our analysis", layout: "pill" as const, options: [{ label: "None" }, { label: "Under 1 year" }, { label: "1-3" }, { label: "3-5" }, { label: "5+" }] },
  { question: "What's the maximum loss you could accept?", subtitle: "If your investment dropped by this much, would you still sleep fine?", layout: "pill" as const, options: [{ label: "0%" }, { label: "5%" }, { label: "10%" }, { label: "20%" }, { label: "50%+" }] },
  { question: "At what gain would you consider selling?", subtitle: "There's no right answer — we're measuring your instinct.", layout: "pill" as const, options: [{ label: "5%" }, { label: "10%" }, { label: "20%" }, { label: "50%" }, { label: "No fixed target" }] },
  { question: "What best describes this investment fund?", subtitle: "This helps us assess your liquidity flexibility.", layout: "card" as const, options: [{ label: "Long-term savings I won't need for years" }, { label: "Money set aside specifically for investing" }, { label: "Funds I may need within 6 months" }, { label: "Not sure yet" }] },
];

function getStoredAnswers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("vett_onboarding") || "{}");
  } catch { return {}; }
}

export default function WebQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const step = parseInt((params.n as string) || "1");
  const [selected, setSelected] = useState<string | null>(null);

  // Restore previous answer for this step
  useEffect(() => {
    const saved = getStoredAnswers()[String(step)];
    if (saved) setSelected(saved);
  }, [step]);

  const q = QUESTIONS[step - 1];
  if (!q) return null;

  const handleNext = async () => {
    if (!selected) return;
    // Save answer to localStorage
    const answers = getStoredAnswers();
    answers[String(step)] = selected;
    localStorage.setItem("vett_onboarding", JSON.stringify(answers));

    if (step < 7) {
      setSelected(null);
      router.push(`/web/step/${step + 1}`);
    } else {
      // Step 7 complete — sync all answers to Supabase
      const investorId = localStorage.getItem("vett_investor_id");
      if (investorId) {
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ investor_id: investorId, answers }),
        });
      }
      localStorage.removeItem("vett_onboarding");
      router.push("/web/import");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="w-full max-w-[560px]">
        {/* Back + progress */}
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => step > 1 ? router.push(`/web/step/${step - 1}`) : router.push("/web/register")} className="p-2 rounded-full">
            <ArrowLeft className="w-5 h-5" style={{ color: "#888888" }} />
          </button>
          <div className="flex gap-2 flex-1">
            {[1,2,3,4,5,6,7].map(d => (
              <div key={d} className="flex-1 h-1 rounded-full" style={{ backgroundColor: d <= step ? "#14B8BB" : "#EEEEEE" }} />
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>{step}/7</span>
        </div>

        <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "36px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px", lineHeight: "1.15" }}>
          {q.question}
        </h2>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", marginBottom: "32px" }}>{q.subtitle}</p>

        {q.layout === "card" ? (
          <div className="space-y-3 mb-8">
            {q.options.map(opt => (
              <button key={opt.label} onClick={() => setSelected(opt.label)} className="w-full text-left transition-all"
                style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, padding: "20px", borderRadius: "14px", backgroundColor: selected === opt.label ? "#111111" : "#F5F5F5", color: selected === opt.label ? "#FFFFFF" : "#333333" }}>
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 mb-8">
            {q.options.map(opt => (
              <button key={opt.label} onClick={() => setSelected(opt.label)} className="transition-all"
                style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, padding: "12px 24px", borderRadius: "9999px", backgroundColor: selected === opt.label ? "#111111" : "#F5F5F5", color: selected === opt.label ? "#FFFFFF" : "#333333" }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <button onClick={handleNext} disabled={!selected} className="w-full transition-colors"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, height: "56px", borderRadius: "9999px", backgroundColor: selected ? "#111111" : "#E5E5E5", color: selected ? "#FFFFFF" : "#AAAAAA" }}>
          {step === 7 ? "Continue to Data Import" : "Next"}
        </button>
      </div>
    </div>
  );
}
