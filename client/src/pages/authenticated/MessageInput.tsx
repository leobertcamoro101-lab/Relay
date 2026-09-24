import { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const MessageInput = ({ onSend, onTyping }: MessageInputProps) => {
  const [text, setText] = useState('');
  const typingRef = useRef(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    // Stop typing indicator
    typingRef.current = false;
    onTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, [text, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 flex gap-2">
      <input
        id="message-text"
        name="message"
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={500}
        autoComplete="off"
        className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm
                   rounded-xl px-4 py-2.5 outline-none focus:border-violet-400
                   transition-colors placeholder-gray-600"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50
                   text-white font-bold px-5 py-2.5 rounded-xl transition-colors shrink-0"
      >
        Send
      </button>
    </form>
  );
};

export default MessageInput;
