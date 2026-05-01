#!/usr/bin/env node
/**
 * CLI entry point for the FormAgent evaluation suite.
 *
 * Usage:
 *   pnpm -F @formagent/eval eval [options]
 *
 * Options:
 *   --forms <ids>         Comma-separated form IDs to run, e.g. 01,02,07
 *   --difficulty <d>      Filter by difficulty: simple | medium | complex
 *   --skip-agent          Skip the FormAgent (browser) evaluation
 *   --skip-baseline       Skip the Playwright baseline (live page→LLM→fill→extract)
 *   --output <file>       Path for the JSON report (default: eval-report.json)
 *   --help                Print this help
 *
 * Required env vars:
 *   OPENAI_API_KEY        Used by the agent LLM and the baseline
 *
 * Optional env vars (Browserbase cloud browser — NOT recommended for eval):
 *   BROWSERBASE_API_KEY / BROWSERBASE_PROJECT_ID
 *   The eval always forces local Chromium so forms on localhost are reachable.
 *
 * Optional env vars (baseline value predictor):
 *   EVAL_BASELINE_MODEL   Explicit override for baseline model
 *   LLM_MODEL             Used for baseline when EVAL_BASELINE_MODEL is unset
 *                         Default baseline model if both unset: gpt-4.1-mini
 *
 * First-time: install Chromium for the baseline browser — `pnpm -F @formagent/eval run eval:install-browser`
 */
import { runEvaluation } from "./evaluate.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: eval [options]

Options:
  --forms <ids>       Comma-separated form IDs (e.g. 01,02,07)
  --difficulty <d>    simple | medium | complex
  --skip-agent        Skip the FormAgent evaluation
  --skip-baseline     Skip the live-page→LLM→Playwright baseline
  --output <file>     JSON report path (default: eval-report.json)
  --help              Show this help

Required env vars: OPENAI_API_KEY
  Also run once: pnpm -F @formagent/eval run eval:install-browser
`);
  process.exit(0);
}

function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const rawForms = getArg("--forms");
const rawDiff = getArg("--difficulty") as
  | "simple"
  | "medium"
  | "complex"
  | undefined;
const outputFile = getArg("--output");
const skipAgent = args.includes("--skip-agent");
const skipBaseline = args.includes("--skip-baseline");

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

await runEvaluation({
  formIds: rawForms ? rawForms.split(",").map((s) => s.trim()) : undefined,
  difficulty: rawDiff,
  skipAgent,
  skipBaseline,
  outputFile,
});
