import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up investor by investor_id (= username)
  const { data: investor, error } = await supabase
    .from("investors")
    .select("investor_id, password_hash")
    .eq("investor_id", username)
    .single();

  if (error || !investor) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  // Verify password with bcrypt (same algorithm as seed + register)
  const valid = await bcrypt.compare(password, investor.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return NextResponse.json({ investor_id: investor.investor_id, message: "Login successful." });
}
