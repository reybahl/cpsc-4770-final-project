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
    />
  );
}

function ContextFormFields({ initialContext }: { initialContext: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [context, setContext] = useState(initialContext);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const saveMutation = useMutation(trpc.context.save.mutationOptions());

  const uploadFile = useCallback(async (file: File) => {
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
        toast.success("PDF uploaded — ready for AI extraction");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
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
            Or upload a PDF résumé (we’ll send it to the AI to extract context)
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
          {resumeUrl && (
            <p className="text-muted-foreground truncate text-xs">
              PDF stored: {resumeUrl}
            </p>
          )}
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
