import { useState, useRef, useCallback, useContext, useEffect } from 'react';
import { Paperclip, File as FileIcon, X, CornerUpLeft } from 'lucide-react';
import { AuthContext } from '../../context/auth-context';
import { useHttpClient } from '../../hooks/useHttpClient';
import FilePicker from '../../components/FilePicker';
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, formatFileSize } from '../../utils/attachments';
import type { MessageAttachment, ReplyPreview } from '../../types';

interface MessageInputProps {
  onSend: (text: string, attachment?: MessageAttachment, replyTo?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyingTo?: ReplyPreview | null; // message being replied to, if any
  onCancelReply?: () => void;
}

const MessageInput = ({ onSend, onTyping, replyingTo, onCancelReply }: MessageInputProps) => {
  const [text, setText] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
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

  // Starting a reply puts the cursor in the box so you can just type.
  const replyId = replyingTo?.id;
  useEffect(() => {
    if (replyId) textInputRef.current?.focus();
  }, [replyId]);

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

  const handlePick = (picked: File | null, error: string) => {
    if (!picked) {
      setFileError(error); // keep any existing selection
      return;
    }
    setFileError(null);
    setFile(picked);
    setFilePreviewUrl(
      picked.type.startsWith('image/') ? URL.createObjectURL(picked) : null
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

      // Only pass a third argument when actually replying, so plain sends keep
      // the same call shape as before.
      if (replyingTo) {
        onSend(trimmed, attachment, replyingTo.id);
        onCancelReply?.();
      } else {
        onSend(trimmed, attachment);
      }
      setText('');
      removeFile();
      // Stop typing indicator
      typingRef.current = false;
      onTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    },
    [text, file, onSend, onTyping, sendRequest, auth.token, removeFile, replyingTo, onCancelReply]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // This is a single-line <input>, not a <textarea>, so Shift+Enter has
    // no newline to insert — it's just a no-op. We still need to
    // preventDefault() unconditionally on Enter, because a text <input>
    // inside a <form> submits natively on Enter regardless of shiftKey;
    // without this, Shift+Enter would silently fall through to that
    // native submit instead of being suppressed.
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.();
      return;
    }
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
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-relay-border bg-relay-hover px-3 py-2">
          <CornerUpLeft size={16} className="shrink-0 text-relay-accent" />
          <div className="min-w-0 flex-1 border-l-2 border-relay-accent pl-2">
            <p className="truncate text-xs font-semibold text-relay-ink">
              Replying to {replyingTo.username}
            </p>
            <p className="truncate text-xs text-relay-ink-subtle">
              {replyingTo.text || replyingTo.attachmentName || 'Message'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            title="Cancel reply"
            className="shrink-0 rounded-full p-1 text-relay-ink-subtle hover:bg-relay-surface hover:text-relay-ink"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
        <FilePicker
          accept={ATTACHMENT_ACCEPT}
          maxBytes={MAX_ATTACHMENT_BYTES}
          label="Choose a file to attach"
          title="Attach a file"
          icon={Paperclip}
          disabled={isUploading}
          onPick={handlePick}
          className="shrink-0 text-relay-ink-subtle hover:text-relay-ink transition-colors"
        />

        <input
          id="message-text"
          ref={textInputRef}
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
