import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnreadTitle } from "../../src/hooks/useUnreadTitle";

beforeEach(() => {
  document.title = "Relay";
});

describe("useUnreadTitle", () => {
  it("leaves the title alone when nothing is unread", () => {
    renderHook(() => useUnreadTitle({}));
    expect(document.title).toBe("Relay");
  });

  it("adds the total unread count across rooms", () => {
    const { result } = renderHook(() => useUnreadTitle({ tech: 2, dm_a_b: 1 }));
    expect(document.title).toBe("(3) Relay");
    expect(result.current).toBe(3);
  });

  it("updates in place without stacking prefixes, and restores at 0", () => {
    const { rerender } = renderHook(({ u }) => useUnreadTitle(u), { initialProps: { u: { tech: 1 } as Record<string, number> } });
    expect(document.title).toBe("(1) Relay");
    rerender({ u: { tech: 4 } });
    expect(document.title).toBe("(4) Relay");
    rerender({ u: {} });
    expect(document.title).toBe("Relay");
  });

  it("caps the display at 99+", () => {
    renderHook(() => useUnreadTitle({ general: 99, tech: 5 }));
    expect(document.title).toBe("(99+) Relay");
  });

  it("restores the original title on unmount", () => {
    const { unmount } = renderHook(() => useUnreadTitle({ tech: 2 }));
    unmount();
    expect(document.title).toBe("Relay");
  });
});
