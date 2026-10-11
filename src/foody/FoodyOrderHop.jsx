import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { hopMarkup, createFoodyHop } from './foodyOrderHop.core.js';

/**
 * "Order done" happy hop (~1.75 s), then a calm idle (breathing + blink).
 * Props: width (px), background ('transparent' | '#hex'), autoplay (hop on mount), onDone, style, className.
 * Imperative: ref.current.play() restarts the hop (e.g. when the order succeeds).
 * The disc is cream, so use it on a dark / orange background (or pass background="#1B1B1D").
 */
const FoodyOrderHop = forwardRef(function FoodyOrderHop(
  { width = 240, background = 'transparent', autoplay = true, onDone, style, className },
  ref
) {
  const el = useRef(null);
  const ctl = useRef(null);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    ctl.current = createFoodyHop(el.current, { background, autoplay, onDone: () => cb.current && cb.current() });
    return () => ctl.current && ctl.current.destroy();
  }, [background, autoplay]);

  useImperativeHandle(ref, () => ({ play: () => ctl.current && ctl.current.play() }), []);

  return (
    <div
      ref={el}
      className={className}
      role="img"
      aria-label="Foody Vrinda squirrel celebrates your order"
      style={{ width, aspectRatio: '600 / 700', ...style }}
      dangerouslySetInnerHTML={{ __html: hopMarkup }}
    />
  );
});

export default FoodyOrderHop;
