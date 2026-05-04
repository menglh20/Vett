# CLAUDE.md — Vett Project

## What is this project?

Vett ("Vet your decision before you act") is a web-based investment decision fitness checker. It compares retail investors' self-reported risk preferences against their actual trading behavior, then provides a fitness check before each new investment decision. **Checker, not Picker** — Vett never recommends what to buy or sell.

## Repo structure

```
/
├── app-nextjs/         # Active codebase — Next.js 15 (App Router)
├── frontend/           # Legacy Vite + React prototype (reference only, do NOT modify)
├── ARCHITECTURE.md     # Full system architecture, data model, agentic engineering plan
├── SPEC.md             # Product spec: user stories, acceptance criteria, data schema
├── PM.md / temp.md     # PM-authored Chinese spec (5-dim radar definitions etc.)
├── TECH.md             # Detailed technical implementation doc (Chinese, dev-facing)
├── README.md           # Project overview
└── gix-bucks.md        # Payment agreement
```

> **Current implementation details, dimension formulas, LLM prompt, caching strategy, and the running list of "things to confirm with PM" all live in [TECH.md](TECH.md). Read it before changing anything in `lib/signals.ts`, `lib/llm.ts`, or the profile/check API routes.**

**All active development happens in `app-nextjs/`.** The `frontend/` directory is the original Figma-exported prototype kept for visual reference — never edit it.

## Tech stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 3 + inline styles using Outfit font via `next/font/google`
- **Charts**: recharts (RadarChart)
- **Icons**: lucide-react
- **Database**: Supabase PostgreSQL (pgvector planned, not yet enabled)
- **Auth**: Custom auth (bcryptjs, investor_id as username, localStorage session)
- **AI**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via Anthropic SDK with `tool_use` for structured output
- **Embeddings** (planned): OpenAI text-embedding-3-small (only when RAG is wired up)

## Running the app

```bash
cd app-nextjs
npm install
npm run dev
# Mobile: http://localhost:3000
# Web:    http://localhost:3000/web
```

## Project structure inside app-nextjs/

```
app-nextjs/
├── app/
│   ├── (mobile)/          # Mobile route group (390×844px phone frame)
│   │   ├── login/         # Mobile login page
│   │   ├── register/      # Mobile register page
│   │   └── step/[n]/      # Onboarding questions (1-7)
│   ├── web/               # Web route group (responsive, max 1200px)
│   │   ├── login/         # Web login page
│   │   ├── register/      # Web register page
│   │   └── step/[n]/      # Onboarding questions (1-7)
│   ├── api/
│   │   ├── auth/login/    # POST — bcrypt login
│   │   ├── auth/register/ # POST — bcrypt register
│   │   ├── onboarding/    # POST — save step 1-7 answers
│   │   ├── profile/       # GET — signal engine + dimensions
│   │   └── ...            # Other routes (check, articles, etc.)
│   └── layout.tsx         # Root layout with Outfit font
├── components/
│   ├── shared/            # Cross-platform: FitnessProgressBar, RadarChart, AppHeader
│   └── web/               # Web-only: WebHeader
├── lib/
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── supabase.ts        # Supabase client (browser + service)
│   ├── signals.ts         # Signal engine (4 signals → score + tier + raw metrics)
│   ├── llm.ts             # Claude Haiku wrapper + 2-tier cache (in-memory L1 + Supabase L2)
│   └── articles.ts        # Hardcoded 16-article knowledge base (mock until RAG)
├── middleware.ts          # UA-based redirect: desktop "/" → "/web/..."
├── scripts/
│   └── seed.ts            # CSV → Supabase seed script (npm run seed)
├── supabase/
│   └── migrations/
│       ├── 00001_create_tables.sql       # investors / products / transactions
│       └── 00002_create_check_results.sql # LLM cache (24h TTL)
└── package.json
```

## Dual UI pattern

The app serves two distinct layouts from one codebase:

| Route group | URL prefix | Layout | Navigation |
|-------------|-----------|--------|------------|
| `(mobile)` | `/` | 390×844px centered phone frame | Bottom tab bar (3 icons) |
| `web` | `/web/` | Max 1200px responsive | Top nav header (WebHeader) |

Both share the same API routes, types, and shared components.

## Current state

