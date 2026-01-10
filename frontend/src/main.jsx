// Application entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register Service Worker for PWA/TWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let hasRefreshedForNewSw = false;

    // When a new SW takes control, reload once to ensure fresh HTML/CSS/JS are in sync.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasRefreshedForNewSw) return;
      hasRefreshedForNewSw = true;
      window.location.reload();
    });

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

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
);
