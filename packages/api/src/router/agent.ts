import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@formagent/db";
import { context, sessions, userSettings } from "@formagent/db/schema";

import {
  composeUserContextForAgent,
  hasUsableUserContext,
} from "../lib/compose-user-context";
import { parseIdentityProfileFromDb } from "../lib/identity-profile-schema";
import { runFormAgent } from "../lib/run-form-agent";
import { protectedProcedure } from "../trpc";

/**
 * Agent-based form filling using Stagehand. The LLM drives the entire
 * browser interaction: understanding the form, mapping fields to user
 * context, filling, and submitting—no manual selectors.
 *
 * Uses Browserbase (cloud) when BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID
 * are set; otherwise falls back to local Chromium.
 *
 * For live view in the app, use the SSE endpoint /api/agent/fill-form-stream.
 */
export const agentRouter = {
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.sessions.findMany({
      where: eq(sessions.userId, ctx.session.user.id),
      columns: {
        id: true,
        formUrl: true,
        browserbaseSessionId: true,
        createdAt: true,
      },
      orderBy: [desc(sessions.createdAt)],
    });
  }),

  fillForm: protectedProcedure
    .input(z.object({ formUrl: z.string().trim().url() }))
    .mutation(async ({ ctx, input }) => {
      const [row, settingsRow] = await Promise.all([
        ctx.db.query.context.findFirst({
          where: eq(context.userId, ctx.session.user.id),
          columns: { context: true, identityProfile: true },
        }),
        ctx.db.query.userSettings.findFirst({
          where: eq(userSettings.userId, ctx.session.user.id),
          columns: { verificationLoopEnabled: true },
        }),
      ]);
      const verificationLoopEnabled =
        settingsRow?.verificationLoopEnabled ?? true;
      const identityProfile = parseIdentityProfileFromDb(row?.identityProfile);
      const userContext = composeUserContextForAgent({
        contextText: row?.context ?? "",
        identityProfile,
      });
      if (
        !hasUsableUserContext({
          contextText: row?.context ?? "",
          identityProfile,
        })
      ) {
        throw new Error(
          "No profile saved. Add notes about yourself or generate a structured profile on your profile page.",
        );
      }

      let lastResult: {
        success: boolean;
        submitted: boolean;
        finalUrl: string;
      } = { success: false, submitted: false, finalUrl: "" };
      for await (const event of runFormAgent(input.formUrl, userContext, {
        skipHumanReview: !verificationLoopEnabled,
      })) {
        if ("success" in event) {
          lastResult = event;
        }
      }
      return lastResult;
    }),
} satisfies TRPCRouterRecord;
