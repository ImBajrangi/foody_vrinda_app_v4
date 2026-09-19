import { useEffect, useRef } from 'react';
import { registerBackHandler, unregisterBackHandler } from '../services/backHandlerService';

/**
 * Custom React Hook to safely register a modal or drawer with the Back Handler Service.
 * Automatically handles registration, update, and unmounting cleanup.
 * 
 * @param {boolean} isOpen Whether the modal/overlay is currently active
 * @param {Function} onClose Callback function to invoke when back button is pressed
 * @param {string} [id] Optional unique identifier for this handler
 * @param {number} [priority] Priority tier (higher numbers get called first)
 */
export function useBackHandler(isOpen, onClose, id, priority = 0) {
  const handlerIdRef = useRef(id || `handler_${Math.random().toString(36).slice(2, 9)}`);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handlerId = handlerIdRef.current;
    if (isOpen) {
      registerBackHandler(handlerId, () => {
        onCloseRef.current?.();
      }, priority);
    } else {
      unregisterBackHandler(handlerId);
    }

    return () => {
      unregisterBackHandler(handlerId);
    };
  }, [isOpen, priority]);
}
