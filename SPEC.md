# SPEC.md — Vett: Investment Decision Fitness Check

## Project Overview

A web-based tool that helps retail investors assess whether a specific investment decision fits their actual behavioral risk tolerance, not just their self-reported questionnaire score. The system analyzes the gap between what investors say they can handle and what their trading history shows they actually do, then provides a fitness check before each new investment decision.

**Product Tagline:** "Vet your decision before you act."

**Product Positioning:** Checker, not Picker — Vett does not recommend what to buy or sell. It checks whether a planned investment decision fits the user's actual behavioral patterns. The final decision always belongs to the user.

## Team

- **Proposer (Product Owner / UX Designer):** Taya Li
- **Developer:** Eric Meng
- **Agreed Development Fee:** 30 GIX Bucks

---

## Problem Statement

Traditional risk assessment relies on static questionnaires (e.g., R1-R5 in Chinese banking). These ratings are filled once, rarely updated, and do not reflect how investors actually behave under market volatility.

Analysis of simulated investor data (500 investors, 8,400+ transactions) reveals:
- Investors who claim long-term horizons (5+ years) hold positions for an average of only 122 days
- Over 50% of selling decisions during losses are driven by panic or social influence, not rational analysis
- 63.8% of buy decisions by investors with low financial literacy are externally driven (social media or friends)
- Self-reported risk levels systematically diverge from behavior-inferred tolerance, with most investors underestimating their actual capacity

---

## User Stories

### US-1: Account Connection and Baseline Setup
**As a** new user,
**I want to** connect my brokerage account and answer a few baseline questions about my risk preferences,
**So that** the system can compare my self-assessment against my actual trading behavior.

**Acceptance Criteria:**
- User can create an account and log in
- User completes a 7-question onboarding questionnaire covering: investment goal, risk tolerance (R1-R5), typical holding period, investment experience, max acceptable loss, target gain threshold, and fund source/liquidity
- System accepts simulated brokerage data via three progressive options: manual entry, CSV import, or account connection (for demo purposes, pre-loaded dataset)
- User sees a confirmation that their profile has been created

### US-2: Behavioral Profile Overview
**As a** returning user,
**I want to** see how my actual trading behavior compares to what I said about myself,
**So that** I can understand where my self-perception may be inaccurate.

**Acceptance Criteria:**
- Dashboard shows a radar chart with 5 dimensions comparing self-assessment vs. behavior-inferred profile:
  - Risk Tolerance
  - Holding Patience
  - Decision Independence
  - Volatility Comfort
  - Liquidity Readiness
- Each dimension shows High / Medium / Low for both self-reported and observed
- Visual overlap/gap between the two profiles is clearly visible
- Brief text explanation accompanies each dimension
- Dashboard also displays a Decision Fitness Score (0-100) with a three-zone progress bar (coral 0-40, amber 40-70, teal 70-100)

### US-3: Pre-Decision Fitness Check (Core Feature)
**As a** user about to make an investment,
**I want to** search for a product and get a fitness check telling me whether this decision matches my actual behavioral patterns,
**So that** I can make a more informed decision before acting.

**Acceptance Criteria:**
- User can search by ticker or product name, or select from a trending products list showing personalized match percentages
- System runs the check against 4 behavioral signals:
  1. Holding period consistency (stated horizon vs. actual median hold days)
  2. Drawdown reaction (panic sell tendency under <10% loss)
  3. Decision independence (% of past decisions externally driven)
  4. Liquidity conflict (short-term cash needs vs. product lock-up)
- System outputs one of three results: **Fit** (≥70), **Caution** (30-69), or **Mismatch** (<30)
- Each result displays specific flags (e.g., "Holding period conflict", "Externally driven")
- Results page shows a Decision Fitness Score (0-100)
- Mismatch results include alternative product suggestions with higher match percentages

### US-4: AI-Generated Explanation
**As a** user who received a Caution or Mismatch result,
**I want to** understand why this decision may not fit me, with references to my own past behavior,
**So that** I know exactly what to reconsider before proceeding.

**Acceptance Criteria:**
- AI generates a plain-language explanation referencing the user's specific behavioral data (e.g., "We've detected 4 exits during dips under 8%. TSLA has had 15 corrections exceeding 10% in the past 18 months.")
- AI provides 2-3 reflection questions the user should consider
- AI does NOT provide any buy/sell recommendations or return predictions
- Explanation cites which behavioral signals triggered the result
- System displays confidence level (e.g., "Based on 6 months of data. Confidence: medium.")
- Output follows three-tier word limits: Fit ≤80 words, Caution ≤100 words, Mismatch ≤120 words

### US-5: Advisor Mode (Concept View — Web Only)
**As a** financial advisor,
**I want to** see which of my clients have high mismatch scores and get a pre-meeting briefing,
**So that** I can prepare more effective suitability conversations.

