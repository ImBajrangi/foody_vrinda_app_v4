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
import {
  ROLE_TUTORIAL_DATA,
  getTutorialKeyForRole,
  markTutorialCompleted,
  saveTutorialProgress
} from '../services/tutorialService';

// Fallback selector map if dataTour is slightly varied or nested
const SELECTOR_FALLBACKS = {
  'customer-search': ['[data-tour="customer-search"]', '[data-tour*="search"]', 'button[title*="Search"]'],
  'customer-categories': ['[data-tour="customer-categories"]', '[data-tour="food-categories"]', '.sticky-category-bar'],
  'customer-add-to-cart': ['[data-tour="customer-add-to-cart"]', '[data-tour*="add-to-cart"]', '.food-card-pop button', '.food-card-pop'],
  'customer-basket': ['[data-tour="customer-basket"]', 'button[title*="Basket"]', 'button[title*="Cart"]'],
  'customer-address': ['[data-tour="customer-address"]', 'button[title*="Branch"]', 'textarea[placeholder*="ashram"]', '.branch-selector'],
  'customer-fv-wallet': ['[data-tour="customer-fv-wallet"]', 'button[title*="Rewards"]', 'button[title*="FV"]'],
  'customer-profile': ['[data-tour="customer-profile"]', '[data-tour="profile-avatar"]', 'button[title*="Profile"]'],
  
  'delivery-go-online': ['[data-tour="delivery-go-online"]', 'button:has(span:contains("Duty"))', 'button[title*="Duty"]'],
  'delivery-orders': ['[data-tour="delivery-orders"]', 'button:has(span:contains("Orders"))', '.orders-board'],
  'delivery-accept': ['[data-tour="delivery-accept"]', 'button:contains("Claim")', 'button:contains("Accept")'],
  'delivery-navigation': ['[data-tour="delivery-navigation"]', 'button:contains("HUD")', 'button:contains("Map")'],
  'delivery-complete': ['[data-tour="delivery-complete"]', 'button:contains("Delivered")', 'button:contains("OTP")'],
  'delivery-earnings': ['[data-tour="delivery-earnings"]', '[data-tour*="earnings"]'],
  'delivery-referral': ['[data-tour="delivery-referral"]', '[data-tour*="referral"]'],

  'restaurant-setup': ['[data-tour="restaurant-setup"]', 'button[title*="Availability"]', 'button[title*="Online"]'],
  'restaurant-menu': ['[data-tour="restaurant-menu"]', 'button:contains("Manual Order")', 'button[title*="Menu"]'],
  'restaurant-orders': ['[data-tour="restaurant-orders"]', '.orders-grid', '[data-tour*="orders"]'],
  'restaurant-manage-orders': ['[data-tour="restaurant-manage-orders"]', 'button:contains("Cooking")', 'button:contains("Ready")'],
  'restaurant-sales': ['[data-tour="restaurant-sales"]', '[data-tour*="sales"]'],
  'restaurant-grow': ['[data-tour="restaurant-grow"]', '[data-tour*="grow"]']
};

