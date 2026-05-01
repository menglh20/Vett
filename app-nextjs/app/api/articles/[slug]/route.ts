import { NextResponse } from "next/server";
import { MOCK_ARTICLES } from "@/lib/articles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = MOCK_ARTICLES.articles.find((a) => a.slug === slug);
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  // Add mock full content
  return NextResponse.json({
    ...article,
    content: `This is the full content for "${article.title}". In production, this will be fetched from the Supabase articles table where the full bilingual content is stored.`,
  });
}
