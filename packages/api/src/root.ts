import { authRouter } from "./router/auth";
import { contextRouter } from "./router/context";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  context: contextRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
