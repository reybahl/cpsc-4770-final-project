import { NextResponse } from "next/server";

import {
  composeUserContextForAgent,
  hasUsableUserContext,
  parseIdentityProfileFromDb,
  runFormAgent,
} from "@formagent/api";
import { eq } from "@formagent/db";
import { db } from "@formagent/db/client";
import { context, sessions, userSettings } from "@formagent/db/schema";

import { getSession } from "~/auth/server";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint for form filling with live Browserbase session view.
 * Streams: { liveViewUrl } (Browserbase only), then { success, submitted, finalUrl }.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { formUrl?: string };
  try {
    body = (await req.json()) as { formUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const formUrl = body.formUrl?.trim();
  if (!formUrl) {
    return NextResponse.json({ error: "Missing formUrl" }, { status: 400 });
  }

  try {
    new URL(formUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const [row, settingsRow] = await Promise.all([
    db.query.context.findFirst({
      where: eq(context.userId, session.user.id),
      columns: { context: true, identityProfile: true },
    }),
    db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
      columns: { verificationLoopEnabled: true },
    }),
  ]);
  const verificationLoopEnabled = settingsRow?.verificationLoopEnabled ?? true;
  const identityProfile = parseIdentityProfileFromDb(row?.identityProfile);
  const userContext = composeUserContextForAgent({
    contextText: row?.context ?? "",
    identityProfile,
  });
  if (
    !hasUsableUserContext({ contextText: row?.context ?? "", identityProfile })
  ) {
    return NextResponse.json(
      {
        error:
          "No profile saved. Add notes about yourself or generate a structured profile on your profile page.",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of runFormAgent(formUrl, userContext, {
          skipHumanReview: !verificationLoopEnabled,
        })) {
          send(event);
          if (
            "success" in event &&
            "browserbaseSessionId" in event &&
            event.browserbaseSessionId
          ) {
            await db.insert(sessions).values({
              userId: session.user.id,
              browserbaseSessionId: event.browserbaseSessionId,
              formUrl,
            });
          }
        }
      } catch (err) {
        send({
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
