# ARCHITECTURE.md — Vett: Investment Decision Fitness Check


## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                               │
│                                                                  │
│   /app/(mobile)/…        │        /app/web/…                    │
│   Mobile UI (390px)      │        Web UI (responsive, 1200px)   │
│                          │                                       │
│   ─────────────────── Server Components ────────────────────    │
│   ─────────────────── Route Handlers (API) ─────────────────    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
   ┌──────────▼──────┐  ┌────▼──────┐  ┌───▼───────────────────┐
   │    Supabase      │  │ Supabase  │  │   Anthropic Claude    │
   │  PostgreSQL      │  │ pgvector  │  │        API            │
   │  Auth + RLS      │  │  (RAG)    │  │  Generator + Validator│
   └──────────────────┘  └───────────┘  └───────────────────────┘
```

**Four processing layers** map to Next.js Route Handlers:

| Layer | Location | Technology |
|-------|----------|------------|
| 1. Signal Engine | `app/api/check/[ticker]/route.ts` | SQL via Supabase server client |
| 2. RAG Retrieval | `lib/rag/retrieve.ts` | pgvector cosine similarity |
| 3. LLM Generation | `lib/ai/generate.ts` | Claude Sonnet (`claude-sonnet-4-5`) |
| 4. AI Guardrail | `lib/ai/validate.ts` | Claude Haiku (`claude-haiku-4-5`) |

---

## 2. Tech Stack & Rationale

### 2.1 Next.js 15 (App Router)

**Why Next.js over keeping Vite:**
- Next.js App Router enables **Server Components**, allowing database queries (Supabase) to run on the server and return pre-rendered HTML — no client-side loading states for the initial data fetch.
- Route Handlers (`app/api/`) provide the backend API layer within the same project, eliminating a separate server process and simplifying deployment to a single Vercel project.
- Next.js **Middleware** integrates natively with Supabase Auth: a single `middleware.ts` file protects all routes, refreshes JWTs, and redirects unauthenticated users without any client-side logic.
- Both the mobile-simulated layout and the full web layout can live in the same codebase under separate route groups, sharing all components and server logic.

**Route groups for dual UI:**
- `app/(mobile)/` — Mobile-first layout (390×844px simulation), used by `OnboardingRoot` and `DashboardRoot` patterns from the existing prototype.
- `app/web/` — Responsive web layout (max-width 1200px), used by the existing `Web*` component family.

### 2.2 Supabase

- **PostgreSQL**: Signal calculations are pure SQL aggregations (median, percentage counts). The Supabase server client runs these queries directly in Server Components and Route Handlers — no ORM, no abstraction layer.
- **pgvector**: The 16-article RAG knowledge base is small enough to keep in the same database. Cosine similarity search via `pgvector` avoids introducing a separate vector database dependency.
- **Auth + Row Level Security**: Supabase Auth issues JWTs; RLS policies on `user_profiles` and `check_history` ensure users can only read their own rows, enforced at the database level.
- **Supabase SSR package** (`@supabase/ssr`): provides `createServerClient` and `createBrowserClient` that handle cookie-based session management correctly in the Next.js App Router model.

### 2.3 AI Layer: Two-Model Design

The AI layer uses two Claude models with different roles:

| Model | Role | Why |
|-------|------|-----|
| `claude-sonnet-4-5` | Generator — writes the behavioral explanation | Strong instruction-following for complex behavioral framing |
| `claude-haiku-4-5` | Validator — checks the generator's output for compliance | Fast (< 500ms), cheap, focused binary classification task |

Using AI to validate AI output (rather than only rule-based filtering) catches semantic violations that a keyword blacklist cannot: paraphrased recommendations, implied urgency, subtle labeling language, and framing that violates the "checker not picker" boundary.

### 2.4 Embeddings: OpenAI `text-embedding-3-small`

Used only for the 16-article corpus at seed time. The model choice is independent of the generation pipeline. At 1536 dimensions and a 16-document corpus, `text-embedding-3-small` is the most cost-effective option.

---

## 3. Data Model

### 3.1 Core Tables (from SPEC)

```sql
-- Simulated investor profiles (500 rows, provided by PM)
CREATE TABLE investors (
  investor_id                  TEXT PRIMARY KEY,
  age                          INTEGER,
  gender                       TEXT,            -- 'M' | 'F'
  is_married                   BOOLEAN,
  occupation                   TEXT,
  education                    TEXT,            -- 'high_school' | 'bachelor' | 'master' | 'phd'
  annual_income                INTEGER,
  debt_level                   TEXT,            -- 'none' | 'low' | 'high'
  account_size                 INTEGER,
  monthly_spending             INTEGER,
  has_short_term_cash_need     BOOLEAN,
  is_qualified_investor        BOOLEAN,
  financial_literacy           TEXT,            -- 'low' | 'medium' | 'high'
  self_risk_level              INTEGER,         -- 1–5
  actual_tolerance             INTEGER,         -- 1–5, behavior-inferred
  stated_horizon               TEXT,            -- '<6m' | '6m-1y' | '1-3y' | '3-5y' | '5y+'
  stated_max_loss              INTEGER,         -- percentage
  investment_experience_years  INTEGER
);

