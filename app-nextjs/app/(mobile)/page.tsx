"use client";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="h-full flex flex-col justify-between p-6" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Logo and Tagline */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="mb-12">
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "40px", fontWeight: 900, color: "#111111", marginBottom: "24px" }}>
            Vett
          </h1>
          <div className="w-16 h-1 mx-auto mb-6 rounded-full" style={{ backgroundColor: "#14B8BB" }} />
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 400, color: "#333333", marginBottom: "8px" }}>
            Vet your decision before you act.
          </p>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 400, color: "#888888" }}>
            See if your investments actually fit you.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        <Link
          href="/register"
          className="block w-full text-center transition-colors"
          style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            lineHeight: "52px",
            backgroundColor: "#111111",
            color: "#FFFFFF",
            borderRadius: "9999px",
            fontSize: "16px",
            textDecoration: "none",
          }}
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="w-full text-center text-base underline block"
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 400, color: "#888888" }}
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
