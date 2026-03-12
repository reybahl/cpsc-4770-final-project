"use client";

import { useState } from "react";

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
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const chunk of lines) {
      const match = chunk.match(/^data:\s*(.+)$/m);
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

  const showLiveSession = liveViewUrl || (isPending && !liveViewUnavailable);

  return (
    <section className="mx-auto mt-12 w-full max-w-2xl space-y-6">
      {showLiveSession && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="text-foreground mb-3 text-sm font-medium">
            Live session {liveViewUrl ? "" : "(connecting…)"}
          </h3>
          {liveViewUrl ? (
            <div className="overflow-hidden rounded-md border">
              <iframe
                src={liveViewUrl}
                className="h-[480px] w-full"
                sandbox="allow-same-origin allow-scripts"
                allow="clipboard-read; clipboard-write"
                title="Browserbase session"
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Starting browser session… Live view will appear here.
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-foreground mb-4 text-xl font-medium">
          Fill a form
        </h2>
        <form onSubmit={handleFill} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="form-url">Form URL</FieldLabel>
                <FieldDescription>
                  Enter the URL of a form. The agent will navigate to it and
                  fill it using your saved context.
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
    </section>
  );
}
