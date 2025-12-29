// Auth context - global authentication state
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { login, register, getProfile, updateProfile } from '../services/authService.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrappedRef = useRef(false);
  const profileRequestRef = useRef(null);

  const clearAuth = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const fetchProfileOnce = useCallback(async () => {
    if (profileRequestRef.current) return profileRequestRef.current;

    profileRequestRef.current = (async () => {
      const response = await getProfile();
      setUser(response.data);
      try {
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch {}
      return response.data;
    })();

    try {
      return await profileRequestRef.current;
    } finally {
      // keep ref around during this session so we never refetch on re-renders
    }
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrap = async () => {
      setLoading(true);

      // Accept OAuth token from URL exactly once (fresh page load after Google redirect)
      // and remove it from the URL ASAP.
      let urlToken = null;
      let urlError = null;
      try {
        const params = new URLSearchParams(window.location.search);
        urlToken = params.get('token');
        urlError = params.get('error');
        if ((urlToken || urlError) && window.location.pathname.startsWith('/oauth/success')) {
          window.history.replaceState({}, '', '/oauth/success');
        }
      } catch {}

      if (urlError) {
        clearAuth();
        setLoading(false);
        return;
      }

      const storedToken = (() => {
        try {
          return localStorage.getItem('token');
        } catch {
          return null;
        }
      })();

      const tokenToUse = urlToken || storedToken;
      if (!tokenToUse) {
        setLoading(false);
        return;
      }

      try {
        if (urlToken) {
          localStorage.setItem('token', urlToken);
        }
        setToken(tokenToUse);
        await fetchProfileOnce();
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const loginUser = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const response = await login(email, password);
      const userData = response.data;
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(userData.token);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // NOTE: OAuth flow is bootstrapped from URL/localStorage on app load.
  // Keep this method for any future non-reload OAuth flows, but do NOT use it from OAuthSuccess.
  const loginWithToken = useCallback(async (jwtToken) => {
    try {
      setLoading(true);
      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);
      await fetchProfileOnce();
    } catch (error) {
      clearAuth();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuth, fetchProfileOnce]);

  const registerUser = useCallback(async (userData) => {
    try {
      setLoading(true);
      const response = await register(userData);
      const userDataResponse = response.data;
      localStorage.setItem('token', userDataResponse.token);
      localStorage.setItem('user', JSON.stringify(userDataResponse));
      setToken(userDataResponse.token);
      setUser(userDataResponse);
      return userDataResponse;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userData) => {
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
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    loginUser,
    loginWithToken,
    registerUser,
    updateUser,
    logout,
  }), [user, token, loading, loginUser, loginWithToken, registerUser, updateUser, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
