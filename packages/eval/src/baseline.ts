import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { readFile } from "node:fs/promises";
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
      name:  z.string(),
      label: z.string(),
      type:  z.string(),
      value: z.string(),
    }),
  ),
});

export async function runBaselineOnForm(
  formFilePath: string,
): Promise<BaselineRunResult> {
  const startTime = Date.now();

  try {
    const html = await readFile(formFilePath, "utf-8");

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: BaselineResultSchema,
      prompt: `You are filling out a web form. You are given the raw HTML of the form and the user's profile.

Your task: identify every form field (input, select, textarea — excluding hidden, submit, reset, and button types) and determine the best value to fill based on the user's profile.

Rules:
- For fields where information is unknown (e.g. password, SSN), use an empty string "".
- For open-ended text fields (bio, essay, cover letter), write a short but realistic response based on the user's profile.
- For select fields, use the option value (not label) that best matches the user.
- For radio fields, use the value of the radio option that best matches the user.
- Return EVERY field present in the form — do not omit any.

User Profile:
"""
${USER_CONTEXT}
"""

HTML Form:
\`\`\`html
${html}
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