-- Simulated transaction history (8400+ rows, provided by PM)
CREATE TABLE transactions (
  transaction_id        TEXT PRIMARY KEY,
  investor_id           TEXT REFERENCES investors(investor_id),
  action                TEXT,            -- 'buy' | 'sell'
  product_type          TEXT,            -- 'deposit' | 'bond' | 'fund' | 'stock' | ...
  product_risk_level    INTEGER,         -- 1–5
  amount                INTEGER,
  date                  DATE,
  hold_days             INTEGER,         -- sell records only
  market_change_pct     FLOAT,           -- % change at time of sell
  decision_source       TEXT,            -- 'self' | 'advisor' | 'social_media' | 'friend'
  sell_decision_source  TEXT,            -- 'rational_stop_loss' | 'panic' | 'follow_others' | 'need_cash'
  is_chasing            BOOLEAN
);
```

### 3.2 Application Tables

```sql
-- Links Supabase Auth users to a demo investor_id; stores onboarding answers
CREATE TABLE user_profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id),
  investor_id          TEXT REFERENCES investors(investor_id),
  q_investment_goal    TEXT,
  q_risk_tolerance     INTEGER,         -- 1–5
  q_holding_period     TEXT,
  q_experience_years   TEXT,
  q_max_loss_pct       TEXT,
  q_gain_target        TEXT,
  q_fund_source        TEXT,
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- One row per fitness check run by a user
CREATE TABLE check_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  ticker           TEXT NOT NULL,
  product_name     TEXT,
  product_risk_level INTEGER,
  fitness_score    INTEGER,             -- 0–100
  result_tier      TEXT,                -- 'fit' | 'caution' | 'mismatch'
  signal_snapshot  JSONB,               -- { medianHoldDays, panicSellRate, externalPct, liquidityConflict }
  ai_explanation   TEXT,
  checked_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RAG knowledge base: 16 behavioral finance articles
CREATE TABLE articles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL,       -- 'Holding Behavior' | 'Panic Selling' | 'Following Others' | 'Liquidity' | 'General'
  content_en       TEXT NOT NULL,
  content_zh       TEXT,
  preview_text     TEXT,
  read_time_minutes INTEGER,
  embedding        VECTOR(1536)         -- text-embedding-3-small
);
```

### 4.3 Computed Signal Types (not persisted, computed per request)

```typescript
interface BehavioralSignals {
  medianHoldDays:      number;   // actual median holding period (days)
  panicSellRate:       number;   // 0–1: % of loss exits triggered on dips < 10%
  externalDecisionPct: number;   // 0–1: % of buys from social_media or friend
  liquidityConflict:   boolean;  // short-term cash need AND purchased illiquid product
  transactionCount:    number;   // used to set confidence level
}

type DimensionLevel = "High" | "Medium" | "Low";

