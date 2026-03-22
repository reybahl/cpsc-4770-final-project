import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@formagent/eslint-config/base";
import { nextjsConfig } from "@formagent/eslint-config/nextjs";
import { reactConfig } from "@formagent/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
