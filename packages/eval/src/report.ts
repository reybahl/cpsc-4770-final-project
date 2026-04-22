import type {
  AggregateMetrics,
  ConfidenceCalibration,
  FormEvalResult,
} from "./metrics.js";

export interface EvalReport {
  timestamp: string;
  forms: FormEvalResult[];
  agent: AggregateMetrics;
  baseline: AggregateMetrics;
  confidenceCalibration: ConfidenceCalibration;
  /** OpenAI model id for the value-prediction step of the browser baseline (`EVAL_BASELINE_MODEL`). */
  baselineLlmModel?: string;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function bar(n: number, width = 20): string {
  const filled = Math.round(n * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function printReport(report: EvalReport): void {
  const line = "─".repeat(72);
  console.log(`\n${"═".repeat(72)}`);
  console.log("  FormAgent Evaluation Report");
  console.log(`  ${report.timestamp}`);
  console.log(`${"═".repeat(72)}\n`);

  // ── Per-form table ─────────────────────────────────────────────────────────
  console.log("PER-FORM FIELD ACCURACY");
  console.log(line);
  console.log(
    "ID  Name                           Diff     Agent      Baseline   Time(s)",
  );
  console.log(line);

  const formIds = [...new Set(report.forms.map((r) => r.formId))].sort();

  for (const id of formIds) {
    const agent = report.forms.find(
      (r) => r.formId === id && r.source === "agent",
    );
    const baseline = report.forms.find(
      (r) => r.formId === id && r.source === "baseline",
    );
    const diff = agent?.difficulty ?? baseline?.difficulty ?? "?";
    const name = (agent?.formName ?? baseline?.formName ?? "")
      .slice(0, 29)
      .padEnd(29);
    const agentStr = agent
      ? agent.completed
        ? pct(agent.fieldAccuracy).padStart(7)
        : "  ERROR".padStart(7)
      : "  ─────".padStart(7);
    const baselineStr = baseline
      ? baseline.completed
        ? pct(baseline.fieldAccuracy).padStart(7)
        : "  ERROR".padStart(7)
      : "  ─────".padStart(7);
    const timeStr = agent
      ? `${(agent.durationMs / 1000).toFixed(1)}s`.padStart(6)
      : "  ─".padStart(6);

    console.log(
      `${id}  ${name}  ${diff.padEnd(7)}  ${agentStr}    ${baselineStr}   ${timeStr}`,
    );
  }
  console.log(line);

  // ── Aggregate ─────────────────────────────────────────────────────────────
  console.log("\nAGGREGATE METRICS");
  console.log(line);

  const printAggregate = (label: string, m: AggregateMetrics) => {
    console.log(`\n  ${label}`);
    console.log(
      `    Task completion rate : ${pct(m.taskCompletionRate)}  ${bar(m.taskCompletionRate)}`,
    );
    console.log(
      `    Overall field accuracy: ${pct(m.overallFieldAccuracy)}  ${bar(m.overallFieldAccuracy)}`,
    );
    for (const [d, acc] of Object.entries(m.byDifficulty)) {
      console.log(`      ${d.padEnd(8)}: ${pct(acc)}  ${bar(acc, 16)}`);
    }
  };

  printAggregate("FormAgent (browser + Stagehand agent)", report.agent);
  const baselineLabel = report.baselineLlmModel
    ? `Baseline (HTML→LLM→Playwright fill→extract; LLM ${report.baselineLlmModel})`
    : "Baseline (skipped)";
  printAggregate(baselineLabel, report.baseline);

  // ── Confidence calibration ────────────────────────────────────────────────
  console.log("\n\nCONFIDENCE CALIBRATION  (FormAgent only)");
  console.log(line);
  console.log("  Confidence  Fields  Correct  Accuracy");
  for (const level of ["high", "medium", "low"] as const) {
    const b = report.confidenceCalibration[level];
    console.log(
      `  ${level.padEnd(10)}  ${String(b.total).padStart(6)}  ${String(b.correct).padStart(7)}  ${pct(b.accuracy).padStart(7)}  ${bar(b.accuracy, 16)}`,
    );
  }

  console.log(`\n${"═".repeat(72)}\n`);
}

export function buildReport(
  forms: FormEvalResult[],
  agent: AggregateMetrics,
  baseline: AggregateMetrics,
  confidenceCalibration: ConfidenceCalibration,
  extras?: { baselineLlmModel?: string },
): EvalReport {
  return {
    timestamp: new Date().toISOString(),
    forms,
    agent,
    baseline,
    confidenceCalibration,
    baselineLlmModel: extras?.baselineLlmModel,
  };
}
