"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";

import type { FilledField } from "@formagent/api";
import { cn } from "@formagent/ui";
import { Button } from "@formagent/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@formagent/ui/field";
import { Input } from "@formagent/ui/input";
import { toast } from "@formagent/ui/toast";

import { useTRPC } from "~/trpc/react";
import { ReviewSheet } from "./review-sheet";

type FillResult =
  | { success: boolean; submitted: boolean; finalUrl: string }
  | {
      awaitingReview: true;
      filledFields: FilledField[];
      confidenceSummary: { high: number; medium: number; low: number };
      formUrl: string;
    };

async function runFillFormStream(
  formUrl: string,
  callbacks: {
    onLiveViewUrl: (url: string) => void;
    onLiveViewAvailable?: (available: boolean) => void;
    onPhase?: (phase: string) => void;
  },
): Promise<FillResult> {
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
  let result: FillResult | null = null;

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
          phase?: string;
          filledFields?: FilledField[];
          confidenceSummary?: { high: number; medium: number; low: number };
          awaitingReview?: boolean;
          formUrl?: string;
          success?: boolean;
          submitted?: boolean;
          finalUrl?: string;
          error?: string;
        };
        if (data.error) throw new Error(data.error);
        if (data.liveViewAvailable === false)
          callbacks.onLiveViewAvailable?.(false);
        const url = data.liveViewUrl;
        if (typeof url === "string") callbacks.onLiveViewUrl(url);
        if (typeof data.phase === "string") callbacks.onPhase?.(data.phase);
        if (
          data.awaitingReview === true &&
          Array.isArray(data.filledFields) &&
          data.confidenceSummary &&
          typeof data.formUrl === "string"
        ) {
          result = {
            awaitingReview: true,
            filledFields: data.filledFields,
            confidenceSummary: data.confidenceSummary,
            formUrl: data.formUrl,
          };
        } else if (
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

async function runSubmitFormStream(
  formUrl: string,
  prefilledData: FilledField[],
  callbacks: {
    onLiveViewUrl: (url: string) => void;
    onLiveViewAvailable?: (available: boolean) => void;
  },
): Promise<{ success: boolean; submitted: boolean; finalUrl: string }> {
  const res = await fetch("/api/agent/submit-form-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formUrl, prefilledData }),
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
        if (data.liveViewAvailable === false)
          callbacks.onLiveViewAvailable?.(false);
        if (typeof data.liveViewUrl === "string")
          callbacks.onLiveViewUrl(data.liveViewUrl);
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

  if (!result) throw new Error("No result from submit");
  return result;
}

const REPLAY_BASE = "https://browserbase.com/sessions";

export function FormFillSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: pastSessions } = useQuery(
    trpc.agent.listSessions.queryOptions(),
  );
  const [formUrl, setFormUrl] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [liveViewUnavailable, setLiveViewUnavailable] = useState(false);

  const [reviewState, setReviewState] = useState<{
    filledFields: FilledField[];
    confidenceSummary: { high: number; medium: number; low: number };
    formUrl: string;
  } | null>(null);
  const reviewOpen = reviewState !== null;

  const handleFill = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = formUrl.trim();
    if (!url || isPending) return;
    setIsPending(true);
    setLiveViewUrl(null);
    setLiveViewUnavailable(false);
    setReviewState(null);
    try {
      const data = await runFillFormStream(url, {
        onLiveViewUrl: (u) => setLiveViewUrl(u),
        onLiveViewAvailable: (available) => {
          if (!available) setLiveViewUnavailable(true);
        },
      });
      if ("awaitingReview" in data) {
        setReviewState({
          filledFields: data.filledFields,
          confidenceSummary: data.confidenceSummary,
          formUrl: data.formUrl,
        });
        toast.success("Form filled. Review and approve before submitting.");
      } else {
        toast.success(
          data.submitted
            ? "Form filled and submitted"
            : "Form filled (submit may have failed)",
        );
        if (data.success) {
          setFormUrl("");
          void queryClient.invalidateQueries({
            queryKey: trpc.agent.listSessions.queryOptions().queryKey,
          });
        }
        setLiveViewUrl(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fill form");
    } finally {
      setIsPending(false);
    }
  };

  const handleApprove = async (editedFields: FilledField[]) => {
    if (!reviewState || isSubmitting) return;
    const formUrlToSubmit = reviewState.formUrl;
    const fieldsToSubmit = editedFields;
    setReviewState(null); // close sheet immediately, show browser only
    setIsSubmitting(true);
    setLiveViewUrl(null);
    setLiveViewUnavailable(false);
    try {
      const data = await runSubmitFormStream(formUrlToSubmit, fieldsToSubmit, {
        onLiveViewUrl: (u) => setLiveViewUrl(u),
        onLiveViewAvailable: (av) => {
          if (!av) setLiveViewUnavailable(true);
        },
      });
      toast.success(
        data.submitted ? "Form submitted successfully" : "Submit completed",
      );
      if (data.success) {
        setFormUrl("");
        setReviewState(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.agent.listSessions.queryOptions().queryKey,
        });
      }
      setLiveViewUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReview = () => {
    setReviewState(null);
  };

  const showLiveSession =
    liveViewUrl != null ||
    ((isPending || isSubmitting) && !liveViewUnavailable);

  const formContent = (
    <div className="space-y-6">
      <h2 className="text-foreground text-xl font-medium">Fill a form</h2>
      <form onSubmit={handleFill} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="form-url">Form URL</FieldLabel>
              <FieldDescription>
                Enter the URL of a form. The agent will fill it using your saved
                context, then let you review before submitting.
              </FieldDescription>
              <Input
                id="form-url"
                type="url"
                placeholder="https://example.com/form"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                disabled={isPending || isSubmitting}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          disabled={!formUrl.trim() || isPending || isSubmitting}
        >
          {isPending ? "Filling…" : isSubmitting ? "Submitting…" : "Fill form"}
        </Button>
      </form>

      {pastSessions && pastSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-foreground text-sm font-medium">Past sessions</h3>
          <ul className="divide-border divide-y rounded-md border">
            {pastSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={s.formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground truncate text-sm underline-offset-4 hover:underline"
                  >
                    {s.formUrl}
                  </a>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <a
                  href={`${REPLAY_BASE}/${s.browserbaseSessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline-offset-4 hover:underline"
                >
                  Replay <ExternalLink className="ml-0.5 inline h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
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
                    <p className="text-sm">
                      {isSubmitting
                        ? "Submitting…"
                        : "Starting browser session…"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {reviewState && (
        <ReviewSheet
          open={reviewOpen}
          onOpenChange={(open) => {
            if (!open) handleCancelReview();
          }}
          filledFields={reviewState.filledFields}
          confidenceSummary={reviewState.confidenceSummary}
          onApprove={handleApprove}
          onCancel={handleCancelReview}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}
