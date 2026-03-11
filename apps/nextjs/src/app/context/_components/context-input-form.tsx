"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Textarea } from "@acme/ui/textarea";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

export function ContextInputForm() {
  const trpc = useTRPC();
  const { data: savedContext } = useQuery(trpc.context.get.queryOptions());

  return (
    <ContextFormFields
      key={savedContext?.id ?? "loading"}
      initialContext={savedContext?.context ?? ""}
      initialResumeUrl={savedContext?.resumeUrl ?? null}
    />
  );
}

function ContextFormFields({
  initialContext,
  initialResumeUrl,
}: {
  initialContext: string;
  initialResumeUrl: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [context, setContext] = useState(initialContext);
  const [resumeUrl, setResumeUrl] = useState<string | null>(initialResumeUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const saveMutation = useMutation(trpc.context.save.mutationOptions());
  const saveResumeMutation = useMutation(
    trpc.context.saveResume.mutationOptions(),
  );
  const clearResumeMutation = useMutation(
    trpc.context.clearResume.mutationOptions(),
  );

  const invalidateContext = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.context.get.queryOptions().queryKey,
    });
  }, [queryClient, trpc.context.get]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/upload-resume", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
        }
        if (data.url) {
          setResumeUrl(data.url);
          saveResumeMutation.mutate(
            { pdfUrl: data.url },
            {
              onSuccess: () => {
                invalidateContext();
                toast.success("PDF uploaded — ready for AI extraction");
              },
            },
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to upload PDF",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [saveResumeMutation, invalidateContext],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      e.target.value = "";
    },
    [uploadFile],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!context.trim()) return;
    saveMutation.mutate(
      { context: context.trim() },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.context.get.queryOptions().queryKey,
          });
          toast.success("Context saved successfully");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to save context");
        },
      },
    );
  };

  const isDisabled = !context.trim() || saveMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="context">Your personal context</FieldLabel>
              <FieldDescription>
                Paste a short bio, bullet points, or text from your résumé.
                Include name, contact info, education, work experience, and
                skills. The more detail you provide, the better the agent can
                fill forms.
              </FieldDescription>
              <Textarea
                id="context"
                placeholder={`e.g. Alex Chen, alex.chen@email.com, 555-123-4567
BS Computer Science, Stanford University, 2020
Senior Software Engineer at TechCorp (2020–present)
Skills: TypeScript, React, Python...`}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="min-h-[240px] resize-y font-mono text-sm"
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            Or upload a PDF résumé (we'll send it to the AI to extract context)
          </p>
          <label
            htmlFor="resume-upload"
            className={cn(
              "border-border bg-muted/30 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              "hover:bg-muted/50",
              isDragging && "border-primary bg-primary/5",
              isUploading && "pointer-events-none opacity-70",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              id="resume-upload"
              disabled={isUploading}
              onChange={handleFileInput}
            />
            <span className="text-muted-foreground text-sm">
              {isUploading
                ? "Uploading…"
                : "Choose a file or drag and drop a PDF here"}
            </span>
          </label>
          {resumeUrl ? (
            <ResumeCard
              pdfUrl={resumeUrl}
              onExtracted={(text) => setContext(text)}
              onDelete={() => {
                setResumeUrl(null);
                clearResumeMutation.mutate(undefined, {
                  onSuccess: () => invalidateContext(),
                });
              }}
              isDeleting={clearResumeMutation.isPending}
            />
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isDisabled}>
            {saveMutation.isPending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ResumeCard({
  pdfUrl,
  onExtracted,
  onDelete,
  isDeleting,
}: {
  pdfUrl: string;
  onExtracted: (text: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery(
    trpc.context.getResumeViewUrl.queryOptions({ pdfUrl }),
  );
  const viewUrl = data?.url;

  return (
    <div className="border-border relative overflow-hidden rounded-lg border">
      <div className="bg-muted/30 flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {viewUrl ? (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm font-medium hover:underline"
            >
              View PDF in new tab
            </a>
          ) : isLoading ? (
            <span className="text-muted-foreground text-sm">Loading…</span>
          ) : isError ? (
            <span className="text-destructive text-sm">
              Could not load preview
            </span>
          ) : null}
          <ResumeExtractButton pdfUrl={pdfUrl} onExtracted={onExtracted} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isDeleting}
          onClick={onDelete}
          aria-label="Delete resume"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      </div>
      {viewUrl ? (
        <iframe
          src={viewUrl}
          title="Resume PDF"
          className="h-[70vh] min-h-[560px] w-full border-0"
        />
      ) : isLoading ? (
        <div className="bg-muted/20 flex h-[70vh] min-h-[560px] items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading PDF…</span>
        </div>
      ) : isError ? (
        <div className="bg-muted/20 flex h-[70vh] min-h-[560px] items-center justify-center">
          <span className="text-muted-foreground text-sm">
            PDF preview unavailable
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ResumeExtractButton({
  pdfUrl,
  onExtracted,
}: {
  pdfUrl: string;
  onExtracted: (text: string) => void;
}) {
  const trpc = useTRPC();
  const extractMutation = useMutation(
    trpc.context.extractResume.mutationOptions(),
  );

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={extractMutation.isPending}
      onClick={() => {
        extractMutation.mutate(
          { pdfUrl },
          {
            onSuccess: (data) => {
              onExtracted(data.text);
              toast.success("Context extracted from PDF");
            },
            onError: (err) => {
              toast.error(err.message || "Extraction failed");
            },
          },
        );
      }}
    >
      {extractMutation.isPending ? "Extracting…" : "Extract context with AI"}
    </Button>
  );
}
