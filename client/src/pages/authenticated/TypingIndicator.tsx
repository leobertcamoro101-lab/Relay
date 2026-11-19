import type { TypingUser } from "../../types";

// "Alice, Bob typing..." bubble shown at the bottom of the message list.
// Renders nothing when no one is typing.
export default function TypingIndicator({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;

  return (
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
  );
}
