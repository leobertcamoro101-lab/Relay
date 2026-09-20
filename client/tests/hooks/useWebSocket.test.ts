import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../src/hooks/useWebSocket";

// A fully-controllable stand-in for the browser WebSocket API. jsdom has
// no real network stack, and even if it did we want deterministic,
// instant control over open/message/close events rather than a real
// socket — so every test drives the server side of the "connection" by
// hand via simulateOpen/simulateMessage/simulateClose.
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  url: string;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }

  // ---- test helpers, simulating the server side ----
  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

function latestSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useWebSocket", () => {
  it("connects and sends JOIN once the socket opens", () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect("tok", "general");
    });
    expect(result.current.status).toBe("connecting");

    act(() => {
      latestSocket().simulateOpen();
    });

    expect(result.current.status).toBe("connected");
    expect(latestSocket().sent).toEqual([
      JSON.stringify({ type: "JOIN", token: "tok", room: "general" }),
    ]);
  });

  it("applies a WELCOME message to state", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());

    act(() =>
      latestSocket().simulateMessage({
        type: "WELCOME",
        userId: "u1",
        username: "Alice",
        room: "general",
        users: [{ id: "u1", username: "Alice" }],
        onlineCount: 1,
        messages: [{ type: "MESSAGE", id: "m1", text: "hi", userId: "u1", username: "Alice" }],
      }),
    );

    expect(result.current.currentUser).toEqual({ id: "u1", username: "Alice" });
    expect(result.current.currentRoom).toBe("general");
    expect(result.current.users).toEqual([{ id: "u1", username: "Alice" }]);
    expect(result.current.onlineCount).toBe(1);
    expect(result.current.messages).toHaveLength(1);
  });

  it("appends incoming MESSAGE events", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));

    act(() =>
      latestSocket().simulateMessage({ type: "MESSAGE", id: "m1", text: "hey", userId: "u2", username: "Bob" }),
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ id: "m1", text: "hey" });
  });

  it("turns USER_JOINED / USER_LEFT into SYSTEM messages and updates the roster", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));

    act(() =>
      latestSocket().simulateMessage({
        type: "USER_JOINED",
        users: [{ id: "u1", username: "Alice" }, { id: "u2", username: "Bob" }],
        onlineCount: 2,
        username: "Bob",
        timestamp: 123,
      }),
    );
    expect(result.current.onlineCount).toBe(2);
    expect(result.current.messages.at(-1)).toMatchObject({ type: "SYSTEM", text: "Bob joined the room" });

    act(() =>
      latestSocket().simulateMessage({
        type: "USER_LEFT",
        users: [{ id: "u1", username: "Alice" }],
        onlineCount: 1,
        userId: "u2",
        username: "Bob",
        timestamp: 124,
      }),
    );
    expect(result.current.onlineCount).toBe(1);
    expect(result.current.messages.at(-1)).toMatchObject({ type: "SYSTEM", text: "Bob left the room" });
  });

  it("clears a departed user's typing indicator on USER_LEFT", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));

    act(() =>
      latestSocket().simulateMessage({ type: "TYPING", userId: "u2", username: "Bob", isTyping: true }),
    );
    expect(result.current.typingUsers).toEqual([{ userId: "u2", username: "Bob" }]);

    act(() =>
      latestSocket().simulateMessage({
        type: "USER_LEFT",
        users: [],
        onlineCount: 0,
        userId: "u2",
        username: "Bob",
        timestamp: 1,
      }),
    );
    expect(result.current.typingUsers).toEqual([]);
  });

  it("auto-expires a typing indicator after 3 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));

    act(() =>
      latestSocket().simulateMessage({ type: "TYPING", userId: "u2", username: "Bob", isTyping: true }),
    );
    expect(result.current.typingUsers).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.typingUsers).toHaveLength(0);
  });

  it("does not add a duplicate typing entry for repeated TYPING events from the same user", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));

    act(() => latestSocket().simulateMessage({ type: "TYPING", userId: "u2", username: "Bob", isTyping: true }));
    act(() => latestSocket().simulateMessage({ type: "TYPING", userId: "u2", username: "Bob", isTyping: true }));

    expect(result.current.typingUsers).toHaveLength(1);
  });

  it("applies ROOM_SWITCHED: new room, new roster, new history, clears typing", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() => latestSocket().simulateMessage({ type: "WELCOME", userId: "u1", username: "Alice", room: "general" }));
    act(() => latestSocket().simulateMessage({ type: "TYPING", userId: "u2", username: "Bob", isTyping: true }));

    act(() =>
      latestSocket().simulateMessage({
        type: "ROOM_SWITCHED",
        room: "tech",
        users: [{ id: "u1", username: "Alice" }],
        onlineCount: 1,
        messages: [{ type: "MESSAGE", id: "m9", text: "welcome to tech", userId: "u1", username: "Alice" }],
      }),
    );

    expect(result.current.currentRoom).toBe("tech");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.typingUsers).toEqual([]);
  });

  it("applies MESSAGE_EDITED and MESSAGE_DELETED", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());
    act(() =>
      latestSocket().simulateMessage({
        type: "WELCOME",
        userId: "u1",
        username: "Alice",
        room: "general",
        messages: [{ type: "MESSAGE", id: "m1", text: "original", userId: "u1", username: "Alice" }],
      }),
    );

    act(() => latestSocket().simulateMessage({ type: "MESSAGE_EDITED", id: "m1", text: "edited!" }));
    expect(result.current.messages[0]).toMatchObject({ id: "m1", text: "edited!", edited: true });

    act(() => latestSocket().simulateMessage({ type: "MESSAGE_DELETED", id: "m1" }));
    expect(result.current.messages).toHaveLength(0);
  });

  it("sets authError when the socket closes with code 4001, but not for other close codes", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    act(() => latestSocket().simulateOpen());

    act(() => latestSocket().simulateClose(4001));
    expect(result.current.authError).toBe(true);
    expect(result.current.status).toBe("disconnected");
  });

  it("only sends outgoing actions while the socket is OPEN", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    // still "connecting" — readyState is CONNECTING, not OPEN yet
    act(() => result.current.sendMessage("too early"));
    expect(latestSocket().sent).toEqual([]);

    act(() => latestSocket().simulateOpen());
    act(() => result.current.sendMessage("hello"));
    act(() => result.current.sendTyping(true));
    act(() => result.current.switchRoom("tech"));
    act(() => result.current.editMessage("m1", "new text"));
    act(() => result.current.deleteMessage("m1"));

    expect(latestSocket().sent).toEqual([
      JSON.stringify({ type: "JOIN", token: "tok", room: "general" }),
      JSON.stringify({ type: "MESSAGE", text: "hello" }),
      JSON.stringify({ type: "TYPING", isTyping: true }),
      JSON.stringify({ type: "SWITCH_ROOM", room: "tech" }),
      JSON.stringify({ type: "EDIT_MESSAGE", id: "m1", text: "new text" }),
      JSON.stringify({ type: "DELETE_MESSAGE", id: "m1" }),
    ]);
  });

  it("closes the previous socket when connect() is called again (reconnect)", () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    const first = latestSocket();
    act(() => first.simulateOpen());

    act(() => result.current.connect("tok2", "tech"));

    expect(first.readyState).toBe(FakeWebSocket.CLOSED);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("closes the socket on unmount", () => {
    const { result, unmount } = renderHook(() => useWebSocket());
    act(() => result.current.connect("tok", "general"));
    const socket = latestSocket();
    act(() => socket.simulateOpen());

    unmount();

    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
  });
});
