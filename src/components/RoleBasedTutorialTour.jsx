import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Search,
  UtensilsCrossed,
  Plus,
  ShoppingBag,
  MapPin,
  Coins,
  User,
  Power,
  Navigation,
  DollarSign,
  Users,
  ChefHat,
  Store,
  Menu,
  BellRing,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ROLE_TUTORIAL_DATA,
  getTutorialKeyForRole,
  markTutorialCompleted,
  saveTutorialProgress
} from '../services/tutorialService';

// Comprehensive valid CSS fallback selector map per stage
const SELECTOR_FALLBACKS = {
  // Customer stages
  'customer-search': [
    '[data-tour~="customer-search"]',
    '[data-tour*="search"]',
    'button[title*="Search" i]',
    'button[aria-label*="Search" i]',
    'input[placeholder*="Search" i]'
  ],
  'customer-categories': [
    '[data-tour~="customer-categories"]',
    '[data-tour*="categories"]',
    '.sticky-category-bar'
  ],
  'customer-add-to-cart': [
    '[data-tour~="customer-add-to-cart"]',
    '[data-tour*="add-to-cart"]',
    '.food-card-pop button',
    '.food-card-pop',
    '.stepper-capsule'
  ],
  'customer-basket': [
    '[data-tour~="customer-basket"]',
    'button[title*="Basket" i]',
    'button[title*="Cart" i]',
    'button[aria-label*="Basket" i]'
  ],
  'customer-address': [
    '[data-tour~="customer-address"]',
    '[data-tour*="branch-selector"]',
    'button[title*="Branch" i]',
    'button[title*="Address" i]'
  ],
  'customer-fv-wallet': [
    '[data-tour~="customer-fv-wallet"]',
    'button[title*="Rewards" i]',
    'button[title*="FV" i]',
    'button[title*="Points" i]'
  ],
  'customer-profile': [
    '[data-tour~="customer-profile"]',
    '[data-tour*="profile"]',
    'button[title*="Profile" i]',
    'button[title*="Account" i]'
  ],
  
  // Delivery stages
  'delivery-go-online': [
    '[data-tour~="delivery-go-online"]',
    'button[title*="Duty" i]',
    'button[title*="Online" i]'
  ],
  'delivery-orders': [
    '[data-tour~="delivery-orders"]',
    '[data-tour*="orders"]',
    'button[title*="Orders" i]'
  ],
  'delivery-accept': [
    '[data-tour~="delivery-accept"]',
    '[data-tour*="accept"]',
    '[data-tour*="claim"]',
    '[data-tour~="delivery-orders"]'
  ],
  'delivery-navigation': [
    '[data-tour~="delivery-navigation"]',
    'button[title*="HUD" i]',
    'button[title*="Map" i]',
    'button[title*="Navigation" i]'
  ],
  'delivery-complete': [
    '[data-tour~="delivery-complete"]',
    '[data-tour*="complete"]',
    '[data-tour*="otp"]',
    '[data-tour~="delivery-go-online"]'
  ],
  'delivery-earnings': [
    '[data-tour~="delivery-earnings"]',
    '[data-tour*="earnings"]'
  ],
  'delivery-referral': [
    '[data-tour~="delivery-referral"]',
    '[data-tour*="referral"]'
  ],

  // Restaurant / Kitchen stages
  'restaurant-setup': [
    '[data-tour~="restaurant-setup"]',
    'button[title*="Availability" i]',
    'button[title*="Online" i]'
  ],
  'restaurant-menu': [
    '[data-tour~="restaurant-menu"]',
    'button[title*="Menu" i]',
    'button[title*="Dishes" i]'
  ],
  'restaurant-orders': [
    '[data-tour~="restaurant-orders"]',
    '[data-tour*="orders"]'
  ],
  'restaurant-manage-orders': [
    '[data-tour~="restaurant-manage-orders"]',
    '[data-tour~="restaurant-orders"]'
  ],
  'restaurant-sales': [
    '[data-tour~="restaurant-sales"]',
    '[data-tour*="sales"]'
  ],
  'restaurant-grow': [
    '[data-tour~="restaurant-grow"]',
    '[data-tour*="grow"]'
  ]
};

