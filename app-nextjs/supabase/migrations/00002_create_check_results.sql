-- ============================================================
-- check_results table — persistent LLM cache
-- One row per (investor_id, ticker). Refreshed every 24 hours.
-- ============================================================
CREATE TABLE IF NOT EXISTS check_results (
  investor_id           TEXT NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  ticker                TEXT NOT NULL,
  score                 INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  tier                  TEXT NOT NULL CHECK (tier IN ('fit', 'caution', 'mismatch')),
  flags                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_explanation        TEXT NOT NULL,
  reflection_questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions           JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence            TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  data_basis            TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (investor_id, ticker)
);

CREATE INDEX idx_check_results_created_at ON check_results(created_at);
CREATE INDEX idx_check_results_investor   ON check_results(investor_id);
