import { NextResponse } from "next/server";

import type { FilledField } from "@formagent/api";
import { runFormAgent } from "@formagent/api";
import { eq } from "@formagent/db";
import { db } from "@formagent/db/client";
import { context, sessions } from "@formagent/db/schema";

import { getSession } from "~/auth/server";

export const dynamic = "force-dynamic";

function isFilledField(f: unknown): f is FilledField {
  return (
    !!f &&
    typeof f === "object" &&
    typeof (f as FilledField).id === "string" &&
    typeof (f as FilledField).label === "string" &&
    typeof (f as FilledField).name === "string" &&
    typeof (f as FilledField).value === "string"
  );
}

/** Validates FilledField shape. */
function parsePrefilledData(val: unknown): FilledField[] {
  if (!Array.isArray(val)) return [];
  return val.filter(isFilledField);
}

/**
 * SSE endpoint for submitting a pre-filled form (Phase 2 of HITL).
 * Expects formUrl and prefilledData from the review step.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { formUrl?: string; prefilledData?: unknown };
  try {
    body = (await req.json()) as {
      formUrl?: string;
      prefilledData?: unknown;
    };
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

  const prefilledData = parsePrefilledData(body.prefilledData);
  if (prefilledData.length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid prefilledData" },
      { status: 400 },
    );
  }

  const row = await db.query.context.findFirst({
    where: eq(context.userId, session.user.id),
    columns: { context: true },
  });
  const userContext = (row?.context ?? "").trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of runFormAgent(formUrl, userContext, {
          mode: "submit",
          prefilledData,
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
