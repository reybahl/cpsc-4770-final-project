"use client";

import { useState } from "react";

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

export function ContextInputForm() {
  const [context, setContext] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          // Placeholder: backend integration coming next
        }}
      >
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
          <Button type="submit" size="lg" disabled={!context.trim()}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
