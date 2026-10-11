import { useEffect, useRef } from 'react';
import { splashMarkup, createFoodySplash } from './foodySplash.core.js';

/**
 * Full-screen animated splash (~4.2 s). Plays once on mount, then calls onDone().
 * Props: onDone, speed (1 = original, 1.4 ≈ 3 s), background, style, className.
 * Needs the fonts from README step 2 (Devanagari line) to look right offline.
 */
export default function FoodySplash({ onDone, speed = 1, background = '#1B1B1D', style, className }) {
  const el = useRef(null);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    const c = createFoodySplash(el.current, { speed, onDone: () => cb.current && cb.current() });
    return () => c.destroy();
  }, [speed]);

  return (
    <div
      ref={el}
      className={className}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background, ...style }}
      dangerouslySetInnerHTML={{ __html: splashMarkup }}
    />
  );
}