export default function RoleBasedTutorialTour({ isOpen, onClose, onComplete, forceRole = null }) {
  const { user, userData, userRole } = useAuth();
  const { isLight } = useTheme();
  const userId = user?.id || userData?.id;

  // Determine active role & tutorial dataset
  const resolvedRole = forceRole || userRole || 'customer';
  const tutorialKey = getTutorialKeyForRole(resolvedRole) || 'customer_v1';
  const tutorialData = ROLE_TUTORIAL_DATA[tutorialKey] || ROLE_TUTORIAL_DATA.customer_v1;
  const stages = tutorialData.stages || [];

  const [currentStep, setCurrentStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [targetFound, setTargetFound] = useState(false);
  const [windowDims, setWindowDims] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  const cardRef = useRef(null);
  const activeStage = stages[currentStep] || stages[0] || {};

  // Reset step on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setClosing(false);
    }
  }, [isOpen]);

  // Window resize observer
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setWindowDims({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Helper: check if element is actually visible and rendered
  const isElementVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };

  // Safe element finder that handles space-separated and compound data-tour values
  const findElementForStage = useCallback((dataTour) => {
    if (!dataTour) return null;

    // 1. Direct attribute selectors (word match, contains match, exact match)
    const primarySelectors = [
      `[data-tour~="${dataTour}"]`,
      `[data-tour*="${dataTour}"]`,
      `[data-tour="${dataTour}"]`
    ];

    for (const sel of primarySelectors) {
      try {
        const matches = document.querySelectorAll(sel);
        for (const m of matches) {
          if (isElementVisible(m)) return m;
        }
      } catch (_) {}
    }

    // 2. Fallback selectors
    const fallbacks = SELECTOR_FALLBACKS[dataTour] || [];
    for (const sel of fallbacks) {
      try {
        const matches = document.querySelectorAll(sel);
        for (const m of matches) {
          if (isElementVisible(m)) return m;
        }
      } catch (_) {}
    }

    return null;
  }, []);

  // Element Finder and Measurement
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStage?.dataTour) {
      setTargetRect(null);
      setTargetFound(false);
      return null;
    }

    const el = findElementForStage(activeStage.dataTour);

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y
        });
        setTargetFound(true);
        return el;
      }
    }

    setTargetRect(null);
    setTargetFound(false);
    return null;
  }, [isOpen, activeStage?.dataTour, findElementForStage]);

  // Scroll into view & continuous rAF tracking on stage change
  useEffect(() => {
    if (!isOpen) return;

    let animationFrameId;
    let cancelTimer;
    const startTime = Date.now();

    const trackElement = () => {
      updateTargetRect();
      if (Date.now() - startTime < 650) {
        animationFrameId = requestAnimationFrame(trackElement);
      }
    };

    // Locate and scroll into view if needed
    cancelTimer = setTimeout(() => {
      const el = updateTargetRect();
      if (el) {
        const style = window.getComputedStyle(el);
        const isFixedOrSticky = style.position === 'fixed' || style.position === 'sticky';
        const r = el.getBoundingClientRect();
        const isInComfortableViewport = r.top >= 50 && r.bottom <= window.innerHeight - 50;

        if (!isInComfortableViewport && !isFixedOrSticky) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }
      animationFrameId = requestAnimationFrame(trackElement);
    }, 40);

    const onScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      clearTimeout(cancelTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  const handleFinish = () => {
    if (userId) {
      markTutorialCompleted(userId, resolvedRole, currentStep);
    }
    if (onComplete) onComplete();
    handleAnimatedClose();
  };

  const handleSkip = () => {
    if (userId) {
      markTutorialCompleted(userId, resolvedRole, currentStep);
    }
    handleAnimatedClose();
  };

  const handleNext = () => {
    if (currentStep < stages.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (userId) {
        saveTutorialProgress(userId, resolvedRole, nextStep);
      }
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, stages.length]);

  if (!isOpen) return null;

  const IconComponent = activeStage.icon || Sparkles;
  const isLast = currentStep === stages.length - 1;

  // Spotlight Cutout Coordinates with ergonomic padding
  const pad = 8;
  const cutout = targetRect ? {
    x: Math.max(0, targetRect.left - pad),
    y: Math.max(0, targetRect.top - pad),
    w: targetRect.width + (pad * 2),
    h: targetRect.height + (pad * 2)
  } : null;

  // Card Positioning Calculations
  const cardWidth = Math.min(windowDims.width - 24, 380);
  const cardHeight = cardRef.current?.offsetHeight || 290;

  let placement = 'center';
  let cardTop = Math.max(16, (windowDims.height - cardHeight) / 2);
  let cardLeft = Math.max(12, (windowDims.width - cardWidth) / 2);
  let arrowLeft = cardWidth / 2;

  if (targetRect && targetFound) {
    const spaceBelow = windowDims.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const gap = 14;

    if (spaceBelow >= cardHeight + gap) {
      placement = 'bottom';
      cardTop = targetRect.bottom + gap;
    } else if (spaceAbove >= cardHeight + gap) {
      placement = 'top';
      cardTop = Math.max(12, targetRect.top - cardHeight - gap);
    } else {
      placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      cardTop = placement === 'bottom' 
        ? Math.min(windowDims.height - cardHeight - 12, targetRect.bottom + gap)
        : Math.max(12, targetRect.top - cardHeight - gap);
    }

    // Align horizontally with target center, clamped inside viewport
    const targetCenter = targetRect.left + (targetRect.width / 2);
    const desiredLeft = targetCenter - (cardWidth / 2);
    cardLeft = Math.max(12, Math.min(windowDims.width - cardWidth - 12, desiredLeft));
    arrowLeft = Math.max(24, Math.min(cardWidth - 24, targetCenter - cardLeft));
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999999] overflow-hidden select-none transition-opacity duration-200 ${closing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ touchAction: 'none', background: 'transparent' }}
    >
      {/* Dynamic Theme Spotlight Hole & Backing Scrim */}
      {cutout ? (
        <div
          style={{
            top: `${cutout.y}px`,
            left: `${cutout.x}px`,
            width: `${cutout.w}px`,
            height: `${cutout.h}px`,
            borderRadius: '20px',
            boxShadow: isLight
              ? '0 0 0 9999px rgba(25, 20, 22, 0.62), 0 0 25px rgba(245, 158, 11, 0.40)'
              : '0 0 0 9999px rgba(10, 8, 9, 0.84), 0 0 30px rgba(224, 255, 51, 0.45)',
          }}
          className={`fixed pointer-events-none z-10 transition-all duration-300 border-2 ${
            isLight
              ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
              : 'border-[#E0FF33] shadow-[0_0_30px_rgba(224,255,51,0.5),inset_0_0_12px_rgba(224,255,51,0.2)]'
          }`}
        />
      ) : (
        /* Fallback Backdrop if target element is currently not detected on screen */
        <div 
          className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-300 ${
            isLight ? 'bg-black/60' : 'bg-black/80'
          }`}
        />
      )}

      {/* Responsive Callout Card Container */}
      <div
        ref={cardRef}
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`
        }}
        className={`fixed z-20 flex flex-col rounded-[28px] sm:rounded-[32px] overflow-hidden transition-all duration-300 apple-modal-spring ${
          isLight
            ? 'bg-[#FAF5EB] text-stone-900 border border-amber-400/50 shadow-[0_25px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(245,158,11,0.2)]'
            : 'bg-[#1E1B1C] text-white border border-[#E0FF33]/30 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(224,255,51,0.15)]'
        } ${closing ? 'closing' : ''}`}
      >
        {/* Directional Arrow pointing towards the highlighted element */}
        {targetFound && placement === 'bottom' && (
          <div
            style={{ left: `${arrowLeft}px` }}
            className={`absolute -top-2 -translate-x-1/2 w-4 h-4 rotate-45 z-30 ${
              isLight
                ? 'bg-[#FAF5EB] border-t border-l border-amber-400/60'
                : 'bg-[#1E1B1C] border-t border-l border-[#E0FF33]/40'
            }`}
          />
        )}
        {targetFound && placement === 'top' && (
          <div
            style={{ left: `${arrowLeft}px` }}
            className={`absolute -bottom-2 -translate-x-1/2 w-4 h-4 rotate-45 z-30 ${
              isLight
                ? 'bg-[#FAF5EB] border-b border-r border-amber-400/60'
                : 'bg-[#1E1B1C] border-b border-r border-[#E0FF33]/40'
            }`}
          />
        )}

        {/* Ambient Top Glow Accent */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 opacity-90 ${
            isLight
              ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent'
              : 'bg-gradient-to-r from-transparent via-[#E0FF33] to-transparent'
          }`}
        />

        {/* Header Ribbon: Stage Tag + Step Counter + Close */}
        <div
          className={`px-5 pt-4 pb-2.5 flex items-center justify-between gap-2 border-b ${
            isLight ? 'border-stone-300/60' : 'border-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-['Outfit'] border ${
                isLight
                  ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                  : 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30'
              }`}
            >
              {activeStage.tag || `STAGE ${currentStep + 1}`}
            </span>
            <span
              className={`text-[11px] font-bold font-mono ${
                isLight ? 'text-stone-500' : 'text-zinc-400'
              }`}
            >
              {currentStep + 1} / {stages.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isLight
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-600 hover:text-stone-950'
                : 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white'
            }`}
            title="Skip Tour"
            aria-label="Skip Tour"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3.5">
          {/* Title Row with Stage Icon */}
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                isLight
                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                  : 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30'
              }`}
            >
              <IconComponent size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className={`text-base sm:text-lg font-black font-['Outfit'] tracking-tight leading-snug ${
                  isLight ? 'text-stone-950' : 'text-white'
                }`}
              >
                {activeStage.title}
              </h3>
              <p
                className={`text-xs font-medium leading-relaxed mt-1 ${
                  isLight ? 'text-stone-600' : 'text-zinc-300'
                }`}
              >
                {activeStage.subtitle}
              </p>
            </div>
          </div>

          {/* Highlights / Features list */}
          {activeStage.highlights && activeStage.highlights.length > 0 && (
            <div
              className={`rounded-2xl p-3 border space-y-2 ${
                isLight
                  ? 'bg-stone-200/60 border-stone-300/80 text-stone-800'
                  : 'bg-[#151314] border-white/5 text-zinc-300'
              }`}
            >
              {activeStage.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      isLight ? 'bg-amber-600' : 'bg-[#E0FF33]'
                    }`}
                  />
                  <div className="leading-snug">
                    <strong className={isLight ? 'text-stone-950 font-bold' : 'text-white font-bold'}>
                      {h.label}:
                    </strong>{' '}
                    <span className={isLight ? 'text-stone-600' : 'text-zinc-400'}>{h.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Target Element Fallback notice if element not in current viewport */}
          {!targetFound && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium flex items-center gap-1.5 ${
                isLight
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-900'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              <Sparkles size={12} className={isLight ? 'text-amber-600' : 'text-amber-400'} />
              <span>Target feature: {activeStage.uiElement || 'Platform Control'}</span>
            </div>
          )}

          {/* Progress Bar */}
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isLight ? 'bg-stone-300/70' : 'bg-white/10'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isLight ? 'bg-amber-600' : 'bg-[#E0FF33]'
              }`}
              style={{ width: `${((currentStep + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-stone-100/90 border-stone-200'
              : 'bg-[#151314] border-white/10'
          }`}
        >
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className={`text-xs font-bold transition-colors cursor-pointer px-2 py-1 ${
              isLight
                ? 'text-stone-500 hover:text-stone-900'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Skip Tour
          </button>

          {/* Next / Back cluster */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className={`h-9 px-3 rounded-full font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 border ${
                  isLight
                    ? 'bg-stone-200/90 hover:bg-stone-300 text-stone-800 border-stone-300'
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                }`}
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`h-9 px-4 rounded-full font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 font-['Outfit'] shadow-md ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/20'
                  : 'bg-[#E0FF33] hover:bg-[#CCFF00] text-black shadow-[0_4px_16px_rgba(224,255,51,0.3)]'
              }`}
            >
              <span>{isLast ? 'Got it! Finish' : 'Next'}</span>
              {isLast ? (
                <CheckCircle2 size={14} strokeWidth={2.8} />
              ) : (
                <ChevronRight size={14} strokeWidth={2.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
