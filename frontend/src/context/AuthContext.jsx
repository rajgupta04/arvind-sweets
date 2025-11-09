// Auth context - global authentication state
import React, { createContext, useState, useEffect } from 'react';
import { login, register, getProfile, updateProfile } from '../services/authService.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
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
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
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
