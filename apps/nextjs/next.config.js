import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Don't bundle Playwright/Stagehand and their deps; they spawn workers that need correct module paths */
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@browserbasehq/stagehand",
    "pino",
    "thread-stream",
  ],

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@formagent/api",
    "@formagent/auth",
    "@formagent/db",
    "@formagent/ui",
    "@formagent/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
