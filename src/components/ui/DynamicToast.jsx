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

  // Format into punchy, high-impact, zero-clipping copy
  const formatConciseToast = (titleStr, descStr) => {
    if (!titleStr) return { title: '', desc: null };

    let t = String(titleStr)
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    let d = descStr 
      ? String(descStr).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim()
      : null;

    // Drop noisy or redundant descriptions
    if (d && /^(from basket|updated|item removed|to basket|letters only|10-digits only)$/i.test(d)) {
      d = null;
    }

    // Common action phrase condensing into crisp professional labels
    t = t
      .replace(/^Added (.*) to (basket|cart)!?/i, '+1 $1')
      .replace(/^Removed (.*) (from|in) (basket|cart)!?/i, 'Removed · $1')
      .replace(/^Removed (.*)/i, 'Removed · $1')
      .replace(/^Basket Updated · (.*) \((\d+)\)/i, '$2x $1')
      .replace(/^(Item|Dish) Added to (Favorites|Favourites)/i, 'Saved to Favorites')
      .replace(/^Added to (Favorites|Favourites)/i, 'Saved to Favorites')
      .replace(/^Removed from (Favorites|Favourites)/i, 'Removed from Favorites')
      .replace(/^Cash on Delivery unavailable for this kitchen/i, 'COD Unavailable')
      .replace(/^Online payment unavailable for this kitchen/i, 'Online Pay Unavailable')
      .replace(/^Prepaid Order Required/i, 'Prepaid Required')
      .replace(/^Pickup from retail shop requires online payment.*/i, 'Prepaid Required')
      .replace(/^Link Copied to Clipboard/i, 'Link Copied')
      .replace(/^Vrinda Dish Shared/i, 'Link Copied')
      .replace(/^Detecting GPS location\.\.\./i, 'Locating GPS...')
      .replace(/^Address Auto-filled!?/i, 'Address Auto-filled')
      .replace(/^Payment recorded, finalizing order\.\.\./i, 'Finalizing Order...')
      .replace(/^Please pin your delivery address on map/i, 'Pin Location on Map')
      .replace(/^Enter valid recipient name.*/i, 'Name Required')
      .replace(/^Enter valid 10-digit mobile number/i, 'Valid Phone Required')
      .replace(/^Enter street or landmark name/i, 'Street Required')
      .replace(/^Self-Pickup is available at the counter right now/i, 'Self-Pickup Available')
      .trim();

    // Clean up filler prefix adjectives in dish names
    t = t
      .replace(/Vrindavan Special /gi, '')
      .replace(/Traditional /gi, '')
      .replace(/Authentic /gi, '')
      .replace(/Special /gi, '')
      .trim();

    // Format concise descriptions
    if (d) {
      d = d
        .replace(/^Pickup from retail shop requires.*/i, 'Online Only')
        .replace(/^Self-Pickup is available at the counter right now/i, 'Self-Pickup')
        .replace(/^5-Star Rating Shared/i, '5★ Rating')
        .replace(/^Payment confirmed/i, 'Confirmed')
        .replace(/^Cash on Delivery/i, 'Cash')
        .replace(/^Online Pay Confirmed/i, 'Online')
        .trim();

      if (!d) d = null;
    }

    // Merge standalone price description into title: "+1 Dish · ₹140"
    if (d && /^₹\d+/.test(d) && !t.includes('₹')) {
      t = `${t} · ${d}`;
      d = null;
    }

    // Keep length bounded cleanly without premature truncation
    if (t.length > 38) {
      if (t.includes(' · ₹')) {
        const [label, price] = t.split(' · ₹');
        t = `${label.slice(0, 24).trim()}… · ₹${price}`;
      } else {
        t = t.slice(0, 35).trim() + '…';
      }
    }

    if (d && d.length > 20) {
      d = d.slice(0, 18).trim() + '…';
    }

    return { title: t, desc: d };
  };

  const { title: cleanTitle, desc: cleanDesc } = formatConciseToast(rawTitle, rawDesc);

  const titleLower = cleanTitle.toLowerCase();
  const isFavAction = titleLower.includes('favourite') || titleLower.includes('favorite') || titleLower.includes('saved');
  const isFavRemove = isFavAction && (titleLower.includes('remove') || titleLower.includes('unsaved'));
  const isFavAdd = isFavAction && !isFavRemove;
  const isBasketAction = titleLower.includes('basket') || titleLower.includes('cart') || titleLower.includes('added') || titleLower.includes('+') || titleLower.includes('removed');
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
      return <Heart size={13} strokeWidth={2.6} className="text-rose-400 fill-rose-500" />;
    }
    if (isFavRemove) {
      return <HeartOff size={13} strokeWidth={2.6} className="text-zinc-300" />;
    }
    if (isShopAction) {
      return <Store size={13} strokeWidth={2.6} className="text-amber-300" />;
    }
    if (isBasketAction && effectiveTypeRaw === 'success') {
      return <ShoppingBag size={13} strokeWidth={2.6} className="text-emerald-300" />;
    }
    switch (effectiveTypeRaw) {
      case 'success':
        return <Check size={13} strokeWidth={3} className="text-emerald-300" />;
      case 'error':
        return <AlertCircle size={13} strokeWidth={2.6} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={13} strokeWidth={2.6} className="text-amber-300" />;
      case 'info':
      default:
        return <Sparkles size={13} strokeWidth={2.6} className="text-sky-300" />;
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
