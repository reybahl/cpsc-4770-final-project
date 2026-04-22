import { readFile } from "node:fs/promises";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod/v4";

import { extractFormFields } from "@formagent/api/eval";

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
 * Injects GPT-planned values into the live DOM so the baseline is scored on
 * actual field state rather than raw LLM output — the same standard the agent is held to.
 */
const INJECT_SCRIPT = (
  fields: { name: string; value: string; type: string }[],
) => `(function () {
  var fields = ${JSON.stringify(fields)};
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (!f.value) continue;
    var els = document.querySelectorAll('[name="' + f.name.replace(/"/g, '\\"') + '"]');
    if (els.length === 0) continue;
    var el = els[0];
    var tag = el.tagName;
    var type = el.type || "";
    if (tag === "INPUT") {
      if (type === "checkbox") {
        el.checked = f.value !== "" && f.value !== "false";
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (type === "radio") {
        for (var j = 0; j < els.length; j++) {
          if (els[j].value === f.value) {
            els[j].checked = true;
            els[j].dispatchEvent(new Event("change", { bubbles: true }));
            break;
          }
        }
      } else {
        el.value = f.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (tag === "SELECT") {
      el.value = f.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (tag === "TEXTAREA") {
      el.value = f.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
})()`;

export async function runBaselineOnForm(
  formFilePath: string,
  formUrl: string,
): Promise<BaselineRunResult> {
  const startTime = Date.now();

  try {
    // 1. Read static HTML and ask GPT-4o to plan values
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

    // 2. Open a real browser, navigate to the live form, inject values, read back
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.goto(formUrl, { waitUntil: "networkidle", timeout: 20_000 });

      await page.evaluate(
        INJECT_SCRIPT(
          object.fields.map((f) => ({
            name: f.name,
            value: f.value,
            type: f.type,
          })),
        ),
      );

      await page.waitForTimeout(500);

      const filled = await extractFormFields(
        page as unknown as Parameters<typeof extractFormFields>[0],
      );

      return {
        completed: true,
        fields: filled.map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          value: f.value,
        })),
        durationMs: Date.now() - startTime,
      };
    } finally {
      await browser.close();
    }
  } catch (err) {
    return {
      completed: false,
      fields: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    };
  }
}
