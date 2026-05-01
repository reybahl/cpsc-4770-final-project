/**
 * Model id for `@ai-sdk/openai` (any OpenAI-compatible API).
 * Use with `OPENAI_BASE_URL` + `OPENAI_API_KEY` for Groq, OpenRouter, etc.
 */
export function getLlmModel(): string {
  const v = process.env.LLM_MODEL?.trim();
  if (v) return v;
  return "gpt-4o";
}

/**
 * Stagehand `provider/model` (e.g. `openai/gpt-4.1-mini`, `groq/llama-3.3-70b-versatile`).
 * When unset, Stagehand uses its own default.
 */
export function getStagehandModel(): string | undefined {
  const v = process.env.STAGEHAND_MODEL?.trim();
  if (v) return v;
  return undefined;
}
