import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@formagent/db";
import { context, CreateContextSchema } from "@formagent/db/schema";

import { parseIdentityProfileFromDb } from "../lib/identity-profile-schema";
import { rebuildIdentityProfileFromSources } from "../lib/rebuild-identity-profile";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase";
import { protectedProcedure } from "../trpc";

const BUCKET = "resumes";

/** Only return id + context; no timestamps so nothing triggers date serialization. */
export const contextRouter = {
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.context.findFirst({
      where: eq(context.userId, ctx.session.user.id),
      columns: {
        id: true,
        context: true,
        resumeUrl: true,
        identityProfile: true,
      },
    });
    if (!row) return null;
    return {
      ...row,
      identityProfile: parseIdentityProfileFromDb(row.identityProfile),
    };
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

  rebuildIdentityProfile: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await ctx.db.query.context.findFirst({
      where: eq(context.userId, ctx.session.user.id),
      columns: { context: true, resumeUrl: true },
    });
    const aboutText = row?.context.trim() ?? "";
    let resumePdfBuffer: Buffer | null = null;

    if (row?.resumeUrl) {
      const pathMatch = /\/resumes\/(.+)$/.exec(row.resumeUrl);
      const path = pathMatch?.[1];
      if (path) {
        if (!isSupabaseConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "A résumé is saved but Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or clear the résumé.",
          });
        }
        const { data, error } = await getSupabaseAdmin()
          .storage.from(BUCKET)
          .download(path);
        if (!error) {
          resumePdfBuffer = Buffer.from(await data.arrayBuffer());
        }
      }
    }

    const profile = await rebuildIdentityProfileFromSources({
      aboutText,
      resumePdfBuffer,
    });

    await ctx.db
      .insert(context)
      .values({
        userId: ctx.session.user.id,
        context: row?.context ?? "",
        identityProfile: profile,
      })
      .onConflictDoUpdate({
        target: context.userId,
        set: { identityProfile: profile },
      });

    return { profile };
  }),

  saveResume: protectedProcedure
    .input(z.object({ pdfUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(context)
        .values({
          userId: ctx.session.user.id,
          context: "",
          resumeUrl: input.pdfUrl,
        })
        .onConflictDoUpdate({
          target: context.userId,
          set: { resumeUrl: input.pdfUrl },
        });
      return { success: true };
    }),

  getResumeViewUrl: protectedProcedure
    .input(z.object({ pdfUrl: z.string().url() }))
    .query(async ({ input }) => {
      const pathMatch = /\/resumes\/(.+)$/.exec(input.pdfUrl);
      const path = pathMatch?.[1];
      if (!path) {
        throw new Error("Invalid PDF URL: could not extract storage path");
      }
      if (!isSupabaseConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Viewing a stored résumé requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        });
      }
      const { data, error } = await getSupabaseAdmin()
        .storage.from(BUCKET)
        .createSignedUrl(path, 3600); // 1 hour
      if (error) {
        throw new Error(`Failed to create view URL: ${error.message}`);
      }
      return { url: data.signedUrl };
    }),

  clearResume: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(context)
      .set({ resumeUrl: null })
      .where(eq(context.userId, ctx.session.user.id));
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
