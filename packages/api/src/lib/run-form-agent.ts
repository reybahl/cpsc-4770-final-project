import type { FilledField } from "./form-agent-types";
import { extractFormFields } from "./extract-form-fields";
import {
  computeConfidenceSummary,
  verifyFilledFields,
} from "./verify-filled-fields";

/** After initial fill, re-verify and run targeted `act()` fixes for low-confidence fields (multi-step agent loop). */
const MAX_CORRECTION_ROUNDS = 2;

/**
 * `stagehand.act` uses a separate structured LLM call per correction batch. With many "low"
 * fields (common on long forms / wizards), the verifier is noisy and a single `act` is brittle
 * (empty or invalid schema from the model). Only run correction for a small shortlist.
 */
const MAX_LOW_FIELDS_FOR_CORRECTION = 6;

function buildCorrectionInstruction(
  lowFields: FilledField[],
  userContext: string,
): string {
  const lines = lowFields
    .map(
      (f) =>
        `- "${f.label}" (name="${f.name}") — current: "${f.value}". Set to the value that matches the user profile.`,
    )
    .join("\n");
  return `The following fields likely don't match the user's profile. Update ONLY these fields. Do NOT click Submit or any submit button.

${lines}

User profile:
"""
${userContext}
"""
`;
}

const useBrowserbase =
  typeof process !== "undefined" &&
  !!process.env.BROWSERBASE_API_KEY?.trim() &&
  !!process.env.BROWSERBASE_PROJECT_ID?.trim();

export type FormAgentEvent =
  | { liveViewUrl: string }
  | { liveViewAvailable: false }
  | { phase: "extracting" }
  | { phase: "filling" }
  | { phase: "verifying"; round: number }
  | {
      phase: "correcting";
      round: number;
      fieldsTargeted: number;
    }
  | { phase: "submitting" }
  | {
      phase: "filled";
      filledFields: FilledField[];
      confidenceSummary: { high: number; medium: number; low: number };
      awaitingReview: true;
      formUrl: string;
    }
  | {
      success: boolean;
      submitted: boolean;
      finalUrl: string;
      browserbaseSessionId?: string;
    }
  | { error: string };

export type FormAgentMode = "fill-and-verify" | "submit";

export interface FormAgentOptions {
  mode?: FormAgentMode;
  prefilledData?: FilledField[];
  /**
   * When true, after the same fill + LLM verify/correct loop, submit immediately
   * instead of yielding fields for human review (no review sheet / second request).
   */
  skipHumanReview?: boolean;
  /**
   * Force local Chromium even when Browserbase credentials are present.
   * Use this when the form URL is on localhost (e.g., during eval).
   */
  forceLocalBrowser?: boolean;
}

const FILL_ONLY_INSTRUCTION = `Fill every visible form field with the appropriate value from the user's information.
IMPORTANT: Do NOT click Submit, Submit button, or any final submission button. Stop as soon as all fields are filled.
Leave the form ready for a human to review.`;

const SUBMIT_INSTRUCTION = (fields: FilledField[]) => {
  const mapping = fields
    .map((f) => `- ${f.label} (name="${f.name}"): "${f.value}"`)
    .join("\n");
  return `Fill the form with these EXACT values for each field. Do not change or interpret them.

Fields and values:
${mapping}

Fill each field with the exact value shown. When all are filled, click the Submit button (or equivalent) to submit the form.`;
};

/**
 * Runs the form-filling agent. Supports two modes:
 * - fill-and-verify: Fills form (no submit), extracts values, verifies with LLM, optional correction rounds.
 *   Then either yields filledFields for HITL review, or (if skipHumanReview) submits with those values.
 * - submit: Navigates to form, fills with prefilledData (from approval), submits
 */
