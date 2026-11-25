// WebSocket frames are arbitrary JSON, so a field typed `string` can really be
// a number, object or null. Calling .trim() on those throws inside the async
// message handler, and Node turns that unhandled rejection into a process
// crash — one malformed frame would take the server down for everyone.
// Returns the trimmed, length-capped string, or "" for anything else.
export function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
