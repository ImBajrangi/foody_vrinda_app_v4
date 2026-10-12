import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Sparkles, ArrowDown } from 'lucide-react';

/**
 * Deep inspection to verify if the touch target or any of its scrollable
 * ancestors are currently scrolled down (>1px).
 * Pull-to-refresh MUST NEVER initiate if the user is scrolling within a list,
 * drawer, modal, feed, or anywhere scrolled below the top.
 */
function isScrolledToTop(target) {
  if (typeof window === 'undefined') return true;

  // 1. Check window and root document scroll
  const winScroll = Math.max(
    window.scrollY || 0,
    window.pageYOffset || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0
  );
  if (winScroll > 1) return false;

  // 2. Walk up the DOM tree from the touch target to document body
  let el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      // Disallow pull-to-refresh inside dialogs, bottom sheets, drawers, maps, or form inputs
      if (
        el.matches?.(
          '[role="dialog"], .modal, [data-sheet="true"], .drawer, .no-pull-refresh, input, textarea, select, .leaflet-container'
        )
      ) {
        return false;
      }

      // Check if this container is scrolled vertically
      if (el.scrollTop > 1) {
        return false;
      }

      // Check if container has vertical scroll styling and content exceeds height
      const style = window.getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight &&
        el.scrollTop > 1
      ) {
        return false;
      }
    }
    el = el.parentElement;
  }

  return true;
}

/**
 * Native-grade Pull-to-Refresh & Gesture Engine (Zero-Flicker 120fps)
 * - Zero transform or re-renders on children: preserves position:fixed for bottom bars, modals, drawers & toasts.
 * - Dynamic Island morphing capsule with Apple haptics on release.
 * - SWR data refresh without destructive window.location.reload().
 * - Strict gesture lock: horizontal carousels & natural downward scrolling never trigger pull.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRelease, setCanRelease] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const gestureLockRef = useRef('idle'); // 'idle' | 'scroll' | 'horizontal' | 'pull'
  const safetyTimerRef = useRef(null);

  const PULL_THRESHOLD = 72; // Intentional, natural pull threshold
  const MAX_PULL = 110;
  const VISIBLE_THRESHOLD = 10;

  const triggerHaptic = useCallback((style = 'light') => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
        import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
          Haptics.impact({ style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
        }).catch(() => {});
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(style === 'medium' ? 24 : 14);
      }
    } catch (_) {}
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (isRefreshingRef.current) return;

    // Check if page is at the absolute top (scrollY <= 1)
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
    if (scrollY > 1) {
      gestureLockRef.current = 'scroll';
      startYRef.current = 0;
      return;
    }

    // Ignore gestures inside modals, sheets, drawers, maps, or form fields
    const target = e.target;
    if (target && target.closest && target.closest('[role="dialog"], .modal, [data-sheet="true"], .drawer, .no-pull-refresh, input, textarea, select, .leaflet-container')) {
      gestureLockRef.current = 'scroll';
      startYRef.current = 0;
      return;
    }

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    gestureLockRef.current = 'idle';

    clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      if (!isRefreshingRef.current) {
        setPullDistance(0);
        setCanRelease(false);
        gestureLockRef.current = 'idle';
        startYRef.current = 0;
      }
    }, 4000);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isRefreshingRef.current || startYRef.current === 0) return;

    if (gestureLockRef.current === 'scroll' || gestureLockRef.current === 'horizontal') {
      return;
    }

    const touch = e.touches[0];
    const diffY = touch.clientY - startYRef.current;
    const diffX = touch.clientX - startXRef.current;

    // Classify user intent early
    if (gestureLockRef.current === 'idle') {
      // Horizontal swipe (dish chips, carousels, tabs)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
        gestureLockRef.current = 'horizontal';
        return;
      }

      // Dragging upwards (scrolling down food items)
      if (diffY < -5) {
        gestureLockRef.current = 'scroll';
        return;
      }

      // Dragging downwards from the very top
      if (diffY > 10) {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
        if (scrollY <= 1) {
          gestureLockRef.current = 'pull';
        } else {
          gestureLockRef.current = 'scroll';
          return;
        }
      }
    }

    // Active downward pull
    if (gestureLockRef.current === 'pull') {
      if (diffY <= 0) {
        setPullDistance(0);
        return;
      }

      // Smooth logarithmic rubber-band formula
      const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.76) * 1.55);
      setPullDistance(damped);
      setCanRelease(damped >= PULL_THRESHOLD);

      if (e.cancelable && diffY > 14) {
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (gestureLockRef.current !== 'pull' || isRefreshingRef.current) {
      setPullDistance(0);
      setCanRelease(false);
      gestureLockRef.current = 'idle';
      startYRef.current = 0;
      return;
    }

    if (canRelease) {
      // Threshold reached: lock at compact Dynamic Island indicator height
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      setPullDistance(52);
      triggerHaptic('medium');

      Promise.resolve().then(async () => {
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            window.dispatchEvent(new CustomEvent('foody:refresh-requested'));
            await new Promise(r => setTimeout(r, 650));
          }
        } catch (_) {}

        setTimeout(() => {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          setPullDistance(0);
          setCanRelease(false);
          gestureLockRef.current = 'idle';
          startYRef.current = 0;
        }, 320);
      });
    } else {
      setPullDistance(0);
      setCanRelease(false);
      gestureLockRef.current = 'idle';
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
      clearTimeout(safetyTimerRef.current);
      setPullDistance(0);
      setCanRelease(false);
      isRefreshingRef.current = false;
      gestureLockRef.current = 'idle';
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const rotationDeg = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);
  const opacity = isRefreshing ? 1 : Math.min(1, Math.max(0, (pullDistance - VISIBLE_THRESHOLD) / 22));
  const isVisible = pullDistance > VISIBLE_THRESHOLD || isRefreshing;
  const currentY = isRefreshing ? 52 : Math.min(pullDistance, MAX_PULL);

  return (
    <>
      {/* Standalone Apple Dynamic Island Pull Indicator: Zero effect on child DOM positioning */}
      <div
        className="fixed left-0 right-0 z-[99999999] pointer-events-none flex justify-center will-change-transform"
        style={{
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          transform: isVisible ? `translate3d(0, ${currentY}px, 0)` : 'translate3d(0, -68px, 0)',
          opacity: isVisible ? opacity : 0,
          transition: gestureLockRef.current === 'pull' ? 'none' : 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.22s ease-out'
        }}
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl border transition-all duration-200 ${
            canRelease || isRefreshing
              ? 'bg-[#1E1B1C]/95 border-[#FD9139]/70 text-white shadow-[0_0_24px_rgba(253,145,57,0.4)]'
              : 'bg-[#1E1B1C]/90 border-white/15 text-stone-200'
          }`}
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

      {/* Children rendered directly without enclosing transform container: keeps position:fixed 100% viewport-anchored */}
      {children}
    </>
  );
}
