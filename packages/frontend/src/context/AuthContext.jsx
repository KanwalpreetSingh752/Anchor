import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, getAccessToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data.user);
      }
    } catch (err) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      fetchUser();
    } else {
      // Try refresh token cookie
      api.post('/auth/refresh')
        .then(res => {
          if (res.data?.data?.accessToken) {
            setAccessToken(res.data.data.accessToken);
            fetchUser();
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          setLoading(false);
        });
    }

    const onExpired = () => {
      setUser(null);
    };
    window.addEventListener('anchor_session_expired', onExpired);
    return () => window.removeEventListener('anchor_session_expired', onExpired);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      return res.data;
    }
    throw new Error(res.data?.error?.message || 'Login failed');
  };

  const register = async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    if (res.data?.success) {
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      return res.data;
    }
    throw new Error(res.data?.error?.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
