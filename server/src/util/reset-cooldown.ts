// How long a password-reset token lives, and how soon after one is issued
// another reset email may be sent to the same account.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const RESET_COOLDOWN_MS = 60 * 1000;

// The token's issue time is its expiry minus the TTL, so no extra database
// field is needed. True while the last reset email for this account is newer
// than the cooldown: the forgot-password route then answers as usual but does
// not send another email. That stops someone from using the form (from many IP
// addresses, which the per-IP limit can't see) to flood one person's inbox.
export function isResetCoolingDown(
  resetPasswordExpires: Date | number | string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (resetPasswordExpires === null || resetPasswordExpires === undefined) return false;
  const expires = new Date(resetPasswordExpires).getTime();
  if (!Number.isFinite(expires)) return false;
  const issuedAt = expires - RESET_TOKEN_TTL_MS;
  return now - issuedAt < RESET_COOLDOWN_MS;
}
