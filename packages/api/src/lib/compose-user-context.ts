import type { IdentityProfile } from "./identity-profile-schema";

/**
 * Combines structured profile JSON with free-text notes for Stagehand / verification prompts.
 */
export function composeUserContextForAgent(input: {
  contextText: string;
  identityProfile: IdentityProfile | null;
}): string {
  const text = input.contextText.trim();
  const profile = input.identityProfile;

  const parts: string[] = [];

  if (profile && Object.keys(profile).length > 0) {
    parts.push(
      "Structured identity profile (JSON from notes + optional résumé PDF — use for accurate field mapping):\n" +
        JSON.stringify(profile, null, 2),
    );
  }

  if (text) {
    parts.push(
      profile
        ? `Manual notes only (not derived from the PDF — additive context):\n${text}`
        : text,
    );
  }

  return parts.join("\n\n---\n\n");
}

export function hasUsableUserContext(input: {
  contextText: string;
  identityProfile: IdentityProfile | null;
}): boolean {
  return composeUserContextForAgent(input).trim().length > 0;
}
