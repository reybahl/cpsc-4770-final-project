import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@acme/db";
import { userSettings } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const settingsRouter = {
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    let row = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
      columns: { verificationLoopEnabled: true },
    });
    if (!row) {
      await ctx.db
        .insert(userSettings)
        .values({ userId, verificationLoopEnabled: true })
        .onConflictDoNothing({ target: userSettings.userId });
      row = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
        columns: { verificationLoopEnabled: true },
      });
    }
    return {
      verificationLoopEnabled: row?.verificationLoopEnabled ?? true,
    };
  }),

  setVerificationLoop: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userSettings)
        .values({
          userId: ctx.session.user.id,
          verificationLoopEnabled: input.enabled,
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { verificationLoopEnabled: input.enabled },
        });
      return { verificationLoopEnabled: input.enabled };
    }),
} satisfies TRPCRouterRecord;
