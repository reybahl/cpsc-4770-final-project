"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

async function runFillFormStream(
  formUrl: string,
  onLiveViewUrl: (url: string) => void,
  onLiveViewAvailable?: (available: boolean) => void,
): Promise<{ success: boolean; submitted: boolean; finalUrl: string }> {
  const res = await fetch("/api/agent/fill-form-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formUrl }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await (res.json() as Promise<{ error?: string }>).catch(
      (): { error?: string } => ({}),
    );
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let result: {
    success: boolean;
    submitted: boolean;
    finalUrl: string;
  } | null = null;

  const dataRegex = /^data:\s*(.+)$/m;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const chunk of lines) {
      const match = dataRegex.exec(chunk);
      const jsonStr = match?.[1];
      if (!jsonStr) continue;
      try {
        const data = JSON.parse(jsonStr) as {
          liveViewUrl?: string;
          liveViewAvailable?: boolean;
          success?: boolean;
          submitted?: boolean;
          finalUrl?: string;
          error?: string;
        };
        if (data.error) throw new Error(data.error);
        if (data.liveViewAvailable === false) onLiveViewAvailable?.(false);
        const url = data.liveViewUrl;
        if (typeof url === "string") onLiveViewUrl(url);
        if (
          typeof data.success === "boolean" &&
          typeof data.submitted === "boolean" &&
          typeof data.finalUrl === "string"
        ) {
          result = {
            success: data.success,
            submitted: data.submitted,
            finalUrl: data.finalUrl,
          };
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        if (e instanceof Error) throw e;
      }
    }
  }

  if (!result) throw new Error("No result from agent");
  return result;
}

export function FormFillSection() {
  const [formUrl, setFormUrl] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [liveViewUnavailable, setLiveViewUnavailable] = useState(false);

  const handleFill = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = formUrl.trim();
    if (!url || isPending) return;
    setIsPending(true);
    setLiveViewUrl(null);
    setLiveViewUnavailable(false);
    try {
      const data = await runFillFormStream(
        url,
        (u) => setLiveViewUrl(u),
        (available) => {
          if (!available) setLiveViewUnavailable(true);
        },
      );
      toast.success(
        data.submitted
          ? "Form filled and submitted"
          : "Form filled (submit may have failed)",
      );
      if (data.success) setFormUrl("");
      setLiveViewUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fill form");
    } finally {
      setIsPending(false);
    }
  };

  const showLiveSession = liveViewUrl ?? (isPending && !liveViewUnavailable);

  const formContent = (
    <div className="space-y-6">
      <h2 className="text-foreground text-xl font-medium">Fill a form</h2>
      <form onSubmit={handleFill} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="form-url">Form URL</FieldLabel>
              <FieldDescription>
                Enter the URL of a form. The agent will navigate to it and fill
                it using your saved context.
              </FieldDescription>
              <Input
                id="form-url"
                type="url"
                placeholder="https://example.com/form"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                disabled={isPending}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={!formUrl.trim() || isPending}>
          {isPending ? "Filling…" : "Fill form"}
        </Button>
      </form>
    </div>
  );

  return (
    <section
      className={cn(
        "mt-12 w-full transition-all duration-300 ease-in-out",
        !showLiveSession && "mx-auto max-w-2xl",
        showLiveSession && "-mx-4 sm:-mx-6 lg:-mx-8",
      )}
    >
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out",
          showLiveSession &&
            "min-h-[calc(100vh-14rem)] flex-col gap-6 lg:flex-row",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 transition-all duration-300",
            showLiveSession && "lg:min-w-0 lg:flex-[0_0_50%]",
            showLiveSession && "pl-4 sm:pl-6 lg:pl-8",
          )}
        >
          {formContent}
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showLiveSession
              ? "flex min-h-[50vh] min-w-0 flex-1 flex-col items-stretch lg:fixed lg:top-14 lg:right-0 lg:bottom-0 lg:z-10 lg:min-h-0 lg:w-1/2"
              : "min-w-0 flex-[0_0_0]",
          )}
        >
          {showLiveSession && (
            <div className="relative inset-0 flex h-full min-h-0 w-full flex-1 flex-col">
              {liveViewUrl ? (
                <iframe
                  src={liveViewUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  allow="clipboard-read; clipboard-write"
                  title="Browserbase session"
                />
              ) : (
                <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Starting browser session…</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
