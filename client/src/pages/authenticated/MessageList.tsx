import { useEffect, useRef, useState } from "react";
import { useMessageEditing } from "../../hooks/useMessageEditing";
import { Pencil, Trash2, Check, X, MoreVertical } from "lucide-react";
import type { ChatMessage, TypingUser, User } from "../../types";

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

interface MessageListProps {
  messages: ChatMessage[];
  currentUser: User | null;
  typingUsers: TypingUser[];
  onEditMessage: (id: string, text: string) => void;
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
  const { editingId, editText, setEditText, startEdit, cancelEdit, saveEdit } = useMessageEditing(onEditMessage);
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpenMessageId(null);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

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
              <span className="text-gray-600 text-xs">{msg.text}</span>
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
                <span className="text-xs text-gray-500 mb-1 ml-1">
                  {msg.username}
                </span>
              )}

              <div className="flex items-center gap-1">
                {isMine && !isEditing && msg.id && (
                  <div className="hidden group-hover:flex items-center gap-1">
                    <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMessageId(isMenuOpen ? null : msg.id!)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                        
                      >
                        <MoreVertical size={20} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => { setOpenMessageId(null); startEdit(msg); }}
                            title="Edit message"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-transparent border-0 rounded-none m-0 justify-start"
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
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(msg.id!);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="px-3 py-1.5 rounded-xl text-sm bg-gray-800 text-white border border-violet-500 focus:outline-none"
                    />
                    <button
                      onClick={() => saveEdit(msg.id!)}
                      title="Save"
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      title="Cancel"
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm ${
                      isMine
                        ? "bg-violet-500 text-white rounded-tr-sm"
                        : "bg-gray-700 text-gray-100 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>

              <span className="text-xs text-gray-600 mt-1 mx-1">
                {msg.timestamp ? formatTime(msg.timestamp) : ""}
                {msg.edited ? " (edited)" : ""}
              </span>
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-gray-400 text-xs">
                {typingUsers.map((u) => u.username).join(", ")} typing...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
