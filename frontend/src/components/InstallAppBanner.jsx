import React, { useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import useInstallPrompt from '../hooks/useInstallPrompt';

const DISMISSED_KEY = 'installBannerDismissed';
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISSED_DURATION;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
}

export default function InstallAppBanner() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (canInstall && !isInstalled && !wasDismissedRecently()) {
      // Small delay so it doesn't pop immediately
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [canInstall, isInstalled]);

  if (!visible) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <FiDownload className="w-6 h-6 text-orange-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">Install App</div>
          <div className="text-sm text-gray-600 truncate">Add Arvind Sweets to your home screen for quick access</div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