interface DimensionProfile {
  riskTolerance:        DimensionLevel;
  holdingPatience:      DimensionLevel;
  decisionIndependence: DimensionLevel;
  volatilityComfort:    DimensionLevel;
  liquidityReadiness:   DimensionLevel;
}
```

---

## 4. Dual UI Architecture

The existing prototype already implements both layouts. In Next.js, they are organized as route groups sharing all server logic and component primitives.

### 4.1 Route Groups

```
app/
├── (mobile)/                   # 390×844px simulated mobile app
│   ├── layout.tsx              # Centers content in 390px container
│   ├── page.tsx                # WelcomeScreen
│   ├── step/[n]/page.tsx       # QuestionScreen (7 steps)
│   ├── import/page.tsx         # DataImportScreen
│   ├── home/page.tsx           # HomeScreen
│   ├── profile/page.tsx        # ProfileScreen (radar chart)
│   ├── check/[ticker]/page.tsx # CheckResultScreen
│   ├── explore/page.tsx        # ExploreScreen
│   └── article/[id]/page.tsx   # MobileArticleDetail
│
└── web/                        # Responsive web (max-width 1200px)
    ├── layout.tsx              # WebHeader + full-width layout
    ├── page.tsx                # WebWelcomeScreen
    ├── step/[n]/page.tsx       # WebQuestionScreen
    ├── import/page.tsx         # WebDataImportScreen
    ├── dashboard/page.tsx      # WebDashboard
    ├── check/[ticker]/page.tsx # WebCheckResult
    ├── explore/page.tsx        # WebExplore
    ├── advisor/page.tsx        # WebAdvisor
    ├── history/page.tsx        # WebHistory
    ├── profile/page.tsx        # WebProfile
    └── article/[id]/page.tsx   # WebArticleDetail
```

### 4.2 Shared Layer

Both route groups import from a single shared component and logic layer:

```
components/
├── shared/             # Used by both mobile and web
│   ├── FitnessProgressBar.tsx
│   ├── RadarChart.tsx
│   ├── ArticleCard.tsx
│   └── FlagCard.tsx
├── mobile/             # Mobile-specific components
└── web/                # Web-specific components

lib/
├── signal-engine/      # SQL queries + scoring (server-only)
├── rag/                # Embedding + retrieval (server-only)
├── ai/                 # Generate + validate (server-only)
└── supabase/           # Server + browser client factories
```

### 4.3 Layout Behavior

| Route group | Layout constraint | Navigation pattern |
|-------------|-------------------|-------------------|
| `(mobile)` | `max-w-[390px] h-[844px]` centered, simulates a phone frame | Bottom tab bar (3 icons) |
| `web` | `max-w-[1200px]` responsive, full-width | Top navigation header (`WebHeader`) |

Both layouts share the same API route handlers and Supabase queries.

---

## 5. API Design

All API endpoints are Next.js Route Handlers located in `app/api/`. They use the Supabase server client and are protected by middleware.

### 5.1 Auth

```
POST   /api/auth/signup         Body: { email, password }
POST   /api/auth/login          Body: { email, password }
POST   /api/auth/logout
GET    /api/auth/me             → { user, profile, onboardingComplete }
```

### 5.2 Onboarding

```
POST   /api/onboarding/answers  Body: { q1..q7 }  → saves to user_profiles
POST   /api/onboarding/link     Body: { investorId } → links demo investor_id
```

### 5.3 Profile

```
GET    /api/profile             → { signals, selfProfile, observedProfile, fitnessScore }
```

### 5.4 Fitness Check (core)

```
GET    /api/check/[ticker]      → { score, tier, flags[], aiExplanation, confidence, alternatives[] }
GET    /api/check/history       → check_history[] for current user
```

### 5.5 Products

```
GET    /api/products/trending   → TrendingProduct[] with per-user matchPercentage
GET    /api/products/search?q=  → search by ticker or name
```

### 5.6 Articles

```
GET    /api/articles            Query: ?category=  → Article[]
GET    /api/articles/[slug]     → full Article with content
```

### 5.7 Advisor

```
GET    /api/advisor/clients     → investors[] ranked by mismatch score
GET    /api/advisor/clients/[id] → { profile, signals, aiBriefing, conversationStarters }
```

---

## 6. Agentic Engineering Plan

The fitness check (`GET /api/check/[ticker]`) is the core agentic workflow. It runs a deterministic-then-generative pipeline with an AI validator as the final safety gate.

### 6.1 Full Pipeline

```
User: GET /api/check/TSLA
        │
        ▼
