import { defineConfig } from "eslint/config";

import { baseConfig } from "@formagent/eslint-config/base";
import { reactConfig } from "@formagent/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
