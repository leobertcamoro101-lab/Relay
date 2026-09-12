import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import Avatar from "../../components/Avatar";

interface FoundUser {
  id: string;
  firstName: string;
  lastName: string;
  image: string;
}

interface ConversationEntry {
  roomId: string;
  otherUser: { id: string; firstName: string; lastName: string; image: string } | null;
}

interface UserSearchProps {
  onStartDM: (roomId: string) => void;
  currentRoom: string;
}

const UserSearch = ({ onStartDM, currentRoom }: UserSearchProps) => {
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);

  // Load your existing DM list from the server once, on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await sendRequest(
          `${import.meta.env.VITE_BACKEND_URL}/conversations`,
          "GET",
          null,
          { Authorization: `Bearer ${auth.token}` }
        );
        setConversations(data.conversations);
      } catch {
        // error already captured by useHttpClient's error state
      }
    };
    if (auth.token) fetchConversations();
  }, [auth.token, sendRequest]);

  const handleChange = async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      const data = await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/users?q=${encodeURIComponent(value)}`,
        "GET",
        null,
        { Authorization: `Bearer ${auth.token}` }
      );
      setResults(data.users);
      setOpen(true);
    } catch {
      // error already captured by useHttpClient's error state
    }
  };

  const handleSelect = async (user: FoundUser) => {
    setQuery("");
    setResults([]);
    setOpen(false);

    try {
      const data = await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/conversations`,
        "POST",
        JSON.stringify({ otherUserId: user.id }),
        { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` }
      );

      setConversations((prev) => {
        const withoutThisUser = prev.filter((c) => c.otherUser?.id !== user.id);
        return [{ roomId: data.roomId, otherUser: user }, ...withoutThisUser];
      });

      onStartDM(data.roomId);
    } catch {
      // error already captured by useHttpClient's error state
    }
  };

  return (
    <div>
      <div className="relative px-3 pb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Find people..."
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />

        {open && results.length > 0 && (
          <div className="absolute left-3 right-3 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
              >
                <div className="w-6 h-6 shrink-0">
                  <Avatar image={u.image} alt={u.firstName} width="24px" />
                </div>
                {u.firstName} {u.lastName}
              </button>
            ))}
          </div>
        )}

        {open && results.length === 0 && query.trim() && (
          <div className="absolute left-3 right-3 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 px-3 py-2 text-sm text-gray-500">
            No users found.
          </div>
        )}
      </div>

      {conversations.length > 0 && (
        <div className="px-3 pb-3">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">
            Direct Messages
          </p>
          {conversations.map((c) => (
            <button
              key={c.roomId}
              onClick={() => onStartDM(c.roomId)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 truncate ${
                currentRoom === c.roomId
                  ? 'bg-violet-500/20 text-violet-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {c.otherUser ? `${c.otherUser.firstName} ${c.otherUser.lastName}` : "Unknown user"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;