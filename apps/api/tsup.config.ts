import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  outDir: "dist",
  clean: true,
  noSplitting: true,
  noExternal: ["@dilirik/db", "@dilirik/shared", "@dilirik/ai"],
})
