import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Sparkles, Heart, HeartOff, Check, AlertCircle, AlertTriangle, Store } from 'lucide-react';

export default function DynamicToast({ 
  toast,
  message, 
  title, 
  desc, 
  type = 'info', 
  duration = 2200, 
  onDismiss,
  onClose
}) {
  const [stage, setStage] = useState('visible'); // 'visible' | 'exiting'
  const timerRef = useRef(null);
  const touchStartY = useRef(null);
  const isExitingRef = useRef(false);

  const rawTitle = title || (typeof toast === 'object' ? toast?.title : '') || message || (typeof toast === 'string' ? toast : toast?.message) || '';
  const rawDesc = desc || (typeof toast === 'object' ? toast?.desc : '') || null;
  const effectiveTypeRaw = (typeof toast === 'object' && toast?.type) ? toast.type : type;
  const dismissHandler = onDismiss || onClose || (() => {});

  const triggerDismiss = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setStage('exiting');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => {
      if (dismissHandler) dismissHandler();
      isExitingRef.current = false;
    }, 240);
  }, [dismissHandler]);

  // Robust Auto-Hiding Timer
  useEffect(() => {
    if (!rawTitle) return;
    
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
  }, [rawTitle, duration, triggerDismiss]);

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

  if (!rawTitle && stage !== 'exiting') return null;

  const cleanTitle = String(rawTitle)
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();
  const cleanDesc = rawDesc 
    ? String(rawDesc).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() 
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
    if (isBasketAction && effectiveTypeRaw === 'success') return 'basket-add';
    return effectiveTypeRaw;
  };

  const effectiveType = getEffectiveType();

  const getIcon = () => {
    if (isFavAdd) {
      return <Heart size={13} strokeWidth={2.6} className="text-rose-400 fill-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" />;
    }
    if (isFavRemove) {
      return <HeartOff size={13} strokeWidth={2.6} className="text-zinc-300" />;
    }
    if (isShopAction) {
      return <Store size={13} strokeWidth={2.6} className="text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />;
    }
    if (isBasketAction && effectiveTypeRaw === 'success') {
      return <ShoppingBag size={13} strokeWidth={2.6} className="text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />;
    }
    switch (effectiveTypeRaw) {
      case 'success':
        return <Check size={13} strokeWidth={3} className="text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />;
      case 'error':
        return <AlertCircle size={13} strokeWidth={2.6} className="text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />;
      case 'warning':
        return <AlertTriangle size={13} strokeWidth={2.6} className="text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />;
      case 'info':
      default:
        return <Sparkles size={13} strokeWidth={2.6} className="text-sky-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]" />;
    }
  };

  const toastElement = (
    <div 
      className="fixed z-[99999999] pointer-events-none flex justify-center w-full top-0 left-0 right-0"
    >
      <aside
        className={`dynamic-island-toast toast type-${effectiveType} stage-${stage} select-none cursor-pointer active:scale-95 transition-all pointer-events-auto`}
        role={effectiveTypeRaw === 'error' ? 'alert' : 'status'}
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

        <div className="dynamic-island-content max-w-[270px] sm:max-w-[420px] overflow-hidden">
          <span className="dynamic-island-title truncate">{cleanTitle}</span>
          {cleanDesc && (
            <>
              <span className="text-white/40 text-xs shrink-0">•</span>
              <span className="dynamic-island-desc truncate">{cleanDesc}</span>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(toastElement, document.body);
  }

  return toastElement;
}
