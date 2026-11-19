interface ReactionBarProps {
  reactions?: Record<string, string[]>;
  currentUserId?: string;
  onToggle?: (emoji: string) => void;
}

// The emoji chips under a message: "👍 2". Highlighted when you've reacted;
// clicking toggles your reaction. Renders nothing when there are none.
export default function ReactionBar({ reactions, currentUserId, onToggle }: ReactionBarProps) {
  const entries = Object.entries(reactions ?? {}).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([emoji, users]) => {
        const reacted = !!currentUserId && users.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle?.(emoji)}
            disabled={!onToggle}
            aria-pressed={reacted}
            aria-label={`${emoji} ${users.length}${reacted ? ", you reacted" : ""}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              reacted
                ? "border-relay-accent bg-relay-accent/12 text-relay-accent-ink"
                : "border-relay-border bg-relay-hover text-relay-ink-muted hover:border-relay-accent"
            }`}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
