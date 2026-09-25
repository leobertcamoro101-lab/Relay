import { useContext, useState } from "react";
import { AuthContext } from "../../context/auth-context";
import { useHttpClient } from "../../hooks/useHttpClient";
import Avatar from "../../components/Avatar";

interface FoundUser {
  id: string;
  firstName: string;
  lastName: string;
  image: string;
}

interface UserSearchProps {
  // Starting the conversation (POST /conversations, refreshing the DM
  // list, switching rooms) is owned by the parent — this component only
  // finds the user and reports the pick.
  onSelectUser: (userId: string) => void;
}

const UserSearch = ({ onSelectUser }: UserSearchProps) => {
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [open, setOpen] = useState(false);

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

  const handleSelect = (user: FoundUser) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelectUser(user.id);
  };

  return (
    <div className="relative px-3 pb-3">
      <input
        id="user-search"
        name="userSearch"
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Find people..."
        autoComplete="off"
        className="w-full bg-relay-hover text-relay-ink text-sm rounded-lg px-3 py-2 placeholder-relay-ink-subtle focus:outline-none focus:ring-1 focus:ring-relay-accent"
      />

      {open && results.length > 0 && (
        <div className="absolute left-3 right-3 mt-1 bg-relay-surface border border-relay-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSelect(u)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-relay-ink-muted hover:bg-relay-hover"
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
        <div className="absolute left-3 right-3 mt-1 bg-relay-surface border border-relay-border rounded-lg shadow-lg z-10 px-3 py-2 text-sm text-relay-ink-subtle">
          No users found.
        </div>
      )}
    </div>
  );
};

export default UserSearch;
