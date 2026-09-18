import { useState, useRef, useEffect } from 'react';
import { Trash2, X, MoreVertical } from 'lucide-react';
import type { User, ConversationSummary } from '../../types';
import AccountMenu from './AccountMenu';
import UserSearch from './UserSearch';

const ROOMS = ['general', 'tech', 'random'];

interface SidebarProps {
  currentRoom: string;
  onlineCount: number;
  users: User[];
  onSwitchRoom: (room: string) => void;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  onStartConversation: (userId: string) => void;
  onDeleteConversation: (roomId: string) => void;
}

const conversationLabel = (conversation: ConversationSummary) =>
  conversation.otherUser
    ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
    : 'Unknown user';

const Sidebar = ({
  currentRoom,
  onlineCount,
  users,
  onSwitchRoom,
  currentUser,
  isOpen,
  onClose,
  conversations,
  onStartConversation,
  onDeleteConversation,
}: SidebarProps) => {
  // Which conversation's "⋮" menu is open, by roomId (or none). One shared
  // piece of state instead of a useState per row — see rules-of-hooks.
  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpenMenuRoomId(null);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-56 bg-gray-900 border-r border-gray-700 flex flex-col transform transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App name */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold">💬 Relay</h1>
            <p className="text-violet-400 font-mono text-xs">WebSocket</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Rooms */}
          <div className="p-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">Rooms</p>
            {ROOMS.map((room) => (
              <button
                key={room}
                onClick={() => room !== currentRoom && onSwitchRoom(room)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 ${
                  room === currentRoom
                    ? 'bg-violet-500/20 text-violet-300 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                # {room}
              </button>
            ))}
          </div>

          {/* Direct messages */}
          <div className="p-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">
              Direct Messages
            </p>
            <UserSearch onSelectUser={onStartConversation} />
            {conversations.length === 0 && (
              <p className="text-gray-600 text-xs px-2">
                Search above, or click an online user below, to start a DM.
              </p>
            )}
            {conversations.map((conversation) => {
              const label = conversationLabel(conversation);
              const isActive = conversation.roomId === currentRoom;
              const isMenuOpen = conversation.roomId === openMenuRoomId;
              return (
                <div
                  key={conversation.roomId}
                  className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-1 cursor-pointer ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-300 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => onSwitchRoom(conversation.roomId)}
                >
                  <span className={`truncate flex-1 ${!conversation.otherUser ? 'italic text-gray-500' : ''}`}>
                    {label}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuRoomId(isMenuOpen ? null : conversation.roomId);
                        }}
                        title="Conversation options"
                        aria-label={`Options for ${label}`}
                        className="p-1 rounded-full text-gray-500 hover:text-white hover:bg-gray-700 shrink-0"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRoomId(null);
                              onDeleteConversation(conversation.roomId);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Online users */}
          <div className="p-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">
              Online — {onlineCount}
            </p>
            {users.map((user) => {
              const isMe = user.id === currentUser?.id;
              return (
                <div
                  key={user.id}
                  onClick={() => !isMe && onStartConversation(user.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${
                    isMe ? '' : 'cursor-pointer hover:bg-gray-800'
                  }`}
                  title={isMe ? undefined : `Message ${user.username}`}
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                  <span className={`text-sm truncate ${
                    isMe ? 'text-violet-300 font-medium' : 'text-gray-400'
                  }`}>
                    {user.username}
                    {isMe && ' (you)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current user */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <AccountMenu/>
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-white text-sm font-medium truncate">
              {currentUser?.username}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
