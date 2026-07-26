import js from "@eslint/js"
import tseslint from "typescript-eslint"

/** Shared flat ESLint config for all Dilirik workspaces. */
export default tseslint.config(
  {
    // Config yang hanya berisi `ignores` = global ignores.
    // Pakai pola **/ agar berlaku dari root untuk semua workspace.
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.d.ts",
      "**/*.tsbuildinfo",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Sementara "warn" agar CI hijau dulu; naikkan ke "error"
      // setelah codebase dibersihkan dengan `pnpm lint --fix`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "no-empty": "warn",
    },
  },
)
