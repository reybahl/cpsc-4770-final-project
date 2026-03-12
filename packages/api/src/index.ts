import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";

/**
 * Inference helpers for input types
 * @example
 * type SaveContextInput = RouterInputs['context']['save']
 */
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type ContextOutput = RouterOutputs['context']['get']
 */
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { type AppRouter, appRouter } from "./root";
export { createTRPCContext } from "./trpc";
export { runFormAgent, type FormAgentEvent } from "./lib/run-form-agent";
export type { RouterInputs, RouterOutputs };
