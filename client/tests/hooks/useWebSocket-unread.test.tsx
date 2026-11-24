import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../src/hooks/useWebSocket";

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    FakeSocket.last = this;
  }
  emit(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function connected() {
  const hook = renderHook(() => useWebSocket());
  act(() => hook.result.current.connect("token", "general"));
  act(() => FakeSocket.last.onopen?.());
  act(() =>
    FakeSocket.last.emit({ type: "WELCOME", userId: "me", username: "Me", room: "general", users: [], onlineCount: 1, messages: [] })
  );
  return hook;
}

describe("useWebSocket unread tracking", () => {
  it("counts an UNREAD ping for another room and records its activity", () => {
    const { result } = connected();
    act(() => FakeSocket.last.emit({ type: "UNREAD", room: "tech", timestamp: 111 }));
    act(() => FakeSocket.last.emit({ type: "UNREAD", room: "tech", timestamp: 222 }));
    expect(result.current.unreadRooms).toEqual({ tech: 2 });
    expect(result.current.roomActivity.tech).toBe(222);
  });

  it("ignores an UNREAD ping for the room you are in", () => {
    const { result } = connected();
    act(() => FakeSocket.last.emit({ type: "UNREAD", room: "general", timestamp: 1 }));
    expect(result.current.unreadRooms).toEqual({});
  });

  it("clears the unread dot when you open that room", () => {
    const { result } = connected();
    act(() => FakeSocket.last.emit({ type: "UNREAD", room: "tech", timestamp: 5 }));
    act(() =>
      FakeSocket.last.emit({ type: "ROOM_SWITCHED", room: "tech", users: [], onlineCount: 1, messages: [] })
    );
    expect(result.current.unreadRooms).toEqual({});
    expect(result.current.roomActivity.tech).toBe(5); // keeps its place at the top
  });

  it("bumps the current room's activity when a message arrives in it", () => {
    const { result } = connected();
    act(() => FakeSocket.last.emit({ type: "MESSAGE", id: "m1", userId: "x", username: "X", text: "hi", timestamp: 999 }));
    expect(result.current.roomActivity.general).toBe(999);
  });

  it("loads saved unread counts and room order from the WELCOME message", () => {
    const { result } = connected();
    act(() =>
      FakeSocket.last.emit({
        type: "WELCOME", userId: "me", username: "Me", room: "general", users: [], onlineCount: 1, messages: [],
        unread: { tech: 4, dm_a_b: 1 },
        activity: { tech: 300, dm_a_b: 200, general: 100 },
      })
    );
    expect(result.current.unreadRooms).toEqual({ tech: 4, dm_a_b: 1 });
    expect(result.current.roomActivity).toMatchObject({ tech: 300, dm_a_b: 200, general: 100 });
  });

  it("starts with no dots when WELCOME has no unread state", () => {
    const { result } = connected();
    expect(result.current.unreadRooms).toEqual({});
  });

  it("never moves a room's activity backwards when WELCOME arrives", () => {
    const { result } = connected();
    act(() => FakeSocket.last.emit({ type: "UNREAD", room: "tech", timestamp: 900 }));
    act(() =>
      FakeSocket.last.emit({
        type: "WELCOME", userId: "me", username: "Me", room: "general", users: [], onlineCount: 1, messages: [],
        unread: {}, activity: { tech: 500 },
      })
    );
    expect(result.current.roomActivity.tech).toBe(900);
  });
});
