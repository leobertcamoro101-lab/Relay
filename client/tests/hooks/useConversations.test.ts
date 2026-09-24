import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const sendRequest = vi.fn();

// useConversations.ts imports `useHttpClient` from "./useHttpClient" — mocking
// it here isolates the hook under test from fetch/AbortController/the
// LoadingContext it would otherwise need a provider for.
vi.mock("../../src/hooks/useHttpClient.ts", () => ({
  useHttpClient: () => ({ sendRequest }),
}));

const { useConversations } = await import("../../src/hooks/useConversations");

beforeEach(() => {
  sendRequest.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useConversations", () => {
  it("fetches the conversation list on mount when a token is present", async () => {
    sendRequest.mockResolvedValueOnce({
      conversations: [{ roomId: "dm_a_b", otherUser: null }],
    });
    const switchRoom = vi.fn();

    const { result } = renderHook(() => useConversations("tok", "general", switchRoom, "general"));

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/conversations"),
      "GET",
      null,
      { Authorization: "Bearer tok" },
    );
  });

  it("does not fetch anything when there is no token yet", () => {
    const switchRoom = vi.fn();
    renderHook(() => useConversations(null, "general", switchRoom, "general"));
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("starts a conversation, refetches the list, and switches to the new room", async () => {
    sendRequest
      .mockResolvedValueOnce({ conversations: [] }) // initial mount fetch
      .mockResolvedValueOnce({ roomId: "dm_new_room" }) // POST /conversations
      .mockResolvedValueOnce({ conversations: [{ roomId: "dm_new_room", otherUser: null }] }); // refetch
    const switchRoom = vi.fn();

    const { result } = renderHook(() => useConversations("tok", "general", switchRoom, "general"));
    await waitFor(() => expect(sendRequest).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.startConversation("other-user-id");
    });

    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/conversations"),
      "POST",
      JSON.stringify({ otherUserId: "other-user-id" }),
      { Authorization: "Bearer tok", "Content-Type": "application/json" },
    );
    expect(switchRoom).toHaveBeenCalledWith("dm_new_room");
  });

  it("confirms before deleting, and removes the conversation from the list", async () => {
    vi.stubGlobal("confirm", () => true);
    sendRequest.mockResolvedValueOnce({ conversations: [{ roomId: "dm_a_b", otherUser: null }] });
    const switchRoom = vi.fn();

    const { result } = renderHook(() => useConversations("tok", "dm_a_b", switchRoom, "general"));
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    sendRequest.mockResolvedValueOnce({ message: "Conversation deleted." });

    await act(async () => {
      await result.current.deleteConversation("dm_a_b");
    });

    expect(result.current.conversations).toHaveLength(0);
    // deleting the room you're currently in falls back to the fallback room
    expect(switchRoom).toHaveBeenCalledWith("general");
  });

  it("does nothing if the user cancels the delete confirmation", async () => {
    vi.stubGlobal("confirm", () => false);
    sendRequest.mockResolvedValueOnce({ conversations: [{ roomId: "dm_a_b", otherUser: null }] });
    const switchRoom = vi.fn();

    const { result } = renderHook(() => useConversations("tok", "dm_a_b", switchRoom, "general"));
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    await act(async () => {
      await result.current.deleteConversation("dm_a_b");
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(switchRoom).not.toHaveBeenCalled();
  });
});
