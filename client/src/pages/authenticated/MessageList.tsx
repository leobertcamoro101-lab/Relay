import { useCallback, useEffect, useRef, useState } from "react";
import { useMessageEditing } from "../../hooks/useMessageEditing";
import { useClickOutside } from "../../hooks/useClickOutside";
import { Pencil, Trash2, MoreVertical, CornerUpLeft } from "lucide-react";
import { useAttachmentEditing } from "../../hooks/useAttachmentEditing";
import { ATTACHMENT_ACCEPT } from "../../utils/attachments";
import MessageEditPanel from "./MessageEditPanel";
import ReactionPicker from "./ReactionPicker";
import ReactionBar from "./ReactionBar";
import AttachmentPreview from "./AttachmentPreview";
import ReplyQuote from "./ReplyQuote";
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
  onToggleReaction?: (id: string, emoji: string) => void; // omit to hide reactions
  onReply?: (message: ChatMessage) => void; // omit to hide the Reply button
}

const MessageList = ({
  messages,
  currentUser,
  typingUsers,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onReply,
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

  // Scroll to the quoted message and flash it. If the original isn't in the
  // loaded history (or was deleted) there is nothing to scroll to — no-op.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpToMessage = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1500);
  }, []);
  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  const replyButton = (msg: ChatMessage) =>
    onReply && (
      <button
        type="button"
        onClick={() => onReply(msg)}
        title="Reply"
        aria-label="Reply"
        className="p-1.5 sm:p-2 rounded-full hover:bg-relay-hover text-relay-ink-subtle"
      >
        <CornerUpLeft size={20} />
      </button>
    );

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
            id={msg.id ? `msg-${msg.id}` : undefined}
            className={`flex rounded-xl transition-colors duration-500 ${
              isMine ? "justify-end" : "justify-start"
            } ${msg.id && msg.id === highlightId ? "bg-relay-accent/15" : ""}`}
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
                  <div className="hidden group-hover:flex group-focus-within:flex [@media(hover:none)]:flex items-center gap-1">
                    {replyButton(msg)}
                    {onToggleReaction && (
                      <ReactionPicker onPick={(emoji) => onToggleReaction(msg.id!, emoji)} />
                    )}
                    <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMessageId(isMenuOpen ? null : msg.id!)}
                        className="p-1.5 sm:p-2 rounded-full hover:bg-relay-hover text-relay-ink-subtle"
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
                    {msg.replyTo && (
                      <ReplyQuote
                        reply={msg.replyTo}
                        isMine={!!isMine}
                        onJump={jumpToMessage}
                        className={msg.attachment ? "m-2 w-auto" : "mb-2"}
                      />
                    )}
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

                {!isMine && msg.id && (onToggleReaction || onReply) && (
                  <div className="hidden group-hover:flex group-focus-within:flex [@media(hover:none)]:flex items-center">
                    {onToggleReaction && (
                      <ReactionPicker align="left" onPick={(emoji) => onToggleReaction(msg.id!, emoji)} />
                    )}
                    {replyButton(msg)}
                  </div>
                )}
              </div>

              <ReactionBar
                reactions={msg.reactions}
                currentUserId={currentUser?.id}
                onToggle={onToggleReaction && msg.id ? (emoji) => onToggleReaction(msg.id!, emoji) : undefined}
              />

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
