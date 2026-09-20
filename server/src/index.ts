// ============================================
// Entry point — one HTTP server serving:
//   - REST routes (add your own — login/signup, etc.)
//     via the Express app below
//   - The WebSocket chat protocol (below), upgraded
//     on that same port
//
// Protocol (mirrors client/src/hooks/useWebSocket.ts):
//   client -> server: JOIN, MESSAGE, TYPING, SWITCH_ROOM
//   server -> client: WELCOME, MESSAGE, USER_JOINED,
//                      USER_LEFT, TYPING, ROOM_SWITCHED
// ============================================
import "./instrument.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/user.js";
import "dotenv/config";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
// import express from "express";
import type { ClientMessage, ServerMessage } from "./types.js";
import Message, { getRecentMessages } from "./models/messages.js";
import {
  type ClientState,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getRoomUsers,
  getRoomOnlineCount,
  canJoinRoom,   // NEW
} from "./state.js";
import { connectDB } from "./db.js";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 8080;
const DEFAULT_ROOM = "general";

// Same allowlist app.ts's CORS middleware uses — kept in sync manually
// since this file doesn't share module scope with app.ts.
const ALLOWED_ORIGINS = ["http://localhost:5173", process.env.FRONTEND_URL];

// Render sits behind a proxy, so the real client IP comes from
// X-Forwarded-For, not the raw socket address.
function getClientIp(request: http.IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress ?? "unknown";
}

// Caps concurrent WebSocket connections per IP. The per-message rate
// limiter inside each connection only throttles one socket at a time —
// without this, someone could open many sockets to multiply their
// effective message budget. Kept generous since several people can
// legitimately share one public IP behind an office/school network or
// mobile carrier NAT.
const MAX_CONNECTIONS_PER_IP = 20; // raise if you want to raise the limit
const connectionsByIp = new Map<string, number>();

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(
  room: string,
  message: ServerMessage,
  excludeUserId?: string,
): void {
  for (const member of getRoomMembers(room)) {
    if (member.id === excludeUserId) continue;
    send(member.ws, message);
  }
}

// ---- HTTP (REST routes: add login/signup, etc. here) ----
// const app = express();
// app.use(express.json());
const server = http.createServer(app);

// ---- WebSocket (chat protocol) — shares the same port ----
// maxPayload caps a single incoming frame at 64KB — comfortably more than
// a 500-char chat message needs, well short of the library's 100MB
// default, which would otherwise let one client burn CPU/memory parsing
// giant frames.
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

wss.on("error", (err) => {
  console.error("WebSocketServer error:", err);
});