export default function RoleBasedTutorialTour({ isOpen, onClose, onComplete, forceRole = null }) {
  const { user, userData, userRole } = useAuth();
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

  // Element Finder and Measurement
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStage?.dataTour) {
      setTargetRect(null);
      setTargetFound(false);
      return;
    }

    let el = document.querySelector(`[data-tour="${activeStage.dataTour}"]`);
    
    // Check fallback selectors
    if (!el && SELECTOR_FALLBACKS[activeStage.dataTour]) {
      for (const sel of SELECTOR_FALLBACKS[activeStage.dataTour]) {
        try {
          const match = document.querySelector(sel);
          if (match) {
            el = match;
            break;
          }
        } catch (_) {}
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      // Ensure element has dimensions and is in document
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
  }, [isOpen, activeStage]);

  // Scroll into view & track target element on stage change
  useEffect(() => {
    if (!isOpen) return;

    let timer = setTimeout(() => {
      const el = updateTargetRect();
      if (el) {
        // Only scroll if element is not already visible in comfortable viewport area
        const r = el.getBoundingClientRect();
        const isInView = r.top >= 60 && r.bottom <= window.innerHeight - 60;
        if (!isInView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          // Re-measure after scroll settling
          setTimeout(updateTargetRect, 280);
        }
      }
    }, 60);

    const onScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll, { capture: true });
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
  const cardEstimatedHeight = 280;

  let placement = 'center';
  let cardTop = windowDims.height / 2 - 140;
  let cardLeft = (windowDims.width - cardWidth) / 2;
  let arrowLeft = cardWidth / 2;

  if (targetRect && targetFound) {
    const spaceBelow = windowDims.height - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow >= cardEstimatedHeight + 20) {
      placement = 'bottom';
      cardTop = targetRect.bottom + 14;
    } else if (spaceAbove >= cardEstimatedHeight + 20) {
      placement = 'top';
      cardTop = Math.max(16, targetRect.top - cardEstimatedHeight - 14);
    } else {
      placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      cardTop = placement === 'bottom' 
        ? Math.min(windowDims.height - cardEstimatedHeight - 16, targetRect.bottom + 14)
        : Math.max(16, targetRect.top - cardEstimatedHeight - 14);
    }

    // Align horizontally with target center, clamped inside viewport
    const targetCenter = targetRect.left + (targetRect.width / 2);
    const desiredLeft = targetCenter - (cardWidth / 2);
    cardLeft = Math.max(12, Math.min(windowDims.width - cardWidth - 12, desiredLeft));
    arrowLeft = Math.max(24, Math.min(cardWidth - 24, targetCenter - cardLeft));
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999999] overflow-hidden apple-overlay select-none transition-opacity duration-200 ${closing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ touchAction: 'none' }}
    >
      {/* SVG FULL-SCREEN MASK BACKDROP */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="game-tour-spotlight-mask">
            {/* White covers entire screen (opaque) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black punches the transparent hole over the target element */}
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.w}
                height={cutout.h}
                rx={18}
                ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Shrouded dark luxury backdrop with mask applied */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(10, 8, 9, 0.82)"
          mask="url(#game-tour-spotlight-mask)"
          className="backdrop-blur-[3px]"
        />
      </svg>

      {/* Target Element Glowing Aura & Animated Border */}
      {cutout && (
        <div
          style={{
            top: `${cutout.y}px`,
            left: `${cutout.x}px`,
            width: `${cutout.w}px`,
            height: `${cutout.h}px`,
            borderRadius: '18px'
          }}
          className="fixed pointer-events-none z-10 transition-all duration-300 border-2 border-[#E0FF33] shadow-[0_0_35px_rgba(224,255,51,0.55),inset_0_0_15px_rgba(224,255,51,0.25)] animate-pulse"
        />
      )}

      {/* CALLOUT CARD CONTAINER */}
      <div
        ref={cardRef}
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`
        }}
        className={`fixed z-20 flex flex-col bg-[#1E1B1C] text-white rounded-[28px] sm:rounded-[32px] border border-[#E0FF33]/30 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(224,255,51,0.15)] overflow-hidden transition-all duration-300 apple-modal-spring ${closing ? 'closing' : ''}`}
      >
        {/* Directional Arrow pointing to the highlighted element */}
        {targetFound && placement === 'bottom' && (
          <div
            style={{ left: `${arrowLeft}px` }}
            className="absolute -top-2 -translate-x-1/2 w-4 h-4 bg-[#1E1B1C] border-t border-l border-[#E0FF33]/30 rotate-45 z-30"
          />
        )}
        {targetFound && placement === 'top' && (
          <div
            style={{ left: `${arrowLeft}px` }}
            className="absolute -bottom-2 -translate-x-1/2 w-4 h-4 bg-[#1E1B1C] border-b border-r border-[#E0FF33]/30 rotate-45 z-30"
          />
        )}

        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#E0FF33] to-transparent opacity-80" />

        {/* Header Ribbon: Stage Tag + Step Counter + Close */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E0FF33]/15 text-[#E0FF33] text-[10px] font-black uppercase tracking-wider font-['Outfit'] border border-[#E0FF33]/30">
              {activeStage.tag || `STAGE ${currentStep + 1}`}
            </span>
            <span className="text-[11px] font-bold text-zinc-400 font-mono">
              {currentStep + 1} / {stages.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
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
            <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33] shrink-0 shadow-sm">
              <IconComponent size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] tracking-tight leading-snug">
                {activeStage.title}
              </h3>
              <p className="text-xs text-zinc-300 font-medium leading-relaxed mt-1">
                {activeStage.subtitle}
              </p>
            </div>
          </div>

          {/* Highlights / Features pill list */}
          {activeStage.highlights && activeStage.highlights.length > 0 && (
            <div className="bg-[#151314] rounded-2xl p-3 border border-white/5 space-y-2">
              {activeStage.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E0FF33] mt-1.5 shrink-0" />
                  <div className="leading-snug">
                    <strong className="text-white font-bold">{h.label}:</strong>{' '}
                    <span className="text-zinc-400">{h.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Target Element Fallback notice if element not in current viewport */}
          {!targetFound && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400 shrink-0" />
              <span>Target feature: {activeStage.uiElement || 'Platform Control'}</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E0FF33] rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-3.5 bg-[#151314] border-t border-white/10 flex items-center justify-between gap-3">
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
          >
            Skip Tour
          </button>

          {/* Next / Back cluster */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="h-9 px-4 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(224,255,51,0.3)] transition-all cursor-pointer active:scale-95 font-['Outfit']"
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
