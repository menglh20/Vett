import { NextResponse } from "next/server";
import { MOCK_ARTICLES } from "@/lib/articles";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const filtered =
    !category || category === "All"
      ? MOCK_ARTICLES.articles
      : MOCK_ARTICLES.articles.filter((a) => a.category === category);

  return NextResponse.json({ ...MOCK_ARTICLES, articles: filtered });
}
