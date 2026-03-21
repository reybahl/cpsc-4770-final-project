import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const context = pgTable("context", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  context: t.text().notNull(),
  /** LLM-extracted structured profile (JSON), built from about text + optional PDF */
  identityProfile: t.jsonb("identity_profile"),
  resumeUrl: t.text(),
  createdAt: t.timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "string", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateContextSchema = createInsertSchema(context, {
  context: z.string().min(1),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const sessions = pgTable("sessions", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  browserbaseSessionId: t.text("browserbase_session_id").notNull(),
  formUrl: t.text("form_url").notNull(),
  createdAt: t
    .timestamp({ mode: "string", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export * from "./auth-schema";
