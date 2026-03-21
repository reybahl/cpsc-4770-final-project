"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { IdentityProfile } from "@acme/api";
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

import { IdentityProfileTable } from "~/app/_components/identity-profile-table";
import { useTRPC } from "~/trpc/react";

export function ContextInputForm() {
  const trpc = useTRPC();
  const { data: savedContext } = useQuery(trpc.context.get.queryOptions());

  return (
    <ContextFormFields
      key={savedContext?.id ?? "loading"}
      initialContext={savedContext?.context ?? ""}
      initialResumeUrl={savedContext?.resumeUrl ?? null}
      identityProfile={savedContext?.identityProfile ?? null}
    />
  );
}

function ContextFormFields({
  initialContext,
  initialResumeUrl,
  identityProfile,
}: {
  initialContext: string;
  initialResumeUrl: string | null;
  identityProfile: IdentityProfile | null;
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
  const rebuildProfileMutation = useMutation(
    trpc.context.rebuildIdentityProfile.mutationOptions(),
  );

  const invalidateContext = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.context.get.queryOptions().queryKey,
    });
  }, [queryClient, trpc.context.get]);

  const canRebuildProfile =
    context.trim().length > 0 || (resumeUrl != null && resumeUrl.length > 0);

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
                void (async () => {
                  invalidateContext();
                  try {
                    await rebuildProfileMutation.mutateAsync();
                    invalidateContext();
                    toast.success(
                      "PDF uploaded and structured profile updated",
                    );
                  } catch {
                    toast.error(
                      "PDF uploaded, but structured profile couldn't be refreshed",
                    );
                  }
                })();
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
    [saveResumeMutation, invalidateContext, rebuildProfileMutation],
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
    void (async () => {
      try {
        await saveMutation.mutateAsync({ context: context.trim() });
        await queryClient.invalidateQueries({
          queryKey: trpc.context.get.queryOptions().queryKey,
        });
        if (canRebuildProfile) {
          try {
            await rebuildProfileMutation.mutateAsync();
          } catch (rebuildErr) {
            toast.error(
              rebuildErr instanceof Error
                ? `Notes saved, but profile refresh failed: ${rebuildErr.message}`
                : "Notes saved, but structured profile couldn't be refreshed",
            );
            await queryClient.invalidateQueries({
              queryKey: trpc.context.get.queryOptions().queryKey,
            });
            return;
          }
        }
        await queryClient.invalidateQueries({
          queryKey: trpc.context.get.queryOptions().queryKey,
        });
        toast.success("Profile saved and structured profile updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save notes",
        );
      }
    })();
  };

  const isProfileUpdating =
    saveMutation.isPending || rebuildProfileMutation.isPending;

  const isDisabled =
    !context.trim() ||
    saveMutation.isPending ||
    rebuildProfileMutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12">
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="context">About you</FieldLabel>
              <FieldDescription>
                Manual notes only—nothing here is filled from your résumé. The
                structured profile below is built from these notes plus your PDF
                (if any) for the form agent.
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

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" size="lg" disabled={isDisabled}>
            {saveMutation.isPending ? "Saving…" : "Save notes"}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            Résumé (optional PDF)
          </p>
          <p className="text-muted-foreground text-sm">
            The PDF is combined with your notes whenever the structured profile
            is generated.
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
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-foreground text-lg font-medium">
              Structured profile
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Built from your manual notes plus the uploaded PDF (if any) each
              time you save notes, upload/replace a résumé, or click Regenerate.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={
              !canRebuildProfile ||
              rebuildProfileMutation.isPending ||
              saveMutation.isPending
            }
            onClick={() => {
              rebuildProfileMutation.mutate(undefined, {
                onSuccess: () => {
                  invalidateContext();
                  toast.success("Structured profile updated");
                },
                onError: (err) => {
                  toast.error(err.message || "Could not build profile");
                },
              });
            }}
          >
            {rebuildProfileMutation.isPending ? "Updating…" : "Regenerate"}
          </Button>
        </div>
        <IdentityProfileTable
          profile={identityProfile}
          isUpdating={isProfileUpdating}
        />
      </div>
    </div>
  );
}

function ResumeCard({
  pdfUrl,
  onDelete,
  isDeleting,
}: {
  pdfUrl: string;
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
