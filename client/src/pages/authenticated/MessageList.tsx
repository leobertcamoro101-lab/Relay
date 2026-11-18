import { useCallback, useEffect, useRef, useState } from "react";
import { useMessageEditing } from "../../hooks/useMessageEditing";
import { useClickOutside } from "../../hooks/useClickOutside";
import { Pencil, Trash2, Check, X, MoreVertical, File as FileIcon, Download, Paperclip } from "lucide-react";
import { useFileUpload } from "../../hooks/useFileUpload";
import { ATTACHMENT_ACCEPT, formatFileSize, validateFile } from "../../utils/attachments";
import type { ChatMessage, MessageAttachment, TypingUser, User } from "../../types";

// What the user has chosen to do with the attachment while editing.
type AttachmentDraft =
  | { mode: "keep" }
  | { mode: "remove" }
  | { mode: "replace"; file: File };

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// Renders an attachment inside a message bubble: inline preview for images
// and video, a downloadable file card (icon + name + size) for everything
// else (pdf, doc, zip, etc).
function AttachmentPreview({
  attachment,
  isMine,
}: {
  attachment: MessageAttachment;
  isMine: boolean;
}) {
  if (attachment.type.startsWith("image/")) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-64 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (attachment.type.startsWith("video/")) {
    return (
      <video controls className="max-h-64 w-full bg-black">
        <source src={attachment.url} type={attachment.type} />
        Your browser can't play this video.
      </video>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-4 py-2.5 hover:underline ${
        isMine ? "text-white" : "text-relay-ink"
      }`}
    >
      <FileIcon size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.name}</span>
        <span className={`block text-xs ${isMine ? "text-white/70" : "text-relay-ink-subtle"}`}>
          {formatFileSize(attachment.size)}
        </span>
      </span>
      <Download size={16} className="shrink-0" />
    </a>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  currentUser: User | null;
  typingUsers: TypingUser[];
  onEditMessage: (id: string, text: string, attachment?: MessageAttachment | null) => void;
  onDeleteMessage: (id: string) => void;
}

const MessageList = ({
  messages,
  currentUser,
  typingUsers,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { editingId, editText, setEditText, startEdit, cancelEdit: cancelTextEdit } = useMessageEditing(onEditMessage);
  const { uploadFile } = useFileUpload();
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

  // Saves text + attachment changes. Done here (not in useMessageEditing) so
  // it can upload a replacement file first and allow empty text when an
  // attachment remains.
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
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const menuRef = useClickOutside(useCallback(() => setOpenMessageId(null), []));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this message?")) {
      onDeleteMessage(id);
    }
  };



  return (

    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg, i) => {
        if (msg.type === "SYSTEM") {
          return (
            <div key={i} className="text-center">
              <span className="text-relay-ink-subtle text-xs">{msg.text}</span>
            </div>
          );
        }

        const isMine = msg.userId === currentUser?.id || msg.isMine;
        const isEditing = editingId === msg.id;
        const isMenuOpen = msg.id === openMessageId;

        return (
          <div
            key={msg.id || i}
            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`group max-w-xs sm:max-w-md ${isMine ? "items-end" : "items-start"} flex flex-col`}
            >
              {!isMine && (
                <span className="text-xs text-relay-ink-subtle mb-1 ml-1">
                  {msg.username}
                </span>
              )}

              <div className="flex items-center gap-1">
                {isMine && !isEditing && msg.id && (
                  <div className="hidden group-hover:flex items-center gap-1">
                    <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMessageId(isMenuOpen ? null : msg.id!)}
                        className="p-2 rounded-full hover:bg-relay-hover text-relay-ink-subtle"
                        title="Message options"
                        aria-label="Message options"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-relay-surface rounded-lg shadow-lg border border-relay-border py-1 z-10">
                          <button
                            onClick={() => { setOpenMessageId(null); beginEdit(msg); }}
                            title="Edit message"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-relay-ink-muted hover:bg-relay-hover bg-transparent border-0 rounded-none m-0 justify-start"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { setOpenMessageId(null); handleDelete(msg.id!); }}
                            title="Delete message"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-relay-accent bg-relay-surface p-2">
                    {attachmentDraft.mode !== "remove" && (msg.attachment || attachmentDraft.mode === "replace") && (
                      <div className="flex items-center gap-2 rounded-lg bg-relay-hover px-2 py-1.5">
                        <FileIcon size={16} className="shrink-0 text-relay-ink-subtle" />
                        <span className="min-w-0 flex-1 truncate text-xs text-relay-ink">
                          {attachmentDraft.mode === "replace"
                            ? attachmentDraft.file.name
                            : msg.attachment!.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSaving}
                          title="Replace file"
                          aria-label="Replace file"
                          className="text-relay-ink-subtle hover:text-relay-ink disabled:opacity-50"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachmentDraft({ mode: "remove" })}
                          disabled={isSaving}
                          title="Remove file"
                          aria-label="Remove file"
                          className="text-relay-ink-subtle hover:text-red-600 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {attachmentDraft.mode === "remove" && msg.attachment && (
                      <div className="flex items-center justify-between rounded-lg bg-relay-hover px-2 py-1.5 text-xs text-relay-ink-subtle">
                        <span>File will be removed</span>
                        <button
                          type="button"
                          onClick={() => setAttachmentDraft({ mode: "keep" })}
                          className="text-relay-accent hover:underline"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(msg);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        placeholder={msg.attachment ? "Caption (optional)" : undefined}
                        maxLength={500}
                        className="px-3 py-1.5 rounded-xl text-sm bg-relay-surface text-relay-ink border border-relay-border focus:outline-none focus:border-relay-accent"
                      />
                      <button
                        onClick={() => saveEdit(msg)}
                        disabled={isSaving}
                        title="Save"
                        className="text-relay-online hover:text-relay-online/80 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        title="Cancel"
                        className="text-relay-ink-subtle hover:text-relay-ink disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {isSaving && <p className="text-xs text-relay-ink-subtle">Uploading...</p>}
                    {editError && (
                      <p className="text-xs text-red-600" role="alert">
                        {editError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl text-sm overflow-hidden ${
                      isMine
                        ? "bg-relay-accent text-white rounded-tr-sm"
                        : "bg-relay-hover text-relay-ink rounded-tl-sm"
                    } ${msg.attachment ? "" : "px-4 py-2.5"}`}
                  >
                    {msg.attachment && (
                      <AttachmentPreview attachment={msg.attachment} isMine={!!isMine} />
                    )}
                    {msg.text && (
                      <p className={`break-words ${msg.attachment ? "px-4 py-2" : ""}`}>
                        {msg.text}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <span className="text-xs text-relay-ink-subtle mt-1 mx-1">
                {msg.timestamp ? formatTime(msg.timestamp) : ""}
                {msg.edited ? " (edited)" : ""}
              </span>
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-relay-hover rounded-2xl rounded-tl-sm px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-relay-ink-subtle rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-relay-ink-subtle rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-relay-ink-subtle rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-relay-ink-subtle text-xs">
                {typingUsers.map((u) => u.username).join(", ")} typing...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* One shared hidden picker for "replace file" while editing. Kept outside
          the per-message div.group so each bubble has a single <input> (the
          edit field) — e2e selectors like `div.group input` rely on that. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        onChange={handleReplacePick}
        className="hidden"
        aria-label="Choose a replacement file"
      />
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
