import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Ultra-responsive 120fps native-grade drag-to-dismiss gesture hook.
 * Strictly operates on designated drag handles (top pill / header bar) only.
 * NEVER interferes with or intercepts content or page scrolling anywhere.
 */
export function useBottomSheetDrag(onClose, threshold = 40) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityYRef = useRef(0);
  const currentDiffRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);
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
    startYRef.current = clientY;
    lastYRef.current = clientY;
    startTimeRef.current = performance.now();
    lastTimeRef.current = startTimeRef.current;
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
      const now = performance.now();
      const deltaY = currentY - startYRef.current;

      const dt = now - lastTimeRef.current;
      if (dt > 8) {
        velocityYRef.current = (currentY - lastYRef.current) / dt;
        lastYRef.current = currentY;
        lastTimeRef.current = now;
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (!isDraggingRef.current) return;
        let clampedDelta;
        if (deltaY > 0) {
          if (deltaY > 4) hasMovedRef.current = true;
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

      // Fast flick down (>0.35 px/ms) or dragged down past threshold
      const shouldDismiss = (velocity > 0.35 && finalDiff > 12) || finalDiff > threshold || (hasMovedRef.current && finalDiff > 25);

      if (shouldDismiss) {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)';
          sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
        }
        onCloseRef.current?.();
      } else {
        // Natural spring-back to resting position
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
          sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
          setTimeout(() => {
            if (sheetRef.current && !isDraggingRef.current) {
              sheetRef.current.style.transform = '';
              sheetRef.current.style.transition = '';
              sheetRef.current.style.willChange = '';
            }
          }, 300);
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




