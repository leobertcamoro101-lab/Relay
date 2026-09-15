import { 
  useContext, 
  useEffect,
  // useRef
  useState
 } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import { useWebSocket } from "../hooks/useWebSocket";
import MessageInput from "../pages/authenticated/MessageInput";
import MessageList from "../pages/authenticated/MessageList";
import Sidebar from "../pages/authenticated/Sidebar";
import LoadingSpinner from "../components/LoadingSpinner";

const DEFAULT_ROOM = "general";

function ChatInterface() {
  const navigate = useNavigate();
  const { logout, token } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  } = useWebSocket();

  const isDM = currentRoom.startsWith("dm_");
  const dmPartner = isDM ? users.find((u) => u.id !== currentUser?.id) : null;
  const roomLabel = isDM ? (dmPartner?.username ?? "Direct Message") : `# ${currentRoom}`;

  // Auto-join using the logged-in user's name — no manual username entry
  useEffect(() => {
    if (status === "disconnected" && token) {
      connect(token, DEFAULT_ROOM);
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
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }
  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentRoom={currentRoom}
        onlineCount={onlineCount}
        users={users}
        onSwitchRoom={switchRoom}
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
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
          </button>
          <div>
            <h2 className="text-white font-bold">{roomLabel}</h2>
            <p className="text-gray-500 text-xs">{onlineCount} online</p>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-mono">
              WebSocket connected
            </span>
            {/* for sentry testing only */}
            {/* <button
              onClick={() => {
                throw new Error("My first Sentry frontend error!");
              }}
              className="ml-2 text-red-400 hover:text-red-300 text-xs font-mono"
            >
              Test Sentry
            </button> */}
            <button
              onClick={handleLogout}
              title="Log out"
              className="ml-2 text-gray-400 hover:text-white transition-colors"
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
        />

        {/* Input */}
        <MessageInput onSend={sendMessage} onTyping={sendTyping} />
      </div>
    </div>
  );
}

export default ChatInterface;
