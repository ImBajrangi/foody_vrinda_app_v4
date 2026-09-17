import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Ultra-responsive native-grade Bottom Sheet gesture hook (iOS / Android standard).
 * - Real-time 120fps hardware-accelerated translation
 * - Natural momentum & velocity tracking (flick to dismiss)
 * - Intelligent threshold detection (no premature/accidental closing)
 * - Clean single-pass dismissal animation with zero double-closing/flicker
 */
export function useBottomSheetDrag(onClose, threshold = 80) {
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
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

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const updateSheetTransform = (translateY, transition = 'none') => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : '';
      sheetRef.current.style.transition = transition;
    }
  };

  const startDrag = useCallback((clientY) => {
    if (isDismissingRef.current) return;

    startYRef.current = clientY;
    lastYRef.current = clientY;
    const now = performance.now();
    lastTimeRef.current = now;
    velocityYRef.current = 0;
    currentDiffRef.current = 0;
    hasMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.willChange = 'transform';
    }

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
      const timeNow = performance.now();
      const deltaY = currentY - startYRef.current;

      const dt = timeNow - lastTimeRef.current;
      if (dt > 10) {
        velocityYRef.current = (currentY - lastYRef.current) / dt;
        lastYRef.current = currentY;
        lastTimeRef.current = timeNow;
      }

      if (Math.abs(deltaY) > 6) {
        hasMovedRef.current = true;
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (!isDraggingRef.current) return;
        let clampedDelta;
        if (deltaY > 0) {
          clampedDelta = deltaY;
        } else {
          // Upward rubber-band resistance
          clampedDelta = deltaY * 0.18;
        }
        currentDiffRef.current = clampedDelta;
        updateSheetTransform(clampedDelta, 'none');
      });
    };

    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);

      const finalDiff = currentDiffRef.current;
      const velocity = velocityYRef.current;
      currentDiffRef.current = 0;

      // Dismiss criteria:
      // 1. Fast downward flick (velocity > 0.5 px/ms) with at least 25px displacement
      // 2. Dragged past explicit threshold (default 80px or ~25% of typical mobile drawer)
      const shouldDismiss = (velocity > 0.5 && finalDiff > 25) || finalDiff > threshold;

      if (shouldDismiss && !isDismissingRef.current) {
        isDismissingRef.current = true;
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease-out';
          sheetRef.current.style.transform = 'translate3d(0, 105%, 0)';
          sheetRef.current.style.opacity = '0.5';
        }
        setTimeout(() => {
          onCloseRef.current?.(true);
          isDismissingRef.current = false;
        }, 210);
      } else {
        // Natural spring-back to resting position
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.12)';
          sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
          setTimeout(() => {
            if (sheetRef.current && !isDraggingRef.current && !isDismissingRef.current) {
              sheetRef.current.style.transform = '';
              sheetRef.current.style.transition = '';
              sheetRef.current.style.willChange = '';
            }
          }, 280);
        }
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onEnd, { passive: true });
    window.addEventListener('pointercancel', onEnd, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup', onEnd, { passive: true });
  }, [threshold]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
    startDrag(clientY);
  }, [startDrag]);

  const sheetStyle = {
    userSelect: isDragging ? 'none' : undefined,
    WebkitUserSelect: isDragging ? 'none' : undefined
  };

  const handleProps = {
    onPointerDown: handlePointerDown,
    onTouchStart: handlePointerDown,
    onClickCapture: (e) => {
      if (hasMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  return {
    sheetRef,
    dragY: 0,
    isDragging,
    sheetStyle,
    handleProps,
    hasMoved: () => hasMovedRef.current
  };
}





