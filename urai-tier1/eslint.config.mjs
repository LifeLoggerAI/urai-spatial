import { defineConfig, globalIgnores } from "eslint/config";
import nextVitalsImport from "eslint-config-next/core-web-vitals.js";
import nextTsImport from "eslint-config-next/typescript.js";

function configArray(config) {
  const resolved = config?.default ?? config;
  return Array.isArray(resolved) ? resolved : [resolved];
}

const eslintConfig = defineConfig([
  ...configArray(nextVitalsImport),
  ...configArray(nextTsImport),
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
