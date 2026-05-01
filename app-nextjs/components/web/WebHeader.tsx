"use client";
import Link from "next/link";
import { Menu } from "lucide-react";

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

        {/* Menu icon */}
        <button className="transition-opacity hover:opacity-80" aria-label="Menu">
          <Menu className="w-6 h-6" style={{ color: "#333333" }} />
        </button>
      </div>
    </nav>
  );
}
