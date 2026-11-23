import { useCallback, useState } from "react";
import { SmilePlus } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { REACTION_EMOJIS } from "../../utils/reactions";

// A small "add reaction" button that opens a row of emoji to pick from.
// Each message gets its own instance, so it owns its open/closed state.
// `align` is which edge of the button the popover lines up with. Own messages sit
// on the right of the screen, so it opens leftwards ("right"); other people's sit
// on the left next to the sidebar, so it must open rightwards ("left") or the
// emoji row gets clipped.
export default function ReactionPicker({
  onPick,
  align = "right",
}: {
  onPick: (emoji: string) => void;
  align?: "left" | "right";
}) {
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
        className="p-1.5 sm:p-2 rounded-full hover:bg-relay-hover text-relay-ink-subtle"
      >
        <SmilePlus size={20} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Choose a reaction"
          className={`absolute bottom-full mb-1 ${align === "left" ? "left-0" : "right-0"} z-10 flex gap-1 rounded-full border border-relay-border bg-relay-surface px-2 py-1 shadow-lg`}
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
