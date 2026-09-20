import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { server } from "../../src/index.js";
import Message from "../../src/models/messages.js";
import { getDMRoomId } from "../../src/util/dmRoom.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

let baseUrl: string;
const openSockets: WebSocket[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `ws://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Every socket opened by a test is tracked and force-closed afterward, so
// the server's per-IP connection count (all these tests connect from the
// same loopback address) is back to zero before the next test runs — the
// per-IP cap test below depends on that.
afterEach(async () => {
  await Promise.all(
    openSockets.splice(0).map(
      (ws) =>
        new Promise<void>((resolve) => {
          if (ws.readyState === WebSocket.CLOSED) return resolve();
          ws.once("close", () => resolve());
          ws.close();
        }),
    ),
  );
});

async function connect(options?: { headers?: Record<string, string>; origin?: string }): Promise<WebSocket> {
  const ws = new WebSocket(baseUrl, options);
  openSockets.push(ws);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  return ws;
}

function nextMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out waiting for a WS message")), 5000);
    ws.once("message", (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString()));
    });
  });
}

function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once("close", (code: number, reasonBuf: Buffer) =>
      resolve({ code, reason: reasonBuf.toString() }),
    );
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("WebSocket auth", () => {
  it("closes the connection on JOIN with an invalid token", async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: "JOIN", token: "not-a-real-token", room: "general" }));

    const { code } = await waitForClose(ws);
    expect(code).toBe(4001);
  });

  it("rejects connections from a disallowed origin", async () => {
    const ws = await connect({ origin: "https://evil.example.com" });
    const { code } = await waitForClose(ws);
    expect(code).toBe(4003);
  });

  it("welcomes a validly-authenticated client", async () => {
    const { user } = await createTestUser();
    const ws = await connect();
    ws.send(JSON.stringify({ type: "JOIN", token: tokenFor(user), room: "general" }));

    const welcome = await nextMessage(ws);
    expect(welcome.type).toBe("WELCOME");
    expect(welcome.room).toBe("general");
    expect(welcome.userId).toBe(user.id);
  });

  it("refuses to let a non-participant join a DM room (IDOR on the WS layer)", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const { user: mallory } = await createTestUser();
    const dmRoom = getDMRoomId(alice.id, bob.id);

    const ws = await connect();
    ws.send(JSON.stringify({ type: "JOIN", token: tokenFor(mallory), room: dmRoom }));

    const { code } = await waitForClose(ws);
    expect(code).toBe(4003);
  });
});

describe("WebSocket chat behavior", () => {
  it("broadcasts a MESSAGE to everyone in the room", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(aliceWs); // WELCOME

    const bobWs = await connect();
    bobWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(bob), room }));
    await nextMessage(bobWs); // WELCOME
    await nextMessage(aliceWs); // USER_JOINED (bob), fired at alice

    const bobIncoming = nextMessage(bobWs);
    aliceWs.send(JSON.stringify({ type: "MESSAGE", text: "hello bob" }));

    const received = await bobIncoming;
    expect(received.type).toBe("MESSAGE");
    expect(received.text).toBe("hello bob");
    expect(received.userId).toBe(alice.id);
  });

  it("does not double-count the same person's online status across two tabs (duplicate-online-users regression)", async () => {
    const { user: alice } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const tab1 = await connect();
    tab1.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(tab1); // WELCOME

    const tab2 = await connect();
    tab2.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    const welcome2 = await nextMessage(tab2);

    // Two connections, one real person — getRoomUsers/getRoomOnlineCount
    // dedupe by userId, not by connection id.
    expect(welcome2.onlineCount).toBe(1);
    expect(welcome2.users).toHaveLength(1);
  });

  it("only lets the author edit their own message", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(aliceWs); // WELCOME

    const ownMessage = nextMessage(aliceWs);
    aliceWs.send(JSON.stringify({ type: "MESSAGE", text: "original text" }));
    const { id: messageId } = await ownMessage;

    const bobWs = await connect();
    bobWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(bob), room }));
    await nextMessage(bobWs); // WELCOME
    await nextMessage(aliceWs); // USER_JOINED (bob)

    bobWs.send(JSON.stringify({ type: "EDIT_MESSAGE", id: messageId, text: "hijacked!" }));
    await sleep(300); // let the server finish processing (or silently drop) the edit

    const stored = await Message.findById(messageId);
    expect(stored?.text).toBe("original text");
    expect(stored?.edited).toBe(false);
  });

  it("silently ignores EDIT_MESSAGE with a malformed id instead of crashing", async () => {
    const { user: alice } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(aliceWs); // WELCOME

    aliceWs.send(JSON.stringify({ type: "EDIT_MESSAGE", id: "not-an-object-id", text: "x" }));
    await sleep(300);

    // Still open / usable afterward — a malformed id must not crash the connection.
    expect(aliceWs.readyState).toBe(WebSocket.OPEN);
  });

  it("broadcasts TYPING to others in the room, not back to the sender", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(aliceWs); // WELCOME

    const bobWs = await connect();
    bobWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(bob), room }));
    await nextMessage(bobWs); // WELCOME
    await nextMessage(aliceWs); // USER_JOINED (bob), fired at alice

    const bobIncoming = nextMessage(bobWs);
    aliceWs.send(JSON.stringify({ type: "TYPING", isTyping: true }));

    const typing = await bobIncoming;
    expect(typing.type).toBe("TYPING");
    expect(typing.userId).toBe(alice.id);
    expect(typing.isTyping).toBe(true);
  });

  it("only lets the author delete their own message, and broadcasts the deletion", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const room = `test-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room }));
    await nextMessage(aliceWs); // WELCOME

    const ownMessage = nextMessage(aliceWs);
    aliceWs.send(JSON.stringify({ type: "MESSAGE", text: "delete me maybe" }));
    const { id: messageId } = await ownMessage;

    const bobWs = await connect();
    bobWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(bob), room }));
    await nextMessage(bobWs); // WELCOME
    await nextMessage(aliceWs); // USER_JOINED (bob)

    // Bob isn't the author — deletion is silently ignored.
    bobWs.send(JSON.stringify({ type: "DELETE_MESSAGE", id: messageId }));
    await sleep(300);
    expect(await Message.findById(messageId)).not.toBeNull();

    // Alice is the author — deletion succeeds and broadcasts to the room.
    const deleteBroadcast = nextMessage(bobWs);
    aliceWs.send(JSON.stringify({ type: "DELETE_MESSAGE", id: messageId }));
    const deleted = await deleteBroadcast;
    expect(deleted.type).toBe("MESSAGE_DELETED");
    expect(deleted.id).toBe(messageId);
    expect(await Message.findById(messageId)).toBeNull();
  });
});