wss.on("connection", (ws: WebSocket, request) => {
  // Reject sockets opened from a page we don't recognize. Auth still runs
  // on JOIN below, so this is defense-in-depth rather than the primary
  // protection — but there's no reason to accept connections from
  // arbitrary origins at all.
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    ws.close(4003, "Origin not allowed");
    return;
  }

  const clientIp = getClientIp(request);
  const currentConnections = connectionsByIp.get(clientIp) ?? 0;
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
    ws.close(4008, "Too many connections from this network");
    return;
  }
  connectionsByIp.set(clientIp, currentConnections + 1);

  // An unhandled 'error' event on an EventEmitter is an uncaught
  // exception in Node — without this listener, a malformed frame from a
  // single client could crash the whole server for everyone connected.
  ws.on("error", (err) => {
    console.error("WebSocket connection error:", err);
  });

  // Populated once this connection sends JOIN.
  let client: ClientState | null = null;

  // At most RATE_LIMIT_MAX_MESSAGES every RATE_LIMIT_WINDOW_MS, per
  // connection. Stops one compromised or malicious client from flooding
  // the DB and every other room member with writes/broadcasts. Also
  // covers repeated JOIN spam on one already-open socket, since the check
  // runs before the switch statement below.
  const RATE_LIMIT_WINDOW_MS = 10_000;
  const RATE_LIMIT_MAX_MESSAGES = 30; // ~3/sec sustained, bursts of 30 allowed (change 30 if want to raise limit)
  let windowStart = Date.now();
  let messageCount = 0;

  ws.on("message", async (raw) => {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
      windowStart = now;
      messageCount = 0;
    }
    if (++messageCount > RATE_LIMIT_MAX_MESSAGES) {
      return; // silently drop — no need to tell a flooder they've been throttled
    }

    let data: ClientMessage;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    switch (data.type) {
      case "JOIN": {
      const token = data.token;
      const room = data.room?.trim().slice(0, 100) || DEFAULT_ROOM;
      if (!token) return;

      let decoded: { userId: string; email: string };
      try {
        decoded = jwt.verify(token, process.env.JWT_KEY as string) as { userId: string; email: string };
      } catch {
        ws.close(4001, "Authentication failed");
        return;
      }

      let user;
      try {
        user = await User.findById(decoded.userId);
      } catch {
        ws.close(4001, "Authentication failed");
        return;
      }
      if (!user) {
        ws.close(4001, "Authentication failed");
        return;
      }

      if (!canJoinRoom(room, decoded.userId)) {
        ws.close(4003, "Not a participant in this conversation");
        return;
      }

      const username = user.name.slice(0, 20);
      client = { ws, id: randomUUID(), userId: decoded.userId, username, room };

      let history: Awaited<ReturnType<typeof getRecentMessages>> = [];
      try{
        history = await getRecentMessages(room);
      } catch(err){
        console.error("Failed to load message history on JOIN:", err);
        // fall through with empty history instead of hanging the client forever
      }

      joinRoom(room, client);


      send(ws, {
        type: "WELCOME",
        userId: client.userId, // was: client.id
        username: client.username,
        room,
        users: getRoomUsers(room),
        onlineCount: getRoomOnlineCount(room),
        messages: history,
      });

      broadcast(
        room,
        {
          type: "USER_JOINED",
          users: getRoomUsers(room),
          onlineCount: getRoomOnlineCount(room),
          username: client.username,
          timestamp: Date.now(),
        },
        client.id,
      );
      break;
    }

      case "MESSAGE": {
        if (!client) return;
        const text = data.text?.trim().slice(0, 500);
        if (!text) return;

        let saved;
        try {
          saved = await Message.create({
            room: client.room,
            userId: client.userId,
            username: client.username,
            text,
          });
        } catch {
          return; // don't broadcast something that failed to save
        }

        broadcast(client.room, {
          type: "MESSAGE",
          id: saved.id,  // was: randomUUID() — now matches what history will return
          userId: client.userId, // was: client.id
          username: client.username,
          text,
          timestamp: saved.createdAt.getTime(), // was: Date.now() — same reasoning, use the persisted time
        });
        break;
      }

      case "TYPING": {
        if (!client) return;
        broadcast(
          client.room,
          {
            type: "TYPING",
            userId: client.userId,  // was: client.id
            username: client.username,
            isTyping: !!data.isTyping,
          },
          client.id,
        );
        break;
      }

      case "SWITCH_ROOM": {
        if (!client) return;
        const newRoom = data.room?.trim().slice(0, 100);
        if (!newRoom || newRoom === client.room) return;
        if (!canJoinRoom(newRoom, client.userId)) return; // NEW — silently ignore, don't leak that the room exists

        const oldRoom = client.room;
        leaveRoom(oldRoom, client.id);
        broadcast(oldRoom, {
          type: "USER_LEFT",
          users: getRoomUsers(oldRoom),
          onlineCount: getRoomOnlineCount(oldRoom),
          userId: client.userId, // was: client.id
          username: client.username,
          timestamp: Date.now(),
        });

        client.room = newRoom;

        let history: Awaited<ReturnType<typeof getRecentMessages>> = [];
        try {
          history = await getRecentMessages(newRoom);
        } catch (err) {
          console.error("Failed to load message history on JOIN:", err);
          // fall through with empty history instead of hanging the client forever
        }
        joinRoom(newRoom, client);

        send(ws, {
          type: "ROOM_SWITCHED",
          room: newRoom,
          users: getRoomUsers(newRoom),
          onlineCount: getRoomOnlineCount(newRoom),
          messages: history,
        });

        broadcast(
          newRoom,
          {
            type: "USER_JOINED",
            users: getRoomUsers(newRoom),
            onlineCount: getRoomOnlineCount(newRoom),
            username: client.username,
            timestamp: Date.now(),
          },
          client.id,
        );
        break;
      }
            case "EDIT_MESSAGE": {
        if (!client) return;
        const text = data.text?.trim().slice(0, 500);
        if (!text || !data.id || !mongoose.isValidObjectId(data.id)) return;

        let updated;
        try {
          updated = await Message.findOneAndUpdate(
            { _id: data.id, userId: client.userId }, // ownership check — only the sender can edit
            { text, edited: true },
            { returnDocument: "after" },
          );
        } catch {
          return;
        }
        if (!updated) return; // not found, or not the owner — silently ignore

        broadcast(client.room, {
          type: "MESSAGE_EDITED",
          id: String(updated._id),
          text: updated.text,
        });
        break;
      }

      case "DELETE_MESSAGE": {
        if (!client) return;
        if (!data.id || !mongoose.isValidObjectId(data.id)) return;

        let deleted;
        try {
          deleted = await Message.findOneAndDelete({
            _id: data.id,
            userId: client.userId, // ownership check — only the sender can delete
          });
        } catch {
          return;
        }
        if (!deleted) return;

        broadcast(client.room, {
          type: "MESSAGE_DELETED",
          id: String(deleted._id),
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    const count = connectionsByIp.get(clientIp) ?? 1;
    if (count <= 1) {
      connectionsByIp.delete(clientIp);
    } else {
      connectionsByIp.set(clientIp, count - 1);
    }
    if (!client) return;
    leaveRoom(client.room, client.id);
    broadcast(client.room, {
      type: "USER_LEFT",
      users: getRoomUsers(client.room),
      onlineCount: getRoomOnlineCount(client.room),
      userId: client.userId, // was: client.id
      username: client.username,
      timestamp: Date.now(),
    });
  });
});

async function main() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(
      `Relay server listening on http://localhost:${PORT} (HTTP + WebSocket)`,
    );
  });
}

// Tests import `server`/`wss` directly and drive them with real ws clients
// against an ephemeral port (server.listen(0, ...)) — they never want this
// module to also connect to the real database or bind to the real PORT on
// import, so this only runs outside the test environment. Vitest sets
// NODE_ENV=test automatically.
if (process.env.NODE_ENV !== "test") {
  main();
}

export { server, wss };
