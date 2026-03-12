# create-t3-turbo

## Installation

> [!NOTE]
>
> Make sure to follow the system requirements specified in [`package.json#engines`](./package.json#L4) before proceeding.

There are two ways of initializing an app using the `create-t3-turbo` starter. You can either use this repository as a template:

![use-as-template](https://github.com/t3-oss/create-t3-turbo/assets/51714798/bb6c2e5d-d8b6-416e-aeb3-b3e50e2ca994)

or use Turbo's CLI to init your project (use PNPM as package manager):

```bash
npx create-turbo@latest -e https://github.com/t3-oss/create-t3-turbo
```

## About

Ever wondered how to migrate your T3 application into a monorepo? Stop right here! This is the perfect starter repo to get you running with the perfect stack!

It uses [Turborepo](https://turborepo.com) and contains:

```text
.github
  └─ workflows
        └─ CI with pnpm cache setup
.vscode
  └─ Recommended extensions and settings for VSCode users
apps
  └─ nextjs
      ├─ Next.js 15
      ├─ React 19
      ├─ Tailwind CSS v4
      └─ E2E Typesafe API Server & Client
packages
  ├─ api
  │   └─ tRPC v11 router definition
  ├─ auth
  │   └─ Authentication using better-auth.
  ├─ db
  │   └─ Typesafe db calls using Drizzle & Supabase
  └─ ui
      └─ Start of a UI package for the webapp using shadcn-ui
tooling
  ├─ eslint
  │   └─ shared, fine-grained, eslint presets
  ├─ prettier
  │   └─ shared prettier configuration
  ├─ tailwind
  │   └─ shared tailwind theme and configuration
  └─ typescript
      └─ shared tsconfig you can extend from
```

> In this template, we use `@acme` as a placeholder for package names. As a user, you might want to replace it with your own organization or project name. You can use find-and-replace to change all the instances of `@acme` to something like `@my-company` or `@project-name`.

## Quick Start

> **Note**
> The [db](./packages/db) package uses the `pg` driver and works with any PostgreSQL database (local, Supabase, Neon, etc.). Set `POSTGRES_URL` in your `.env` and run `pnpm db:migrate` to apply migrations.

To get it running, follow the steps below:

### 1. Setup dependencies

```bash
# Install dependencies
pnpm i

# Configure environment variables
# There is an `.env.example` in the root directory you can use for reference
cp .env.example .env

# Push the Drizzle schema to the database
pnpm db:push
```

### 2. Generate Better Auth Schema

This project uses [Better Auth](https://www.better-auth.com) for authentication. The auth schema needs to be generated using the Better Auth CLI before you can use the authentication features.

```bash
# Generate the Better Auth schema
pnpm --filter @acme/auth generate
```

This command runs the Better Auth CLI with the following configuration:

- **Config file**: `packages/auth/script/auth-cli.ts` - A CLI-only configuration file (isolated from src to prevent imports)
- **Output**: `packages/db/src/auth-schema.ts` - Generated Drizzle schema for authentication tables

The generation process:

1. Reads the Better Auth configuration from `packages/auth/script/auth-cli.ts`
2. Generates the appropriate database schema based on your auth setup
3. Outputs a Drizzle-compatible schema file to the `@acme/db` package

> **Note**: The `auth-cli.ts` file is placed in the `script/` directory (instead of `src/`) to prevent accidental imports from other parts of the codebase. This file is exclusively for CLI schema generation and should **not** be used directly in your application. For runtime authentication, use the configuration from `packages/auth/src/index.ts`.

For more information about the Better Auth CLI, see the [official documentation](https://www.better-auth.com/docs/concepts/cli#generate).

### 3. When it's time to add a new UI component

Run the `ui-add` script to add a new UI component using the interactive `shadcn/ui` CLI:

```bash
pnpm ui-add
```

When the component(s) has been installed, you should be good to go and start using it in your app.

### 4. When it's time to add a new package

To add a new package, simply run `pnpm turbo gen init` in the monorepo root. This will prompt you for a package name as well as if you want to install any dependencies to the new package (of course you can also do this yourself later).

The generator sets up the `package.json`, `tsconfig.json` and a `index.ts`, as well as configures all the necessary configurations for tooling around your package such as formatting, linting and typechecking. When the package is created, you're ready to go build out the package.

## FAQ

### Does this pattern leak backend code to my client applications?

No, it does not. The `api` package should only be a production dependency in the Next.js application where it's served. Any other apps you may add in the future should only add the `api` package as a dev dependency. This lets you have full typesafety in your client applications, while keeping your backend code safe.

If you need to share runtime code between the client and server, such as input validation schemas, you can create a separate `shared` package for it and import it on both sides.

## Deployment

### Next.js

#### Deploy to Vercel

Let's deploy the Next.js application to [Vercel](https://vercel.com). If you've never deployed a Turborepo app there, don't worry, the steps are quite straightforward. You can also read the [official Turborepo guide](https://vercel.com/docs/concepts/monorepos/turborepo) on deploying to Vercel.

1. Create a new project on Vercel, select the `apps/nextjs` folder as the root directory. Vercel's zero-config system should handle all configurations for you.

2. Add your `POSTGRES_URL` environment variable.

3. Done! Your app should successfully deploy.

### Auth Proxy

The auth proxy comes as a better-auth plugin. This is required for the Next.js app to be able to authenticate users in preview deployments. The auth proxy is not used for OAuth requests in production deployments. The easiest way to get it running is to deploy the Next.js app to Vercel.

## References

The stack originates from [create-t3-app](https://github.com/t3-oss/create-t3-app).

A [blog post](https://jumr.dev/blog/t3-turbo) where I wrote how to migrate a T3 app into this.


# Project Context

## What is FormAgent?

FormAgent is a full-stack web application that automatically fills out web forms using a user-provided personal context (free-form text or résumé) and an LLM-powered browser agent. The agent navigates to a given form URL, reasons about how to map the user's profile to each form field, fills the form, and surfaces uncertain fields for human review before submitting.

## Goals

- Parse unstructured personal context into a structured identity profile
- Navigate and understand arbitrary web forms, including dynamic and multi-page ones
- Map profile data to form fields using LLM reasoning
- Self-verify filled fields with a confidence score before submission
- Let the user review and correct low-confidence fields before the agent submits
- Evaluate performance across a diverse set of forms with clear metrics

## Tech Stack

- **Frontend**: Next.js (App Router) — handles all UI: context input, form URL entry, live action log, and the confirmation/review screen
- **API layer**: tRPC — type-safe communication between frontend and backend, all TypeScript
- **Browser agent**: Stagehand (`@browserbasehq/stagehand`) — TypeScript-native LLM browser automation built on Playwright; provides `extract()` to read form structure, `act()` to fill fields, and `observe()` for verification. Uses **Browserbase** (cloud) when `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are set; otherwise falls back to **local Chromium**
- **LLM**: OpenAI GPT-4o / GPT-5 via the OpenAI Node.js SDK — used at three distinct points: context parsing, field mapping during the agent loop, and self-verification
- **PDF parsing**: `pdf-parse` or `pdfjs-dist` — extracts raw text from uploaded résumé files before the LLM ingestion step
- **Session auth**: Playwright `storageState` — user exports cookies from their own browser; backend injects them into the Playwright context so the agent starts already authenticated
- **Styling**: Tailwind CSS

## System Components

### 1. Context Ingestion

The user provides personal context either as free-form text (a short bio, bullet points, etc.) or by uploading a résumé PDF. The backend extracts raw text from the PDF if needed, then makes an LLM call to parse it into a structured identity profile — name, email, phone, education history, work experience, skills, links, and a summary. The LLM also flags any commonly-needed fields that appear to be missing from the provided context.

### 2. Browser Agent (Stagehand)

Once the profile is ready and a form URL is provided, the agent launches a Playwright browser context with any provided session cookies injected. It then:

- Navigates to the form URL
- Uses `extract()` to read and understand all form fields — their labels, types (text, dropdown, checkbox, file, date, etc.), and whether they are required
- For each field, uses LLM reasoning to determine the best value from the user's profile — handling ambiguous labels, unusual phrasing, and fields that require inference rather than direct lookup
- Uses `act()` to fill each field
- Handles multi-page navigation, conditional fields that appear based on prior answers, and JS-rendered elements that don't exist in the static HTML
- Uses raw Playwright for file upload fields, pointing to pre-staged files on the server

### 3. Self-Verification

After filling, the agent runs a separate LLM pass using `extract()` to read back all the current field values. The LLM evaluates each filled field and assigns a confidence score: **high**, **medium**, or **low**, along with a brief reason for any low-confidence fields. This output is returned to the frontend.

### 4. Human-in-the-Loop Confirmation

Before submission, the frontend shows the user a summary of all filled fields. Low-confidence fields are visually flagged with the agent's stated reason for uncertainty. The user can correct any values inline, then approve. Only after approval does the agent submit the form.

### 5. Authentication for Login-Gated Forms

The agent never handles raw credentials. The intended flow is: the user logs into the target site in their own browser, exports their session cookies as a JSON file (via browser DevTools or a cookie-export browser extension), and uploads that file in the FormAgent UI. The backend injects the cookies via Playwright `storageState` before the agent starts, so the agent inherits a fully authenticated session.

## Evaluation Plan

FormAgent is evaluated against a custom suite of 20 forms using a fixed fictional test persona ("Alex Chen") with known ground-truth answers for every field.

**Form categories:**

- Simple (7 forms): static HTML, standard field labels, no JavaScript dependency
- Medium (7 forms): Google Forms / Typeform, dropdowns, optional fields
- Complex (6 forms): multi-page, conditional logic, JS-rendered fields

**Metrics:**

- *Field accuracy*: percentage of fields filled with the correct value vs. ground truth
- *Task completion rate*: full success / partial completion / failure per form
- *Confidence calibration*: whether low-confidence scores actually correlate with incorrectly filled fields

**Baseline:** A static HTML baseline passes the form's raw HTML and user profile to an LLM in a single prompt with no browser interaction. This isolates the contribution of the agent loop — the static baseline will succeed on simple forms but fail on anything dynamic, conditional, or multi-page.

**Ablations:**

- Agent with vs. without the self-verification step
- GPT-4o vs. GPT-4o-mini on field mapping accuracy

## Known Limitations

- CAPTCHAs are out of scope — the eval suite avoids forms with anti-bot measures
- Authentication is a precondition; the agent does not handle logging in
- File uploads require files to be pre-staged on the server; the agent selects the appropriate file based on context
- The solution is intentionally scoped to form-filling and does not attempt general web task completion

## Related Work

- **Mind2Web** (Deng et al., 2023) — LLM web agent benchmark across 137 real websites; focuses on general navigation, not profile-driven form completion
- **WebArena** (Zhou et al., 2023) — sandboxed web environments for autonomous agent evaluation
- **Stagehand** (Browserbase) — the TypeScript browser automation framework used in this project