// Escapes regex metacharacters so user input is matched as plain text.
// Without this, a search box value goes straight into a MongoDB $regex: "^a"
// or ".*" lets anyone list or probe accounts, and a pattern like "(a+)+$"
// can burn the database's CPU (ReDoS).
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
