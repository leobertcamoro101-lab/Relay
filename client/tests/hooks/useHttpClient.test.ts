import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHttpClient } from "../../src/hooks/http-hook";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useHttpClient", () => {
  it("returns parsed JSON on a successful request", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ hello: "world" }));
    const { result } = renderHook(() => useHttpClient());

    let response: unknown;
    await act(async () => {
      response = await result.current.sendRequest("https://api.example.com/things");
    });

    expect(response).toEqual({ hello: "world" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("throws and sets the error state when the response isn't ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ message: "Nope" }, false, 400));
    const { result } = renderHook(() => useHttpClient());

    await act(async () => {
      await expect(result.current.sendRequest("https://api.example.com/things")).rejects.toThrow("Nope");
    });

    expect(result.current.error).toBe("Nope");
    expect(result.current.isLoading).toBe(false);
  });

  it("clearError resets the error state", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ message: "boom" }, false));
    const { result } = renderHook(() => useHttpClient());

    await act(async () => {
      await result.current.sendRequest("https://api.example.com/things").catch(() => {});
    });
    expect(result.current.error).toBe("boom");

    act(() => result.current.clearError());
    expect(result.current.error).toBeUndefined();
  });

  it("swallows an aborted request without setting the error state", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);
    const { result } = renderHook(() => useHttpClient());

    let response: unknown;
    await act(async () => {
      response = await result.current.sendRequest("https://api.example.com/things");
    });

    expect(response).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("aborts any in-flight request's AbortController on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    let resolveFetch!: (value: Response) => void;
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useHttpClient());

    act(() => {
      // fire-and-forget — we only care that a request is left in flight
      result.current.sendRequest("https://api.example.com/slow").catch(() => {});
    });

    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
    resolveFetch(jsonResponse({}));
  });
});
