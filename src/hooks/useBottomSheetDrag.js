import { useState, useRef, useCallback } from 'react';

/**
 * Ultra-responsive 120fps 1:1 drag-to-dismiss gesture hook.
 * Follows the user's finger/mouse 1:1 down the screen with zero clamping and zero latency.
 * Reference: Vrinda Tours Standard
 */
export function useBottomSheetDrag(onClose, threshold = 40) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentDiffRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const startDrag = useCallback((clientY) => {
    startYRef.current = clientY;
    currentDiffRef.current = 0;
    hasMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      const currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
      const deltaY = currentY - startYRef.current;
      if (deltaY > 0) {
        if (deltaY > 4) {
          hasMovedRef.current = true;
        }
        currentDiffRef.current = deltaY;
        setDragY(deltaY);
      } else {
        currentDiffRef.current = 0;
        setDragY(0);
      }
    };

    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);

      const finalDiff = currentDiffRef.current;
      currentDiffRef.current = 0;
      setDragY(0);

      if (finalDiff > threshold || (hasMovedRef.current && finalDiff > 30)) {
        onClose?.();
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
  }, [threshold, onClose]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    startDrag(e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0);
  }, [startDrag]);

  const sheetStyle = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1)',
    touchAction: 'pan-x',
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
    dragY,
    isDragging,
    sheetStyle,
    handleProps,
    hasMoved: () => hasMovedRef.current
  };
}


