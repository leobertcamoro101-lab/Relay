// Reactions are stored on a message as { [emoji]: userId[] }. Only a small
// fixed set of emoji is accepted so a client can't stuff arbitrary strings
// into field names. Keep in sync with client/src/utils/reactions.ts.
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"] as const;

export type Reactions = Record<string, string[]>;

export function isAllowedReaction(emoji: unknown): emoji is string {
  return typeof emoji === "string" && (REACTION_EMOJIS as readonly string[]).includes(emoji);
}

// Cleans what comes out of Mongo: drops emoji with nobody left on them (a
// toggle-off leaves an empty array behind) and anything that isn't a
// string[] — so clients only ever see real, non-empty reactions.
export function normalizeReactions(raw: unknown): Reactions {
  const out: Reactions = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(users)) continue;
    const ids = users.filter((u): u is string => typeof u === "string");
    if (ids.length > 0) out[emoji] = ids;
  }
  return out;
}
