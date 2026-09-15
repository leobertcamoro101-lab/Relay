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
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  // Populated once this connection sends JOIN.
  let client: ClientState | null = null;

  ws.on("message", async (raw) => {
    let data: ClientMessage;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    switch (data.type) {
      case "JOIN": {
      const token = data.token;
      const room = data.room?.trim() || DEFAULT_ROOM;
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
      

      // const history = await getRecentMessages(room); // not wrapped in try/catch it will caused back button loading forever

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
        const newRoom = data.room?.trim();
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

        // const history = await getRecentMessages(newRoom); // not wrapped in try/catch it will caused back button loading forever

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
        if (!text || !data.id) return;

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
        if (!data.id) return;

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

main();
