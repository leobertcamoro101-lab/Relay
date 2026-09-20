import { defineConfig } from "vitest/config";

// Server test config. Runs against a fresh in-memory MongoDB per test file
// (see tests/setup.ts) rather than the real database — nothing here ever
// touches production data.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // mongodb-memory-server downloads/boots a real mongod binary per test
    // file on first run, which can be slow — give it room before Vitest
    // gives up on a hook.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
