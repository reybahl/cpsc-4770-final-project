import { NextResponse } from "next/server";

import { runFormAgent } from "@acme/api";
import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { context, sessions } from "@acme/db/schema";

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

  const row = await db.query.context.findFirst({
    where: eq(context.userId, session.user.id),
    columns: { context: true },
  });
  const userContext = row?.context.trim();
  if (!userContext) {
    return NextResponse.json(
      { error: "No personal context saved. Add context first." },
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
        for await (const event of runFormAgent(formUrl, userContext)) {
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
