import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/Loader';

function OAuthSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, user, token, logout } = useContext(AuthContext);
  const [error, setError] = useState('');

  const isStandaloneApp = (() => {
    try {
      return (
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        window.navigator?.standalone === true
      );
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      return;
    }

    // If neither token nor error exists, user likely opened this page directly.
    const urlToken = params.get('token');
    if (!urlToken) {
      setError('Missing token. Please try again.');
    }
  }, [location.search]);

  useEffect(() => {
    if (error) return;
    if (loading) return;

    if (token && user) {
      if (isStandaloneApp) {
        window.location.replace('/');
        return;
      }

      navigate('/', { replace: true });
      return;
    }

    // Auth bootstrap finished but no user loaded => invalid/expired token or backend unreachable
    setError('Login failed. Please try again.');
    logout();
  }, [error, loading, token, user, navigate, logout]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Loader />
    </div>
  );
}

export default OAuthSuccess;
