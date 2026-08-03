import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-prod/**",
    ".next-capacitor/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The native Android project contains a copy of the built web bundle
    // under android/app/src/main/assets/public, which is minified/generated
    // JS, not source ESLint should ever see.
    "android/**",
  ]),
]);

export default eslintConfig;
