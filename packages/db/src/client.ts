import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("Missing POSTGRES_URL environment variable");
}

export const db = drizzle(connectionString, {
  schema,
  casing: "snake_case",
});
