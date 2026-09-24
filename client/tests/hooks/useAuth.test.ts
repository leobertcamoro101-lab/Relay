import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../../src/hooks/useAuth";

beforeEach(() => {
  localStorage.clear();
});

describe("useAuth", () => {
  it("login sets auth state and persists it to localStorage", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login("u1", "tok", undefined, "Alice", "avatar.png");
    });

    expect(result.current.token).toBe("tok");
    expect(result.current.userId).toBe("u1");
    expect(result.current.name).toBe("Alice");
    expect(result.current.image).toBe("avatar.png");

    const stored = JSON.parse(localStorage.getItem("userData")!);
    expect(stored.userId).toBe("u1");
    expect(stored.token).toBe("tok");
  });

  it("logout clears auth state and localStorage", () => {
    const { result } = renderHook(() => useAuth());
    act(() => result.current.login("u1", "tok", undefined, "Alice", "avatar.png"));

    act(() => result.current.logout());

    expect(result.current.token).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(localStorage.getItem("userData")).toBeNull();
  });

  it("auto-logs-in from valid, unexpired data already in localStorage", async () => {
    const expiration = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(
      "userData",
      JSON.stringify({ userId: "u2", token: "stored-tok", expiration, name: "Bob", image: "" }),
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.token).toBe("stored-tok"));
    expect(result.current.userId).toBe("u2");
  });

  it("does not auto-log-in from expired stored data", async () => {
    const expiration = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem(
      "userData",
      JSON.stringify({ userId: "u2", token: "stale-tok", expiration, name: "Bob", image: "" }),
    );

    const { result } = renderHook(() => useAuth());

    // give the mount-time effect a moment to (not) fire its setTimeout(0)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result.current.token).toBeNull();
  });

  it("automatically logs out once the token expires", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login("u1", "tok", new Date(Date.now() + 5000), "Alice", "");
      });
      expect(result.current.token).toBe("tok");

      act(() => {
        vi.advanceTimersByTime(5001);
      });
      expect(result.current.token).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("updateUserInfo updates name/image in state and in localStorage", () => {
    const { result } = renderHook(() => useAuth());
    act(() => result.current.login("u1", "tok", undefined, "Alice", "old.png"));

    act(() => result.current.updateUserInfo("Alice B.", "new.png"));

    expect(result.current.name).toBe("Alice B.");
    expect(result.current.image).toBe("new.png");
    const stored = JSON.parse(localStorage.getItem("userData")!);
    expect(stored.name).toBe("Alice B.");
    expect(stored.image).toBe("new.png");
  });
});
