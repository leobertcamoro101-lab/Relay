import { Link } from 'react-router-dom';
import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../../context/auth-context';
import Avatar from '../../components/Avatar';
import { ChevronDown, User, LogOut } from 'lucide-react';

function AccountMenu() {
	const auth = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!auth.isLoggedIn) return null;

  const linkClasses =
    'w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 no-underline';
	return (
		<div className="relative " ref={menuRef}>
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Account menu"
      >
        <div className="w-8 h-8">
          <Avatar image={auth.image ?? undefined} alt="Profile" name={auth.name ?? undefined} width="32px" />
        </div>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {menuOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
          <Link to="/profile" onClick={() => setMenuOpen(false)} className={linkClasses}>
            <User size={16} /> Profile
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              auth.logout();
            }}
            aria-label="Logout"
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
	);
}

export default AccountMenu;