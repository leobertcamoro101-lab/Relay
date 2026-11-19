import { File as FileIcon, Download } from "lucide-react";
import { formatFileSize } from "../../utils/attachments";
import type { MessageAttachment } from "../../types";

// Renders an attachment inside a message bubble: inline preview for images
// and video, a downloadable file card (icon + name + size) for everything
// else (pdf, doc, zip, etc).
export default function AttachmentPreview({
  attachment,
  isMine,
}: {
  attachment: MessageAttachment;
  isMine: boolean;
}) {
  if (attachment.type.startsWith("image/")) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-64 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (attachment.type.startsWith("video/")) {
    return (
      <video controls className="max-h-64 w-full bg-black">
        <source src={attachment.url} type={attachment.type} />
        Your browser can't play this video.
      </video>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-4 py-2.5 hover:underline ${
        isMine ? "text-white" : "text-relay-ink"
      }`}
    >
      <FileIcon size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.name}</span>
        <span className={`block text-xs ${isMine ? "text-white/70" : "text-relay-ink-subtle"}`}>
          {formatFileSize(attachment.size)}
        </span>
      </span>
      <Download size={16} className="shrink-0" />
    </a>
  );
}
