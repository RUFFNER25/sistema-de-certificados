import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) {
      // Here you could optionally validate the token with the backend
      // For now, we decode it or just assume it's valid if present
      // To be safe, we just store it. If it's invalid, API calls will fail (401/403) and we can logout then.
      localStorage.setItem('token', token);
      setUser({ token }); // Minimal user object
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (username, password) => {
    const resp = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Login fallido');
    }

    const data = await resp.json();
    setToken(data.token);
  };

  const logout = () => {
    setToken('');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
