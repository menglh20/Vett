# Vett — Investment Decision Fitness Check

> "Vet your decision before you act."

A web-based tool that helps retail investors check whether a planned investment decision fits their actual behavioral patterns — not just their self-reported risk questionnaire. Vett is a **Checker, not a Picker**: it never recommends what to buy or sell, only surfaces the gap between what you say and what you do.

---

## Problem

Traditional risk assessment relies on static questionnaires (R1–R5) that are filled once and rarely updated. Our simulated dataset (500 investors, 8,400+ transactions) confirms what two years of financial advisory experience showed firsthand:

- Investors claiming 5+ year horizons hold positions for an average of **122 days**
- **52%** of loss-driven sells are panic or herd behavior, not rational decisions
- **63.8%** of buys by low-literacy investors are externally influenced
- Self-reported risk levels systematically diverge from actual behavior

## Solution

Vett compares an investor's self-assessment against their real trading behavior across 4 behavioral signals, then delivers a fitness check before each new investment decision.

**Core flow:** Onboarding (7 self-assessment questions) → Data import → Behavioral profile (radar chart, 5 dimensions) → Search a product → Fitness check result (Fit / Caution / Mismatch) with AI-generated explanation → User decides.

---

## System Architecture

| Layer | Role | Implementation |
|-------|------|----------------|
| **1. SQL Signal Engine** | Extract 4 behavioral signals from transaction data | SQL rules engine — no AI |
| **2. RAG Knowledge Retrieval** | Retrieve behavioral finance explanations for detected mismatches | Vector store + 16-article knowledge base |
| **3. LLM Explanation** | Generate personalized plain-language explanation | OpenAI API (or equivalent) |
| **4. Guardrails** | Ensure output never crosses checker boundary | Keyword blacklist + word limits + confidence labeling |

### 4 Behavioral Signals

1. **Holding Period Deviation** — Stated horizon vs. actual median hold days
2. **Panic Sell Tendency** — % of loss-driven sells triggered by small dips (<10%)
3. **External Dependency** — % of buy decisions driven by social media or friends
4. **Liquidity Conflict** — Short-term cash needs vs. illiquid product purchases

### Fitness Result

| Result | Condition | Score |
|--------|-----------|-------|
| **Fit** | No signal rated High | ≥ 70 |
| **Caution** | 1–2 signals High | 30–69 |
| **Mismatch** | 3+ signals High or severe deviation | < 30 |

---

## Features

- **Onboarding** — 7-question self-assessment + progressive data import (manual → CSV → account)
- **Behavioral Profile** — Radar chart comparing self-assessed vs. observed across 5 dimensions
- **Fitness Check** — Search by ticker, view trending products with personalized match %, get scored result with mismatch flags
- **AI Explanation** — Personalized explanation referencing user's own data, reflection questions, confidence level
- **Explore** — Browsable knowledge base (16 articles on behavioral finance)
- **Advisor View** (Web only) — Client mismatch rankings + AI-generated pre-meeting briefings

---

## Tech Stack

Suggested: Next.js + Supabase — final decision by developer.

## Data

Simulated dataset provided by PM: 500 investors (17 fields) + 8,400+ transactions (12 fields). No real brokerage API integration required.

---

## Team

| Role | Person | Responsibilities |
|------|--------|------------------|
| **PM / UX Designer** | Taya Li | Product spec, data & SQL analysis, Figma design, RAG knowledge base, prompt & guardrails design, PR review, acceptance testing |
| **Developer** | Eric Meng | Frontend, backend API, database, RAG implementation, LLM integration |

### PM Deliverables (All Complete)

- ✅ Product Brief v4 + SPEC.md
- ✅ Simulated dataset (500 investors, 8,400+ transactions) + SQL analysis (4 queries)
- ✅ RAG knowledge base (16 articles, bilingual EN/CN)
- ✅ Figma high-fidelity mockups (App 5 pages + Web 6 pages + design system)
- ✅ Prompt template + Guardrails document
- ✅ UI Copy document
- ✅ Case Study (EN/CN)

---

## Timeline

| Check-in | Date | Expected Progress |
|----------|------|-------------------|
| Check-in 1 | April 13, 2026 | Project setup, database schema, data imported, auth + onboarding working |
| Check-in 2 | May 4, 2026 | Signal engine, behavioral profile dashboard with radar chart, fitness check flow |
| Check-in 3 | May 18, 2026 | AI explanation with RAG, advisor view, explore page |
| Final | May 25, 2026 | Guardrails enforced, UI polished, demo-ready |

**Final Presentation:** June 1, 2026
