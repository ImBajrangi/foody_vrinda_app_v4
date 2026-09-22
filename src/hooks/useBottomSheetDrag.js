import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Ultra-responsive native-grade Bottom Sheet gesture hook (iOS / Android standard).
 * - 120fps hardware-accelerated continuous glide from finger release position to offscreen
 * - Zero jump to original position on dismiss
 * - Dynamic backdrop dimming linked to drag progress
 * - Deceleration curve: cubic-bezier(0.32, 0.72, 0, 1) matching native mobile sheets
 */
export const registerGhostClickBlocker = () => {};

export function useBottomSheetDrag(param1, param2) {
  // Support both (onClose, threshold) and ({ onClose, threshold })
  let onClose;
  let threshold = 50;

  if (typeof param1 === 'function') {
    onClose = param1;
    if (typeof param2 === 'number') threshold = param2;
  } else if (param1 && typeof param1 === 'object') {
    onClose = param1.onClose;
    if (typeof param1.threshold === 'number') threshold = param1.threshold;
  }

  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);
  const overlayRef = useRef(null);

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
      sheetRef.current.style.setProperty('transform', translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : '', 'important');
      sheetRef.current.style.setProperty('transition', transition, 'important');
    }
    const overlay = overlayRef.current || sheetRef.current?.closest('.apple-overlay') || sheetRef.current?.parentElement?.querySelector('.apple-overlay');
    if (overlay && sheetRef.current) {
      if (translateY > 0) {
        const sheetH = sheetRef.current.offsetHeight || 400;
        const opacity = Math.max(0, 1 - (translateY / sheetH) * 0.95);
        overlay.style.setProperty('opacity', String(opacity), 'important');
      } else {
        overlay.style.removeProperty('opacity');
      }
    }
  };

  const startDrag = useCallback((clientY) => {
    if (isDismissingRef.current || isDraggingRef.current) return;

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
      sheetRef.current.classList.add('sheet-dragging');
      sheetRef.current.classList.remove('sheet-dismissing');
      sheetRef.current.style.setProperty('transition', 'none', 'important');
      sheetRef.current.style.setProperty('will-change', 'transform', 'important');
    }

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
      const timeNow = performance.now();
      const deltaY = currentY - startYRef.current;

      const dt = timeNow - lastTimeRef.current;
      if (dt > 8) {
        velocityYRef.current = (currentY - lastYRef.current) / dt;
        lastYRef.current = currentY;
        lastTimeRef.current = timeNow;
      }

      if (Math.abs(deltaY) > 5) {
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
          clampedDelta = deltaY * 0.12;
        }
        currentDiffRef.current = clampedDelta;
        updateSheetTransform(clampedDelta, 'none');
      });
    };

    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);

      const finalDiff = currentDiffRef.current;
      const velocity = velocityYRef.current;
      currentDiffRef.current = 0;

      // Dismiss criteria:
      // 1. Downward velocity flick (> 0.22 px/ms) with at least 15px travel
      // 2. Dragged past explicit threshold
      const shouldDismiss = (velocity > 0.22 && finalDiff > 15) || finalDiff > threshold;

      const sheet = sheetRef.current;
      const overlay = overlayRef.current || sheet?.closest('.apple-overlay') || sheet?.parentElement?.querySelector('.apple-overlay');

      if (shouldDismiss && !isDismissingRef.current) {
        isDismissingRef.current = true;
        // Keep isDragging state without immediate React re-render to prevent DOM reconciliation jump
        if (sheet) {
          sheet.classList.add('sheet-dismissing');
          sheet.classList.remove('sheet-dragging');
          // Smoothly continue moving downwards from finalDiff to offscreen (105%)
          sheet.style.setProperty('transition', 'transform 0.20s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease-out', 'important');
          sheet.style.setProperty('transform', 'translate3d(0, 105%, 0)', 'important');
          sheet.style.setProperty('opacity', '0', 'important');
        }
        if (overlay) {
          overlay.style.setProperty('transition', 'opacity 0.18s ease-out', 'important');
          overlay.style.setProperty('opacity', '0', 'important');
        }

        setTimeout(() => {
          if (typeof onCloseRef.current === 'function') {
            onCloseRef.current(true);
          }
          if (sheet) {
            sheet.classList.remove('sheet-dismissing');
            sheet.classList.remove('sheet-dragging');
            sheet.style.removeProperty('transform');
            sheet.style.removeProperty('opacity');
            sheet.style.removeProperty('transition');
            sheet.style.removeProperty('will-change');
          }
          if (overlay) {
            overlay.style.removeProperty('opacity');
            overlay.style.removeProperty('transition');
          }
          isDismissingRef.current = false;
          setIsDragging(false);
        }, 200);
      } else {
        // Snappy spring-back to 0 (resting position) directly from finalDiff
        if (sheet) {
          sheet.style.setProperty('transition', 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)', 'important');
          sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
        }
        if (overlay) {
          overlay.style.setProperty('transition', 'opacity 0.2s ease-out', 'important');
          overlay.style.setProperty('opacity', '1', 'important');
        }

        setTimeout(() => {
          if (sheet && !isDraggingRef.current && !isDismissingRef.current) {
            sheet.classList.remove('sheet-dragging');
            sheet.style.removeProperty('transform');
            sheet.style.removeProperty('opacity');
            sheet.style.removeProperty('transition');
            sheet.style.removeProperty('will-change');
          }
          if (overlay) {
            overlay.style.removeProperty('opacity');
            overlay.style.removeProperty('transition');
          }
          setIsDragging(false);
        }, 230);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onEnd, { passive: true });
    window.addEventListener('pointercancel', onEnd, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
  }, [threshold]);

  const handlePointerDown = useCallback((e) => {
    if (isDismissingRef.current || isDraggingRef.current) return;
    if (e.button !== undefined && e.button !== 0) return;
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
    startDrag(clientY);
  }, [startDrag]);

  // Programmatic dismiss (Backdrop tap, Close button, option select)
  const dismiss = useCallback((callbackOrEvent) => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    // Check if callbackOrEvent is an actual callback function, ignoring synthetic DOM event objects
    const callback = typeof callbackOrEvent === 'function' ? callbackOrEvent : null;

    const sheet = sheetRef.current;
    const overlay = overlayRef.current || sheet?.closest('.apple-overlay') || sheet?.parentElement?.querySelector('.apple-overlay');

    if (sheet) {
      sheet.classList.add('sheet-dismissing');
      sheet.style.setProperty('transition', 'transform 0.20s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease-out', 'important');
      sheet.style.setProperty('transform', 'translate3d(0, 105%, 0)', 'important');
      sheet.style.setProperty('opacity', '0', 'important');
    }
    if (overlay) {
      overlay.style.setProperty('transition', 'opacity 0.18s ease-out', 'important');
      overlay.style.setProperty('opacity', '0', 'important');
    }

    setTimeout(() => {
      if (callback) {
        callback(true);
      } else if (typeof onCloseRef.current === 'function') {
        onCloseRef.current(true);
      }

      if (sheet) {
        sheet.classList.remove('sheet-dismissing');
        sheet.style.removeProperty('transform');
        sheet.style.removeProperty('opacity');
        sheet.style.removeProperty('transition');
        sheet.style.removeProperty('will-change');
      }
      if (overlay) {
        overlay.style.removeProperty('opacity');
        overlay.style.removeProperty('transition');
      }
      isDismissingRef.current = false;
    }, 200);
  }, []);

  const sheetStyle = {
    userSelect: isDragging ? 'none' : undefined,
    WebkitUserSelect: isDragging ? 'none' : undefined
  };

  const handleProps = {
    onPointerDown: handlePointerDown,
    onClickCapture: (e) => {
      if (hasMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  return {
    sheetRef,
    overlayRef,
    dismiss,
    dragY: 0,
    isDragging,
    sheetStyle,
    handleProps,
    hasMoved: () => hasMovedRef.current
  };
}
