import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../src/hooks/useWebSocket";

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

let hidden = false;
function setHidden(value: boolean) {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  hidden = false;
  vi.stubGlobal("WebSocket", FakeSocket);
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const server = (msg: object) =>
  act(() => FakeSocket.last.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent));

function joined() {
  const hook = renderHook(() => useWebSocket());
  act(() => hook.result.current.connect("token", "general"));
  act(() => FakeSocket.last.onopen?.());
  server({ type: "WELCOME", userId: "u1", username: "Alan", room: "general", users: [], onlineCount: 1, messages: [] });
  return hook;
}

const sent = () => FakeSocket.last.send.mock.calls.map((c) => JSON.parse(c[0]));

describe("unread while the tab is hidden", () => {
  it("ignores an UNREAD ping for the open room while the tab is visible", () => {
    const { result } = joined();
    server({ type: "UNREAD", room: "general", timestamp: 1 });
    expect(result.current.unreadRooms.general).toBeUndefined();
  });

  it("counts an UNREAD ping for the open room while the tab is hidden", () => {
    const { result } = joined();
    setHidden(true);
    server({ type: "UNREAD", room: "general", timestamp: 1 });
    expect(result.current.unreadRooms.general).toBe(1);
  });

  it("clears the open room's dot when the tab becomes visible again", () => {
    const { result } = joined();
    setHidden(true);
    server({ type: "UNREAD", room: "general", timestamp: 1 });
    act(() => setHidden(false));
    expect(result.current.unreadRooms.general).toBeUndefined();
  });
});

describe("telling the server", () => {
  it("sends VISIBILITY when the tab is hidden and shown", () => {
    joined();
    act(() => setHidden(true));
    act(() => setHidden(false));
    const v = sent().filter((m) => m.type === "VISIBILITY");
    expect(v.map((m) => m.visible)).toEqual([false, true]);
  });

  it("reports a hidden tab right after connecting", () => {
    hidden = true;
    joined();
    expect(sent()).toContainEqual({ type: "VISIBILITY", visible: false });
  });
});
