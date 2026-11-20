import { Paperclip } from "lucide-react";
import type { ReplyPreview } from "../../types";

// The quoted preview shown at the top of a reply bubble. Clicking it asks the
// list to scroll to the original message.
export default function ReplyQuote({
  reply,
  isMine,
  onJump,
  className = "",
}: {
  reply: ReplyPreview;
  isMine: boolean;
  onJump?: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump?.(reply.id)}
      aria-label={`Replying to ${reply.username}. Jump to original message`}
      title="Jump to original message"
      className={`block w-full text-left rounded-lg border-l-4 px-2 py-1 text-xs ${
        isMine
          ? "border-white/70 bg-white/15 text-white"
          : "border-relay-accent bg-relay-surface text-relay-ink-muted"
      } ${className}`}
    >
      <span className="block font-semibold truncate">{reply.username}</span>
      <span className="block truncate opacity-90">
        {reply.text ||
          (reply.attachmentName ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip size={11} /> {reply.attachmentName}
            </span>
          ) : (
            "Message"
          ))}
      </span>
    </button>
  );
}