describe("room switching", () => {
  it("leaves the old room (broadcasting USER_LEFT) and joins the new one (with its own history)", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const oldRoom = `old-room-${Date.now()}`;
    const newRoom = `new-room-${Date.now()}`;

    const aliceWs = await connect();
    aliceWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(alice), room: oldRoom }));
    await nextMessage(aliceWs); // WELCOME

    const bobWs = await connect();
    bobWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(bob), room: oldRoom }));
    await nextMessage(bobWs); // WELCOME
    await nextMessage(aliceWs); // USER_JOINED (bob), at alice

    const bobSeesLeave = nextMessage(bobWs);
    aliceWs.send(JSON.stringify({ type: "SWITCH_ROOM", room: newRoom }));

    const left = await bobSeesLeave;
    expect(left.type).toBe("USER_LEFT");
    expect(left.userId).toBe(alice.id);
    expect(left.onlineCount).toBe(1); // just bob, left behind in oldRoom

    const switched = await nextMessage(aliceWs);
    expect(switched.type).toBe("ROOM_SWITCHED");
    expect(switched.room).toBe(newRoom);
    expect(switched.onlineCount).toBe(1); // just alice, now in newRoom

    // A message sent after switching lands in the new room, not the old one.
    const ownMessage = nextMessage(aliceWs);
    aliceWs.send(JSON.stringify({ type: "MESSAGE", text: "hello from the new room" }));
    const msg = await ownMessage;

    const stored = await Message.findById(msg.id);
    expect(stored?.room).toBe(newRoom);
  });

  it("silently ignores SWITCH_ROOM into a DM room you're not a participant in", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const { user: mallory } = await createTestUser();
    const dmRoom = getDMRoomId(alice.id, bob.id);

    const malloryWs = await connect();
    malloryWs.send(JSON.stringify({ type: "JOIN", token: tokenFor(mallory), room: "general" }));
    await nextMessage(malloryWs); // WELCOME

    malloryWs.send(JSON.stringify({ type: "SWITCH_ROOM", room: dmRoom }));
    await sleep(300);

    // Still connected — the switch was silently dropped rather than
    // crashing or leaking whether that DM room exists.
    expect(malloryWs.readyState).toBe(WebSocket.OPEN);
  });
});

describe("per-IP connection cap", () => {
  it("closes the 21st concurrent connection from the same IP", async () => {
    // MAX_CONNECTIONS_PER_IP in src/index.ts is 20. This test intentionally
    // hardcodes that number — if you ever raise the cap, update this too.
    const sockets = await Promise.all(Array.from({ length: 20 }, () => connect()));
    expect(sockets.every((ws) => ws.readyState === WebSocket.OPEN)).toBe(true);

    const overflow = await connect();
    const { code } = await waitForClose(overflow);
    expect(code).toBe(4008);
  });
});
