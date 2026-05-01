"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function WebRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const isValid = username.trim().length > 0 && password.length >= 6 && passwordsMatch;

  const handleRegister = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      localStorage.setItem("vett_investor_id", data.investor_id);
      router.push("/web/step/1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="w-full max-w-[440px]">
        <button onClick={() => router.push("/web")} className="mb-8 p-2 rounded-full hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" style={{ color: "#888888" }} />
        </button>

        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "36px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px" }}>
          Create account
        </h1>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", marginBottom: "36px" }}>
          Set up your account, then we&apos;ll ask a few quick questions.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: "#FEF2F2", fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#EF4444" }}>
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#333333", display: "block", marginBottom: "8px" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full outline-none transition-colors"
              style={{
                fontFamily: "var(--font-outfit)", fontSize: "16px", padding: "16px 20px",
                borderRadius: "14px", backgroundColor: "#F5F5F5", color: "#0A0A0A",
                border: "2px solid transparent",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#14B8BB")}
              onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#333333", display: "block", marginBottom: "8px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full outline-none transition-colors"
              style={{
                fontFamily: "var(--font-outfit)", fontSize: "16px", padding: "16px 20px",
                borderRadius: "14px", backgroundColor: "#F5F5F5", color: "#0A0A0A",
                border: "2px solid transparent",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#14B8BB")}
              onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: "#333333", display: "block", marginBottom: "8px" }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full outline-none transition-colors"
              style={{
                fontFamily: "var(--font-outfit)", fontSize: "16px", padding: "16px 20px",
                borderRadius: "14px", backgroundColor: "#F5F5F5", color: "#0A0A0A",
                border: confirmPassword.length > 0 && !passwordsMatch ? "2px solid #EF4444" : "2px solid transparent",
              }}
              onFocus={e => { if (passwordsMatch) e.currentTarget.style.borderColor = "#14B8BB"; }}
              onBlur={e => { if (passwordsMatch) e.currentTarget.style.borderColor = "transparent"; }}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#EF4444", marginTop: "6px" }}>
                Passwords do not match
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!isValid || loading}
          className="w-full mt-8 transition-colors"
          style={{
            fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600,
            height: "56px", borderRadius: "9999px",
            backgroundColor: isValid ? "#111111" : "#E5E5E5",
            color: isValid ? "#FFFFFF" : "#AAAAAA",
            cursor: isValid ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="mt-6 text-center" style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>
          Already have an account?{" "}
          <button onClick={() => router.push("/web/login")} style={{ color: "#14B8BB", fontWeight: 600 }}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
