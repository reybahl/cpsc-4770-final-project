"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@acme/ui";
import { Label } from "@acme/ui/label";
import { Switch } from "@acme/ui/switch";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

export function AgentSettingsForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    ...trpc.settings.get.queryOptions(),
    /** Avoid long waits and repeated server logs when the query fails (e.g. missing migration). */
    retry: false,
  });

  const mutation = useMutation(
    trpc.settings.setVerificationLoop.mutationOptions({
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: trpc.settings.get.queryOptions().queryKey,
        });
        toast.success(
          variables.enabled
            ? "You’ll review filled values before the form is submitted."
            : "The agent will verify fields, then submit without a review step.",
        );
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Could not save setting",
        );
      },
    }),
  );

  const enabled = data?.verificationLoopEnabled ?? true;

  return (
    <div
      className={cn(
        "border-border bg-card rounded-lg border p-6 shadow-xs",
        isPending && "opacity-70",
      )}
    >
      <h2 className="text-foreground text-lg font-semibold">Form agent</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        The agent always runs its correctness pass on filled fields. Choose
        whether you confirm values in the app before submit.
      </p>
      {isError && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error instanceof Error ? error.message : "Could not load settings."}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="review-before-submit" className="text-base">
            Review before submit
          </Label>
          <p className="text-muted-foreground text-sm leading-normal">
            When on, you approve or edit values in the review sheet, then
            submit. When off, the same verify/correct loop runs, then the form
            submits automatically.
          </p>
        </div>
        <Switch
          id="review-before-submit"
          className="shrink-0"
          checked={enabled}
          disabled={isPending || isError || mutation.isPending}
          onCheckedChange={(checked) => {
            mutation.mutate({ enabled: checked });
          }}
        />
      </div>
    </div>
  );
}