export async function* runFormAgent(
  formUrl: string,
  userContext: string,
  options: FormAgentOptions = {},
): AsyncGenerator<FormAgentEvent, void, unknown> {
  const {
    mode = "fill-and-verify",
    prefilledData = [],
    skipHumanReview = false,
    forceLocalBrowser = false,
  } = options;

  const { Stagehand } = await import("@browserbasehq/stagehand");

  const stagehand =
    useBrowserbase && !forceLocalBrowser
      ? new Stagehand({
          env: "BROWSERBASE",
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        })
      : new Stagehand({
          env: "LOCAL",
          localBrowserLaunchOptions: {
            headless: true,
          },
        });

  try {
    try {
      await stagehand.init();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      if (msg.includes("429")) {
        throw new Error(
          "Browserbase rate limit (429). Unset BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID to use local Chromium instead.",
        );
      }
      throw err;
    }

    let browserbaseSessionId: string | undefined;
    if (!useBrowserbase) {
      yield { liveViewAvailable: false };
    } else {
      browserbaseSessionId =
        stagehand.browserbaseSessionID ??
        (stagehand as { sessionId?: string }).sessionId;

      const debugUrl = (stagehand as { browserbaseDebugURL?: string })
        .browserbaseDebugURL;
      if (typeof debugUrl === "string" && debugUrl.startsWith("https://")) {
        yield { liveViewUrl: debugUrl };
      } else if (browserbaseSessionId) {
        const { default: Browserbase } = await import("@browserbasehq/sdk");
        const bb = new Browserbase({
          apiKey: process.env.BROWSERBASE_API_KEY,
        });
        let url: string | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const debug = (await bb.sessions.debug(
              browserbaseSessionId,
            )) as unknown as Record<string, unknown>;
            const pages = debug.pages as
              | { debuggerFullscreenUrl?: string; debuggerUrl?: string }[]
              | undefined;
            url =
              (debug.debuggerFullscreenUrl as string | undefined) ??
              (debug.debuggerUrl as string | undefined) ??
              (debug.debugger_fullscreen_url as string | undefined) ??
              pages?.[0]?.debuggerFullscreenUrl ??
              pages?.[0]?.debuggerUrl;
            if (typeof url === "string" && url) break;
          } catch (e) {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            } else {
              console.warn("[runFormAgent] Could not fetch live view URL:", e);
            }
          }
        }
        if (typeof url === "string" && url) {
          yield { liveViewUrl: url };
        }
      } else {
        console.warn(
          "[runFormAgent] No sessionId from Stagehand (browserbaseSessionID/sessionId both undefined)",
        );
      }
    }

    const page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error("No browser page available");
    }

    await page.goto(formUrl, {
      waitUntil: "networkidle",
      timeoutMs: 20_000,
    });
    await page.waitForTimeout(2000);

    if (mode === "submit") {
      if (prefilledData.length === 0) {
        yield { error: "No prefilled data provided for submit mode" };
        return;
      }
      const agent = stagehand.agent({
        systemPrompt:
          "You are a form-filling assistant. Fill each field with the EXACT value provided. Do not modify or infer. Then click Submit.",
      });
      await agent.execute({
        instruction: SUBMIT_INSTRUCTION(prefilledData),
        maxSteps: 50,
      });
      yield {
        success: true,
        submitted: true,
        finalUrl: page.url(),
        ...(browserbaseSessionId && { browserbaseSessionId }),
      };
      return;
    }

    // fill-and-verify mode
    yield { phase: "filling" };

    const agent = stagehand.agent({
      systemPrompt:
        "You are a form-filling assistant. Fill each form field with the appropriate value from the user's information. Do NOT click Submit or any submit button—stop when all fields are filled.",
    });

    await agent.execute({
      instruction: `${FILL_ONLY_INSTRUCTION}\n\nUser information:\n\n${userContext}`,
      maxSteps: 40,
    });

    await page.waitForTimeout(1000);

    let filledFields: FilledField[] = [];

    for (
      let correctionIndex = 0;
      correctionIndex <= MAX_CORRECTION_ROUNDS;
      correctionIndex++
    ) {
      yield { phase: "verifying", round: correctionIndex };

      const rawFields = await extractFormFields(page, { visibility: "all" });
      filledFields = await verifyFilledFields(rawFields, userContext);

      const lowFields = filledFields.filter((f) => f.confidence === "low");
      if (lowFields.length === 0) break;
      if (correctionIndex === MAX_CORRECTION_ROUNDS) break;

      if (lowFields.length > MAX_LOW_FIELDS_FOR_CORRECTION) {
        console.warn(
          `[runFormAgent] Skipping correction: ${lowFields.length} low-confidence fields exceed max ${MAX_LOW_FIELDS_FOR_CORRECTION} (brittle batch act / verifier noise on large forms).`,
        );
        break;
      }

      yield {
        phase: "correcting",
        round: correctionIndex + 1,
        fieldsTargeted: lowFields.length,
      };

      try {
        await stagehand.act(buildCorrectionInstruction(lowFields, userContext));
      } catch (err) {
        console.warn(
          "[runFormAgent] Correction act failed (continuing with last extraction):",
          err instanceof Error ? err.message : err,
        );
      }
      await page.waitForTimeout(1000);
    }

    const confidenceSummary = computeConfidenceSummary(filledFields);

    if (skipHumanReview) {
      if (filledFields.length === 0) {
        yield { error: "No form fields found to submit" };
        return;
      }
      yield { phase: "submitting" };
      const submitAgent = stagehand.agent({
        systemPrompt:
          "You are a form-filling assistant. Fill each field with the EXACT value provided. Do not modify or infer. Then click Submit.",
      });
      await submitAgent.execute({
        instruction: SUBMIT_INSTRUCTION(filledFields),
        maxSteps: 50,
      });
      yield {
        success: true,
        submitted: true,
        finalUrl: page.url(),
        ...(browserbaseSessionId && { browserbaseSessionId }),
      };
      return;
    }

    yield {
      phase: "filled",
      filledFields,
      confidenceSummary,
      awaitingReview: true,
      formUrl,
    };
  } catch (err) {
    yield {
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    await stagehand.close();
  }
}
