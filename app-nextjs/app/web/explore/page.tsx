"use client";
import { useEffect, useState } from "react";
import { WebHeader } from "@/components/web/WebHeader";
import type { Article, ArticlesResponse } from "@/lib/types";

const TAG_COLORS: Record<string, string> = {
  Holding: "#14B8BB", Panic: "#EF4444", Following: "#F59E0B", Liquidity: "#F59E0B",
};

export default function WebExplorePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [data, setData] = useState<ArticlesResponse | null>(null);

  useEffect(() => {
    fetch(`/api/articles?category=${encodeURIComponent(activeCategory)}`)
      .then(r => r.json()).then(setData);
  }, [activeCategory]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
      <WebHeader activePage="explore" />
      <div className="max-w-[1200px] mx-auto px-10 py-8">
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "36px", fontWeight: 700, color: "#0A0A0A", marginBottom: "8px" }}>Explore</h1>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", color: "#888888", marginBottom: "32px" }}>
          Behavioral finance concepts behind your results
        </p>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {(data?.categories ?? ["All"]).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-5 py-2 rounded-full transition-colors"
              style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, backgroundColor: activeCategory === cat ? "#14B8BB" : "#F5F5F5", color: activeCategory === cat ? "#FFFFFF" : "#333333" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Article grid */}
        <div className="grid grid-cols-3 gap-4">
          {(data?.articles ?? []).map((article: Article) => (
            <div key={article.slug} className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-sm" style={{ backgroundColor: "#F5F5F5" }}>
              <h3 className="mb-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "17px", fontWeight: 600, color: "#111111" }}>{article.title}</h3>
              <p className="mb-4" style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888", lineHeight: "1.5" }}>{article.preview}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", backgroundColor: "#EBEBEB", color: "#333333" }}>
                  {TAG_COLORS[article.tag] && <div className="rounded-full" style={{ width: "6px", height: "6px", backgroundColor: TAG_COLORS[article.tag] }} />}
                  {article.tag}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#AAAAAA" }}>{article.readTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
