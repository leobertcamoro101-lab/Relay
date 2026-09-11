import { createContext } from 'react';

export interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  name: string | null;
  image: string | null;
  token: string | null;
  login: (
    uid: string,
    token: string,
    expirationDate?: Date,
    name?: string,
    image?: string
  ) => void;
  logout: () => void;
  updateUserInfo: (newName: string, newImage: string) => void;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userId: null,
  name: null,
  image: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUserInfo: () => {},
});