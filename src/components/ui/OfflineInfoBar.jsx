import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

/**
 * Chrome-Style Native Top Slide-Down Offline Info Bar.
 * - Slides down from the top viewport when the device loses network connectivity.
 * - Shows a sleek, compact, non-intrusive status pill with zero layout shift.
 * - Transitions to "Back online" briefly before sliding smoothly back up.
 * - Pointer-events pass through so other interactions are never blocked.
 */
export default function OfflineInfoBar() {
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setShowReconnected(false);
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        setShowReconnected(false);
      }, 2400);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const visible = isOffline || showReconnected;

  return (
    <aside
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-0 left-0 right-0 z-[99999999] pointer-events-none flex justify-center px-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? 'translate-y-2 sm:translate-y-3 opacity-100'
          : '-translate-y-full opacity-0'
      }`}
      style={{
        paddingTop: 'max(6px, env(safe-area-inset-top, 6px))'
      }}
    >
      {isOffline ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E1B1C]/95 border border-amber-500/40 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md text-[12px] font-bold select-none font-['Outfit'] tracking-tight animate-fade-in pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <WifiOff size={13} className="text-amber-400 shrink-0" strokeWidth={2.5} />
          <span>No Internet Connection · Offline Mode</span>
        </div>
      ) : showReconnected ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E1B1C]/95 border border-emerald-500/40 text-emerald-200 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md text-[12px] font-bold select-none font-['Outfit'] tracking-tight animate-fade-in pointer-events-auto">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
          <span>Back online · Reconnected</span>
        </div>
      ) : null}
    </aside>
  );
}
