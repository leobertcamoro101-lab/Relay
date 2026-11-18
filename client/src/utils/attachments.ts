// Shared rules for chat attachments, used by the composer (MessageInput),
// the edit-message "replace file" flow (MessageList) and FilePicker.
// Keep MAX_ATTACHMENT_BYTES in sync with the server's upload limit
// (middleware/file-upload.ts) — this check is a convenience for the user,
// the server is the real enforcement.

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

// Comma-separated, same format as <input accept>: MIME patterns ("image/*"),
// exact MIME types, and ".ext" extensions.
export const ATTACHMENT_ACCEPT =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Does the file match an <input accept>-style list? Extensions are checked
// as well as MIME types because some browsers/OSes report an empty type
// for formats like .docx or .zip.
export function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

// Returns an error message for the user, or null when the file is fine.
export function validateFile(
  file: File,
  { accept = ATTACHMENT_ACCEPT, maxBytes = MAX_ATTACHMENT_BYTES }: { accept?: string; maxBytes?: number } = {}
): string | null {
  if (!matchesAccept(file, accept)) {
    return `"${file.name}" isn't a supported file type.`;
  }
  if (file.size > maxBytes) {
    return `"${file.name}" is larger than ${formatFileSize(maxBytes)}.`;
  }
  return null;
}
