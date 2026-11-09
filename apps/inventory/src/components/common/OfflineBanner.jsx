import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (justReconnected) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center space-x-2 transition-all">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Internet connection restored. Live sync operational.</span>
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center space-x-2">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>You are currently offline. Admin actions requiring server confirmation are disabled.</span>
    </div>
  );
}

export default OfflineBanner;
