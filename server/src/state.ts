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

// room name -> connection id -> ClientState. Keyed by the per-connection
// id (not userId) on purpose, so a broadcast reaches every open tab/
// connection a user has in a room. getRoomUsers()/getRoomOnlineCount()
// below collapse that back down to one entry per real person for display.
const rooms = new Map<string, Map<string, ClientState>>();

export function joinRoom(room: string, client: ClientState): void {
  if (!rooms.has(room)) rooms.set(room, new Map());
  rooms.get(room)!.set(client.id, client);
}

export function leaveRoom(room: string, connectionId: string): void {
  const members = rooms.get(room);
  if (!members) return;
  members.delete(connectionId);
  if (members.size === 0) rooms.delete(room);
}

export function getRoomMembers(room: string): ClientState[] {
  return [...(rooms.get(room)?.values() ?? [])];
}

// A user can have more than one live connection in the same room — e.g.
// two browser tabs — each its own ClientState. Collapse those down to one
// entry per real person, so the "online" list shows who's online, not how
// many tabs are open.
export function getRoomUsers(room: string): User[] {
  const seen = new Map<string, User>();
  for (const member of getRoomMembers(room)) {
    if (!seen.has(member.userId)) {
      seen.set(member.userId, { id: member.userId, username: member.username });
    }
  }
  return [...seen.values()];
}

export function getRoomOnlineCount(room: string): number {
  return getRoomUsers(room).length;
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