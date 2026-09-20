import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { type IUser } from "../../src/models/user.js";

let counter = 0;

interface CreateTestUserOptions {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  birthday?: string;
  gender?: "female" | "male" | "custom";
}

// Mirrors the required fields on the real User schema (server/src/models/user.ts)
// so tests exercise the same validation shape production data goes through.
export async function createTestUser(options: CreateTestUserOptions = {}) {
  counter += 1;
  const plainPassword = options.password ?? "password123";
  // Low cost factor — this is test-only, never a real credential, and
  // running bcrypt at the production cost factor (12) for every fixture
  // user would slow the suite down for no benefit.
  const hashedPassword = await bcrypt.hash(plainPassword, 4);

  const user = await User.create({
    firstName: options.firstName ?? "Test",
    lastName: options.lastName ?? `User${counter}`,
    birthday: options.birthday ?? "1990-01-01",
    gender: options.gender ?? "custom",
    email: options.email ?? `test-user-${counter}-${Date.now()}@example.com`,
    password: hashedPassword,
  });

  return { user, plainPassword };
}

export function tokenFor(user: Pick<IUser, "id" | "email">): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_KEY as string,
    { expiresIn: "1h" },
  );
}
