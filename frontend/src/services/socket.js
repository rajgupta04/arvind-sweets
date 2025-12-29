import { io } from 'socket.io-client';

function getBackendOrigin() {
  const envBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;

  let backendUrl = envBackendUrl;

  if (!backendUrl && typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      backendUrl = 'https://arvind-sweets.onrender.com';
    }
  }

  return backendUrl || undefined;
}

export function createSocket() {
  const origin = getBackendOrigin();
  const token = (() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  })();

  return createSocketWithToken(origin, token);
}

export function createSocketWithToken(originOrUndefined, token) {
  const origin = originOrUndefined;

  return io(origin, {
    autoConnect: true,
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });
}

export function createSocketForAuthToken(token) {
  const origin = getBackendOrigin();
  return createSocketWithToken(origin, token);
}
