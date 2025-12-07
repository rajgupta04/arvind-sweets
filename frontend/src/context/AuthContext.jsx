// Auth context - global authentication state
import React, { createContext, useState, useEffect } from 'react';
import { login, register, getProfile, updateProfile } from '../services/authService.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
      setLoading(false);
    } else if (storedToken) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await getProfile();
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    try {
      const response = await login(email, password);
      const userData = response.data;
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(userData.token);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const registerUser = async (userData) => {
    try {
      const response = await register(userData);
      const userDataResponse = response.data;
      localStorage.setItem('token', userDataResponse.token);
      localStorage.setItem('user', JSON.stringify(userDataResponse));
      setToken(userDataResponse.token);
      setUser(userDataResponse);
      return userDataResponse;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = async (userData) => {
    try {
      const response = await updateProfile(userData);
      setUser(response.data);
      try {
        const existing = localStorage.getItem('user');
        const parsed = existing ? JSON.parse(existing) : {};
        const merged = { ...parsed, ...response.data };
        localStorage.setItem('user', JSON.stringify(merged));
      } catch {}
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      loginUser,
      registerUser,
      updateUser,
      logout,
      loadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