**Acceptance Criteria:**
- Simple dashboard view listing simulated clients ranked by mismatch score
- Clicking a client shows: their self-assessment vs. behavioral profile, top mismatch signals, and suggested conversation starters
- Advisor briefing generated by AI (≤80 words) with 2 data-driven, non-confrontational conversation starters
- This is a concept/demo view using simulated data, not a full B2B product

### US-6: Explore / Knowledge Base
**As a** user,
**I want to** browse educational content about behavioral finance concepts referenced in my results,
**So that** I can better understand my own patterns.

**Acceptance Criteria:**
- Knowledge base page displays articles from the 16-article RAG knowledge base
- Articles are filterable by category: Holding Behavior, Panic Selling, Following Others, Liquidity, General
- Each article shows category tag, title, preview text, and estimated reading time

---

## Technical Specifications

### Data Model

**Table 1: investors (17 fields)**

| Field | Type | Description |
|-------|------|-------------|
| investor_id | string (PK) | Unique identifier |
| age | integer | |
| gender | string | M / F |
| is_married | boolean | |
| occupation | string | |
| education | string | high_school / bachelor / master / phd |
| annual_income | integer | USD |
| debt_level | string | none / low / high |
| account_size | integer | USD |
| monthly_spending | integer | USD |
| has_short_term_cash_need | boolean | |
| is_qualified_investor | boolean | Qualified for private equity etc. |
| financial_literacy | string | low / medium / high |
| self_risk_level | integer | 1-5 (R1-R5) |
| actual_tolerance | integer | 1-5, behavior-inferred |
| stated_horizon | string | <6m / 6m-1y / 1-3y / 3-5y / 5y+ |
| stated_max_loss | integer | Percentage |
| investment_experience_years | integer | |

**Table 2: transactions (12 fields)**

| Field | Type | Description |
|-------|------|-------------|
| transaction_id | string (PK) | Unique identifier |
| investor_id | string (FK) | Links to investors table |
| action | string | buy / sell |
| product_type | string | deposit / bond / fund / stock / etc. |
| product_risk_level | integer | 1-5 |
| amount | integer | USD |
| date | date | |
| hold_days | integer | Only for sell records |
| market_change_pct | float | % change at time of sell |
| decision_source | string | self / advisor / social_media / friend |
| sell_decision_source | string | rational_stop_loss / panic / follow_others / need_cash |
| is_chasing | boolean | Bought during market upswing driven by hype |

### System Architecture (4 Layers)

**Layer 1: Data and Rule Engine (SQL/API)**
- Extracts structured behavioral signals from transaction data
- Calculates: actual median holding period, panic sell rate, external decision %, liquidity conflicts
- Outputs structured mismatch facts
- Structured data uses SQL rules engine only — no AI involved in this layer

