import { Check, X, File as FileIcon, Paperclip } from "lucide-react";
import type { AttachmentDraft } from "../../hooks/useAttachmentEditing";
import type { ChatMessage } from "../../types";

interface MessageEditPanelProps {
  message: ChatMessage;
  draft: AttachmentDraft;
  editText: string;
  isSaving: boolean;
  error: string | null;
  onTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReplaceFile: () => void;
  onRemoveFile: () => void;
  onUndoRemove: () => void;
}

// In-place editor shown instead of a message bubble: the current/new file chip
// (replace / remove), the caption/text input, Save + Cancel, and any error.
export default function MessageEditPanel({
  message,
  draft,
  editText,
  isSaving,
  error,
  onTextChange,
  onSave,
  onCancel,
  onReplaceFile,
  onRemoveFile,
  onUndoRemove,
}: MessageEditPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-relay-accent bg-relay-surface p-2">
      {draft.mode !== "remove" && (message.attachment || draft.mode === "replace") && (
        <div className="flex items-center gap-2 rounded-lg bg-relay-hover px-2 py-1.5">
          <FileIcon size={16} className="shrink-0 text-relay-ink-subtle" />
          <span className="min-w-0 flex-1 truncate text-xs text-relay-ink">
            {draft.mode === "replace"
              ? draft.file.name
              : message.attachment!.name}
          </span>
          <button
            type="button"
            onClick={onReplaceFile}
            disabled={isSaving}
            title="Replace file"
            aria-label="Replace file"
            className="text-relay-ink-subtle hover:text-relay-ink disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemoveFile}
            disabled={isSaving}
            title="Remove file"
            aria-label="Remove file"
            className="text-relay-ink-subtle hover:text-red-600 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {draft.mode === "remove" && message.attachment && (
        <div className="flex items-center justify-between rounded-lg bg-relay-hover px-2 py-1.5 text-xs text-relay-ink-subtle">
          <span>File will be removed</span>
          <button
            type="button"
            onClick={onUndoRemove}
            className="text-relay-accent hover:underline"
          >
            Undo
          </button>
        </div>
      )}
      <div className="flex items-center gap-1">
        <input
          autoFocus
          aria-label="Edit message"
          value={editText}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) onSave();
            if (e.key === "Escape") onCancel();
          }}
          placeholder={message.attachment ? "Caption (optional)" : undefined}
          maxLength={500}
          className="px-3 py-1.5 rounded-xl text-sm bg-relay-surface text-relay-ink border border-relay-border focus:outline-none focus:border-relay-accent"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          title="Save"
          aria-label="Save"
          className="text-relay-online hover:text-relay-online/80 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          title="Cancel"
          aria-label="Cancel"
          className="text-relay-ink-subtle hover:text-relay-ink disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {isSaving && <p role="status" className="text-xs text-relay-ink-subtle">Uploading...</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
