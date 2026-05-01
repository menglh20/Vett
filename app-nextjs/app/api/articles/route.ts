import { NextResponse } from "next/server";
import type { ArticlesResponse } from "@/lib/types";

export const MOCK_ARTICLES: ArticlesResponse = {
  categories: ["All", "Holding Behavior", "Panic Selling", "Following Others", "Liquidity", "General"],
  articles: [
    { slug: "say-long-sell-short",      title: "Why we say long-term but sell short",       category: "Holding Behavior", tag: "Holding",   preview: "Understanding the gap between investment intentions and actual behavior patterns.", readTime: "3 min read" },
    { slug: "8pct-panic-threshold",     title: "The 8% panic threshold",                     category: "Panic Selling",    tag: "Panic",     preview: "Most retail investors panic-sell at smaller drawdowns than they expect.", readTime: "4 min read" },
    { slug: "social-media-portfolio",   title: "Social media and your portfolio",             category: "Following Others", tag: "Following", preview: "How external influences shape investment decisions without you realizing it.", readTime: "5 min read" },
    { slug: "liquidity-trap",           title: "The liquidity trap",                         category: "Liquidity",        tag: "Liquidity", preview: "Why you need cash access more often than your survey answers suggest.", readTime: "3 min read" },
    { slug: "tolerance-vs-capacity",    title: "Risk tolerance vs risk capacity",             category: "General",          tag: "General",   preview: "The difference between what you can handle emotionally vs financially.", readTime: "6 min read" },
    { slug: "holding-blind-spot",       title: "Your holding period blind spot",              category: "Holding Behavior", tag: "Holding",   preview: "Data shows most investors overestimate their patience by 5-10x.", readTime: "4 min read" },
    { slug: "sell-low-cycle",           title: "Breaking the sell-low cycle",                category: "Panic Selling",    tag: "Panic",     preview: "Practical strategies to avoid emotional decision-making during downturns.", readTime: "5 min read" },
    { slug: "fomo-drives-trades",       title: "When FOMO drives your trades",               category: "Following Others", tag: "Following", preview: "Recognizing and managing fear of missing out in investment decisions.", readTime: "3 min read" },
    { slug: "disposition-effect",       title: "The disposition effect explained",           category: "Panic Selling",    tag: "Panic",     preview: "Why investors sell winners too early and hold losers too long.", readTime: "5 min read" },
    { slug: "herd-behavior",            title: "Herd behavior in retail investing",          category: "Following Others", tag: "Following", preview: "How social proof distorts individual investment judgment.", readTime: "4 min read" },
    { slug: "overconfidence-bias",      title: "Overconfidence and your returns",            category: "General",          tag: "General",   preview: "Why above-average self-assessment leads to below-average outcomes.", readTime: "5 min read" },
    { slug: "cash-buffer-strategy",     title: "Building your cash buffer",                  category: "Liquidity",        tag: "Liquidity", preview: "How much liquidity you actually need versus what you think you need.", readTime: "4 min read" },
    { slug: "loss-aversion",            title: "Loss aversion in practice",                  category: "Panic Selling",    tag: "Panic",     preview: "The asymmetric pain of losses and how it distorts risk decisions.", readTime: "6 min read" },
    { slug: "recency-bias",             title: "Recency bias and market cycles",             category: "General",          tag: "General",   preview: "Why recent events dominate our expectations of the future.", readTime: "4 min read" },
    { slug: "dca-vs-lump-sum",          title: "DCA vs lump sum: a behavioral view",        category: "Holding Behavior", tag: "Holding",   preview: "Why dollar-cost averaging works better for most behavioral profiles.", readTime: "5 min read" },
    { slug: "advisor-communication",    title: "Talking to your advisor about risk",        category: "General",          tag: "General",   preview: "How to have an honest conversation about your real risk tolerance.", readTime: "3 min read" },
  ],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const filtered =
    !category || category === "All"
      ? MOCK_ARTICLES.articles
      : MOCK_ARTICLES.articles.filter((a) => a.category === category);

  return NextResponse.json({ ...MOCK_ARTICLES, articles: filtered });
}
