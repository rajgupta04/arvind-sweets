import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../services/api';
import {
  fetchMyProfile,
  loginWithEmailPassword,
  loginWithGoogle,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  async function persistToken(nextToken) {
    if (!nextToken) {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, nextToken);
  }

  async function hydrateFromStorage() {
    try {
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (savedToken) {
        setToken(savedToken);
        // Validate token by fetching profile.
        const profile = await fetchMyProfile();
        setUser(profile?.user || profile);
      }
    } catch (e) {
      // If profile fetch fails (token expired/revoked), clear local state.
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    hydrateFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const data = await loginWithEmailPassword({ email, password });

    // Common patterns: { token, user } OR { data: { token } }.
    const nextToken = data?.token || data?.accessToken || data?.jwt;
    if (!nextToken) throw new Error('Login succeeded but token missing');

    await persistToken(nextToken);
    setToken(nextToken);

    // Always re-fetch profile so the app depends on server truth.
    const profile = await fetchMyProfile();
    setUser(profile?.user || profile);

    return profile;
  }

  // Google OAuth UI runs in LoginScreen (expo-auth-session).
  // This method only exchanges Google token(s) for your backend JWT.
  async function googleLogin({ idToken, accessToken }) {
    const data = await loginWithGoogle({ idToken, accessToken });

    const nextToken = data?.token || data?.accessToken || data?.jwt;
    if (!nextToken) throw new Error('Google login succeeded but token missing');

    await persistToken(nextToken);
    setToken(nextToken);

    const profile = await fetchMyProfile();
    setUser(profile?.user || profile);

    return profile;
  }

  async function logout() {
    await persistToken(null);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      isAuthenticated: !!token,
      login,
      googleLogin,
      logout,
    }),
    [token, user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
