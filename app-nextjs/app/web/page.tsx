"use client";
import Link from "next/link";

export default function WebWelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="text-center max-w-lg px-6">
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "64px", fontWeight: 900, color: "#111111", marginBottom: "24px" }}>
          Vett
        </h1>
        <div className="w-16 h-1 mx-auto mb-8 rounded-full" style={{ backgroundColor: "#14B8BB" }} />
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "24px", fontWeight: 400, color: "#333333", marginBottom: "12px" }}>
          Vet your decision before you act.
        </p>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 400, color: "#888888", marginBottom: "48px" }}>
          Compare your self-assessment against your actual trading behavior — and get a fitness check before every investment decision.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/web/register"
            className="block"
            style={{
              fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "16px",
              padding: "16px 48px", backgroundColor: "#111111", color: "#FFFFFF",
              borderRadius: "9999px", textDecoration: "none",
            }}
          >
            Get Started
          </Link>
          <Link href="/web/login" style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 400, color: "#888888", textDecoration: "underline" }}>
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}
