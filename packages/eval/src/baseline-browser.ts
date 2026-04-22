import type { Page } from "playwright";
import { chromium } from "playwright";

import type { FilledField } from "@formagent/api/eval";
import { extractFormFields, verifyFilledFields } from "@formagent/api/eval";

import type { BaselineField } from "./baseline.js";
import { runBaselineOnForm } from "./baseline.js";
import { USER_CONTEXT } from "./fixtures/test-profile.js";

export interface BaselineBrowserRunResult {
  completed: boolean;
  filledFields: FilledField[];
  error?: string;
  durationMs: number;
}

/** Use inside a double-quoted CSS attribute selector (`[name="…"]`). */
function cssAttrValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function applyBaselineField(page: Page, f: BaselineField): Promise<void> {
  const name = f.name?.trim();
  if (!name) return;

  const value = f.value ?? "";
  const type = (f.type ?? "text").toLowerCase();

  if (type === "select") {
    const sel = page.locator(`select[name="${cssAttrValue(name)}"]`).first();
    if ((await sel.count()) === 0) return;
    try {
      await sel.selectOption(value, { timeout: 5_000 });
    } catch {
      await sel
        .selectOption({ label: value }, { timeout: 3_000 })
        .catch(() => {});
    }
    return;
  }

  if (type === "radio") {
    if (!value) return;
    const r = page
      .locator(
        `input[type="radio"][name="${cssAttrValue(name)}"][value="${cssAttrValue(value)}"]`,
      )
      .first();
    if ((await r.count()) === 0) return;
    await r.check({ timeout: 5_000 }).catch(() => {});
    return;
  }

  if (type === "checkbox") {
    const box = page
      .locator(`input[type="checkbox"][name="${cssAttrValue(name)}"]`)
      .first();
    if ((await box.count()) === 0) return;
    const shouldCheck =
      Boolean(value) &&
      value !== "false" &&
      value !== "0" &&
      value.toLowerCase() !== "off";
    if (shouldCheck) await box.check({ timeout: 5_000 }).catch(() => {});
    else await box.uncheck({ timeout: 5_000 }).catch(() => {});
    return;
  }

  const loc = page.locator(`[name="${cssAttrValue(name)}"]`).first();
  if ((await loc.count()) === 0) return;
  await loc.fill(value, { timeout: 5_000 }).catch(() => {});
}

/**
 * Baseline that matches production scoring: static HTML → LLM field values → real browser fill →
 * same DOM extract + verify pipeline as {@link runAgentOnForm}.
 */
export async function runBaselineBrowserOnForm(
  formUrl: string,
  formFilePath: string,
): Promise<BaselineBrowserRunResult> {
  const start = Date.now();

  const predicted = await runBaselineOnForm(formFilePath);
  if (!predicted.completed) {
    return {
      completed: false,
      filledFields: [],
      error: predicted.error,
      durationMs: Date.now() - start,
    };
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(formUrl, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(2_000);

    for (const field of predicted.fields) {
      await applyBaselineField(page, field);
    }

    await page.waitForTimeout(500);

    const raw = await extractFormFields(page);
    const filledFields = await verifyFilledFields(raw, USER_CONTEXT);

    return {
      completed: true,
      filledFields,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      completed: false,
      filledFields: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  } finally {
    await browser?.close();
  }
}
