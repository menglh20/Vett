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
├── README.md           # Project overview
└── gix-bucks.md        # Payment agreement
```

**All active development happens in `app-nextjs/`.** The `frontend/` directory is the original Figma-exported prototype kept for visual reference — never edit it.

## Tech stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 3 + inline styles using Outfit font via `next/font/google`
- **Charts**: recharts (RadarChart)
- **Icons**: lucide-react
- **Database**: Supabase PostgreSQL + pgvector
- **Auth**: Custom auth (bcryptjs, investor_id as username)
- **AI** (planned): Claude Sonnet (generation) + Claude Haiku (validation)
- **Embeddings** (planned): OpenAI text-embedding-3-small

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
│   └── signals.ts         # Signal engine (4 signals → score + tier)
├── scripts/
│   └── seed.ts            # CSV → Supabase seed script (npm run seed)
├── supabase/
│   └── migrations/        # SQL schema migrations
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
- Auth: login/register pages + API routes (bcryptjs, investor_id = username)
- Database: Supabase schema migration (investors, transactions, products tables)
- Seed script: CSV → Supabase with bcrypt hashed passwords (`npm run seed`), includes 37 products
- Onboarding: step 1-7 answers saved to localStorage, synced to Supabase after step 7
- Signal engine: 4 signals computed from Supabase data (lib/signals.ts), with 5-min in-memory cache
- Profile API: real signal computation with mock data fallback
- Trending API: product info from DB, matchPercentage via signal engine
- History API: derived from user transactions, matchPercentage via signal engine
- Match percentage: base score (risk distance) + signal-based penalty modifiers

**What still needs to be built:**
- RAG retrieval (pgvector)
- AI explanation (Claude Sonnet generation + Claude Haiku validation)
- Replace remaining mock API routes (check/[ticker], articles, advisor) with real Supabase queries

## API routes

| Endpoint | Status | Returns |
|----------|--------|---------|
| `POST /api/auth/register` | real | Register new investor (bcrypt) |
| `POST /api/auth/login` | real | Login with investor_id + password (bcrypt) |
| `POST /api/onboarding` | real | Save step 1-7 answers to Supabase |
| `GET /api/profile?investor_id=` | real* | Fitness score, 5-dimension profile, signals |
| `GET /api/check/[ticker]` | mock | Score, tier, flags, AI explanation, alternatives |
| `GET /api/check/history?investor_id=` | real* | User's traded products with matchPercentage |
| `GET /api/products/trending?investor_id=` | real* | 7 trending products with matchPercentage |
| `GET /api/articles?category=` | mock | 16 articles, filterable by category |
| `GET /api/articles/[slug]` | mock | Single article detail |
| `GET /api/advisor/clients` | mock | 5 advisor clients with mismatch scores |

*Falls back to mock data when Supabase is not configured.

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

**Match percentage:** `computeMatchPercentage(product, actualTolerance, signals)` in `lib/signals.ts`.
- Base: `100 - |product_risk_level - actual_tolerance| × 20`
- Penalties: holding deviation + long-term product (-15/-8), panic selling + high-volatility R4+ (-15/-8), external dependency (-10/-5), liquidity conflict + illiquid product (-15/-8)
- Floor: 5 (never returns 0)

## TODO: Dimension calculation (pending PM alignment)

The 5 profile dimensions currently use a preliminary mapping from signals. The exact calculation logic needs to be confirmed with PM before finalizing:

| Dimension | Current self source | Current observed source | Open questions |
|-----------|-------------------|----------------------|----------------|
| Risk Tolerance | `self_risk_level` (step 2) | Panic sell signal (inverted) | Should actual_tolerance from CSV also factor in? |
| Holding Patience | `stated_horizon` (step 3) | Holding deviation signal (inverted) | Threshold tuning needed? |
| Decision Independence | Hardcoded 75 | External dependency signal (inverted) | No self-reported question maps here — add one, or derive from data? |
| Volatility Comfort | `stated_max_loss` (step 5) | Panic sell signal (inverted) | Overlaps with Risk Tolerance — should they share the same signal or differentiate? |
| Liquidity Readiness | `has_short_term_cash_need` (step 7) | Liquidity conflict signal (inverted) | Should account_size / monthly_spending also factor in? |

**Action items:**
- [ ] Confirm dimension definitions and calculation formulas with PM
- [ ] Decide whether Decision Independence needs a self-assessment question
- [ ] Clarify how Risk Tolerance vs Volatility Comfort should differ
- [ ] Determine if Liquidity Readiness should incorporate financial profile fields
- [ ] Set radar chart value ranges and normalization rules

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

## Environment variables needed (when Supabase is connected)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```
