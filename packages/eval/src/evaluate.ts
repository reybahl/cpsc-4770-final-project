import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FormEntry } from "./fixtures/forms-registry.js";
import type { FormEvalResult } from "./metrics.js";
import { runBaselineBrowserOnForm } from "./baseline-browser.js";
import { getBaselineLlmModel } from "./baseline.js";
import { FORMS_REGISTRY } from "./fixtures/forms-registry.js";
import { GROUND_TRUTH } from "./fixtures/ground-truth.js";
import {
  computeAggregateMetrics,
  computeConfidenceCalibration,
  evaluateForm,
} from "./metrics.js";
import { buildReport, printReport } from "./report.js";
import { runAgentOnForm } from "./run-agent.js";
import { startFormServer } from "./server.js";

const FORMS_DIR = join(fileURLToPath(import.meta.url), "../forms");

export interface EvalOptions {
  formIds?: string[];
  difficulty?: "simple" | "medium" | "complex";
  skipAgent?: boolean;
  skipBaseline?: boolean;
  outputFile?: string;
}

function selectForms(opts: EvalOptions): FormEntry[] {
  return FORMS_REGISTRY.filter((f) => {
    if (opts.formIds?.length && !opts.formIds.includes(f.id)) return false;
    if (opts.difficulty && f.difficulty !== opts.difficulty) return false;
    return true;
  });
}

export async function runEvaluation(opts: EvalOptions = {}): Promise<void> {
  const forms = selectForms(opts);
  if (forms.length === 0) {
    console.error("No forms matched the given filters.");
    process.exit(1);
  }

  console.log(`\nFormAgent Evaluation — ${forms.length} form(s)\n`);

  const server = await startFormServer();
  const allResults: FormEvalResult[] = [];

  try {
    for (const form of forms) {
      const gt = GROUND_TRUTH[form.id];
      if (!gt) {
        console.warn(`[WARN] No ground truth for form ${form.id}, skipping.`);
        continue;
      }

      console.log(`[${form.id}] ${form.name} (${form.difficulty})`);
      const formUrl = `${server.baseUrl}/${form.file}`;
      const formPath = join(FORMS_DIR, form.file);

      // ── Agent ──────────────────────────────────────────────────────────────
      if (!opts.skipAgent) {
        process.stdout.write("  agent    … ");
        const agentRun = await runAgentOnForm(formUrl);
        const agentResult = evaluateForm(
          agentRun.filledFields.map((f) => ({
            name: f.name,
            label: f.label,
            value: f.value,
            confidence: f.confidence,
          })),
          gt,
          form.id,
          form.name,
          form.difficulty,
          "agent",
          agentRun.completed,
          agentRun.durationMs,
          agentRun.error,
        );
        allResults.push(agentResult);
        const status = agentRun.completed
          ? `${(agentResult.fieldAccuracy * 100).toFixed(1)}% accuracy`
          : `ERROR: ${agentRun.error?.slice(0, 60)}`;
        console.log(status);
      }

      // ── Baseline: HTML → LLM values → Playwright fill → extract+verify (same as agent)
      if (!opts.skipBaseline) {
        process.stdout.write("  baseline … ");
        const baselineRun = await runBaselineBrowserOnForm(formUrl, formPath);
        const baselineResult = evaluateForm(
          baselineRun.filledFields.map((f) => ({
            name: f.name,
            label: f.label,
            value: f.value,
            confidence: f.confidence,
          })),
          gt,
          form.id,
          form.name,
          form.difficulty,
          "baseline",
          baselineRun.completed,
          baselineRun.durationMs,
          baselineRun.error,
        );
        allResults.push(baselineResult);
        const status = baselineRun.completed
          ? `${(baselineResult.fieldAccuracy * 100).toFixed(1)}% accuracy`
          : `ERROR: ${baselineRun.error?.slice(0, 60)}`;
        console.log(status);
      }
    }
  } finally {
    await server.close();
  }

  const agentResults = allResults.filter((r) => r.source === "agent");
  const baselineResults = allResults.filter((r) => r.source === "baseline");

  const report = buildReport(
    allResults,
    computeAggregateMetrics(agentResults),
    computeAggregateMetrics(baselineResults),
    computeConfidenceCalibration(allResults),
    { baselineLlmModel: opts.skipBaseline ? undefined : getBaselineLlmModel() },
  );

  printReport(report);

  const outFile = opts.outputFile ?? "eval-report.json";
  await writeFile(outFile, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Report saved to ${outFile}\n`);
}
