import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Sparkles, ArrowDown } from 'lucide-react';

/**
 * Native-grade 120fps Pull-to-Refresh & Swipe-Down Gesture Engine
 * Complies with Foody Vrinda Dynamic Island standard & Chitra Vrinda touch ergonomics.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRelease, setCanRelease] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const triggeredHapticRef = useRef(false);

  const PULL_THRESHOLD = 72; // pixels needed to trigger refresh
  const MAX_PULL = 110;

  const triggerHaptic = useCallback((ms = 18) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (_) { }
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (isRefreshingRef.current) return;

    // Do not initiate pull-to-refresh inside dialogs, modals, bottom sheets, or drawers
    const target = e.target;
    if (target && target.closest) {
      const isInsideModal = target.closest('[role="dialog"], .modal, [data-sheet="true"], .drawer, .no-pull-refresh');
      if (isInsideModal) return;
    }

    // Only allow pull-down if already scrolled to the very top
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 2) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    isPullingRef.current = false;
    triggeredHapticRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isRefreshingRef.current || startYRef.current === 0) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 2 && !isPullingRef.current) return;

    const touch = e.touches[0];
    const diffY = touch.clientY - startYRef.current;
    const diffX = touch.clientX - startXRef.current;

    // Discard horizontal scrolls (e.g. dish chips, carousels)
    if (!isPullingRef.current && Math.abs(diffX) > Math.abs(diffY)) {
      startYRef.current = 0;
      return;
    }

    if (diffY > 10) {
      // User is dragging downwards from the top
      isPullingRef.current = true;
      // Rubber-band resistance formula
      const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.82) * 1.8);
      setPullDistance(damped);

      const ready = damped >= PULL_THRESHOLD;
      setCanRelease(ready);

      if (ready && !triggeredHapticRef.current) {
        triggerHaptic(24);
        triggeredHapticRef.current = true;
      } else if (!ready && triggeredHapticRef.current) {
        triggeredHapticRef.current = false;
      }

      // Prevent native rubber-band bounce conflicting with our capsule
      if (e.cancelable && diffY > 20) {
        e.preventDefault();
      }
    }
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current || isRefreshingRef.current) {
      setPullDistance(0);
      setCanRelease(false);
      startYRef.current = 0;
      return;
    }

    if (canRelease) {
      // Threshold reached: lock in refreshing state
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      setPullDistance(PULL_THRESHOLD);
      triggerHaptic(35);

      // Perform refresh sequence
      Promise.resolve().then(async () => {
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            // Default full platform reload & cache sync
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('foody_pull_refresh_timestamp', String(Date.now()));
              window.dispatchEvent(new CustomEvent('foody:refresh-requested'));
              setTimeout(() => {
                window.location.reload();
              }, 450);
              return;
            }
          }
        } catch (_) { }

        // Exit refreshing state gracefully if custom onRefresh didn't reload
        setTimeout(() => {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          setPullDistance(0);
          setCanRelease(false);
          startYRef.current = 0;
        }, 500);
      });
    } else {
      // Spring back to top
      setPullDistance(0);
      setCanRelease(false);
      startYRef.current = 0;
    }
  }, [canRelease, onRefresh, triggerHaptic]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const rotationDeg = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);
  const opacity = Math.min(1, pullDistance / 35);
  const scale = Math.min(1, 0.7 + (pullDistance / PULL_THRESHOLD) * 0.3);

  return (
    <>
      {/* Morphing Dynamic Island Pull Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed left-0 right-0 z-[9999999] pointer-events-none flex justify-center transition-transform duration-75 ease-out"
          style={{
            top: 'max(14px, env(safe-area-inset-top, 14px))',
            transform: `translate3d(0, ${Math.min(pullDistance, MAX_PULL)}px, 0)`,
            opacity: opacity
          }}
        >
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-2xl border transition-all duration-200 ${
              canRelease || isRefreshing
                ? 'bg-[#1E1B1C]/95 border-[#FD9139]/60 text-white shadow-[0_0_24px_rgba(253,145,57,0.35)]'
                : 'bg-[#1E1B1C]/90 border-white/10 text-stone-200'
            }`}
            style={{
              transform: `scale(${scale})`
            }}
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 text-[#FD9139] animate-spin" />
            ) : canRelease ? (
              <Sparkles className="w-4 h-4 text-[#FD9139] animate-bounce" />
            ) : (
              <ArrowDown
                className="w-4 h-4 text-stone-400 transition-transform duration-100"
                style={{ transform: `rotate(${rotationDeg}deg)` }}
              />
            )}

            <span className="text-xs font-bold tracking-wide font-['Outfit'] select-none">
              {isRefreshing
                ? 'Refreshing Foody Vrinda...'
                : canRelease
                ? 'Release to Refresh'
                : 'Pull down to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Main App Content View with subtle spring translation */}
      <div
        className="w-full flex-1 flex flex-col"
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.35}px, 0)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        {children}
      </div>
    </>
  );
}
