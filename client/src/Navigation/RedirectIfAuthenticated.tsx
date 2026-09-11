import { useContext, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';

interface RedirectIfAuthenticatedProps {
  children: ReactNode;
}

function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const { isLoggedIn } = useContext(AuthContext);

  if (isLoggedIn) {
    return <Navigate to="/relay" replace />;
  }

  return children;
}

export default RedirectIfAuthenticated;