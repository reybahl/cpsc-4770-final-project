import type { FieldMatcher, FormGroundTruth, MatchType } from "./fixtures/ground-truth.js";
import type { Difficulty } from "./fixtures/forms-registry.js";

export type { MatchType };

export interface EvalField {
  fieldName: string;
  label: string | undefined;
  matcher: FieldMatcher;
  filledValue: string | undefined;
  /** true=correct, false=incorrect, null=skipped */
  correct: boolean | null;
  confidence?: "high" | "medium" | "low";
}

export interface FormEvalResult {
  formId: string;
  formName: string;
  difficulty: Difficulty;
  source: "agent" | "baseline";
  completed: boolean;
  error?: string;
  fields: EvalField[];
  fieldAccuracy: number;
  durationMs: number;
}

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "");
}

function applyMatcher(value: string, matcher: FieldMatcher): boolean | null {
  if (matcher.type === "skip") return null;
  const v = value.trim().toLowerCase();

  switch (matcher.type) {
    case "exact":
      return v === (matcher.value ?? "").toLowerCase();

    case "contains":
      return (matcher.values ?? []).every((sub) =>
        v.includes(sub.toLowerCase()),
      );

    case "any-of":
      return (matcher.values ?? []).some(
        (opt) =>
          v === opt.toLowerCase() || v.includes(opt.toLowerCase()),
      );

    case "phone":
      return (
        normalizePhone(value) ===
        normalizePhone(matcher.value ?? "")
      );

    case "nonempty":
      return v.length > 0;
  }
}

export function evaluateForm(
  filledFields: { name: string; label?: string; value: string; confidence?: "high" | "medium" | "low" }[],
  groundTruth: FormGroundTruth,
  formId: string,
  formName: string,
  difficulty: Difficulty,
  source: "agent" | "baseline",
  completed: boolean,
  durationMs: number,
  error?: string,
): FormEvalResult {
  const byName = new Map(filledFields.map((f) => [f.name.toLowerCase(), f]));

  const fields: EvalField[] = Object.entries(groundTruth).map(
    ([fieldName, matcher]) => {
      const filled = byName.get(fieldName.toLowerCase());
      const filledValue = filled?.value;
      const correct = applyMatcher(filledValue ?? "", matcher);
      return {
        fieldName,
        label: filled?.label,
        matcher,
        filledValue,
        correct,
        confidence: filled?.confidence,
      };
    },
  );

  const countable = fields.filter((f) => f.correct !== null);
  const correctCount = countable.filter((f) => f.correct === true).length;
  const fieldAccuracy =
    countable.length > 0 ? correctCount / countable.length : 0;

  return {
    formId,
    formName,
    difficulty,
    source,
    completed,
    error,
    fields,
    fieldAccuracy,
    durationMs,
  };
}

// ── Aggregate metrics ────────────────────────────────────────────────────────

export interface AggregateMetrics {
  taskCompletionRate: number;
  overallFieldAccuracy: number;
  byDifficulty: Record<Difficulty, number>;
}

export function computeAggregateMetrics(
  results: FormEvalResult[],
): AggregateMetrics {
  const completed = results.filter((r) => r.completed);
  const taskCompletionRate = results.length > 0
    ? completed.length / results.length
    : 0;

  const allCountable = results.flatMap((r) =>
    r.fields.filter((f) => f.correct !== null),
  );
  const totalCorrect = allCountable.filter((f) => f.correct === true).length;
  const overallFieldAccuracy =
    allCountable.length > 0 ? totalCorrect / allCountable.length : 0;

  const difficulties: Difficulty[] = ["simple", "medium", "complex"];
  const byDifficulty = Object.fromEntries(
    difficulties.map((d) => {
      const group = results
        .filter((r) => r.difficulty === d)
        .flatMap((r) => r.fields.filter((f) => f.correct !== null));
      const groupCorrect = group.filter((f) => f.correct === true).length;
      return [d, group.length > 0 ? groupCorrect / group.length : 0];
    }),
  ) as Record<Difficulty, number>;

  return { taskCompletionRate, overallFieldAccuracy, byDifficulty };
}

// ── Confidence calibration ───────────────────────────────────────────────────

export interface CalibrationBucket {
  total: number;
  correct: number;
  accuracy: number;
}

export type ConfidenceCalibration = Record<
  "high" | "medium" | "low",
  CalibrationBucket
>;

export function computeConfidenceCalibration(
  results: FormEvalResult[],
): ConfidenceCalibration {
  const buckets: Record<"high" | "medium" | "low", { total: number; correct: number }> = {
    high:   { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    low:    { total: 0, correct: 0 },
  };

  for (const result of results) {
    if (result.source !== "agent") continue;
    for (const field of result.fields) {
      if (field.correct === null || !field.confidence) continue;
      const b = buckets[field.confidence];
      b.total++;
      if (field.correct) b.correct++;
    }
  }

  return Object.fromEntries(
    (Object.entries(buckets) as [keyof typeof buckets, { total: number; correct: number }][]).map(
      ([level, b]) => [
        level,
        { ...b, accuracy: b.total > 0 ? b.correct / b.total : 0 },
      ],
    ),
  ) as ConfidenceCalibration;
}
