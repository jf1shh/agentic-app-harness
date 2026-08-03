import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Capacitor-specific build output and the native Android project — the
    // latter contains a copy of the built web bundle under
    // android/app/src/main/assets/public, which is minified/generated JS, not
    // source ESLint should ever see.
    ".next-prod/**",
    ".next-capacitor/**",
    "android/**",
  ]),
]);

export default eslintConfig;
