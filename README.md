# FormAgent

**Context-aware web form completion via LLM-powered browser agents.**

FormAgent is a full-stack web application that automatically fills out web forms from user-provided personal context (free-form text or résumé). A browser agent navigates the live form, maps the user's profile to each field using LLM reasoning, self-verifies with confidence scores, and surfaces uncertain fields for human review before submitting.

Built as a final project for CPSC 4770 by Perryn Chang, Reyansh Bahl, and Michael Gao.

---

## How It Works

1. **Context ingestion** — the user provides a free-form bio or uploads a résumé PDF. The LLM parses it into a structured identity profile and flags missing fields.
2. **Browser agent** — given a form URL, the agent navigates the live page, identifies all fields (text, dropdown, checkbox, date, file upload), and fills each one by reasoning over the user's profile. It handles conditional logic, multi-page forms, and JS-rendered elements.
3. **Self-verification** — after filling, the agent re-reads every field and assigns a confidence score (high / medium / low) to each.
4. **Human-in-the-loop** — low-confidence fields are flagged for user review. The user can correct values inline before the agent submits.

---

## Tech Stack

| Layer         | Technology                                                                      |
| ------------- | ------------------------------------------------------------------------------- |
| Frontend      | Next.js 15 (App Router), React 19, Tailwind CSS v4                              |
| API           | tRPC v11                                                                        |
| Browser agent | [Stagehand](https://github.com/browserbasehq/stagehand) (Playwright-based)      |
| LLM           | OpenAI **GPT-4o** (identity profile + field verification) and **GPT-4.1** (**gpt-4.1-mini** eval baseline; Stagehand browser agent uses its default model) |
| Database      | PostgreSQL via Drizzle ORM                                                      |
| Auth          | [Better Auth](https://www.better-auth.com)                                      |
| File storage  | Supabase Storage (résumé PDFs; optional if you use free-text context only)      |
| Cloud browser | [Browserbase](https://browserbase.com) (optional; falls back to local Chromium) |

---

## Monorepo Structure

```
apps/
  nextjs/          # Next.js web app
packages/
  api/             # tRPC router + all agent logic (run-form-agent, verify, extract)
  auth/            # Better Auth configuration
  db/              # Drizzle schema + migrations
  eval/            # Evaluation suite (20 forms, baseline, metrics, report)
  ui/              # Shared UI components (shadcn/ui)
  validators/      # Shared Zod schemas
tooling/
  eslint/          # Shared ESLint config
  prettier/        # Shared Prettier config
  tailwind/        # Shared Tailwind theme
  typescript/      # Shared tsconfig
```

---

## Setup

### Prerequisites

- **Node.js** 22+ (see `engines` in the root `package.json`)
- **Docker** — for local PostgreSQL (`compose.yaml`)
- **pnpm** — `corepack enable` (once; ships with Node)

### 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

This starts Postgres in the background. Omit `-d` if you want logs attached to the terminal. Stop it with `docker compose down` when you are done.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable                    | Required | Description                                                     |
| --------------------------- | -------- | --------------------------------------------------------------- |
| `POSTGRES_URL`              | Yes      | PostgreSQL connection string                                    |
| `AUTH_SECRET`               | Yes      | Random secret for Better Auth (`openssl rand -base64 32`)       |
| `OPENAI_API_KEY`            | Yes      | Used by the agent and baseline eval                             |
| `NEXT_PUBLIC_SUPABASE_URL`  | No       | Supabase project URL — required only for résumé PDF upload      |
| `SUPABASE_SERVICE_ROLE_KEY` | No       | Supabase service role key — required only for résumé PDF upload |
| `BROWSERBASE_API_KEY`       | No       | Cloud browser (falls back to local Chromium if unset)           |
| `BROWSERBASE_PROJECT_ID`    | No       | Required if using Browserbase                                   |

For the bundled Docker database, `POSTGRES_URL` can match `.env.example` (e.g. `postgresql://postgres:supersecret@localhost:5432/local`).

### 4. Apply database migrations

```bash
pnpm db:push
```

### 5. Run the app

```bash
pnpm dev
```

---

## Evaluation

The `packages/eval` package contains a custom suite of 20 forms with ground-truth answers for a fixed test persona (Alex Johnson), spanning three difficulty tiers:

| Tier    | Forms | Description                                          |
| ------- | ----- | ---------------------------------------------------- |
| Simple  | 01–06 | Static HTML, standard field labels                   |
| Medium  | 07–13 | Multi-field, dropdowns, date inputs, optional fields |
| Complex | 14–20 | Multi-section, conditional logic, multi-step wizard  |

**Metrics:**

- _Field accuracy_ — % of fields filled with the correct value vs. ground truth
- _Task completion rate_ — did the agent successfully complete the form?
- _Confidence calibration_ — do low-confidence scores predict incorrect fields?

**Baseline:** the form's raw HTML is passed directly to the LLM in a single prompt with no browser interaction. This isolates the contribution of the agent loop — the static baseline cannot handle conditional logic or multi-page forms.

### Running the eval

```bash
# Baseline only (fast, no browser)
pnpm -F @formagent/eval eval:baseline-only

# Agent only (requires local Chromium or Browserbase)
pnpm -F @formagent/eval eval:agent-only

# Both
pnpm -F @formagent/eval eval

# Subset of forms
pnpm -F @formagent/eval eval --forms 01,07,15,19

# Filter by difficulty
pnpm -F @formagent/eval eval --difficulty complex
```

Results are printed to stdout and saved to `eval-report.json`.

---

## Known Limitations

- CAPTCHAs are out of scope — the eval suite uses forms without anti-bot measures
- Authentication is a precondition; the agent does not handle logging in (session cookies must be injected manually)
- File uploads require files to be pre-staged on the server

---

## Related Work

- **Mind2Web** (Deng et al., 2023) — LLM web agent benchmark across 137 real websites; focuses on general navigation, not profile-driven form completion
- **WebArena** (Zhou et al., 2023) — sandboxed web environments for autonomous agent evaluation; forms are within simulated sites, not profile-driven
- **Stagehand** (Browserbase) — the TypeScript browser automation framework powering the agent loop
