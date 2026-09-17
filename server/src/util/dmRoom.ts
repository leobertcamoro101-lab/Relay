// DM room ids are deterministic and built from the two participants' user
// ids (sorted so it doesn't matter who started the conversation). That
// means a JOIN/SWITCH_ROOM over the WebSocket can be authorized just by
// parsing the room id string — no database round-trip needed — which is
// why canJoinRoom() in state.ts can be a synchronous check.

const DM_PREFIX = "dm_";

export function getDMRoomId(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `${DM_PREFIX}${a}_${b}`;
}

// Pulls the two participant ids back out of a room id built by
// getDMRoomId(). Returns null when `room` isn't a DM room at all (e.g. a
// public room like "general").
export function parseDMRoomId(room: string): [string, string] | null {
  if (!room.startsWith(DM_PREFIX)) return null;
  const parts = room.slice(DM_PREFIX.length).split("_");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}
