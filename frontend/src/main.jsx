// Application entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Ensure correct mobile viewport on every load (helps in some TWA/PWA auth return flows).
(() => {
  try {
    const desired = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    if (meta.getAttribute('content') !== desired) {
      meta.setAttribute('content', desired);
    }
  } catch {
    // ignore
  }
})();

// In some Android/TWA flows (notably after auth), the viewport can briefly report a
// desktop-like width and then correct itself. Waiting a moment for the viewport to
// stabilize avoids a visible layout "flash" from desktop → mobile.
async function waitForStableViewport({ timeoutMs = 800, intervalMs = 50 } = {}) {
  try {
    const vv = window.visualViewport;
    if (!vv) {
      await new Promise((r) => requestAnimationFrame(() => r()));
      return;
    }

    const start = Date.now();
    let last = Math.round(vv.width);
    let stableCount = 0;

    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const next = Math.round(vv.width);
      if (next === last) {
        stableCount += 1;
        if (stableCount >= 2) return;
      } else {
        stableCount = 0;
        last = next;
      }
    }
  } catch {
    // ignore
  }
}

// Register Service Worker for PWA/TWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Every hour
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));

(async () => {
  await waitForStableViewport();
  root.render(
    // <React.StrictMode>
      <App />
    // </React.StrictMode>,
  );
})();
