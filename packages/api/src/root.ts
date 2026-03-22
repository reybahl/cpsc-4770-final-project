import { agentRouter } from "./router/agent";
import { authRouter } from "./router/auth";
import { contextRouter } from "./router/context";
import { settingsRouter } from "./router/settings";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  agent: agentRouter,
  auth: authRouter,
  context: contextRouter,
  settings: settingsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
