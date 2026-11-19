import { useCallback, useEffect, useRef, useState } from "react";
import { useMessageEditing } from "../../hooks/useMessageEditing";
import { useClickOutside } from "../../hooks/useClickOutside";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { useAttachmentEditing } from "../../hooks/useAttachmentEditing";
import { ATTACHMENT_ACCEPT } from "../../utils/attachments";
import MessageEditPanel from "./MessageEditPanel";
import AttachmentPreview from "./AttachmentPreview";
import TypingIndicator from "./TypingIndicator";
import type { ChatMessage, MessageAttachment, TypingUser, User } from "../../types";

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
  const {
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
  } = useAttachmentEditing({ editText, onEditMessage, startEdit, cancelTextEdit });
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
                  <MessageEditPanel
                    message={msg}
                    draft={attachmentDraft}
                    editText={editText}
                    isSaving={isSaving}
                    error={editError}
                    onTextChange={setEditText}
                    onSave={() => saveEdit(msg)}
                    onCancel={cancelEdit}
                    onReplaceFile={openFilePicker}
                    onRemoveFile={markRemoved}
                    onUndoRemove={undoRemove}
                  />
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

      <TypingIndicator typingUsers={typingUsers} />

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
