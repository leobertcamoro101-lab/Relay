// Remembers which room you were in so a refresh (or a dropped connection that
// reconnects) puts you back there instead of always dropping you in #general.
//
// Why it matters for unread: joining a room counts as reading it. If a refresh
// always landed you in #general, #general would be marked read every time you
// reloaded, even when you were looking at #tech.
//
// sessionStorage, not localStorage: it is per tab, so two tabs open in
// different rooms don't overwrite each other.
const KEY = "relay:lastRoom";

export function getLastRoom(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value && value.length <= 100 ? value : null;
  } catch {
    return null; // storage blocked/unavailable: just use the default room
  }
}

export function saveLastRoom(room: string): void {
  try {
    sessionStorage.setItem(KEY, room);
  } catch {
    // ignore: remembering the room is a convenience only
  }
}

export function clearLastRoom(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
