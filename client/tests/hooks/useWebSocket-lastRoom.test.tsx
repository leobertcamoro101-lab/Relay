import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../src/hooks/useWebSocket";
import { getLastRoom, saveLastRoom } from "../../src/utils/lastRoom";

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    FakeSocket.last = this;
  }
}

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function connectedHook() {
  const hook = renderHook(() => useWebSocket());
  act(() => hook.result.current.connect("token", "tech"));
  return hook;
}

describe("remembered room is forgotten when the server refuses it", () => {
  it("clears it when the server closes with 4003 (not a participant)", () => {
    saveLastRoom("dm_x_y");
    connectedHook();
    act(() => FakeSocket.last.onclose?.({ code: 4003 }));
    expect(getLastRoom()).toBeNull();
  });

  it("clears it on a failed login (4001)", () => {
    saveLastRoom("tech");
    connectedHook();
    act(() => FakeSocket.last.onclose?.({ code: 4001 }));
    expect(getLastRoom()).toBeNull();
  });

  it("keeps it on an ordinary disconnect so the reconnect returns to the same room", () => {
    saveLastRoom("tech");
    connectedHook();
    act(() => FakeSocket.last.onclose?.({ code: 1006 }));
    expect(getLastRoom()).toBe("tech");
  });
});
