import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, CLIENT_PORT, SERVER_PORT, WS_URL, API_URL } from "./tests/env";

export default defineConfig({
  testDir: "./tests",
  // The chat "rooms" and rate limiters this suite exercises are shared,
  // in-memory state on one server process (see server/tests/e2e-server.ts)
  // — running everything in one worker keeps two specs from racing each
  // other over the same room or tripping a per-IP/per-window limit.
  // Revisit once the suite is bigger and each spec is fully isolated.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Video recording needs a separate ffmpeg binary that Playwright
    // fetches from the same CDN as its browsers (npx playwright install
    // ffmpeg) — left off so a run never depends on that download
    // succeeding. Screenshots-on-failure and traces already cover
    // debugging a failed run; re-enable this once `ffmpeg` is confirmed
    // installed if you want video too.
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      // Use the machine's real installed Google Chrome instead of
      // Playwright's own downloaded copy (channel: "chrome"). Playwright's
      // bundled Chromium/chromium-headless-shell have to be fetched from
      // cdn.playwright.dev on every fresh machine, which some networks
      // throttle or block outright — "chrome" skips that download entirely
      // and drives the Chrome that's already on this computer.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      // Boots the real Express + WebSocket server against an in-memory
      // MongoDB — see that file for why NODE_ENV=test is set there rather
      // than here.
      command: "npx tsx tests/e2e-server.ts",
      cwd: "../server",
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // The real Vite dev server. client/.env is gitignored and won't
      // exist in CI, so VITE_BACKEND_URL/VITE_WS_URL are passed here
      // instead — Vite exposes any VITE_-prefixed process.env var to
      // import.meta.env regardless of .env files.
      command: `npx vite --port ${CLIENT_PORT} --strictPort`,
      cwd: "../client",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_BACKEND_URL: API_URL,
        VITE_WS_URL: WS_URL,
      },
    },
  ],
});
