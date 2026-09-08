import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * High-performance 120fps drag-to-dismiss gesture hook with GPU synchronization.
 * Uses requestAnimationFrame and class-based transition suppression to guarantee zero lag and zero flicker.
 * Reference: Vrinda Tours Standard
 */
export function useBottomSheetDrag(onClose, threshold = 70) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const rafRef = useRef(null);

  const startDrag = useCallback((clientY) => {
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setIsDragging(true);
    document.body.classList.add('sheet-dragging');
    window.getSelection()?.removeAllRanges();
  }, []);

  const moveDrag = useCallback((clientY) => {
    if (!isDragging) return;
    const delta = Math.max(0, clientY - startYRef.current);
    currentYRef.current = clientY;
    setDragY(delta);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--card-drag-offset', `${delta}px`);
    });
  }, [isDragging]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.classList.remove('sheet-dragging');
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const delta = Math.max(0, currentYRef.current - startYRef.current);
    if (delta > threshold) {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        setDragY(0);
        document.documentElement.style.setProperty('--card-drag-offset', '0px');
        onClose?.();
      }, 220);
    } else {
      setDragY(0);
      document.documentElement.style.setProperty('--card-drag-offset', '0px');
    }
  }, [isDragging, threshold, onClose]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.classList.remove('sheet-dragging');
      document.documentElement.style.setProperty('--card-drag-offset', '0px');
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    startDrag(e.touches[0].clientY);
  }, [startDrag]);

  const handleTouchMove = useCallback((e) => {
    moveDrag(e.touches[0].clientY);
  }, [moveDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    startDrag(e.clientY);

    const onMouseMove = (ev) => {
      ev.preventDefault();
      moveDrag(ev.clientY);
    };

    const onMouseUp = () => {
      endDrag();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [startDrag, moveDrag, endDrag]);

  const triggerClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    document.documentElement.style.setProperty('--card-drag-offset', '0px');
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 220);
  }, [isClosing, onClose]);

  const sheetStyle = {
    '--drag-y': dragY > 0 ? `${dragY}px` : '0px',
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease',
    opacity: dragY > 0 ? Math.max(0.3, 1 - dragY / 400) : undefined,
    WebkitUserSelect: isDragging ? 'none' : undefined,
    userSelect: isDragging ? 'none' : undefined
  };

  const handleProps = {
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };

  return {
    dragY,
    isDragging,
    isClosing,
    sheetStyle,
    handleProps,
    triggerClose
  };
}
