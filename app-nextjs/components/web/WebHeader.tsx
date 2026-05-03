"use client";
import Link from "next/link";
import { Menu, LogOut, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ActivePage = "dashboard" | "explore" | "advisor" | "none";

interface WebHeaderProps {
  activePage: ActivePage;
}

const NAV_LINKS: { href: string; label: string; page: ActivePage }[] = [
  { href: "/web/dashboard", label: "Dashboard", page: "dashboard" },
  { href: "/web/explore",   label: "Explore",   page: "explore" },
  { href: "/web/advisor",   label: "Advisor View", page: "advisor" },
];

export function WebHeader({ activePage }: WebHeaderProps) {
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
    router.push("/web/import");
  }

  function handleSignOut() {
    localStorage.removeItem("vett_investor_id");
    localStorage.removeItem("vett_onboarding");
    setMenuOpen(false);
    router.push("/web/login");
  }

  return (
    <nav style={{ borderBottom: "1px solid #EEEEEE" }}>
      <div className="max-w-[1200px] mx-auto px-10 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/web/dashboard" className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "24px", fontWeight: 900, color: "#0A0A0A" }}>
            Vett
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-8">
          {NAV_LINKS.map(({ href, label, page }) => {
            const isActive = activePage === page;
            return (
              <Link
                key={page}
                href={href}
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "16px",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#0A0A0A" : "#888888",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="transition-opacity hover:opacity-80"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Menu className="w-6 h-6" style={{ color: "#333333" }} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-3 overflow-hidden z-50"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #EEEEEE",
                borderRadius: "12px",
                minWidth: "200px",
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
    </nav>
  );
}
