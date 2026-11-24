import {
  useContext,
  useEffect,
  useRef,
  useState
 } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useConversations } from "../../hooks/useConversations";
import MessageInput from "../authenticated/MessageInput";
import MessageList from "../authenticated/MessageList";
import Sidebar from "./Sidebar";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getLastRoom, saveLastRoom, clearLastRoom } from "../../utils/lastRoom";
import type { ChatMessage, ReplyPreview } from "../../types";

const DEFAULT_ROOM = "general";
const NO_ROOM_STATE: Record<string, number> = {}; // stable default so effects don't re-run every render

function ChatInterface() {
  const navigate = useNavigate();
  const { logout, token } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const {
    status,
    messages,
    users,
    onlineCount,
    currentUser,
    currentRoom,
    typingUsers,
    connect,
    sendMessage,
    sendTyping,
    switchRoom,
    authError,
    editMessage,     // NEW
    deleteMessage,   // NEW
    toggleReaction,
    unreadRooms = NO_ROOM_STATE,
    roomActivity = NO_ROOM_STATE,
  } = useWebSocket();

  const {
    conversations,
    startConversation: handleStartConversation,
    deleteConversation: handleDeleteConversation,
    refreshConversations,
  } = useConversations(token, currentRoom, switchRoom, DEFAULT_ROOM);

  // Remember the room once the server has confirmed we're in it.
  useEffect(() => {
    if (status !== "connected" || !currentUser) return;
    if (currentRoom === DEFAULT_ROOM) clearLastRoom();
    else saveLastRoom(currentRoom);
  }, [status, currentUser, currentRoom]);

  // Someone started a DM with you: the room pings us before it's in the DM
  // list, so fetch the list once for each such room.
  const refreshedRooms = useRef(new Set<string>());
  useEffect(() => {
    for (const room of Object.keys(unreadRooms)) {
      if (!room.startsWith("dm_")) continue;
      if (conversations.some((c) => c.roomId === room)) continue;
      if (refreshedRooms.current.has(room)) continue;
      refreshedRooms.current.add(room);
      refreshConversations?.();
    }
  }, [unreadRooms, conversations, refreshConversations]);

  const hasUnread = Object.keys(unreadRooms).length > 0;

  // A reply target belongs to one room — drop it when the room changes.
  useEffect(() => {
    setReplyingTo(null);
  }, [currentRoom]);

  const handleReply = (msg: ChatMessage) => {
    if (!msg.id || !msg.username) return;
    setReplyingTo({
      id: msg.id,
      username: msg.username,
      text: msg.text,
      attachmentName: msg.attachment?.name,
    });
  };

  const isDM = currentRoom.startsWith("dm_");
  const dmPartner = isDM ? users.find((u) => u.id !== currentUser?.id) : null;
  const roomLabel = isDM ? (dmPartner?.username ?? "Direct Message") : `# ${currentRoom}`;

  // Auto-join using the logged-in user's name — no manual username entry
  useEffect(() => {
    if (status === "disconnected" && token) {
      // Back to the room you were in (refresh / reconnect), else the default.
      connect(token, getLastRoom() ?? DEFAULT_ROOM);
    }
  }, [status, token, connect, currentRoom, currentUser, users]);


  useEffect(() => {
  if (authError) {
    logout();
    navigate("/");
  }
}, [authError, logout, navigate]);

  // Waiting on the auto-connect
  if (status !== "connected" || !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-relay-bg">
        <LoadingSpinner />
      </div>
    );
  }
  return (
    <div className="h-screen flex bg-relay-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentRoom={currentRoom}
        onlineCount={onlineCount}
        users={users}
        onSwitchRoom={switchRoom}
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        onStartConversation={handleStartConversation}
        onDeleteConversation={handleDeleteConversation}
        unread={unreadRooms}
        activity={roomActivity}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-relay-surface border-b border-relay-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative md:hidden text-relay-ink-subtle hover:text-relay-ink transition-colors"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            {/* unread elsewhere: hint on the closed drawer button */}
            {hasUnread && (
              <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-relay-accent ring-2 ring-relay-bg" />
            )}
          </button>
          <div>
            <h2 className="text-relay-ink font-bold">{roomLabel}</h2>
            <p className="text-relay-ink-subtle text-xs">{onlineCount} online</p>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-relay-online rounded-full animate-pulse" />
            <span className="text-relay-online text-xs font-mono">
              WebSocket connected
            </span>
            <button
              onClick={handleLogout}
              title="Log out"
              className="ml-2 text-relay-ink-subtle hover:text-relay-ink transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onEditMessage={editMessage}     // NEW
          onDeleteMessage={deleteMessage} // NEW
          onToggleReaction={toggleReaction}
          onReply={handleReply}
        />

        {/* Input */}
        <MessageInput
          onSend={sendMessage}
          onTyping={sendTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}

export default ChatInterface;
