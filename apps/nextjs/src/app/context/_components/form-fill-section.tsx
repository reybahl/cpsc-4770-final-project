"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

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

import { useTRPC } from "~/trpc/react";

export function FormFillSection() {
  const trpc = useTRPC();
  const [formUrl, setFormUrl] = useState("");
  const fillFormMutation = useMutation(trpc.agent.fillForm.mutationOptions());

  const handleFill = (e: React.FormEvent) => {
    e.preventDefault();
    const url = formUrl.trim();
    if (!url || fillFormMutation.isPending) return;
    fillFormMutation.mutate(
      { formUrl: url },
      {
        onSuccess: (data) => {
          toast.success(
            data.submitted
              ? "Form filled and submitted"
              : "Form filled (submit may have failed)",
          );
          if (data.success) setFormUrl("");
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-2xl">
      <h2 className="text-foreground mb-4 text-xl font-medium">Fill a form</h2>
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
                disabled={fillFormMutation.isPending}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          disabled={!formUrl.trim() || fillFormMutation.isPending}
        >
          {fillFormMutation.isPending ? "Filling…" : "Fill form"}
        </Button>
      </form>
    </section>
  );
}
