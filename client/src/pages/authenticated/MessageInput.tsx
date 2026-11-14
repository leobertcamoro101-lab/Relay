import { useState, useRef, useCallback, useContext, useEffect } from 'react';
import { Paperclip, File as FileIcon, X } from 'lucide-react';
import { AuthContext } from '../../context/auth-context';
import { useHttpClient } from '../../hooks/useHttpClient';
import type { MessageAttachment } from '../../types';

interface MessageInputProps {
  onSend: (text: string, attachment?: MessageAttachment) => void;
  onTyping: (isTyping: boolean) => void;
}

// Keep this in sync with whatever the backend's upload route actually
// enforces — this is a client-side convenience check, not the source of
// truth. 25MB covers most images/documents/short clips without needing
// chunked upload.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_FILE_TYPES =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MessageInput = ({ onSend, onTyping }: MessageInputProps) => {
  const [text, setText] = useState('');
  const typingRef = useRef(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Revoke the object URL whenever it's replaced or the component unmounts,
  // so selecting several images in a row doesn't leak blob URLs.
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const removeFile = useCallback(() => {
    setFile((current) => {
      if (current) {
        setFilePreviewUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return null;
        });
      }
      return null;
    });
    setFileError(null);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again after removing it
    if (!selected) return;

    setFileError(null);
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `"${selected.name}" is larger than ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`
      );
      return;
    }

    setFile(selected);
    setFilePreviewUrl(
      selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Send typing indicator
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 1500);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed && !file) return; // nothing to send

      let attachment: MessageAttachment | undefined;

      if (file) {
        setIsUploading(true);
        setFileError(null);
        try {
          const formData = new FormData();
          formData.append('file', file);
          // NOTE: deliberately no Content-Type header here — the browser
          // sets the multipart boundary itself when the body is a
          // FormData. Setting it manually breaks the upload.
          const response = await sendRequest(
            `${import.meta.env.VITE_BACKEND_URL}/upload`,
            'POST',
            formData,
            { Authorization: `Bearer ${auth.token}` }
          );
          attachment = {
            url: response.url,
            name: file.name,
            type: file.type,
            size: file.size,
          };
        } catch (err) {
          setIsUploading(false);
          setFileError(err instanceof Error ? err.message : 'Upload failed. Try again.');
          return; // keep text + file selected so the user can retry
        }
        setIsUploading(false);
      }

      onSend(trimmed, attachment);
      setText('');
      removeFile();
      // Stop typing indicator
      typingRef.current = false;
      onTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    },
    [text, file, onSend, onTyping, sendRequest, auth.token, removeFile]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // This is a single-line <input>, not a <textarea>, so Shift+Enter has
    // no newline to insert — it's just a no-op. We still need to
    // preventDefault() unconditionally on Enter, because a text <input>
    // inside a <form> submits natively on Enter regardless of shiftKey;
    // without this, Shift+Enter would silently fall through to that
    // native submit instead of being suppressed.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.shiftKey) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const canSubmit = (text.trim().length > 0 || file !== null) && !isUploading;

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-relay-border">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-relay-border bg-relay-hover px-3 py-2">
          {filePreviewUrl ? (
            <img
              src={filePreviewUrl}
              alt={file.name}
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-relay-surface text-relay-ink-subtle">
              <FileIcon size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-relay-ink">{file.name}</p>
            <p className="text-xs text-relay-ink-subtle">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            disabled={isUploading}
            aria-label="Remove attachment"
            title="Remove attachment"
            className="shrink-0 rounded-full p-1 text-relay-ink-subtle hover:bg-relay-surface hover:text-relay-ink disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {fileError && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {fileError}
        </p>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Choose a file to attach"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach a file"
          aria-label="Attach a file"
          className="shrink-0 text-relay-ink-subtle hover:text-relay-ink disabled:opacity-50 transition-colors"
        >
          <Paperclip size={20} />
        </button>

        <input
          id="message-text"
          name="message"
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={file ? 'Add a caption (optional)...' : 'Type a message...'}
          maxLength={500}
          autoComplete="off"
          className="flex-1 bg-relay-hover border border-relay-border text-relay-ink text-sm
                     rounded-xl px-4 py-2.5 outline-none focus:border-relay-accent
                     transition-colors placeholder-relay-ink-subtle"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-relay-accent hover:bg-relay-accent-ink disabled:opacity-50
                     text-white font-bold px-5 py-2.5 rounded-xl transition-colors shrink-0"
        >
          {isUploading ? 'Uploading...' : 'Send'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
