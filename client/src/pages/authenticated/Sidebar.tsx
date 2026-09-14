import type { User } from '../../types';
import AccountMenu from '../../Navigation/AccountMenu';
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
}

const Sidebar = ({ currentRoom, onlineCount, users, onSwitchRoom, currentUser, isOpen, onClose }: SidebarProps) => {
  const handleSwitchRoom = (room: string) => {
    onSwitchRoom(room);
    onClose(); // auto-close the mobile drawer once a room/DM is picked
  };

  return (
    <>
      {/* Mobile backdrop — only exists (and is clickable) while the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-56 bg-gray-900 border-r border-gray-700 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* App name */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-white font-bold">💬 Relay</h1>
          <p className="text-violet-400 font-mono text-xs">WebSocket</p>
        </div>

        {/* Rooms */}
        <div className="p-3">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">Rooms</p>
          {ROOMS.map((room) => (
            <button
              key={room}
              onClick={() => room !== currentRoom && handleSwitchRoom(room)}
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

        <UserSearch onStartDM={handleSwitchRoom} currentRoom={currentRoom} />

        {/* Online users */}
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-2">
            Online — {onlineCount}
          </p>
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
              <span className={`text-sm truncate ${
                user.id === currentUser?.id ? 'text-violet-300 font-medium' : 'text-gray-400'
              }`}>
                {user.username}
                {user.id === currentUser?.id && ' (you)'}
              </span>
            </div>
          ))}
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