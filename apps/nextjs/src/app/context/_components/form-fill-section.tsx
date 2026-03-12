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

export function FormFillSection() {
  const [formUrl, setFormUrl] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleFill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim() || isPending) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/agent/fill-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formUrl: formUrl.trim() }),
        credentials: "include",
      });
      const data = (await res.json()) as {
        success?: boolean;
        submitted?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fill form");
      }
      toast.success(
        data.submitted
          ? "Form filled and submitted"
          : "Form filled (submit may have failed)",
      );
      if (data.success) setFormUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fill form");
    } finally {
      setIsPending(false);
    }
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
                disabled={isPending}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={!formUrl.trim() || isPending}>
          {isPending ? "Filling…" : "Fill form"}
        </Button>
      </form>
    </section>
  );
}
