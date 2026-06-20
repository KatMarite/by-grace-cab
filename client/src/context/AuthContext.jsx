import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('bgc_token');
    const savedUser = sessionStorage.getItem('bgc_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setReady(true);
  }, []);

  function persist(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    sessionStorage.setItem('bgc_token', nextToken);
    sessionStorage.setItem('bgc_user', JSON.stringify(nextUser));
  }

  async function login(email, password) {
    const data = await api.login({ email, password });
    persist(data.token, data.user);
    return data.user;
  }

  async function signup(payload) {
    const data = await api.signup(payload);
    persist(data.token, data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('bgc_token');
    sessionStorage.removeItem('bgc_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