┌────────────────────────┐
│  Step 1                │  Four SQL queries run in parallel via Promise.all
│  Signal Calculation    │  → BehavioralSignals (4 values)
│  (deterministic SQL)   │  No AI involved.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Step 2                │  Rule-based formula (penalty deductions)
│  Score + Flag          │  → fitnessScore (0–100), tier, flags[]
│  Generation            │  No AI involved.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Step 3                │  pgvector cosine similarity search
│  RAG Retrieval         │  Query: embed(flagLabels) → top-3 article excerpts
│  (skip if 'fit')       │  Returns: behavioral finance knowledge context
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Step 4                │  Claude Sonnet (claude-sonnet-4-5)
│  LLM Generation        │  Input: signals + flags + RAG context + product info
│  (generative)          │  Output: explanation + 2–3 reflection questions
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Step 5                │  Claude Haiku (claude-haiku-4-5) ← AI checks AI
│  AI Guardrail          │  Input: generated explanation
│  Validation            │  Output: { pass: boolean, violations: string[] }
└───────────┬────────────┘
            │
     pass? ─┴─ fail?
      │              │
      │     ┌────────▼────────────┐
      │     │  Sanitization Pass  │  One retry: Sonnet regenerates with violations listed
      │     │  (max 1 retry)      │  If still fails → safe template fallback
      │     └────────┬────────────┘
      │              │
      ▼              ▼
   Final JSON response to client
   { score, tier, flags, aiExplanation, confidence }
```

### 6.2 Signal Calculation (Layer 1)

Four independent SQL queries, executed in parallel:

```sql
-- Signal 1: Median actual holding period
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hold_days) AS median_hold_days
FROM transactions
WHERE investor_id = $1 AND action = 'sell' AND hold_days IS NOT NULL;

-- Signal 2: Panic sell rate (loss exits on dips < 10%)
SELECT
  COUNT(*) FILTER (WHERE sell_decision_source = 'panic'
                   AND market_change_pct > -10
                   AND market_change_pct < 0)  AS panic_sells,
  COUNT(*) FILTER (WHERE action = 'sell'
                   AND market_change_pct < 0)  AS total_loss_sells
FROM transactions WHERE investor_id = $1;

-- Signal 3: External decision percentage
SELECT
  COUNT(*) FILTER (WHERE decision_source IN ('social_media', 'friend')) AS external_buys,
  COUNT(*) FILTER (WHERE action = 'buy')                                 AS total_buys
FROM transactions WHERE investor_id = $1;

-- Signal 4: Liquidity conflict
SELECT has_short_term_cash_need FROM investors WHERE investor_id = $1;
-- Combined with: any buy of illiquid product_type in the past 6 months
```

### 6.3 Scoring Formula (Layer 1 → 2)

```typescript
function computeFitnessScore(
  signals: BehavioralSignals,
  product: { riskLevel: number; isIlliquid: boolean },
  investor: { statedHorizon: string; selfRiskLevel: number }
): { score: number; tier: ResultTier; flags: Flag[] } {
  let score = 100;
  const flags: Flag[] = [];

  // Holding period deviation (max −30 pts)
  const statedDays = horizonToDays(investor.statedHorizon);
  const holdRatio = signals.medianHoldDays / statedDays;
  if (holdRatio < 0.25)       { score -= 30; flags.push(FLAG_HOLDING_SEVERE); }
  else if (holdRatio < 0.5)   { score -= 20; flags.push(FLAG_HOLDING_MODERATE); }
  else if (holdRatio < 0.75)  { score -= 10; flags.push(FLAG_HOLDING_MILD); }

  // Panic sell tendency (max −25 pts)
  if (signals.panicSellRate > 0.5)      { score -= 25; flags.push(FLAG_PANIC_HIGH); }
  else if (signals.panicSellRate > 0.3) { score -= 15; flags.push(FLAG_PANIC_MODERATE); }
  else if (signals.panicSellRate > 0.1) { score -= 8;  flags.push(FLAG_PANIC_MILD); }

  // External dependency (max −25 pts)
  if (signals.externalDecisionPct > 0.6)      { score -= 25; flags.push(FLAG_EXTERNAL_HIGH); }
  else if (signals.externalDecisionPct > 0.4) { score -= 15; flags.push(FLAG_EXTERNAL_MODERATE); }
  else if (signals.externalDecisionPct > 0.2) { score -= 8;  flags.push(FLAG_EXTERNAL_MILD); }

  // Liquidity conflict (max −20 pts)
  if (signals.liquidityConflict && product.isIlliquid) {
    score -= 20;
    flags.push(FLAG_LIQUIDITY_CONFLICT);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const tier: ResultTier =
    finalScore >= 70 ? "fit" : finalScore >= 30 ? "caution" : "mismatch";

  return { score: finalScore, tier, flags };
}
```

### 6.4 RAG Retrieval (Layer 2)

```typescript
// lib/rag/retrieve.ts
export async function retrieveRelevantArticles(
  flags: Flag[],
  tier: ResultTier
): Promise<ArticleExcerpt[]> {
  if (tier === "fit") return []; // No RAG needed for fit results

  const queryText = flags.map(f => f.label).join(". ") + ` Behavioral finance ${tier}.`;
  const { data: embeddingData } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: queryText,
  });

  // pgvector RPC defined in Supabase
  const { data } = await supabase.rpc("match_articles", {
    query_embedding: embeddingData[0].embedding,
    match_threshold: 0.72,
    match_count: 3,
  });

  return data ?? [];
}
```

```sql
-- Supabase RPC function
CREATE OR REPLACE FUNCTION match_articles(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count     INT
)
RETURNS TABLE (id UUID, title TEXT, preview_text TEXT, category TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, title, preview_text, category,
         1 - (embedding <=> query_embedding) AS similarity
  FROM articles
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 6.5 LLM Generation — Prompt Design (Layer 3)

```typescript
// lib/ai/generate.ts
const WORD_LIMITS = { fit: 80, caution: 100, mismatch: 120 } as const;

function buildSystemPrompt(tier: ResultTier): string {
  return `You are a behavioral finance analysis assistant for Vett, an investment fitness checker.
Your sole role is to explain behavioral patterns — never to recommend, advise, or predict.

ABSOLUTE RULES — violation of any rule will cause rejection:
1. Never recommend buying, selling, holding, or avoiding any asset
2. Never predict prices, returns, or market movements
3. Never use urgency language ("act now", "don't miss", "time-sensitive")
4. Never label the person ("you are a panic seller", "you're impulsive")
   — use pattern framing instead ("we've detected a pattern of exiting during dips")
5. Always use first-person-plural framing: "we've detected" / "your data shows"
6. Output must be under ${WORD_LIMITS[tier]} words total
7. End with exactly 2–3 numbered reflection questions
8. Reference at least one specific data point from the user's signals`;
}

