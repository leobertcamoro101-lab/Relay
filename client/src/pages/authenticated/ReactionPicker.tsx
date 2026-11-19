import { useCallback, useState } from "react";
import { SmilePlus } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { REACTION_EMOJIS } from "../../utils/reactions";

// A small "add reaction" button that opens a row of emoji to pick from.
// Each message gets its own instance, so it owns its open/closed state.
export default function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(useCallback(() => setOpen(false), []));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Add reaction"
        aria-label="Add reaction"
        aria-expanded={open}
        className="p-2 rounded-full hover:bg-relay-hover text-relay-ink-subtle"
      >
        <SmilePlus size={20} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Choose a reaction"
          className="absolute bottom-full mb-1 right-0 z-10 flex gap-1 rounded-full border border-relay-border bg-relay-surface px-2 py-1 shadow-lg"
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(emoji);
              }}
              aria-label={`React with ${emoji}`}
              className="rounded-full p-1 text-lg leading-none hover:bg-relay-hover"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
