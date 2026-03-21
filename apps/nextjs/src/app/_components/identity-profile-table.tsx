"use client";

import { Loader2 } from "lucide-react";

import type { IdentityProfile } from "@acme/api";

function flattenForTable(
  value: unknown,
  prefix = "",
): { key: string; value: string }[] {
  if (value === null || value === undefined) {
    return prefix ? [{ key: prefix, value: String(value) }] : [];
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [{ key: prefix, value: String(value) }];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ key: prefix || "(array)", value: "—" }];
    return value.flatMap((item, i) => {
      const p = prefix ? `${prefix}[${i}]` : `[${i}]`;
      return flattenForTable(item, p);
    });
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0)
      return [{ key: prefix || "(object)", value: "—" }];
    return entries.flatMap(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      return flattenForTable(v, key);
    });
  }
  return [{ key: prefix, value: JSON.stringify(value) }];
}

export function IdentityProfileTable({
  profile,
  isUpdating = false,
}: {
  profile: IdentityProfile | null;
  isUpdating?: boolean;
}) {
  if (isUpdating) {
    return (
      <div className="border-border bg-muted/20 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">
          Updating structured profile…
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-muted-foreground border-border rounded-md border border-dashed p-6 text-sm">
        No structured profile yet. Save your notes (and optionally upload a
        résumé) to generate one automatically.
      </p>
    );
  }

  const rows = flattenForTable(profile);
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Structured profile is empty.
      </p>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-md border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-muted-foreground w-[min(40%,24rem)] px-3 py-2 font-medium">
              Field
            </th>
            <th className="text-muted-foreground px-3 py-2 font-medium">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-border border-b last:border-b-0"
            >
              <td className="text-muted-foreground px-3 py-2 align-top font-mono text-xs break-all">
                {row.key}
              </td>
              <td className="px-3 py-2 align-top wrap-break-word">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
