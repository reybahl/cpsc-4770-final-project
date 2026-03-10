"use client";

import { useState } from "react";
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

  const saveMutation = useMutation(trpc.context.save.mutationOptions());

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

        <div
          className={cn(
            "border-border bg-muted/30 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            "hover:bg-muted/50",
          )}
        >
          <p className="text-muted-foreground text-sm font-medium">
            PDF résumé upload — coming soon
          </p>
          <p className="text-muted-foreground/80 mt-1 text-xs">
            You’ll be able to upload a .pdf and we’ll extract the text for you
          </p>
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
