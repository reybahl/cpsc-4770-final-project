import type { TRPCRouterRecord } from "@trpc/server";

import { eq } from "@acme/db";
import { context, CreateContextSchema } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const contextRouter = {
  get: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.context.findFirst({
      where: eq(context.userId, ctx.session.user.id),
    });
  }),

  save: protectedProcedure
    .input(CreateContextSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.query.context.findFirst({
        where: eq(context.userId, userId),
      });

      if (existing) {
        return ctx.db
          .update(context)
          .set({ context: input.context })
          .where(eq(context.userId, userId));
      }

      return ctx.db.insert(context).values({
        userId,
        context: input.context,
      });
    }),
} satisfies TRPCRouterRecord;