**Done:**
- Frontend: all pages built (mobile + web dual UI)
- Auth: login/register + API routes (bcryptjs, investor_id = username)
- Database: 2 migrations applied (investors / products / transactions / check_results)
- Seed: CSV → Supabase, 500 investors + 8400 transactions + 37 products (default password `vett2026`)
- Onboarding: 7 questions, answers saved to localStorage, synced after step 7
- Signal engine: 4 signals + raw metrics, 5-min in-memory cache
- Profile API: 5-dim radar (self vs obs, gap = mismatch model from PM.md), dynamic headline (10 templates), 3-5 branch dimension explanations
- **LLM Match Check**: Claude Haiku 4.5 generates score / tier / flags / aiExplanation / reflectionQuestions / suggestions / confidence per `(investor, ticker)`. 6-principle system prompt + Anthropic prompt cache.
- **2-tier cache**: in-memory L1 (30 min) + Supabase `check_results` L2 (24h). Same user sees same result for 24h.
- Trending / History APIs: prefer LLM cached score, fall back to rule-based `computeMatchPercentage`. Dashboards mark non-LLM scores with `?` icon + tooltip + dimmed opacity.
- UA middleware: desktop hitting `/` auto-redirects to `/web/...`
- Header dropdown menu (mobile + web): Import data / Sign out

**What still needs to be built:**
- RAG retrieval (pgvector + 16-article vector store + retrieval logic in LLM context)
- Replace mock API routes: `/api/articles*` (16-article hardcoded), `/api/advisor/clients` (5 fake clients)
- Investor goal (Q1) + target gain (Q6) saved but not yet used in any computation
- See [TECH.md §9](TECH.md) for the running PM-alignment punch list

## API routes

| Endpoint | Status | Returns |
|----------|--------|---------|
| `POST /api/auth/register` | real | Register new investor (bcrypt) |
| `POST /api/auth/login` | real | Login with investor_id + password (bcrypt) |
| `POST /api/onboarding` | real | Save step 1-7 answers to Supabase |
| `GET /api/profile?investor_id=` | real* | Fitness score, headline, 5-dimension profile, signals |
| `GET /api/check/[ticker]?investor_id=` | **real (LLM)** | LLM-driven score / tier / flags / AI explanation / suggestions / alternatives. 24h cached. |
| `GET /api/check/history?investor_id=` | real* | User's traded products. Match% prefers LLM cache, falls back to rule-based with `isEstimate=true`. |
| `GET /api/products/trending?investor_id=` | real* | 7 trending products. Same caching strategy as history. |
| `GET /api/articles?category=` | mock | 16 articles hardcoded in `lib/articles.ts` |
| `GET /api/articles/[slug]` | mock | Single article detail |
| `GET /api/advisor/clients` | mock | 5 advisor clients with mismatch scores |

*Falls back to mock data when Supabase / Anthropic is not configured.

## Signal engine

4 core signals computed in `lib/signals.ts`:

| Signal | Input | Level thresholds |
|--------|-------|-----------------|
| Holding deviation | stated_horizon + median hold_days | high: <30% of range / medium: below range / low: in range |
| Panic selling | sells in -10%~0% dip + panic source | high: >50% / medium: >25% / low: <25% |
| External dependency | friend/social_media buy % | high: >50% / medium: >25% / low: <25% |
| Liquidity conflict | short_term_need + illiquid buys | high: >30% illiquid / medium: any illiquid / low: none |

**Scoring:** high=0, medium=15, low=25. Total = sum of 4 (max 100).

**Tier:** Fit (no high) / Caution (1-2 high or 2+ medium) / Mismatch (3+ high or extreme deviation).

**Caching:** Signal results are cached in-memory per investor_id with 5-min TTL. Call `invalidateSignalCache(investorId)` when user data changes.

**Match percentage on check detail page** is **LLM-driven** (Claude Haiku 4.5 in `lib/llm.ts`). The system prompt instructs the model to anchor on `|product.risk_level − actual_tolerance| × 20` and apply behavioral signal penalties, then settle the final score.

**Match percentage on dashboard / history lists** prefers cached LLM scores from `check_results`. When no cache hit, falls back to rule-based `computeMatchPercentage(product, actualTolerance, signals)` and the response carries `isEstimate=true` so the UI can dim it + show a `?` tooltip.

Rule-based fallback formula:
- Base: `100 − |product_risk_level − actual_tolerance| × 20`
- Penalties: holding deviation + long-term product (-15/-8), panic selling + R4+ (-15/-8), external dependency (-10/-5), liquidity conflict + illiquid product (-15/-8)
- Floor: 5

## AI integration

- **Model**: `claude-haiku-4-5-20251001` (Sonnet 4.6 swappable in `lib/llm.ts`)
- **Structured output**: Anthropic `tool_use` with a JSON schema that locks 8 output fields
- **Prompt cache**: system prompt marked `cache_control: ephemeral` (5-min TTL) — repeat calls within 5 min reuse cached prefix
- **2-tier cache**: in-memory L1 (30 min) + Supabase `check_results` L2 (24h). Same `(investor_id, ticker)` returns the exact same JSON for 24h, avoiding both cost and inconsistency between dashboard and detail page.
- **Cost**: ~$0.005 per uncached call (Haiku), ~$0.001-0.002 with prompt cache hit. Demo budget: ≤ $5/day for 500 simulated users.

