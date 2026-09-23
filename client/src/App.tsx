import { RouterProvider } from 'react-router-dom';

import { AuthContext } from './context/auth-context';
import { LoadingProvider } from './context/LoadingProvider';
import { useAuth } from './hooks/auth-hook';
import router from './router/router';

function App() {
  const { token, login, logout, userId, name, image, updateUserInfo } = useAuth();

  return (
    <LoadingProvider>
      <AuthContext.Provider 
        value={{ 
          isLoggedIn: !!token,
          token: token,
          userId: userId,
          name: name,
          image: image,
          login: login,
          logout: logout,
          updateUserInfo: updateUserInfo,
        }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </LoadingProvider>
  );
}

export default App;