function buildUserPrompt(
  signals: BehavioralSignals,
  flags: Flag[],
  investor: InvestorProfile,
  product: ProductInfo,
  ragContext: ArticleExcerpt[],
  tier: ResultTier,
  score: number
): string {
  return `
Investor behavioral profile:
- Self-reported risk level: R${investor.selfRiskLevel}
- Stated holding horizon: ${investor.statedHorizon}
- Median actual hold: ${signals.medianHoldDays} days
- Panic sell rate: ${(signals.panicSellRate * 100).toFixed(0)}% of loss exits
- External decision rate: ${(signals.externalDecisionPct * 100).toFixed(0)}% of buys
- Liquidity conflict: ${signals.liquidityConflict ? "yes" : "no"}
- Data basis: ${signals.transactionCount} transactions

Fitness check result: ${tier.toUpperCase()} (score: ${score}/100)
Triggered flags: ${flags.map(f => f.label).join(", ")}

Product evaluated: ${product.ticker} — ${product.name} (Risk level: R${product.riskLevel})

Behavioral finance context (from knowledge base):
${ragContext.map(a => `[${a.category}] ${a.preview_text}`).join("\n")}

Generate the behavioral explanation now. Stay under ${WORD_LIMITS[tier]} words.`;
}
```

### 6.6 AI Guardrail — Validator (Layer 4)

The validator is a second, independent Claude call that judges the generator's output. This catches semantic violations that a keyword blacklist cannot: paraphrased recommendations, implied urgency, and subtle labeling language.

```typescript
// lib/ai/validate.ts

const VALIDATION_SYSTEM_PROMPT = `You are a compliance validator for an investment app.
Your job is to detect policy violations in AI-generated text.

Policy rules to check:
1. NO buy/sell/hold recommendations (direct or implied)
2. NO return or price predictions
3. NO urgency language
4. NO negative personal labels about the user
5. NO "you should" / "you must" framing
6. Word count must be within the stated limit
7. Must end with 2–3 numbered reflection questions
8. Must reference at least one specific data point

Respond ONLY with valid JSON: { "pass": boolean, "violations": string[] }
If pass is true, violations must be an empty array.`;

interface ValidationResult {
  pass: boolean;
  violations: string[];
}

