const useBrowserbase =
  typeof process !== "undefined" &&
  !!process.env.BROWSERBASE_API_KEY?.trim() &&
  !!process.env.BROWSERBASE_PROJECT_ID?.trim();

export type FormAgentEvent =
  | { liveViewUrl: string }
  | { liveViewAvailable: false }
  | { success: boolean; submitted: boolean; finalUrl: string };

/**
 * Runs the form-filling agent. Yields liveViewUrl (Browserbase only) before
 * the agent runs, then yields the result when done.
 */
export async function* runFormAgent(
  formUrl: string,
  userContext: string,
): AsyncGenerator<FormAgentEvent, void, unknown> {
  const { Stagehand } = await import("@browserbasehq/stagehand");

  const stagehand = useBrowserbase
    ? new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
      })
    : new Stagehand({
        env: "LOCAL",
        localBrowserLaunchOptions: {
          headless: false,
        },
      });

  try {
    try {
      await stagehand.init();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      if (msg.includes("429")) {
        throw new Error(
          "Browserbase rate limit (429). Unset BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID to use local Chromium instead.",
        );
      }
      throw err;
    }

    if (!useBrowserbase) {
      yield { liveViewAvailable: false };
    } else {
      const sessionId =
        stagehand.browserbaseSessionID ??
        (stagehand as { sessionId?: string }).sessionId;

      // Try browserbaseDebugURL first (Stagehand may expose embeddable URL directly)
      const debugUrl = (stagehand as { browserbaseDebugURL?: string })
        .browserbaseDebugURL;
      if (typeof debugUrl === "string" && debugUrl.startsWith("https://")) {
        yield { liveViewUrl: debugUrl };
      } else if (sessionId) {
        const { default: Browserbase } = await import("@browserbasehq/sdk");
        const bb = new Browserbase({
          apiKey: process.env.BROWSERBASE_API_KEY,
        });
        let url: string | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const debug = (await bb.sessions.debug(
              sessionId,
            )) as unknown as Record<string, unknown>;
            const pages = debug.pages as
              | { debuggerFullscreenUrl?: string; debuggerUrl?: string }[]
              | undefined;
            url =
              (debug.debuggerFullscreenUrl as string | undefined) ??
              (debug.debuggerUrl as string | undefined) ??
              (debug.debugger_fullscreen_url as string | undefined) ??
              pages?.[0]?.debuggerFullscreenUrl ??
              pages?.[0]?.debuggerUrl;
            if (typeof url === "string" && url) break;
          } catch (e) {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            } else {
              console.warn("[runFormAgent] Could not fetch live view URL:", e);
            }
          }
        }
        if (typeof url === "string" && url) {
          yield { liveViewUrl: url };
        }
      } else {
        console.warn(
          "[runFormAgent] No sessionId from Stagehand (browserbaseSessionID/sessionId both undefined)",
        );
      }
    }

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

    yield {
      success: result.success,
      submitted: result.success,
      finalUrl: page.url(),
    };
  } finally {
    await stagehand.close();
  }
}
