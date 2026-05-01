import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod/v4";

import { USER_CONTEXT } from "./fixtures/test-profile.js";

export interface BaselineField {
  name: string;
  label: string;
  type: string;
  value: string;
}

export interface BaselineRunResult {
  completed: boolean;
  fields: BaselineField[];
  error?: string;
  durationMs: number;
}

const BaselineResultSchema = z.object({
  fields: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.string(),
      value: z.string(),
    }),
  ),
});

/**
 * Model for the page-HTML→structured-fields baseline.
 * `EVAL_BASELINE_MODEL` overrides; then `LLM_MODEL`; else `gpt-4.1-mini`.
 */
export function getBaselineLlmModel(): string {
  const explicit = process.env.EVAL_BASELINE_MODEL?.trim();
  if (explicit) return explicit;
  const shared = process.env.LLM_MODEL?.trim();
  if (shared) return shared;
  return "gpt-4.1-mini";
}

/**
 * Predict field values from the **same** HTML the browser has after loading the form URL
 * (`document.documentElement.outerHTML` / Playwright `page.content()`), plus the shared user profile.
 * This aligns baseline **perception** with the URL-only agent (no on-disk HTML fixture oracle).
 */
export async function runBaselineOnPageHtml(
  pageHtml: string,
): Promise<BaselineRunResult> {
  const startTime = Date.now();

  try {
    const { object } = await generateObject({
      model: openai(getBaselineLlmModel()),
      schema: BaselineResultSchema,
      prompt: `You are filling out a web form. You are given the HTML of the page **as loaded in a real browser** (including any client-rendered or lazy-loaded content present in this snapshot) and the user's profile.

Your task: identify every form field (input, select, textarea — excluding hidden, submit, reset, and button types) that **currently exists in this HTML** and determine the best value to fill based on the user's profile.

Rules:
- For fields where information is unknown (e.g. password, SSN), use an empty string "".
- For open-ended text fields (bio, essay, cover letter), write a short but realistic response based on the user's profile.
- For select fields, use the option value (not label) that best matches the user.
- For radio fields, use the value of the radio option that best matches the user.
- Return EVERY field that appears in this HTML snapshot — do not omit any. If a multi-step form only shows step 1 in the HTML, only return fields for step 1.

User Profile:
"""
${USER_CONTEXT}
"""

Page HTML (browser snapshot):
\`\`\`html
${pageHtml}
\`\`\`

Return every form field with: name (the HTML name attribute), label (the human-readable label text), type (input type or "select"/"textarea"), value (what you would fill in).`,
    });

    return {
      completed: true,
      fields: object.fields,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      completed: false,
      fields: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    };
  }
}
