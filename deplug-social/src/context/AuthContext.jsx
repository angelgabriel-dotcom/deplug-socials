import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);
const storageKey = 'deplug_social_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(storageKey));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api.me(token).then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { localStorage.removeItem(storageKey); if (active) setToken(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const beginSession = useCallback(({ user: currentUser, session }) => {
    localStorage.setItem(storageKey, session.token);
    setToken(session.token);
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token;
    localStorage.removeItem(storageKey);
    setToken(null);
    setUser(null);
    if (currentToken) await api.logout(currentToken).catch(() => undefined);
  }, [token]);

  const updateUser = useCallback((updatedUser) => setUser(updatedUser), []);

  const value = useMemo(() => ({ user, token, loading, beginSession, logout, updateUser }), [user, token, loading, beginSession, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
