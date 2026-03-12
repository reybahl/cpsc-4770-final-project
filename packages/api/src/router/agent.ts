import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@acme/db";
import { context } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

/**
 * Agent-based form filling using Stagehand. The LLM drives the entire
 * browser interaction: understanding the form, mapping fields to user
 * context, filling, and submitting—no manual selectors.
 */
export const agentRouter = {
  fillForm: protectedProcedure
    .input(z.object({ formUrl: z.string().trim().url() }))
    .mutation(async ({ ctx, input }) => {
      const { Stagehand } = await import("@browserbasehq/stagehand");
      const formUrl = input.formUrl;

      const row = await ctx.db.query.context.findFirst({
        where: eq(context.userId, ctx.session.user.id),
        columns: { context: true },
      });
      const userContext = row?.context.trim();
      if (!userContext) {
        throw new Error("No personal context saved. Add context first.");
      }

      const stagehand = new Stagehand({
        env: "LOCAL",
        localBrowserLaunchOptions: {
          headless: false,
        },
      });

      try {
        await stagehand.init();

        const page = stagehand.context.pages()[0];
        if (!page) {
          throw new Error("No browser page available");
        }

        await page.goto(formUrl, {
          waitUntil: "networkidle",
          timeoutMs: 20_000,
        });
        await page.waitForTimeout(2000);

        const agent = stagehand.agent({
          systemPrompt:
            "You are a form-filling assistant. Fill each form field with the appropriate value from the user's information. When all fields are filled, click the Submit button.",
        });

        const result = await agent.execute({
          instruction: `Fill out this form completely and submit it. Use the following information for each field:\n\n${userContext}\n\nWhen done, click Submit.`,
          maxSteps: 30,
        });

        const finalUrl = page.url();

        return {
          success: result.success,
          submitted: result.success,
          finalUrl,
        };
      } finally {
        await stagehand.close();
      }
    }),
} satisfies TRPCRouterRecord;
