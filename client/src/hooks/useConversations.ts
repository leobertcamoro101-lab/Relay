import { useCallback, useEffect, useState } from "react";
import { useHttpClient } from "./useHttpClient";
import type { ConversationSummary } from "../types";

// Owns the Direct Messages list: fetching it on mount, starting a new
// conversation, and deleting one. Pulled out of ChatInterface.tsx so that
// component only has to deal with session lifecycle (connect/logout) and
// rendering — this hook is the whole conversations subsystem.
export const useConversations = (
  token: string | null,
  currentRoom: string,
  switchRoom: (room: string) => void,
  fallbackRoom: string
) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const { sendRequest } = useHttpClient();

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const responseData = await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/conversations`,
        "GET",
        null,
        { Authorization: `Bearer ${token}` }
      );
      setConversations(responseData.conversations ?? []);
    } catch {
      // error already captured by useHttpClient's error state
    }
  }, [token, sendRequest]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startConversation = useCallback(
    async (otherUserId: string) => {
      if (!token) return;
      try {
        const responseData = await sendRequest(
          `${import.meta.env.VITE_BACKEND_URL}/conversations`,
          "POST",
          JSON.stringify({ otherUserId }),
          { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        );
        await fetchConversations();
        switchRoom(responseData.roomId);
      } catch {
        // error already captured by useHttpClient's error state
      }
    },
    [token, sendRequest, fetchConversations, switchRoom]
  );

  const deleteConversation = useCallback(
    async (roomId: string) => {
      if (!token) return;
      if (!window.confirm("Delete this conversation? This can't be undone.")) return;
      try {
        await sendRequest(
          `${import.meta.env.VITE_BACKEND_URL}/conversations/${roomId}`,
          "DELETE",
          null,
          { Authorization: `Bearer ${token}` }
        );
        setConversations((prev) => prev.filter((c) => c.roomId !== roomId));
        if (roomId === currentRoom) {
          switchRoom(fallbackRoom);
        }
      } catch {
        // error already captured by useHttpClient's error state
      }
    },
    [token, sendRequest, currentRoom, switchRoom, fallbackRoom]
  );

  return { conversations, startConversation, deleteConversation };
};
