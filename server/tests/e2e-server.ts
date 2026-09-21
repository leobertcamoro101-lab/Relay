// ============================================
// Bootstraps a real Relay server (HTTP + WebSocket) for Playwright E2E
// runs, backed by an in-memory MongoDB instead of the real Atlas cluster.
//
// This is deliberately NOT a vitest file — it's a standalone process that
// Playwright's webServer config starts and tears down around the whole
// E2E run (see e2e/playwright.config.ts). It mirrors tests/setup.ts's
// approach (same mongodb-memory-server, same test-only JWT secret) but,
// unlike vitest, nothing here auto-invokes src/index.ts's main() — that
// only runs when NODE_ENV !== "test", and we need NODE_ENV === "test" so
// the auth/forgot-password rate limiters use their generous test ceiling
// (routes/users-routes.ts) instead of the production limits, which a
// run with retries could otherwise trip. So we set env vars first, then
// do main()'s two jobs (connect to Mongo, start listening) ourselves.
//
// Run directly with: npx tsx tests/e2e-server.ts
// ============================================
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_KEY ??= "e2e-test-jwt-secret-do-not-use-in-prod";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.LOG_LEVEL ??= "silent";
process.env.PORT ??= "8080";
process.env.DB_NAME ??= "relay-e2e";
// No CLOUDINARY_*/BREVO_API_KEY/SENTRY_DSN on purpose — the E2E suite
// never exercises profile-image upload or real password-reset email
// delivery (see e2e/tests/auth.spec.ts), so those integrations are left
// unconfigured rather than pointed at fake credentials.

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  // Imported dynamically, after the env vars above are set, since both
  // modules read process.env at import/call time.
  const { connectDB } = await import("../src/db.js");
  const { server } = await import("../src/index.js");

  await connectDB();

  const port = Number(process.env.PORT);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`[e2e-server] listening on http://localhost:${port}`);

  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[e2e-server] failed to start:", err);
  process.exit(1);
});
