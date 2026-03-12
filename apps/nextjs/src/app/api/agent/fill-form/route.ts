import { NextResponse } from "next/server";
import { Stagehand } from "@browserbasehq/stagehand";

import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { context } from "@acme/db/schema";

import { getSession } from "~/auth/server";
import { env } from "~/env";

/**
 * Agent-based form filling using Stagehand. The LLM drives the entire
 * browser interaction: understanding the form, mapping fields to user
 * context, filling, and submitting—no manual selectors.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { formUrl?: string };
  const formUrl = body.formUrl?.trim();
  if (!formUrl) {
    return NextResponse.json({ error: "Missing formUrl" }, { status: 400 });
  }

  try {
    new URL(formUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const row = await db.query.context.findFirst({
    where: eq(context.userId, session.user.id),
    columns: { context: true },
  });
  const userContext = row?.context?.trim();
  if (!userContext) {
    return NextResponse.json(
      { error: "No personal context saved. Add context first." },
      { status: 400 },
    );
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

    await page.goto(formUrl, { waitUntil: "networkidle", timeoutMs: 20_000 });
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

    return NextResponse.json({
      success: result?.success ?? true,
      submitted: result?.success ?? true,
      finalUrl,
    });
  } finally {
    await stagehand.close();
  }
}
