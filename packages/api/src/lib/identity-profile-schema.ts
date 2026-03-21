/**
 * Free-form JSON describing the user (from the model). No fixed shape — keys and
 * nesting are whatever the model infers from résumé + notes.
 */
export type IdentityProfile = Record<string, unknown>;

export function parseIdentityProfileFromDb(
  raw: unknown,
): IdentityProfile | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as IdentityProfile;
  }
  return null;
}
