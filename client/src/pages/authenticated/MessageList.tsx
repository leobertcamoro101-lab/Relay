import { useEffect, useRef } from 'react';
import type { ChatMessage, TypingUser, User } from '../../types';

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface MessageListProps {
  messages: ChatMessage[];
  currentUser: User | null;
  typingUsers: TypingUser[];
}

const MessageList = ({ messages, currentUser, typingUsers }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg, i) => {
        // System messages (join/leave)
        if (msg.type === 'SYSTEM') {
          return (
            <div key={i} className="text-center">
              <span className="text-gray-600 text-xs">{msg.text}</span>
            </div>
          );
        }

        const isMine = msg.userId === currentUser?.id || msg.isMine;

        return (
          <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs sm:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Username */}
              {!isMine && (
                <span className="text-xs text-gray-500 mb-1 ml-1">{msg.username}</span>
              )}
              {/* Bubble */}
              <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                isMine
                  ? 'bg-violet-500 text-white rounded-tr-sm'
                  : 'bg-gray-700 text-gray-100 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
              {/* Time */}
              <span className="text-xs text-gray-600 mt-1 mx-1">
                {msg.timestamp ? formatTime(msg.timestamp) : ''}
              </span>
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-gray-400 text-xs">
                {typingUsers.map(u => u.username).join(', ')} typing...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
