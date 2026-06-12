import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Strict import rules (no-relative-parent-imports, import/order) were removed: they
// conflict with @/ path aliases in Next.js and produced thousands of false positives.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".swc/**",
      ".codex-tmp/**",
      ".codex-tmp-playwright/**",
      "backups/**",
      "functions/lib/**",
      "next-env.d.ts",
      "lint-output.txt",
      "tools/**",
      "e2e/**",
      "playwright.config.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
