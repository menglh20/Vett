-- ============================================================
-- Vett — Database Schema Migration
-- Tables: investors (with auth), transactions
-- ============================================================

-- Enable pgcrypto for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. investors table
--    investor_id = login username
--    password_hash = bcrypt hash (unified with frontend)
-- ============================================================
CREATE TABLE IF NOT EXISTS investors (
  investor_id       TEXT PRIMARY KEY,            -- e.g. "INV0001", also used as login username
  password_hash     TEXT NOT NULL,               -- bcrypt hashed password

  -- demographic
  age               INTEGER,
  gender            TEXT CHECK (gender IN ('M', 'F')),
  is_married        BOOLEAN DEFAULT FALSE,
  occupation        TEXT,
  education         TEXT CHECK (education IN ('high_school', 'bachelor', 'master', 'phd')),
  annual_income     INTEGER,
  debt_level        TEXT CHECK (debt_level IN ('none', 'low', 'high')),

  -- financial profile
  account_size      INTEGER,
  monthly_spending  INTEGER,
  has_short_term_cash_need  BOOLEAN DEFAULT FALSE,
  is_qualified_investor     BOOLEAN DEFAULT FALSE,
  financial_literacy        TEXT CHECK (financial_literacy IN ('low', 'medium', 'high')),

  -- self-reported preferences (from onboarding step 1–7)
  investment_goal           TEXT CHECK (investment_goal IN ('capital_preservation', 'steady_income', 'growth', 'aggressive_growth')),
  self_risk_level           INTEGER CHECK (self_risk_level BETWEEN 1 AND 5),
  stated_horizon            TEXT CHECK (stated_horizon IN ('<6m', '6m-1y', '1-3y', '3-5y', '5y+')),
  investment_experience_years INTEGER,
  stated_max_loss           INTEGER,
  target_gain               TEXT CHECK (target_gain IN ('5', '10', '20', '50', 'none')),

  -- behavioral analysis (computed from transactions)
  actual_tolerance    INTEGER CHECK (actual_tolerance BETWEEN 1 AND 5),
  mismatch_direction  TEXT CHECK (mismatch_direction IN ('accurate', 'underestimate', 'overestimate')),

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. products table
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  ticker          TEXT PRIMARY KEY,           -- e.g. "AAPL", "VOO"
  name            TEXT NOT NULL,              -- e.g. "Apple Inc."
  product_type    TEXT NOT NULL CHECK (product_type IN (
    'stock', 'fund', 'etf', 'bond', 'crypto',
    'money_market', 'deposit', 'savings_insurance',
    'private_equity', 'mixed_low', 'mixed_medium'
  )),
  risk_level      INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 5),
  is_long_term    BOOLEAN DEFAULT FALSE,      -- requires long holding period
  is_illiquid     BOOLEAN DEFAULT FALSE,      -- hard to liquidate quickly
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. transactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id      TEXT PRIMARY KEY,           -- e.g. "TX000001"
  investor_id         TEXT NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,

  action              TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  product_type        TEXT NOT NULL CHECK (product_type IN (
    'stock', 'fund', 'etf', 'bond', 'crypto',
    'money_market', 'deposit', 'savings_insurance',
    'private_equity', 'mixed_low', 'mixed_medium'
  )),
  product_risk_level  INTEGER CHECK (product_risk_level BETWEEN 1 AND 5),
  amount              INTEGER NOT NULL,
  date                DATE NOT NULL,

  -- holding & market context
  hold_days           INTEGER,                    -- NULL for buy actions
  market_change_pct   NUMERIC(6,2),               -- market movement during hold period

  -- decision attribution
  decision_source       TEXT CHECK (decision_source IN ('self', 'friend', 'advisor', 'social_media')),
  sell_decision_source  TEXT CHECK (sell_decision_source IN (
    'panic', 'follow_others', 'rational_take_profit',
    'rational_stop_loss', 'need_cash'
  )),
  is_chasing            BOOLEAN,                  -- trend-chasing flag for buys

  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Indexes for common query patterns (signal engine)
-- ============================================================
CREATE INDEX idx_transactions_investor  ON transactions(investor_id);
CREATE INDEX idx_transactions_action    ON transactions(action);
CREATE INDEX idx_transactions_date      ON transactions(date);
CREATE INDEX idx_investors_literacy     ON investors(financial_literacy);
CREATE INDEX idx_investors_risk_level   ON investors(self_risk_level);

-- ============================================================
-- 4. Updated_at trigger for investors
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_investors_updated_at
  BEFORE UPDATE ON investors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
