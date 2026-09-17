import { useState } from "react";
import type { ChatMessage } from "../types";

// Owns the "edit message in place" state machine used by MessageList:
// which message (if any) is being edited, and the draft text for it.
export const useMessageEditing = (onEditMessage: (id: string, text: string) => void) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = (msg: ChatMessage) => {
    if (!msg.id) return;
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (id: string) => {
    const trimmed = editText.trim();
    if (trimmed) onEditMessage(id, trimmed);
    setEditingId(null);
    setEditText("");
  };

  return { editingId, editText, setEditText, startEdit, cancelEdit, saveEdit };
};