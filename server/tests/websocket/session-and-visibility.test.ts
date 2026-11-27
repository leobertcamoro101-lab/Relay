import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { WebSocket } from "ws";
import request from "supertest";
import type { AddressInfo } from "node:net";
import { server } from "../../src/index.js";
import app from "../../src/app.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

let baseUrl: string;
const openSockets: WebSocket[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
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

async function connect(): Promise<WebSocket> {
  const ws = new WebSocket(baseUrl);
  openSockets.push(ws);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  return ws;
}

// Resolves with the first message of the given type (or rejects on timeout).
function waitFor(ws: WebSocket, type: string, ms = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`timed out waiting for ${type}`));
    }, ms);
    const onMessage = (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off("message", onMessage);
        resolve(msg);
      }
    };
    ws.on("message", onMessage);
  });
}

async function join(user: Awaited<ReturnType<typeof createTestUser>>["user"], extra: object = {}) {
  const ws = await connect();
  const welcome = waitFor(ws, "WELCOME");
  ws.send(JSON.stringify({ type: "JOIN", token: tokenFor(user), room: "general", ...extra }));
  await welcome;
  return ws;
}

describe("open sockets and password changes", () => {
  it("closes the user's open socket with 4001 when they change their password", async () => {
    const { user, plainPassword } = await createTestUser();
    const ws = await join(user);
    const closed = new Promise<number>((resolve) => ws.once("close", (code) => resolve(code)));

    await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ currentPassword: plainPassword, newPassword: "brand-new-password" })
      .expect(200);

    expect(await closed).toBe(4001);
  });

  it("does not close other people's sockets", async () => {
    const { user, plainPassword } = await createTestUser();
    const { user: other } = await createTestUser();
    const otherWs = await join(other);

    await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ currentPassword: plainPassword, newPassword: "brand-new-password" })
      .expect(200);

    await new Promise((r) => setTimeout(r, 300));
    expect(otherWs.readyState).toBe(WebSocket.OPEN);
  });
});

describe("a tab that connects while hidden", () => {
  it("is pinged UNREAD for its own open room", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const aliceWs = await join(alice, { hidden: true });
    const bobWs = await join(bob);

    const unread = waitFor(aliceWs, "UNREAD");
    bobWs.send(JSON.stringify({ type: "MESSAGE", text: "anyone there?" }));

    const msg = await unread;
    expect(msg.room).toBe("general");
  });

  it("is not pinged for its open room when it connected visible", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const aliceWs = await join(alice);
    const bobWs = await join(bob);

    const unread = waitFor(aliceWs, "UNREAD", 600);
    bobWs.send(JSON.stringify({ type: "MESSAGE", text: "hello" }));

    await expect(unread).rejects.toThrow(/timed out/);
  });
});
