import crypto from "crypto";

// A short fingerprint of the user's current password hash, put in the JWT as
// `pv` at login/signup. checkAuth (and the WebSocket JOIN) compare it with the
// user's current password: after a password change or reset the fingerprint no
// longer matches, so every token issued before that stops working, instead of
// staying valid until it expires. A hash of the hash is used so nothing about
// the password hash itself ends up in the token.
export function passwordVersion(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// True when the token's `pv` claim still matches the user's current password.
// A token with no `pv` (issued before this check existed) is accepted until it
// expires on its own (1 hour), so deploying this doesn't log everyone out.
export function isSessionCurrent(tokenPv: unknown, passwordHash: string): boolean {
  if (tokenPv === undefined) return true;
  return typeof tokenPv === "string" && tokenPv === passwordVersion(passwordHash);
}
