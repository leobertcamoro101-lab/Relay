import type { APIRequestContext, Page } from "@playwright/test";
import { API_URL, BASE_URL } from "./env";

// A password that satisfies both the client's Zod schema (8+ chars,
// upper-case, digit, special char) and the server's (6+ chars) — see
// client/src/schemas/signup.ts and server/src/schemas/user-schemas.ts.
export const VALID_PASSWORD = "E2eTest!123";

let counter = 0;
/** A unique-per-process email, so re-running the suite (or a retry) never
 * collides with a user created earlier in the same run. */
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export interface SignedUpUser {
  userId: string;
  token: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** "First Last" — the server's `name` virtual. Used wherever the UI
   * reads full names from the REST API (e.g. the sidebar's Direct
   * Messages list, built from GET /api/conversations). */
  name: string;
  /** What the WebSocket layer reports as this user's `username`
   * (server/src/index.ts's JOIN handler truncates `name` to 20 chars) —
   * that's what feeds ChatInterface's `users` array and therefore the DM
   * room header. Identical to `name` for any name this short, but kept
   * separate so a test always asserts the right value against the right
   * UI surface rather than relying on staying under the limit. */
  wsUsername: string;
  image: string;
}

/**
 * Creates a real user directly through the signup API, bypassing the
 * Signup UI. Used by tests that exercise chat/conversation behavior and
 * don't need to re-prove the signup form itself (that's covered once, in
 * auth.spec.ts, by driving the real form).
 *
 * The in-memory MongoDB backing an E2E run isn't reset between tests (see
 * server/tests/e2e-server.ts) the way vitest's per-file instance is, so
 * every user created over the whole run lives in the same database. A
 * fixed lastName like "Turing" would then match several unrelated users
 * by the time a later test searches for it — so a unique suffix is always
 * appended, even when a lastName is supplied, keeping every user's name —
 * and therefore every user-search / getByRole(name:) lookup — unambiguous
 * for the life of the run.
 *
 * That suffix is Date.now() + the in-process counter, not just the
 * counter — a plain incrementing counter turned out not to be
 * collision-proof in practice (two unrelated tests minted the same
 * "Turing-11" and the search results ended up containing two real,
 * identically-named users), so this mirrors uniqueEmail()'s scheme
 * instead. The resulting names run well past the WS layer's 20-char
 * truncation, which is exactly why `wsUsername` exists — see above.
 */
export async function signupViaApi(
  request: APIRequestContext,
  overrides: Partial<{ firstName: string; lastName: string; email: string }> = {},
): Promise<SignedUpUser> {
  counter += 1;
  const firstName = overrides.firstName ?? "Ada";
  const lastName = `${overrides.lastName ?? "Lovelace"}-${Date.now()}-${counter}`;
  const email = overrides.email ?? uniqueEmail("e2e-user");

  const response = await request.post(`${API_URL}/users/signup`, {
    data: {
      firstName,
      lastName,
      birthday: "1995-05-15",
      gender: "female",
      email,
      password: VALID_PASSWORD,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `signupViaApi failed (${response.status()}): ${await response.text()}`,
    );
  }
  const body = await response.json();
  const name = `${firstName} ${lastName}`;
  return {
    userId: body.userId,
    token: body.token,
    email,
    password: VALID_PASSWORD,
    firstName,
    lastName,
    name,
    wsUsername: name.slice(0, 20),
    image: body.image ?? "",
  };
}

/**
 * Puts a page into the same "already logged in" state the real app
 * reaches after Login.tsx/Signup.tsx call `auth.login(...)` — see
 * client/src/hooks/auth-hook.ts, which persists exactly this shape under
 * localStorage["userData"]. Navigates to the app first if the page has no
 * origin yet (localStorage needs a same-origin document to write to).
 */
export async function loginInBrowser(page: Page, user: SignedUpUser): Promise<void> {
  if (new URL(page.url()).origin === "null" || page.url() === "about:blank") {
    await page.goto(BASE_URL);
  }
  await page.evaluate(
    ({ userId, token, name, image }) => {
      window.localStorage.setItem(
        "userData",
        JSON.stringify({
          userId,
          token,
          expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          name,
          image,
        }),
      );
    },
    { userId: user.userId, token: user.token, name: user.name, image: user.image },
  );
}

/** Signs a fresh user up via the API and lands the given page on /relay,
 * already authenticated and connected — the common starting point for
 * chat/conversation specs. */
export async function loginAsNewUser(
  page: Page,
  request: APIRequestContext,
  overrides: Parameters<typeof signupViaApi>[1] = {},
): Promise<SignedUpUser> {
  const user = await signupViaApi(request, overrides);
  await loginInBrowser(page, user);
  await page.goto(`${BASE_URL}/relay`);
  return user;
}
