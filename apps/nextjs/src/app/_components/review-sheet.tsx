"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { FilledField } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@acme/ui/sheet";

export interface ReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filledFields: FilledField[];
  confidenceSummary: { high: number; medium: number; low: number };
  onApprove: (editedFields: FilledField[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ReviewSheet({
  open,
  onOpenChange,
  filledFields,
  confidenceSummary,
  onApprove,
  onCancel,
  isSubmitting = false,
}: ReviewSheetProps) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const handleValueChange = (id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const getDisplayValue = (field: FilledField) =>
    editedValues[field.id] ?? field.value;

  const handleApprove = () => {
    const editedFields: FilledField[] = filledFields.map((f) => ({
      ...f,
      value: editedValues[f.id] ?? f.value,
    }));
    onApprove(editedFields);
    setEditedValues({});
  };

  const handleCancel = () => {
    setEditedValues({});
    onCancel();
  };

  const hasLowConfidence =
    confidenceSummary.low > 0 || confidenceSummary.medium > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        showCloseButton={!isSubmitting}
      >
        <SheetHeader>
          <SheetTitle>Review filled fields</SheetTitle>
          <SheetDescription>
            {hasLowConfidence
              ? `Some fields have low confidence. Review and edit before submitting. (${confidenceSummary.high} high, ${confidenceSummary.medium} medium, ${confidenceSummary.low} low)`
              : `All fields have high confidence. Confirm and submit.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {filledFields.map((field) => {
            const isLow = field.confidence === "low";
            const isMedium = field.confidence === "medium";
            const flagLow = isLow || isMedium;
            return (
              <div
                key={field.id}
                className={cn(
                  "space-y-1.5 rounded-md border p-3",
                  flagLow && "border-amber-500/50 bg-amber-500/5",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">
                    {field.label}
                  </span>
                  {flagLow && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        isLow &&
                          "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                        isMedium &&
                          "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                      )}
                    >
                      {field.confidence}
                    </span>
                  )}
                </div>
                <Input
                  value={getDisplayValue(field)}
                  onChange={(e) => handleValueChange(field.id, e.target.value)}
                  disabled={isSubmitting}
                  className={cn(flagLow && "border-amber-500/30")}
                />
                {flagLow && field.reason && (
                  <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {field.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? (
              <>Submitting…</>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 size-4" />
                Approve & Submit
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
