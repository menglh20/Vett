import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check if investor_id already exists
  const { data: existing } = await supabase
    .from("investors")
    .select("investor_id")
    .eq("investor_id", username)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Username already exists." }, { status: 409 });
  }

  // Hash password with bcrypt (same as seed script)
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert new investor with auth credentials
  const { error } = await supabase.from("investors").insert({
    investor_id: username,
    password_hash: passwordHash,
  });

  if (error) {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }

  return NextResponse.json({ investor_id: username, message: "Account created." });
}