See [TECH.md §5–6](TECH.md) for the full system prompt, schema, and cache flow.

## 5-dimension radar (current implementation)

Aligned with PM.md / temp.md "twin polygons, gap = mismatch" model. Each axis maps both self and observed onto 0-100. See [TECH.md §4](TECH.md) for the full formulas.

| Dimension | self source | observed source |
|---|---|---|
| Risk Tolerance | `self_risk_level × 20` | `actual_tolerance × 20` (CSV-derived) |
| Holding Patience | `stated_horizon` mapped (20/40/60/80/95) | `medianHoldDays` bucketed (10/25/45/65/80/95) |
| Decision Independence | `expValue + literacyBonus` (proxy) | `selfBuyRate × 100` |
| Volatility Comfort | `stated_max_loss` mapped (20/40/60/80/95) | `100 − (smallDipRate + panicRate)/2 × 100` |
| Liquidity Readiness | `has_short_term_cash_need ? 30 : 80` | no need → 100; else `100 − illiquidBuyRate × 100` |

**Items still pending PM confirmation** (see [TECH.md §9](TECH.md) for full punch list):
- [ ] Decision Independence self side: keep proxy or add a dedicated onboarding question?
- [ ] Liquidity self uses only the boolean — Q7 has 4 options. Add `liquidity_awareness` column?
- [ ] Q1 (investment_goal) and Q6 (target_gain) saved but unused — should they feed into any dimension?
- [ ] LLM-driven Match anchor formula not in any PM doc — confirm acceptance
- [ ] Tier thresholds: PM.md says ≥70/30-69/<30; current code judges by signal counts (≥3 high → mismatch)
- [ ] Radar dot color: current uses gap magnitude (teal/amber/coral). PM.md hints at self=blue / obs=orange. Pick one.

## Design system

- **Font**: Outfit (loaded via `next/font/google`, accessed as `var(--font-outfit)`)
- **Colors**: Black `#111111`, Gray `#888888`, Teal `#14B8BB` (fit/positive), Amber `#F59E0B` (caution), Coral `#EF4444` (mismatch/negative)
- **Score zones**: ≥70 teal (Fit), 40–69 amber (Caution), <40 coral (Mismatch)
- **Risk level dots**: R1 `#CCCCCC` → R5 `#333333` (grayscale gradient)
- **Border radius**: Cards `14px`/`2xl`, Pills `9999px`, Score cards `3xl`

## Key conventions

- All interactive components must have `"use client"` at the top
- Use `useRouter()` from `next/navigation` for navigation (not react-router)
- Use `<Link>` from `next/link` for declarative links
- Font styling: `fontFamily: "var(--font-outfit)"` in inline styles, or `font-outfit` in Tailwind
- Data fetching in client components: `useEffect` + `fetch("/api/...")`
- Shared types live in `lib/types.ts` — import as `@/lib/types`
- Path aliases: `@/` resolves to the project root

## Guardrail rules (for AI-generated content)

These rules apply to any AI-generated explanation text in the app:
- **Never** recommend buying, selling, holding, or avoiding any asset
- **Never** predict prices, returns, or market movements
- **Never** use urgency language ("act now", "don't miss")
- **Never** label the user negatively ("you are a panic seller")
- Use pattern framing: "we've detected" / "your data shows"
- Word limits: Fit ≤80 words, Caution ≤100 words, Mismatch ≤120 words
- Always end with 2–3 numbered reflection questions

## Timeline

| Checkpoint | Date | Goal |
|-----------|------|------|
| Check-in 1 | April 13, 2026 | Project setup, DB, auth, onboarding |
| Check-in 2 | May 4, 2026 | Signal engine, dashboard, fitness check |
| Check-in 3 | May 18, 2026 | AI + RAG, advisor mode, explore page |
| Final | May 25, 2026 | Guardrails, polish, demo-ready |
| Presentation | June 1, 2026 | Final demo |

## Environment variables

Required for full functionality (set both locally in `app-nextjs/.env.local` and on Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
# OPENAI_API_KEY=    # Only when RAG is wired up (text-embedding-3-small)
```

Without `ANTHROPIC_API_KEY` the check API gracefully falls back to a rule-based placeholder. Without Supabase keys the entire app degrades to mock fixtures.

## Database setup

Run migrations in order in Supabase SQL Editor:
1. [00001_create_tables.sql](app-nextjs/supabase/migrations/00001_create_tables.sql) — investors / products / transactions
2. [00002_create_check_results.sql](app-nextjs/supabase/migrations/00002_create_check_results.sql) — LLM cache table

Then locally: `cd app-nextjs && npm run seed` to load CSVs (default password for all seeded users: `vett2026`).
