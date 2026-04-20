import type { FilledField } from "@formagent/api/eval";
import { USER_CONTEXT } from "./fixtures/test-profile.js";

export interface AgentRunResult {
  completed: boolean;
  filledFields: FilledField[];
  error?: string;
  durationMs: number;
}

export async function runAgentOnForm(formUrl: string): Promise<AgentRunResult> {
  const { runFormAgent } = await import("@formagent/api/eval");

  const startTime = Date.now();
  let completed = false;
  let filledFields: FilledField[] = [];
  let error: string | undefined;

  try {
    for await (const event of runFormAgent(formUrl, USER_CONTEXT, {
      forceLocalBrowser: true,
    })) {
      if ("phase" in event && event.phase === "filled") {
        filledFields = event.filledFields;
        completed = true;
      }
      if ("error" in event) {
        error = event.error;
        break;
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return { completed, filledFields, error, durationMs: Date.now() - startTime };
}
