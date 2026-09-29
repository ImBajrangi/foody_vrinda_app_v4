import { useRef, useCallback, useEffect } from 'react';

/**
 * 120fps Native-Grade iOS & Android Bottom Sheet Gesture Controller.
 * 
 * Features:
 * - Fluid 1:1 hardware translation on swipe-down (requestAnimationFrame)
 * - Zero lag: Zero re-renders during active drag (pure ref-driven)
 * - Single-swipe dismissal on first attempt
 * - Single-tap card opening immediately after dismissal (zero ghost blocking)
 * - 100% responsive buttons with standard touch handling
 */
export function useBottomSheetDrag(param1, param2) {
  let onClose;
  let threshold = 40;

  if (typeof param1 === 'function') {
    onClose = param1;
    if (typeof param2 === 'number') threshold = param2;
  } else if (param1 && typeof param1 === 'object') {
    onClose = param1.onClose;
    if (typeof param1.threshold === 'number') threshold = param1.threshold;
  }

  const sheetRef = useRef(null);
  const overlayRef = useRef(null);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityYRef = useRef(0);
  const currentDiffRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isDismissingRef = useRef(false);
  const rafIdRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const getOverlay = () => {
    return (
      overlayRef.current ||
      sheetRef.current?.closest('.apple-overlay') ||
      sheetRef.current?.parentElement?.querySelector('.apple-overlay') ||
      sheetRef.current?.parentElement
    );
  };

  // Clean cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const updateSheetTransform = (translateY) => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : '';
      sheetRef.current.style.transition = 'none';
    }
    const overlay = getOverlay();
    if (overlay && sheetRef.current) {
      if (translateY > 0) {
        const sheetH = sheetRef.current.offsetHeight || 450;
        const opacity = Math.max(0, 1 - (translateY / sheetH) * 1.2);
        overlay.style.opacity = String(opacity);
      } else {
        overlay.style.removeProperty('opacity');
      }
    }
  };

  // Programmatic dismiss (Backdrop tap, Close button, Esc key)
  const dismiss = useCallback((callbackOrEvent) => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    const callback = typeof callbackOrEvent === 'function' ? callbackOrEvent : null;
    const sheet = sheetRef.current;
    const overlay = getOverlay();

    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.transition = 'opacity 0.12s ease-out';
      overlay.style.opacity = '0';
    }
    if (sheet) {
      sheet.style.pointerEvents = 'none';
      sheet.style.transition = 'transform 0.14s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.12s ease-out';
      sheet.style.transform = 'translate3d(0, 100%, 0)';
      sheet.style.opacity = '0';
    }

    setTimeout(() => {
      if (callback) {
        callback(true);
      } else if (typeof onCloseRef.current === 'function') {
        onCloseRef.current(true);
      }
      isDismissingRef.current = false;
      isDraggingRef.current = false;
    }, 120);
  }, []);

  // Universal Touch & Pointer Start
  const handleTouchStart = useCallback((e) => {
    if (isDismissingRef.current || isDraggingRef.current) return;

    // Prevent duplicate triggers if browser fires both touchstart and pointerdown
    if (e.type === 'pointerdown' && e.pointerType === 'touch') return;

    // Never intercept buttons or inputs
    const target = e.target;
    if (target && target.closest && target.closest('button, input, textarea, select, a, [role="button"], label')) {
      return;
    }

    const touch = e.touches ? e.touches[0] : e;
    if (!touch) return;

    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
    velocityYRef.current = 0;
    currentDiffRef.current = 0;
    hasMovedRef.current = false;
    isDraggingRef.current = true;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.willChange = 'transform';
    }

    const onTouchMove = (moveEvt) => {
      if (!isDraggingRef.current) return;

      const currentTouch = moveEvt.touches ? moveEvt.touches[0] : moveEvt;
      if (!currentTouch) return;

      const currentY = currentTouch.clientY;
      const currentX = currentTouch.clientX;
      const timeNow = performance.now();
      const deltaY = currentY - startYRef.current;
      const deltaX = currentX - startXRef.current;

      // Ignore horizontal swipes
      if (!hasMovedRef.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        return;
      }

      const dt = timeNow - lastTimeRef.current;
      if (dt > 8) {
        velocityYRef.current = (currentY - lastYRef.current) / dt;
        lastYRef.current = currentY;
        lastTimeRef.current = timeNow;
      }

      if (deltaY > 4) {
        hasMovedRef.current = true;
        // Prevent browser scrolling and prevent synthetic click generation!
        if (moveEvt.cancelable) {
          moveEvt.preventDefault();
        }
      }

      const clampedDelta = deltaY > 0 ? deltaY : deltaY * 0.12;
      currentDiffRef.current = clampedDelta;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (!isDraggingRef.current) return;
        updateSheetTransform(clampedDelta);
      });
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      // Cleanly reset hasMovedRef shortly after touch release
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 60);

      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('pointermove', onTouchMove);
      window.removeEventListener('pointerup', onTouchEnd);
      window.removeEventListener('pointercancel', onTouchEnd);

      const finalDiff = currentDiffRef.current;
      const velocity = velocityYRef.current;
      currentDiffRef.current = 0;

      const sheetHeight = sheetRef.current?.offsetHeight || 450;
      const effectiveThreshold = Math.min(threshold, sheetHeight * 0.1);
      const shouldDismiss = (velocity > 0.18 && finalDiff > 8) || finalDiff > effectiveThreshold;

      const sheet = sheetRef.current;
      const overlay = getOverlay();

      if (shouldDismiss && !isDismissingRef.current) {
        isDismissingRef.current = true;

        // 1. Immediately disable pointer events on overlay so background clicks are NEVER blocked
        if (overlay) {
          overlay.style.pointerEvents = 'none';
          overlay.style.transition = 'opacity 0.12s ease-out';
          overlay.style.opacity = '0';
        }
        if (sheet) {
          sheet.style.pointerEvents = 'none';
          sheet.style.transition = 'transform 0.14s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.12s ease-out';
          sheet.style.transform = 'translate3d(0, 100%, 0)';
          sheet.style.opacity = '0';
        }

        // 2. Unmount clean
        setTimeout(() => {
          if (typeof onCloseRef.current === 'function') {
            onCloseRef.current(true);
          }
          isDismissingRef.current = false;
        }, 120);
      } else {
        // Snap back to resting position
        if (sheet) {
          sheet.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1)';
          sheet.style.transform = 'translate3d(0, 0, 0)';
        }
        if (overlay) {
          overlay.style.transition = 'opacity 0.14s ease-out';
          overlay.style.opacity = '1';
        }

        setTimeout(() => {
          if (sheet && !isDraggingRef.current && !isDismissingRef.current) {
            sheet.style.removeProperty('transform');
            sheet.style.removeProperty('opacity');
            sheet.style.removeProperty('transition');
            sheet.style.removeProperty('will-change');
          }
          if (overlay) {
            overlay.style.removeProperty('opacity');
            overlay.style.removeProperty('transition');
          }
        }, 180);
      }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('pointermove', onTouchMove, { passive: false });
    window.addEventListener('pointerup', onTouchEnd, { passive: true });
    window.addEventListener('pointercancel', onTouchEnd, { passive: true });
  }, [threshold]);

  const handleProps = {
    onTouchStart: handleTouchStart,
    onPointerDown: handleTouchStart,
    style: { touchAction: 'pan-y' }
  };

  return {
    sheetRef,
    overlayRef,
    dismiss,
    handleProps,
    hasMoved: () => hasMovedRef.current
  };
}
