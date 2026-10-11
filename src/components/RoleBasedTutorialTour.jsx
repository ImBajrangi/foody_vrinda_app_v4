import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ROLE_TUTORIAL_DATA,
  getTutorialKeyForRole,
  markTutorialCompleted,
  saveTutorialProgress
} from '../services/tutorialService';

// Comprehensive valid CSS fallback selector map per stage across all panels
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

  // Kitchen stages
  'restaurant-setup': [
    '[data-tour~="restaurant-setup"]',
    'button[title*="Availability" i]',
    'button[title*="Online" i]'
  ],
  'restaurant-menu': [
    '[data-tour~="restaurant-menu"]',
    'button[title*="Stock" i]',
    'button[title*="Menu" i]',
    'button[title*="Order" i]'
  ],
  'restaurant-orders': [
    '[data-tour~="restaurant-orders"]',
    '[data-tour*="orders"]'
  ],
  'restaurant-sales': [
    '[data-tour~="restaurant-sales"]',
    '[data-tour*="sales"]'
  ],
  'restaurant-grow': [
    '[data-tour~="restaurant-grow"]',
    '[data-tour*="grow"]'
  ],

  // Delivery / Rider stages
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
  'delivery-navigation': [
    '[data-tour~="delivery-navigation"]',
    'button[title*="HUD" i]',
    'button[title*="Map" i]',
    'button[title*="Navigation" i]'
  ],
  'delivery-earnings': [
    '[data-tour~="delivery-earnings"]',
    '[data-tour*="earnings"]',
    '[data-tour*="cash"]'
  ],
  'delivery-report': [
    '[data-tour~="delivery-report"]',
    'button[title*="Slip" i]',
    'button[title*="Report" i]',
    'button[title*="PDF" i]',
    'button[title*="Statement" i]'
  ],

  // Owner stages
  'owner-stores': [
    '[data-tour~="owner-stores"]',
    'button[title*="Store" i]',
    'button[title*="Kitchen" i]',
    'header'
  ],
  'owner-sales': [
    '[data-tour~="owner-sales"]',
    '[data-tour*="sales"]',
    'div[class*="metric"]',
    'div[class*="stat"]'
  ],
  'owner-menu': [
    '[data-tour~="owner-menu"]',
    'button[title*="Menu" i]',
    'div[class*="menu"]'
  ],
  'owner-staff': [
    '[data-tour~="owner-staff"]',
    'button[title*="Staff" i]',
    'button[title*="Role" i]'
  ],

  // Developer stages
  'dev-console': [
    '[data-tour~="dev-console"]',
    'header',
    'div[class*="terminal"]'
  ],
  'dev-realtime': [
    '[data-tour~="dev-realtime"]',
    'div[class*="realtime"]',
    'div[class*="stream"]'
  ],
  'dev-audit': [
    '[data-tour~="dev-audit"]',
    'button[title*="Audit" i]',
    'button[title*="DR" i]'
  ]
};

