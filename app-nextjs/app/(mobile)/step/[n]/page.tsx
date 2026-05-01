"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Question {
  question: string;
  subtitle: string;
  options: { label: string; description?: string }[];
  layout: "card" | "pill";
}

const QUESTIONS: Question[] = [
  {
    question: "What's your investment goal?",
    subtitle: "This helps us understand what matters most to you.",
    layout: "card",
    options: [
      { label: "Capital preservation" },
      { label: "Steady income" },
      { label: "Growth" },
      { label: "Aggressive growth" },
    ],
  },
  {
    question: "How would you rate your risk tolerance?",
    subtitle: "How much volatility can you handle?",
    layout: "card",
    options: [
      { label: "R1: No loss at all" },
      { label: "R2: Small dips, under 5%" },
      { label: "R3: Moderate ups and downs" },
      { label: "R4: Significant swings" },
      { label: "R5: High volatility, no problem" },
    ],
  },
  {
    question: "How long do you typically hold an investment?",
    subtitle: "Think about your actual habit, not what you wish you'd do.",
    layout: "pill",
    options: [
      { label: "Less than a week" },
      { label: "~ 1 month" },
      { label: "~ 3 months" },
      { label: "~ 6 months" },
      { label: "~ 1 year" },
      { label: "1-3 years" },
      { label: "3+ years" },
    ],
  },
  {
    question: "How many years of investment experience do you have?",
    subtitle: "Your experience level helps us calibrate our analysis",
    layout: "pill",
    options: [
      { label: "None" },
      { label: "Under 1 year" },
      { label: "1-3" },
      { label: "3-5" },
      { label: "5+" },
    ],
  },
  {
    question: "What's the maximum loss you could accept?",
    subtitle: "If your investment dropped by this much, would you still sleep fine?",
    layout: "pill",
    options: [
      { label: "0%" },
      { label: "5%" },
      { label: "10%" },
      { label: "20%" },
      { label: "50%+" },
    ],
  },
  {
    question: "At what gain would you consider selling?",
    subtitle: "There's no right answer — we're measuring your instinct.",
    layout: "pill",
    options: [
      { label: "5%" },
      { label: "10%" },
      { label: "20%" },
      { label: "50%" },
      { label: "No fixed target" },
    ],
  },
  {
    question: "What best describes this investment fund?",
    subtitle: "This helps us assess your liquidity flexibility.",
    layout: "card",
    options: [
      { label: "Long-term savings I won't need for years" },
      { label: "Money set aside specifically for investing" },
      { label: "Funds I may need within 6 months" },
      { label: "Not sure yet" },
    ],
  },
];

function getStoredAnswers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("vett_onboarding") || "{}");
  } catch { return {}; }
}

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();
  const step = parseInt((params.n as string) || "1");
  const [selected, setSelected] = useState<string | null>(null);

  // Restore previous answer for this step
  useEffect(() => {
    const saved = getStoredAnswers()[String(step)];
    if (saved) setSelected(saved);
  }, [step]);

  const question = QUESTIONS[step - 1];
  if (!question) return null;

  const handleNext = async () => {
    if (!selected) return;
    // Save answer to localStorage
    const answers = getStoredAnswers();
    answers[String(step)] = selected;
    localStorage.setItem("vett_onboarding", JSON.stringify(answers));

    if (step < 7) {
      setSelected(null);
      router.push(`/step/${step + 1}`);
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
      router.push("/import");
    }
  };

  const handleBack = () => {
    setSelected(null);
    if (step > 1) router.push(`/step/${step - 1}`);
    else router.push("/register");
  };

  const isCard = question.layout === "card";

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Back button */}
      <div className="p-4 flex items-center">
        <button onClick={handleBack} className="p-2 rounded-full" aria-label="Go back">
          <ArrowLeft className="w-6 h-6" style={{ color: "#888888" }} />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 px-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
          <div
            key={dot}
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor:
                dot === step ? "#14B8BB" : dot < step ? "#B3E8E5" : "#DDDDDD",
            }}
          />
        ))}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-24">
        <div className="mb-8">
          <h2
            style={{
              fontFamily: "var(--font-outfit)",
              fontSize: "32px",
              fontWeight: 700,
              color: "#0A0A0A",
              lineHeight: "1.15",
              marginBottom: "8px",
            }}
          >
            {question.question}
          </h2>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 400, color: "#888888" }}>
            {question.subtitle}
          </p>
        </div>

        {/* Options */}
        {isCard ? (
          <div className="space-y-3">
            {question.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelected(opt.label)}
                className="w-full text-left transition-all"
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "16px",
                  fontWeight: 600,
                  padding: "20px",
                  borderRadius: "14px",
                  minHeight: "56px",
                  backgroundColor: selected === opt.label ? "#111111" : "#F5F5F5",
                  color: selected === opt.label ? "#FFFFFF" : "#333333",
                }}
              >
                {opt.label}
                {opt.description && (
                  <div style={{ fontSize: "14px", fontWeight: 400, marginTop: "4px", color: selected === opt.label ? "#DDDDDD" : "#888888" }}>
                    {opt.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {question.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelected(opt.label)}
                className="transition-all"
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "16px",
                  fontWeight: 600,
                  padding: "12px 20px",
                  borderRadius: "9999px",
                  backgroundColor: selected === opt.label ? "#111111" : "#F5F5F5",
                  color: selected === opt.label ? "#FFFFFF" : "#333333",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-6" style={{ backgroundColor: "#FFFFFF" }}>
        <button
          onClick={handleNext}
          disabled={!selected}
          className="w-full transition-colors"
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "16px",
            fontWeight: 600,
            height: "52px",
            borderRadius: "9999px",
            backgroundColor: selected ? "#111111" : "#E5E5E5",
            color: selected ? "#FFFFFF" : "#AAAAAA",
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
