import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod/v4";

import type { FilledField, RawFormField } from "./form-agent-types";
import { getLlmModel } from "./llm-env";

const VerificationResultSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(), // empty string for high confidence; required for JSON Schema compatibility
    }),
  ),
});

/**
 * Runs LLM verification on filled form fields. Assigns confidence (high/medium/low)
 * and a reason for low/medium confidence based on user profile alignment.
 */
export async function verifyFilledFields(
  rawFields: RawFormField[],
  userContext: string,
): Promise<FilledField[]> {
  if (rawFields.length === 0) {
    return [];
  }

  const prompt = `You are verifying form field values filled by an AI agent against a user's profile.

User profile/context:
"""
${userContext}
"""

Filled form fields (label, current value):
${rawFields.map((f) => `- id=${f.id} label="${f.label}" value="${f.value}"`).join("\n")}

For each field, assess:
1. confidence: "high" if the value correctly matches the user's profile, "medium" if plausible but uncertain, "low" if likely wrong or missing
2. reason: brief explanation for medium/low confidence (e.g. "Could not find matching email in profile"); use empty string "" for high confidence

You MUST return exactly one assessment object per field line above, with the same id= value. Do not omit any id.`;

  try {
    const { object } = await generateObject({
      model: openai(getLlmModel()),
      schema: VerificationResultSchema,
      prompt,
    });

    const byId = new Map(object.fields.map((f) => [f.id, f]));

    return rawFields.map((raw): FilledField => {
      const v = byId.get(raw.id);
      const reason = v ? v.reason.trim() || undefined : undefined;
      return {
        ...raw,
        confidence: v?.confidence ?? "medium",
        reason,
      };
    });
  } catch (err) {
    console.warn(
      "[verifyFilledFields] LLM verification failed; using medium confidence for all fields:",
      err instanceof Error ? err.message : err,
    );
    return rawFields.map(
      (raw): FilledField => ({
        ...raw,
        confidence: "medium",
        reason: undefined,
      }),
    );
  }
}

export function computeConfidenceSummary(fields: FilledField[]): {
  high: number;
  medium: number;
  low: number;
} {
  const summary = { high: 0, medium: 0, low: 0 };
  for (const f of fields) {
    summary[f.confidence]++;
  }
  return summary;
}
