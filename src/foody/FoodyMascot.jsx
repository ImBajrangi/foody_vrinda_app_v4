import React, { useEffect, useRef, useImperativeHandle, forwardRef, useId } from 'react';
import { createMascotMarkup, createFoodyMascot } from './foodyMascot.core.js';

/**
 * Foody Vrinda mascot component with 4 animated states:
 * - 'idle': Calm breathing and blink
 * - 'happy': Acorn toss celebration jump
 * - 'sad': Drooped head, crying tears, lost acorn
 * - 'delivery': Scooter ride with spinning wheels and moving road stripes
 *
 * Props:
 * @param {'idle'|'happy'|'sad'|'delivery'} state - Active mascot state
 * @param {string} background - Background fill (default: 'transparent')
 * @param {number|string} width - Container width
 * @param {number|string} height - Container height
 * @param {string} className - Optional container CSS classes
 * @param {object} style - Optional container inline styles
 */
const FoodyMascot = forwardRef(function FoodyMascot(
  {
    state = 'idle',
    background = 'transparent',
    width = 240,
    height = 280,
    className = '',
    style = {},
    onClick
  },
  ref
) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const rawId = useId();
  const idPrefix = 'fvm-' + rawId.replace(/[^a-zA-Z0-9]/g, '');

  useImperativeHandle(ref, () => ({
    setState: (newState) => {
      controllerRef.current?.set(newState);
    },
    triggerHop: () => {
      controllerRef.current?.set('happy');
    }
  }));

  // Initial mount: create markup & animation controller
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.innerHTML = createMascotMarkup(idPrefix);
    const controller = createFoodyMascot(root, {
      state,
      background
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
      root.innerHTML = '';
    };
  }, [idPrefix]);

  // Reactive state change
  useEffect(() => {
    if (controllerRef.current && state) {
      controllerRef.current.set(state);
    }
  }, [state]);

  // Background update
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const bgEl = root.querySelector('[data-k="bg"]');
    if (bgEl) {
      bgEl.setAttribute('fill', background === 'transparent' ? 'none' : background);
    }
  }, [background]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`inline-block select-none overflow-hidden ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style
      }}
      aria-label={`Foody Vrinda squirrel mascot (${state})`}
    />
  );
});

export default FoodyMascot;
