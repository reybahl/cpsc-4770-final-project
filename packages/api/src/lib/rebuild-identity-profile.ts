import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { IdentityProfile } from "./identity-profile-schema";
import { getLlmModel } from "./llm-env";

const SYSTEM = `You extract everything useful about this person for filling web forms.

You may receive manual free-text notes and/or a résumé PDF. Combine both sources; notes are
not extracted from the PDF—they are separate, additive context when present.

Respond with a single JSON object only. No markdown fences, no commentary before or after.
Choose your own keys and structure (nested objects/arrays as needed): contact, work history,
education, skills, links, gaps or uncertainties, etc.
Only include information supported by the materials; do not invent credentials or employers.`;

function parseJsonObjectFromModelText(text: string): IdentityProfile {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const candidate = fence?.[1]?.trim() ?? trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate) as unknown;
  } catch {
    throw new Error("Model did not return valid JSON. Try again.");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Model JSON must be a single object at the root.");
  }

  return parsed as IdentityProfile;
}

export async function rebuildIdentityProfileFromSources(input: {
  aboutText: string;
  resumePdfBuffer: Buffer | null;
}): Promise<IdentityProfile> {
  const about = input.aboutText.trim();
  const hasPdf = input.resumePdfBuffer && input.resumePdfBuffer.length > 0;

  if (!about && !hasPdf) {
    throw new Error(
      "Add something about yourself or upload a PDF résumé before generating a structured profile.",
    );
  }

  const userIntro = about
    ? `User's own description / notes:\n"""\n${about}\n"""\n`
    : "The user did not provide separate free-text notes; infer from the résumé only.\n";

  const instruction = `${userIntro}
Build the JSON object from these materials.`;

  const content: (
    | { type: "text"; text: string }
    | { type: "file"; data: Buffer; mediaType: "application/pdf" }
  )[] = [{ type: "text", text: instruction }];

  if (hasPdf && input.resumePdfBuffer) {
    content.push({
      type: "file",
      data: input.resumePdfBuffer,
      mediaType: "application/pdf",
    });
  }

  const { text } = await generateText({
    model: openai(getLlmModel()),
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  return parseJsonObjectFromModelText(text);
}