**Layer 2: RAG Knowledge Retrieval (Unstructured Content)**
- 16-article behavioral finance knowledge base (bilingual EN/CN), covering: loss aversion, disposition effect, herding behavior, overconfidence, and advisor communication playbooks
- Retrieves relevant explanations when a mismatch is detected
- For advisor mode: retrieves communication playbooks for handling specific client mismatch types
- Does NOT retrieve structured transaction data (that is Layer 1's job)

**Layer 3: AI Explanation and Generation (LLM)**
- Takes Layer 1 structured facts + Layer 2 knowledge context
- Generates personalized plain-language explanation
- Three-tier output: Fit (≥70, ≤80 words), Caution (30-69, ≤100 words), Mismatch (<30, ≤120 words)
- References specific past behavior as evidence
- Uses "we've detected / your data shows" framing — never "you should"

**Layer 4: Guardrails**
- Hard block: no buy/sell recommendations, no return predictions, no urgency language
- Keyword blacklist filtering + word count limits + confidence labeling
- Transparency: displays data basis and confidence level
- Behavioral descriptions only — never labels people (e.g., "pattern of exiting during dips" not "you are a panic seller")

### AI Integration
- LLM: OpenAI API (or equivalent) for explanation generation
- RAG: Vector store with 16-article behavioral finance knowledge base
- Guardrails: Rule-based output filtering with keyword blacklist
- Prompt template and guardrails document provided by proposer

### Stack Preference
- Suggested: Next.js + Supabase (multi-user, auth, database)
- Final decision by developer

### Demo Data
- Pre-loaded dataset of 500 simulated investors and 8,400+ transactions (provided by proposer)
- No real brokerage API integration required

---

## Scope Boundaries

### In Scope (V1)
- User onboarding with 7-question risk self-assessment
- Behavioral profile dashboard with radar chart and fitness score
- Pre-decision fitness check with ticker search and trending products
- AI-generated explanation with behavioral references and reflection questions
- Explore / knowledge base page
- Advisor mode concept view (web only)
- Simulated data only

### Out of Scope (V1)
- Real brokerage API integration
- Real-time market data
- Post-decision tracking and notifications
- Mobile app
- Multi-language support
- Payment or subscription system

---

## Revenue Model

### B2C: Freemium
- Free: Basic behavioral profile and limited fitness checks per month
- Premium ($14.99/month): Unlimited checks, detailed AI explanations, historical trend tracking

### B2B: SaaS for Advisory Firms
- Per-seat licensing for advisor mode dashboard
- Integration fee for connecting to firm's existing CRM/portfolio systems
- Target: Independent financial advisors and mid-size wealth management firms

### Market Size Reference
- AI-powered wealth management solutions market projected to grow from $1B (2025) to $5.8B (2035) at 12.7% CAGR
- Over 50% of wealth management firms are actively piloting or deploying generative AI

---

## GitHub Issues Breakdown

### Issue 1: Project Setup and Data Layer
Set up project repo, database schema, and import simulated dataset.
**Acceptance:** Database populated with 500 investors and 8,400+ transactions. Basic API endpoints return investor and transaction data.

### Issue 2: User Authentication and Onboarding
Implement user registration, login, and 7-question onboarding questionnaire.
**Acceptance:** User can sign up, log in, complete questionnaire, and see their self-reported profile saved.

### Issue 3: Behavioral Signal Calculation Engine
Implement the 4 core behavioral signal calculations from transaction data.
**Acceptance:** Given an investor_id, system returns: median hold days, panic sell rate, external decision %, and liquidity conflict flag. Results match expected values from sample data.

### Issue 4: Behavioral Profile Dashboard
Build the profile overview page with radar chart, fitness score, and trending products with personalized match percentages.
**Acceptance:** Radar chart displays 5 dimensions with two overlapping profiles. Text explanations appear for each dimension. Fitness score displays with three-zone progress bar.

### Issue 5: Pre-Decision Fitness Check Flow
Build the core fitness check: user searches by ticker, system runs check, outputs Fit/Caution/Mismatch with flags, score, and alternative suggestions.
**Acceptance:** User can search for a product, receive a scored result with specific mismatch flags, see the Decision Fitness Score, and view better-matched alternatives for Mismatch results.

### Issue 6: AI Explanation Generation with RAG
Integrate LLM to generate personalized explanations referencing user's behavioral data, with RAG retrieval from the 16-article knowledge base.
**Acceptance:** Caution and Mismatch results include AI-generated explanation with at least one reference to user's past behavior, 2-3 reflection questions, confidence level, and no buy/sell recommendations. Output respects word count limits per tier.

### Issue 7: Advisor Mode and Explore Page
Build advisor dashboard (web) showing client mismatch rankings and pre-meeting briefings. Build explore page displaying knowledge base articles with category filters.
**Acceptance:** Advisor dashboard lists clients by mismatch score with AI-generated briefings and conversation starters. Explore page displays filterable articles.

### Issue 8: Guardrails, Polish, and Demo Preparation
Implement guardrails (keyword blacklist, word count enforcement, confidence labeling). UI refinement, edge case handling, and demo flow preparation.
**Acceptance:** Guardrails block prohibited content. Clean, consistent UI following design system (Outfit font, black/white base, teal/amber/coral functional color). No crashes on core user flow. Demo can run end-to-end without errors.

---

## Deliverables Provided by Proposer

- ✅ Simulated dataset (500 investors, 8,400+ transactions)
- ✅ SQL analysis queries (4 core signal validations)
- ✅ SPEC.md with user stories and acceptance criteria
- ✅ RAG knowledge base (16 articles, bilingual EN/CN)
- ✅ Prompt template and guardrails document
- ✅ UI copy document (all fixed-text content)
- ✅ Figma high-fidelity mockups (App 5 pages + Web 6 pages + design system)
- ✅ GitHub Issues breakdown
- ✅ All PR reviews and acceptance testing

---

## Timeline and Check-in Points

| Check-in | Target Date | Expected Progress |
|----------|-------------|-------------------|
| Check-in 1 | April 13, 2026 | Issues 1-2 complete: project setup, data loaded, auth and onboarding working |
| Check-in 2 | May 4, 2026 | Issues 3-5 complete: signal engine, profile dashboard with radar chart, fitness check flow working |
| Check-in 3 | May 18, 2026 | Issues 6-7 complete: AI explanation with RAG, advisor mode, explore page integrated |
| Final | May 25, 2026 | Issue 8 complete: guardrails enforced, polished, demo-ready |

**Final Presentation:** June 1, 2026

---

*Proposer provides all product specifications, design assets, data, prompt templates, and acceptance criteria. Developer is responsible for architecture decisions, implementation, and testing.*
