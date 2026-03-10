import type { TRPCRouterRecord } from "@trpc/server";

import { eq } from "@acme/db";
import { context, CreateContextSchema } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

/** Only return id + context; no timestamps so nothing triggers date serialization. */
export const contextRouter = {
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.context.findFirst({
      where: eq(context.userId, ctx.session.user.id),
      columns: { id: true, context: true },
    });
    return row ?? null;
  }),

  save: protectedProcedure
    .input(CreateContextSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(context)
        .values({
          userId: ctx.session.user.id,
          context: input.context,
        })
        .onConflictDoUpdate({
          target: context.userId,
          set: { context: input.context },
        });
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
