import { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Sparkles, Heart, HeartOff, Check, AlertCircle, AlertTriangle, Info, MapPin, Store } from 'lucide-react';

export default function DynamicToast({ 
  message, 
  title, 
  desc, 
  type = 'info', 
  duration = 3200, 
  onDismiss 
}) {
  const [stage, setStage] = useState('visible'); // 'visible' | 'exiting'
  const timerRef = useRef(null);
  const touchStartY = useRef(null);

  const triggerDismiss = () => {
    if (stage === 'exiting') return;
    setStage('exiting');
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 280);
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    if (stage === 'visible') {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, 2600);
    }
  };

  const handleTouchStart = (e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (e.touches && e.touches[0]) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current !== null && e.changedTouches && e.changedTouches[0]) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY < -15) {
        triggerDismiss();
        return;
      }
    }
    if (stage === 'visible') {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, 2600);
    }
  };

  useEffect(() => {
    if (message || title) {
      setStage('visible');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, duration);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [message, title, duration]);

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
  const isBasketAction = titleLower.includes('basket') || titleLower.includes('cart') || titleLower.includes('added');
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
      return <Heart size={16} strokeWidth={2.5} className="text-[#fb7185] fill-[#f43f5e]" />;
    }
    if (isFavRemove) {
      return <HeartOff size={16} strokeWidth={2.5} className="text-[#fca5a5]" />;
    }
    if (isShopAction) {
      return <Store size={16} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
    if (isBasketAction && type === 'success') {
      return <ShoppingBag size={16} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
    switch (type) {
      case 'success':
        return <Check size={16} strokeWidth={3} className="text-[#E0FF33]" />;
      case 'error':
        return <AlertCircle size={16} strokeWidth={2.5} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={16} strokeWidth={2.5} className="text-amber-400" />;
      case 'info':
      default:
        return <Sparkles size={16} strokeWidth={2.5} className="text-[#E0FF33]" />;
    }
  };

  return (
    <aside
      className={`dynamic-island-toast toast type-${effectiveType} stage-${stage}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={triggerDismiss}
    >
      <div className={`dynamic-island-icon-wrap type-${effectiveType}`}>
        {getIcon()}
      </div>

      <div className="dynamic-island-content">
        <span className="dynamic-island-title">{cleanTitle}</span>
        {cleanDesc && (
          <>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="dynamic-island-desc">{cleanDesc}</span>
          </>
        )}
      </div>
    </aside>
  );
}
