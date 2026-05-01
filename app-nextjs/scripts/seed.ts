/**
 * Seed script — loads investors_v2.csv and transactions_v2.csv into Supabase.
 *
 * Default password for all seeded investors: "vett2026"
 * Hashed with bcryptjs (same library used by the auth API routes).
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// --------------- config ---------------
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "vett2026";
const DATA_DIR = path.resolve(__dirname, "../../data");
const BATCH_SIZE = 100;

// --------------- load env ---------------
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local — copy .env.example and fill in values.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = val;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// --------------- CSV parser (simple) ---------------
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });
}

// --------------- helpers ---------------
function toBool(val: string): boolean | null {
  if (val === "True" || val === "true") return true;
  if (val === "False" || val === "false") return false;
  return null;
}

function toIntOrNull(val: string): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toFloatOrNull(val: string): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toTextOrNull(val: string): string | null {
  return val === "" ? null : val;
}

// --------------- seed investors ---------------
async function seedInvestors() {
  const rows = parseCSV(path.join(DATA_DIR, "investors_v2.csv"));
  console.log(`Parsed ${rows.length} investors from CSV`);

  // Hash the default password once — bcrypt includes the salt in the hash
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  console.log(`Default password "${DEFAULT_PASSWORD}" hashed with bcrypt (salt rounds: ${SALT_ROUNDS})`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      investor_id: r.investor_id,
      password_hash: passwordHash,
      age: toIntOrNull(r.age),
      gender: toTextOrNull(r.gender),
      is_married: toBool(r.is_married),
      occupation: toTextOrNull(r.occupation),
      education: toTextOrNull(r.education),
      annual_income: toIntOrNull(r.annual_income),
      debt_level: toTextOrNull(r.debt_level),
      account_size: toIntOrNull(r.account_size),
      monthly_spending: toIntOrNull(r.monthly_spending),
      has_short_term_cash_need: toBool(r.has_short_term_cash_need),
      is_qualified_investor: toBool(r.is_qualified_investor),
      financial_literacy: toTextOrNull(r.financial_literacy),
      self_risk_level: toIntOrNull(r.self_risk_level),
      stated_horizon: toTextOrNull(r.stated_horizon),
      stated_max_loss: toIntOrNull(r.stated_max_loss),
      investment_experience_years: toIntOrNull(r.investment_experience_years),
      actual_tolerance: toIntOrNull(r.actual_tolerance),
      mismatch_direction: toTextOrNull(r.mismatch_direction),
    }));

    const { error } = await supabase.from("investors").upsert(batch, { onConflict: "investor_id" });
    if (error) {
      console.error(`Error inserting investors batch ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    console.log(`  Investors ${i + 1}–${i + batch.length} inserted`);
  }

  console.log(`✓ ${rows.length} investors seeded\n`);
}

// --------------- seed products ---------------
async function seedProducts() {
  const rows = parseCSV(path.join(DATA_DIR, "products.csv"));
  console.log(`Parsed ${rows.length} products from CSV`);

  const batch = rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    product_type: r.product_type,
    risk_level: toIntOrNull(r.risk_level),
    is_long_term: toBool(r.is_long_term),
    is_illiquid: toBool(r.is_illiquid),
  }));

  const { error } = await supabase.from("products").upsert(batch, { onConflict: "ticker" });
  if (error) {
    console.error("Error inserting products:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${rows.length} products seeded\n`);
}

// --------------- seed transactions ---------------
async function seedTransactions() {
  const rows = parseCSV(path.join(DATA_DIR, "transactions_v2.csv"));
  console.log(`Parsed ${rows.length} transactions from CSV`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      transaction_id: r.transaction_id,
      investor_id: r.investor_id,
      action: r.action,
      product_type: r.product_type,
      product_risk_level: toIntOrNull(r.product_risk_level),
      amount: toIntOrNull(r.amount),
      date: r.date,
      hold_days: toIntOrNull(r.hold_days),
      market_change_pct: toFloatOrNull(r.market_change_pct),
      decision_source: toTextOrNull(r.decision_source),
      sell_decision_source: toTextOrNull(r.sell_decision_source),
      is_chasing: toBool(r.is_chasing),
    }));

    const { error } = await supabase.from("transactions").upsert(batch, { onConflict: "transaction_id" });
    if (error) {
      console.error(`Error inserting transactions batch ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    console.log(`  Transactions ${i + 1}–${i + batch.length} inserted`);
  }

  console.log(`✓ ${rows.length} transactions seeded\n`);
}

// --------------- main ---------------
async function main() {
  console.log("=== Vett Seed Script ===\n");
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  await seedInvestors();
  await seedProducts();
  await seedTransactions();

  console.log("=== Seed complete ===");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