export async function validateExplanation(
  explanation: string,
  tier: ResultTier,
  score: number
): Promise<ValidationResult> {
  const wordCount = explanation.split(/\s+/).length;
  const limit = WORD_LIMITS[tier];

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: VALIDATION_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Word limit for this ${tier} result: ${limit} words.
Actual word count: ${wordCount}.
Fitness score: ${score}/100.

Text to validate:
---
${explanation}
---`
    }],
  });

  try {
    return JSON.parse(
      (response.content[0] as { text: string }).text
    ) as ValidationResult;
  } catch {
    // If the validator itself fails to parse, fail safe
    return { pass: false, violations: ["Validator parse error — treat as fail"] };
  }
}
```

**Retry and fallback logic:**

```typescript
// lib/ai/orchestrate.ts
export async function generateValidatedExplanation(
  context: ExplanationContext
): Promise<string> {
  // First generation attempt
  let explanation = await generateExplanation(context);
  let validation = await validateExplanation(explanation, context.tier, context.score);

  if (validation.pass) return explanation;

  // One retry: include violations in the regeneration prompt
  explanation = await generateExplanation({
    ...context,
    retryNote: `Previous attempt was rejected for: ${validation.violations.join("; ")}. Fix these issues.`,
  });
  validation = await validateExplanation(explanation, context.tier, context.score);

  if (validation.pass) return explanation;

  // Fallback: safe deterministic template (no LLM)
  return buildSafeTemplate(context.tier, context.flags, context.signals);
}

function buildSafeTemplate(
  tier: ResultTier,
  flags: Flag[],
  signals: BehavioralSignals
): string {
  const flagList = flags.map(f => f.label).join(" and ");
  return tier === "fit"
    ? `Your data shows strong alignment with this investment's profile. Your behavioral patterns are consistent with its risk and holding characteristics.`
    : `We've detected the following patterns in your data: ${flagList}. ` +
      `Your median hold is ${signals.medianHoldDays} days. ` +
      `Reflection questions:\n1. What is your exit plan if this position drops?\n2. Is this decision based on your own research?\n3. How does this fit your stated time horizon?`;
}
```

### 6.7 Advisor Mode Agent

The advisor briefing runs a simplified pipeline:
- Computes signals for the requested `investor_id`
- Retrieves advisor communication playbook articles from RAG (dedicated `category: 'advisor_playbook'`)
- Generates a ≤80-word briefing with exactly 2 non-confrontational conversation starters
- Same AI Guardrail validation step applies

---

## 7. Next.js Project Structure

```
/
├── frontend/            # LEGACY: existing Vite prototype (reference only, not deployed)
│
└── app-nextjs/          # New Next.js project (source of truth)
    ├── app/
    │   ├── (mobile)/                   # Mobile route group
    │   │   ├── layout.tsx              # 390×844px container
    │   │   ├── page.tsx                # Welcome
    │   │   ├── step/[n]/page.tsx
    │   │   ├── import/page.tsx
    │   │   ├── home/page.tsx
    │   │   ├── profile/page.tsx
    │   │   ├── check/[ticker]/page.tsx
    │   │   ├── explore/page.tsx
    │   │   └── article/[id]/page.tsx
    │   │
    │   ├── web/                        # Web route group
    │   │   ├── layout.tsx              # WebHeader + 1200px max-width
    │   │   ├── page.tsx
    │   │   ├── step/[n]/page.tsx
    │   │   ├── import/page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── check/[ticker]/page.tsx
    │   │   ├── explore/page.tsx
    │   │   ├── advisor/page.tsx
    │   │   ├── history/page.tsx
    │   │   ├── profile/page.tsx
    │   │   └── article/[id]/page.tsx
    │   │
    │   └── api/                        # Route Handlers
    │       ├── auth/
    │       │   ├── signup/route.ts
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   └── me/route.ts
    │       ├── onboarding/
    │       │   ├── answers/route.ts
    │       │   └── link/route.ts
    │       ├── profile/route.ts
    │       ├── check/
    │       │   ├── [ticker]/route.ts   # Core agentic pipeline
    │       │   └── history/route.ts
    │       ├── products/
    │       │   ├── trending/route.ts
    │       │   └── search/route.ts
    │       ├── articles/
    │       │   ├── route.ts
    │       │   └── [slug]/route.ts
    │       └── advisor/
    │           ├── clients/route.ts
    │           └── clients/[id]/route.ts
    │
    ├── components/
    │   ├── mobile/                     # Mobile-only components
    │   ├── web/                        # Web-only components
    │   └── shared/                     # Shared across both UIs
    │       ├── FitnessProgressBar.tsx
    │       ├── RadarChart.tsx
    │       ├── ArticleCard.tsx
    │       └── FlagCard.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── server.ts               # createServerClient (Route Handlers + Server Components)
    │   │   └── browser.ts              # createBrowserClient (Client Components)
    │   ├── signal-engine/
    │   │   ├── queries.ts              # 4 SQL signal queries
    │   │   └── scoring.ts             # Score formula + flag generation
    │   ├── rag/
    │   │   ├── embed.ts                # OpenAI embedding wrapper
    │   │   └── retrieve.ts            # pgvector similarity search
    │   ├── ai/
    │   │   ├── generate.ts            # Claude Sonnet — explanation generator
    │   │   ├── validate.ts            # Claude Haiku — compliance validator
    │   │   └── orchestrate.ts         # Generate → Validate → Retry → Fallback
    │   └── types.ts                   # Shared TypeScript types
    │
    ├── middleware.ts                   # Supabase Auth session refresh + route protection
    ├── scripts/
    │   └── seed.ts                    # CSV import + article embedding generation
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── package.json
```

---

## 8. Implementation Phases

### Phase 1 — Check-in 1 (due April 13, 2026)

- [ ] Initialize Next.js 15 project with TypeScript, Tailwind CSS, App Router
- [ ] Set up Supabase project; run `001_initial_schema.sql`
- [ ] Write and run CSV seed script for 500 investors + 8400+ transactions
- [ ] Implement Supabase Auth: signup, login, logout Route Handlers
- [ ] Implement `middleware.ts` for session management and route protection
- [ ] Implement onboarding answers Route Handler (save Q1–Q7)
- [ ] Migrate mobile onboarding UI (WelcomeScreen, QuestionScreen, DataImportScreen) from prototype to Next.js
- [ ] Migrate web onboarding UI equivalents

### Phase 2 — Check-in 2 (due May 4, 2026)

- [ ] Implement 4 SQL signal queries and scoring formula
- [ ] Implement `GET /api/profile` (signals + 5 dimensions + fitness score)
- [ ] Implement `GET /api/products/trending` with per-user match %
- [ ] Implement `GET /api/check/[ticker]` — signals + score + flags (no AI yet, use safe template)
- [ ] Migrate mobile dashboard UI (HomeScreen, ProfileScreen, CheckResultScreen, ExploreScreen)
- [ ] Migrate web dashboard UI (WebDashboard, WebCheckResult, WebExplore, WebProfile)
- [ ] All hardcoded values replaced with live API data

### Phase 3 — Check-in 3 (due May 18, 2026)

- [ ] Seed 16 articles; compute and store pgvector embeddings via seed script
- [ ] Implement `match_articles` pgvector RPC in Supabase
- [ ] Implement RAG retrieval (`lib/rag/retrieve.ts`)
- [ ] Implement Claude Sonnet generation (`lib/ai/generate.ts`)
- [ ] Implement Claude Haiku validator (`lib/ai/validate.ts`)
- [ ] Implement orchestration with retry + fallback (`lib/ai/orchestrate.ts`)
- [ ] Connect full AI pipeline to `GET /api/check/[ticker]`
- [ ] Implement advisor Route Handlers with AI briefing generation
- [ ] Implement articles Route Handlers; connect ExploreScreen
- [ ] Migrate WebAdvisor UI

### Phase 4 — Final (due May 25, 2026)

- [ ] End-to-end testing of AI validator: adversarial prompts, edge cases
- [ ] Confidence level labeling (based on `transactionCount`)
- [ ] Edge case handling: new user with no transaction data, all-buy investor
- [ ] Persist check results to `check_history`; wire history endpoints
- [ ] Deploy to Vercel; configure environment variables
- [ ] Full demo run: onboarding → dashboard → fitness check → AI explanation → advisor view

---

## 9. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, seed script + admin operations

# AI
ANTHROPIC_API_KEY=               # Claude Sonnet (generation) + Claude Haiku (validation)
OPENAI_API_KEY=                  # text-embedding-3-small (RAG seed only)
```

---

*Architecture by Eric Meng. All product decisions (signals, scoring tiers, guardrail rules, word limits, behavioral framing) follow SPEC.md authored by Taya Li.*