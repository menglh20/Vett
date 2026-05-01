"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, User, BookOpen } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import type { Article, ArticlesResponse } from "@/lib/types";

const TAG_COLORS: Record<string, string> = {
  Holding: "#14B8BB",
  Panic: "#EF4444",
  Following: "#F59E0B",
  Liquidity: "#F59E0B",
};

export default function ExplorePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [data, setData] = useState<ArticlesResponse | null>(null);

  useEffect(() => {
    fetch(`/api/articles?category=${encodeURIComponent(activeCategory)}`)
      .then(r => r.json())
      .then(setData);
  }, [activeCategory]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="flex-1 overflow-y-auto pb-20">
        <AppHeader />

        <div className="px-6 pb-4">
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "32px", fontWeight: 700, color: "#0A0A0A" }}>Explore</h1>
        </div>

        {/* Category filters */}
        <div className="px-6 pb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(data?.categories ?? ["All"]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full whitespace-nowrap transition-colors"
                style={{
                  fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600,
                  backgroundColor: activeCategory === cat ? "#14B8BB" : "#F5F5F5",
                  color: activeCategory === cat ? "#FFFFFF" : "#333333",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles */}
        <div className="px-6 space-y-4">
          {(data?.articles ?? []).map((article: Article) => (
            <div key={article.slug} className="rounded-2xl p-4" style={{ backgroundColor: "#F5F5F5" }}>
              <h3 className="mb-2" style={{ fontFamily: "var(--font-outfit)", fontSize: "17px", fontWeight: 600, color: "#111111" }}>
                {article.title}
              </h3>
              <p className="mb-3" style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", color: "#888888", lineHeight: "1.5" }}>
                {article.preview}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", backgroundColor: "#F0F0F0", color: "#333333" }}>
                  {TAG_COLORS[article.tag] && (
                    <div className="rounded-full" style={{ width: "6px", height: "6px", backgroundColor: TAG_COLORS[article.tag] }} />
                  )}
                  {article.tag}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "12px", color: "#AAAAAA" }}>{article.readTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around" style={{ height: "56px", borderTop: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}>
        <button className="p-2" onClick={() => router.push("/home")}><Home className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
        <button className="p-2" onClick={() => router.push("/profile")}><User className="w-6 h-6" style={{ color: "#CCCCCC" }} /></button>
        <button className="p-2"><BookOpen className="w-6 h-6 fill-current" style={{ color: "#111111" }} /></button>
      </div>
    </div>
  );
}
