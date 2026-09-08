import { useEffect, useState, useRef, useCallback } from 'react';
import { ShoppingBag, Sparkles, Heart, HeartOff, Check, AlertCircle, AlertTriangle, Store } from 'lucide-react';

export default function DynamicToast({ 
  message, 
  title, 
  desc, 
  type = 'info', 
  duration = 2200, 
  onDismiss 
}) {
  const [stage, setStage] = useState('visible'); // 'visible' | 'exiting'
  const timerRef = useRef(null);
  const touchStartY = useRef(null);
  const isExitingRef = useRef(false);

  const triggerDismiss = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setStage('exiting');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => {
      if (onDismiss) onDismiss();
      isExitingRef.current = false;
    }, 240);
  }, [onDismiss]);

  // Robust Auto-Hiding Timer
  useEffect(() => {
    if (!message && !title) return;
    
    isExitingRef.current = false;
    setStage('visible');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      triggerDismiss();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, title, duration, triggerDismiss]);

  // Instant Tap / Pointer Down Dismissal
  const handlePointerDown = (e) => {
    e.stopPropagation();
    triggerDismiss();
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current !== null && e.changedTouches && e.changedTouches[0]) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      // Swipe up to dismiss or immediate tap
      if (deltaY < -8 || Math.abs(deltaY) < 5) {
        triggerDismiss();
      }
    }
  };

  if (!message && !title && stage !== 'exiting') return null;

  const rawTitle = title || message || '';
  const cleanTitle = String(rawTitle)
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();
  const cleanDesc = desc 
    ? String(desc).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() 
    : null;

  const titleLower = cleanTitle.toLowerCase();
  const isFavAction = titleLower.includes('favourite') || titleLower.includes('favorite') || titleLower.includes('saved');
  const isFavRemove = isFavAction && (titleLower.includes('remove') || titleLower.includes('unsaved'));
  const isFavAdd = isFavAction && !isFavRemove;
  const isBasketAction = titleLower.includes('basket') || titleLower.includes('cart') || titleLower.includes('added') || titleLower.includes('+');
  const isShopAction = titleLower.includes('switch') || titleLower.includes('kitchen') || titleLower.includes('branch') || titleLower.includes('location') || titleLower.includes('store');

  const getEffectiveType = () => {
    if (isFavAdd) return 'fav-add';
    if (isFavRemove) return 'fav-remove';
    if (isShopAction) return 'shop-switch';
    if (isBasketAction && type === 'success') return 'basket-add';
    return type;
  };

  const effectiveType = getEffectiveType();

  const getIcon = () => {
    if (isFavAdd) {
      return <Heart size={15} strokeWidth={2.5} className="text-[#fb7185] fill-[#f43f5e]" />;
    }
    if (isFavRemove) {
      return <HeartOff size={15} strokeWidth={2.5} className="text-[#fca5a5]" />;
    }
    if (isShopAction) {
      return <Store size={15} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
    if (isBasketAction && type === 'success') {
      return <ShoppingBag size={15} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
    switch (type) {
      case 'success':
        return <Check size={15} strokeWidth={3} className="text-[#E0FF33]" />;
      case 'error':
        return <AlertCircle size={15} strokeWidth={2.5} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={15} strokeWidth={2.5} className="text-amber-400" />;
      case 'info':
      default:
        return <Sparkles size={15} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
  };

  return (
    <aside
      className={`dynamic-island-toast toast type-${effectiveType} stage-${stage} select-none cursor-pointer active:scale-95 transition-all`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      onClick={triggerDismiss}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="Tap to dismiss"
    >
      <div className={`dynamic-island-icon-wrap type-${effectiveType}`}>
        {getIcon()}
      </div>

      <div className="dynamic-island-content max-w-[260px] sm:max-w-[400px] overflow-hidden">
        <span className="dynamic-island-title truncate">{cleanTitle}</span>
        {cleanDesc && (
          <>
            <span className="text-zinc-500 text-xs shrink-0">•</span>
            <span className="dynamic-island-desc truncate">{cleanDesc}</span>
          </>
        )}
      </div>
    </aside>
  );
}
