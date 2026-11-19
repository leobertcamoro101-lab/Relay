import { useRef, useState } from "react";
import { useFileUpload } from "./useFileUpload";
import { validateFile } from "../utils/attachments";
import type { ChatMessage, MessageAttachment } from "../types";

// What the user has chosen to do with the attachment while editing.
export type AttachmentDraft =
  | { mode: "keep" }
  | { mode: "remove" }
  | { mode: "replace"; file: File };

interface Options {
  /** Current text in the edit box (owned by useMessageEditing). */
  editText: string;
  onEditMessage: (id: string, text: string, attachment?: MessageAttachment | null) => void;
  /** From useMessageEditing — this hook wraps them so the draft resets with them. */
  startEdit: (msg: ChatMessage) => void;
  cancelTextEdit: () => void;
}

// The attachment half of "edit a sent message": keep / remove / replace the
// file, upload a replacement, and save text + attachment together. Text state
// itself stays in useMessageEditing; this hook sits next to it.
export function useAttachmentEditing({ editText, onEditMessage, startEdit, cancelTextEdit }: Options) {
  const { uploadFile } = useFileUpload();
  // Attach this to the (single, shared) hidden <input type="file">.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraft>({ mode: "keep" });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const resetDraft = () => {
    setAttachmentDraft({ mode: "keep" });
    setEditError(null);
    setIsSaving(false);
  };

  const cancelEdit = () => {
    cancelTextEdit();
    resetDraft();
  };

  const beginEdit = (msg: ChatMessage) => {
    resetDraft();
    startEdit(msg);
  };

  const openFilePicker = () => fileInputRef.current?.click();
  const markRemoved = () => setAttachmentDraft({ mode: "remove" });
  const undoRemove = () => setAttachmentDraft({ mode: "keep" });

  const handleReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    const error = validateFile(selected);
    if (error) {
      setEditError(error);
      return;
    }
    setEditError(null);
    setAttachmentDraft({ mode: "replace", file: selected });
  };

  // Uploads a replacement first (if any), then sends text + attachment change.
  // Allows empty text when an attachment remains.
  const saveEdit = async (msg: ChatMessage) => {
    if (!msg.id || isSaving) return;
    const text = editText.trim();
    const keepsAttachment =
      attachmentDraft.mode === "replace" ||
      (attachmentDraft.mode === "keep" && !!msg.attachment);
    if (!text && !keepsAttachment) return; // would leave an empty message

    let attachment: MessageAttachment | null | undefined; // undefined = unchanged
    if (attachmentDraft.mode === "remove") {
      attachment = msg.attachment ? null : undefined;
    } else if (attachmentDraft.mode === "replace") {
      setIsSaving(true);
      setEditError(null);
      try {
        attachment = await uploadFile(attachmentDraft.file);
      } catch (err) {
        setIsSaving(false);
        setEditError(err instanceof Error ? err.message : "Upload failed. Try again.");
        return; // stay in edit mode so the user can retry
      }
    }

    const textChanged = text !== (msg.text ?? "");
    if (!textChanged && attachment === undefined) {
      cancelEdit(); // nothing actually changed
      return;
    }
    // Omit the third argument entirely when the attachment is untouched, so a
    // plain text edit calls onEditMessage(id, text) exactly as before.
    if (attachment === undefined) onEditMessage(msg.id, text);
    else onEditMessage(msg.id, text, attachment);
    cancelEdit();
  };

  return {
    attachmentDraft,
    isSaving,
    editError,
    fileInputRef,
    beginEdit,
    cancelEdit,
    saveEdit,
    openFilePicker,
    markRemoved,
    undoRemove,
    handleReplacePick,
  };
}
