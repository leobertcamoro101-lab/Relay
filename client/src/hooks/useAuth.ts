import { useState, useCallback, useEffect } from "react";

let logoutTimer: ReturnType<typeof setTimeout>;

interface StoredUserData {
  userId: string;
  token: string;
  expiration: string;
  name: string;
  image: string;
}

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpirationDate, setTokenExpirationDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  const login = useCallback(
    (uid: string, token: string, expirationDate?: Date, name?: string, image?: string) => {
      setToken(token);
      setUserId(uid);
      setName(name ?? null);
      setImage(image ?? null);
      const newExpirationDate =
        expirationDate || new Date(new Date().getTime() + 1000 * 60 * 60);
      setTokenExpirationDate(newExpirationDate);
      localStorage.setItem(
        "userData",
        JSON.stringify({
          userId: uid,
          token: token,
          expiration: newExpirationDate.toISOString(),
          name: name,
          image: image,
        })
      );
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setTokenExpirationDate(null);
    setUserId(null);
    setName(null);
    setImage(null);
    localStorage.removeItem("userData");
  }, []);

  useEffect(() => {
    if (token && tokenExpirationDate) {
      const remainingTime =
        tokenExpirationDate.getTime() - new Date().getTime();
      logoutTimer = setTimeout(logout, remainingTime);
    } else {
      clearTimeout(logoutTimer);
    }
  }, [token, logout, tokenExpirationDate]);

  useEffect(() => {
    const raw = localStorage.getItem("userData");
    const storedData: StoredUserData | null = raw ? JSON.parse(raw) : null;

    if (
      storedData &&
      storedData.token &&
      new Date(storedData.expiration) > new Date()
    ) {
      const timer = setTimeout(() => {
        login(
          storedData.userId,
          storedData.token,
          new Date(storedData.expiration),
          storedData.name,
          storedData.image
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [login]);

  const updateUserInfo = useCallback((newName: string, newImage: string) => {
    setName(newName);
    setImage(newImage);

    const raw = localStorage.getItem("userData");
    const storedData: StoredUserData | null = raw ? JSON.parse(raw) : null;
    if (storedData) {
      localStorage.setItem(
        "userData",
        JSON.stringify({ ...storedData, name: newName, image: newImage })
      );
    }
  }, []);

  return { token, login, logout, userId, name, image, updateUserInfo };
};