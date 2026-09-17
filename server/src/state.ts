import type { WebSocket } from 'ws';
import type { User } from './types.js';
import { parseDMRoomId } from './util/dmRoom.js';

export interface ClientState {
  ws: WebSocket;
  id: string;       // per-connection id — unchanged, used for presence/room membership
  userId: string;   // NEW — the real, JWT-verified Mongo user id, used only for persisting messages
  username: string;
  room: string;
}

// room name -> userId -> ClientState
const rooms = new Map<string, Map<string, ClientState>>();

export function joinRoom(room: string, client: ClientState): void {
  if (!rooms.has(room)) rooms.set(room, new Map());
  rooms.get(room)!.set(client.id, client);
}

export function leaveRoom(room: string, userId: string): void {
  const members = rooms.get(room);
  if (!members) return;
  members.delete(userId);
  if (members.size === 0) rooms.delete(room);
}

export function getRoomMembers(room: string): ClientState[] {
  return [...(rooms.get(room)?.values() ?? [])];
}

export function getRoomUsers(room: string): User[] {
  return getRoomMembers(room).map((c) => ({ id: c.userId, username: c.username }));
}

export function getRoomOnlineCount(room: string): number {
  return rooms.get(room)?.size ?? 0;
}

// Public/group rooms (e.g. "general") are open to anyone. A DM room's id
// itself encodes its two participants (see util/dmRoom.ts), so we can
// authorize a JOIN/SWITCH_ROOM synchronously just by checking the
// requesting user's id is one of the two — no DB lookup needed.
export function canJoinRoom(room: string, userId: string): boolean {
  const participants = parseDMRoomId(room);
  if (!participants) return true;
  return participants.includes(userId);
}
