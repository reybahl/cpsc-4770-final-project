import { z } from "zod/v4";

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const FilledFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  type: z.string(),
  value: z.string(),
  selector: z.string().optional(),
  confidence: ConfidenceLevelSchema,
  reason: z.string().optional(),
});
export type FilledField = z.infer<typeof FilledFieldSchema>;

export const ConfidenceSummarySchema = z.object({
  high: z.number(),
  medium: z.number(),
  low: z.number(),
});
export type ConfidenceSummary = z.infer<typeof ConfidenceSummarySchema>;

/** Raw field from DOM extraction (before verification). */
export const RawFormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  type: z.string(),
  value: z.string(),
  selector: z.string().optional(),
});
export type RawFormField = z.infer<typeof RawFormFieldSchema>;
