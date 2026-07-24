import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/dilirik_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret",
      BETTER_AUTH_URL: "http://localhost:4000",
    },
  },
})
