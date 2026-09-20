import { beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Test-only defaults. Real values from .env are never read here — these
// tests never touch the real JWT secret, database, or Brevo/Sentry
// accounts. Individual test files that need to talk to email/Sentry mock
// those modules directly (see tests/security/password-validation.test.ts).
process.env.NODE_ENV = "test";
process.env.JWT_KEY ??= "test-only-jwt-secret-do-not-use-in-prod";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.LOG_LEVEL ??= "silent";

let mongod: MongoMemoryServer;

// One in-memory MongoDB instance per test file (Vitest re-runs setupFiles
// per file), so test files never share state and can safely run in
// parallel.
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  process.env.DB_NAME = "relay-test";
  await mongoose.connect(uri, { dbName: "relay-test" });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
