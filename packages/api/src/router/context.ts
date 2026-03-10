import type { TRPCRouterRecord } from "@trpc/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod/v4";

import { eq } from "@acme/db";
import { context, CreateContextSchema } from "@acme/db/schema";

import { supabaseAdmin } from "../lib/supabase";
import { protectedProcedure } from "../trpc";

const BUCKET = "resumes";

const EXTRACT_PROMPT = `Extract the personal context from this résumé PDF. 
Summarize: name, contact info (email, phone), education, work experience, skills, and any other relevant details for filling out forms. 
Output as plain text suitable for auto-filling web forms.`;

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

  extractResume: protectedProcedure
    .input(z.object({ pdfUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const pathMatch = input.pdfUrl.match(/\/resumes\/(.+)$/);
      const path = pathMatch?.[1];
      if (!path) {
        throw new Error("Invalid PDF URL: could not extract storage path");
      }

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(path);
      if (error) {
        throw new Error(`Failed to download PDF: ${error.message}`);
      }
      const buffer = Buffer.from(await data.arrayBuffer());

      const { text } = await generateText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACT_PROMPT },
              {
                type: "file",
                data: buffer,
                mediaType: "application/pdf",
              },
            ],
          },
        ],
      });
      console.log("[context.extractResume] Extracted:\n", text);
      return { text };
    }),
} satisfies TRPCRouterRecord;
