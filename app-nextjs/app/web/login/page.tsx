"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function WebLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const isValid = username.trim().length > 0 && password.length >= 6;

  const handleLogin = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      localStorage.setItem("vett_investor_id", data.investor_id);
      router.push("/web/dashboard");
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
          Welcome back
        </h1>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", color: "#888888", marginBottom: "36px" }}>
          Log in to continue to your dashboard.
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
              placeholder="Enter your username"
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
              placeholder="Enter your password"
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
        </div>

        <button
          onClick={handleLogin}
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
          {loading ? "Logging in…" : "Log In"}
        </button>

        <p className="mt-6 text-center" style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888" }}>
          Don&apos;t have an account?{" "}
          <button onClick={() => router.push("/web/register")} style={{ color: "#14B8BB", fontWeight: 600 }}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