export default function RoleBasedTutorialTour({ isOpen, onClose, onComplete, forceRole = null }) {
  const { user, userData, userRole } = useAuth();
  const { isLight } = useTheme();
  const userId = user?.id || userData?.id;

  // Determine active role & tutorial dataset
  const resolvedRole = forceRole || userRole || 'customer';
  const tutorialKey = getTutorialKeyForRole(resolvedRole) || 'customer_v1';
  const tutorialData = ROLE_TUTORIAL_DATA[tutorialKey] || ROLE_TUTORIAL_DATA.customer_v1 || { stages: [], roleLabel: 'Guide' };
  const stages = tutorialData?.stages || [];

  const [currentStep, setCurrentStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, isTapping: false });
  const [windowDims, setWindowDims] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

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
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  };

  // Find target element with fallback cascades
  const locateTargetElement = useCallback((dataTourTag) => {
    if (!dataTourTag) return null;

    // 1. Direct query
    const directEls = Array.from(document.querySelectorAll(`[data-tour~="${dataTourTag}"]`));
    const visibleDirect = directEls.find(isElementVisible);
    if (visibleDirect) return visibleDirect;

    // 2. Fallback candidates from mapping table
    const fallbackSelectors = SELECTOR_FALLBACKS[dataTourTag] || [];
    for (const sel of fallbackSelectors) {
      try {
        const foundList = Array.from(document.querySelectorAll(sel));
        const firstVisible = foundList.find(isElementVisible);
        if (firstVisible) return firstVisible;
      } catch (_) {}
    }

    // 3. Heuristic matching by tag tokens
    const tokens = dataTourTag.split('-');
    const lastToken = tokens[tokens.length - 1];
    if (lastToken && lastToken.length > 2) {
      const fuzzyEls = Array.from(document.querySelectorAll(`[data-tour*="${lastToken}"]`));
      const fuzzyVisible = fuzzyEls.find(isElementVisible);
      if (fuzzyVisible) return fuzzyVisible;
    }

    return null;
  }, []);

  // Update target rect with scroll sync & animate cursor
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !activeStage) return;

    const el = locateTargetElement(activeStage.dataTour);

    if (el) {
      // Smoothly scroll target into visible viewport if occluded
      const r = el.getBoundingClientRect();
      const inView = (
        r.top >= 70 &&
        r.bottom <= window.innerHeight - 80 &&
        r.left >= 10 &&
        r.right <= window.innerWidth - 10
      );

      if (!inView) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch (_) {}
      }

      // Read bounding box and set smooth cursor glide position
      setTimeout(() => {
        if (!el.isConnected) return;
        const freshRect = el.getBoundingClientRect();
        setTargetRect({
          top: freshRect.top,
          left: freshRect.left,
          width: freshRect.width,
          height: freshRect.height,
          bottom: freshRect.bottom,
          right: freshRect.right
        });

        // Target center for cursor landing
        const targetX = freshRect.left + (freshRect.width / 2);
        const targetY = freshRect.top + (freshRect.height / 2);

        setCursorPos({ x: targetX, y: targetY, isTapping: false });

        // Trigger micro-tap haptic ripple after cursor arrives
        setTimeout(() => {
          setCursorPos(prev => ({ ...prev, isTapping: true }));
          setTimeout(() => {
            setCursorPos(prev => ({ ...prev, isTapping: false }));
          }, 350);
        }, 320);
      }, 70);
    } else {
      setTargetRect(null);
      setCursorPos({ x: windowDims.width / 2, y: windowDims.height / 2 - 80, isTapping: false });
    }
  }, [isOpen, activeStage, locateTargetElement, windowDims]);

  // Helper to emit close event
  const dispatchCloseEvent = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('foody:tutorial-closed', {
        detail: { role: resolvedRole }
      })
    );
  }, [resolvedRole]);

  // Emit event whenever step changes
  useEffect(() => {
    if (!isOpen || stages.length === 0) return;
    const stage = stages[currentStep] || stages[0];
    if (!stage) return;

    window.dispatchEvent(
      new CustomEvent('foody:tutorial-step-active', {
        detail: {
          stage,
          tag: stage.dataTour || '',
          step: currentStep,
          role: resolvedRole
        }
      })
    );

    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, resolvedRole, stages, updateTargetPosition]);

  // Recalculate target position on window scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [isOpen, updateTargetPosition]);

  // Advance to next step or complete
  const handleNext = () => {
    if (currentStep < stages.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveTutorialProgress(userId, resolvedRole, nextStep);
    } else {
      setClosing(true);
      markTutorialCompleted(userId, resolvedRole, stages.length);
      dispatchCloseEvent();
      setTimeout(() => {
        if (onComplete) onComplete();
        if (onClose) onClose();
      }, 180);
    }
  };

  // Step back
  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveTutorialProgress(userId, resolvedRole, prevStep);
    }
  };

  // Skip tutorial
  const handleSkip = () => {
    setClosing(true);
    markTutorialCompleted(userId, resolvedRole, currentStep);
    dispatchCloseEvent();
    setTimeout(() => {
      if (onClose) onClose();
    }, 180);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, stages.length]);

  if (!isOpen || stages.length === 0) return null;

  const isLast = currentStep === stages.length - 1;
  const IconComponent = activeStage.icon || HelpCircle;

  // Compute spotlight ring on target
  const padding = 6;
  const cutout = targetRect ? {
    x: Math.max(0, targetRect.left - padding),
    y: Math.max(0, targetRect.top - padding),
    w: targetRect.width + (padding * 2),
    h: targetRect.height + (padding * 2)
  } : null;

  // Determine if target is in bottom half -> place guide capsule at top
  const isTargetNearBottom = targetRect && targetRect.bottom > windowDims.height - 220;

  return (
    <div
      className={`fixed inset-0 z-[9999999] overflow-hidden select-none transition-opacity duration-200 pointer-events-auto ${closing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ touchAction: 'none' }}
    >
      {/* 1. Ultra-clean Subtle Backdrop (Zero Clunky Blackout Scrim) */}
      <div 
        onClick={handleSkip}
        className="fixed inset-0 bg-black/30 dark:bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto"
      />

      {/* 2. Delicate Target Element Spotlight Aura (Zero 9999px box-shadow) */}
      {cutout && (
        <div
          style={{
            top: `${cutout.y}px`,
            left: `${cutout.x}px`,
            width: `${cutout.w}px`,
            height: `${cutout.h}px`,
            borderRadius: '22px',
          }}
          className="fixed pointer-events-none z-10 transition-all duration-300 border-2 border-[#FD9139] shadow-[0_0_25px_rgba(253,145,57,0.55),inset_0_0_15px_rgba(253,145,57,0.25)] ring-4 ring-[#FD9139]/20 animate-pulse"
        />
      )}

      {/* 3. VRINDOPNISHAD-STYLE HARDWARE-ACCELERATED GUIDED CURSOR */}
      <div
        style={{
          transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
          transition: 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="fixed top-0 left-0 z-30 pointer-events-none -ml-2 -mt-2 flex items-start gap-1.5 will-change-transform"
      >
        {/* Soft Animated macOS Pointer Arrow */}
        <div 
          style={{
            transform: cursorPos.isTapping ? 'scale(0.82) rotate(-8deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          className="relative drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)]"
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block overflow-visible"
          >
            <path
              d="M 5.8 3.6 Q 4.5 3.2 4.6 4.6 L 10.2 22.6 Q 10.6 23.9 11.7 23.2 L 14.2 16.6 L 21.8 14.7 Q 23.1 14.4 22.6 13.2 L 6.8 3.8 Z"
              fill="#FD9139"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          {/* Micro Tap Beacon Ripple */}
          {cursorPos.isTapping && (
            <span className="absolute -inset-2 rounded-full border-2 border-[#FD9139] animate-ping pointer-events-none" />
          )}
        </div>

        {/* Fluid Trailing Badge Pill (Hidden on mobile viewports to prevent input clipping) */}
        <div 
          className="hidden sm:flex px-2.5 py-1 rounded-full bg-[#1E1B1C] text-white border border-[#FD9139]/40 shadow-[0_6px_20px_rgba(0,0,0,0.6)] text-[10.5px] font-black font-['Outfit'] tracking-wide whitespace-nowrap items-center gap-1.5 animate-hint-float"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FD9139] animate-pulse" />
          <span>{activeStage.uiElement || activeStage.tag?.split('•')[1]?.trim() || 'Tap Here'}</span>
        </div>
      </div>

      {/* 4. DYNAMIC ISLAND GUIDED HUD CAPSULE (Clean Apple Standard, Non-Occluding) */}
      <div
        style={{
          bottom: isTargetNearBottom ? 'auto' : 'calc(20px + env(safe-area-inset-bottom, 0px))',
          top: isTargetNearBottom ? 'calc(24px + env(safe-area-inset-top, 0px))' : 'auto',
        }}
        className={`fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[420px] rounded-[28px] p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.9)] transition-all duration-300 border ${
          isLight
            ? 'bg-[#FAF5EB]/98 text-stone-900 border-amber-400/40'
            : 'bg-[#1E1B1C]/98 text-white border-white/10'
        }`}
      >
        {/* Top Header: Role Badge + Progress dots + Skip Close */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider font-['Outfit'] bg-[#FD9139]/15 text-[#FD9139] border border-[#FD9139]/30">
              {tutorialData?.roleLabel || 'Guide'} • {currentStep + 1}/{stages.length}
            </span>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1">
            {stages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStep
                    ? 'w-4 bg-[#FD9139]'
                    : isLight ? 'w-1.5 bg-stone-300' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 text-stone-400 hover:text-stone-900 dark:hover:text-white"
            title="Close Tutorial"
            aria-label="Close Tutorial"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3 my-1">
          <div className="w-9 h-9 rounded-2xl bg-[#FD9139]/15 text-[#FD9139] border border-[#FD9139]/30 flex items-center justify-center shrink-0">
            <IconComponent size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-black font-['Outfit'] tracking-tight truncate">
              {activeStage.title}
            </h3>
            <p className={`text-xs mt-0.5 font-medium leading-relaxed line-clamp-2 ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>
              {activeStage.description || activeStage.subtitle}
            </p>
          </div>
        </div>

        {/* Footer Actions Row */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-200/60 dark:border-white/10">
          <button
            onClick={handleSkip}
            className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer px-1 py-1"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="h-8 px-3 rounded-full font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 border bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-800 dark:text-white border-stone-300 dark:border-white/10"
              >
                <ChevronLeft size={13} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="h-8 px-4 rounded-full font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 font-['Outfit'] shadow-md bg-[#FD9139] hover:bg-[#FCA65E] text-white"
            >
              <span>{isLast ? 'Done' : 'Next'}</span>
              {isLast ? (
                <CheckCircle2 size={13} strokeWidth={2.8} />
              ) : (
                <ChevronRight size={13} strokeWidth={2.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
