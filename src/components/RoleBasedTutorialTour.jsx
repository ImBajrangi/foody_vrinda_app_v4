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

// Comprehensive valid CSS fallback selector map per stage across all 5 panels
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

/**
 * Speech Bubble Tail Component (iOS / iMessage style curved tail)
 */
function SpeechBubbleTail({ placement, arrowLeft, isLight }) {
  const bg = isLight ? '#FAF5EB' : '#282526';
  const border = isLight ? 'rgba(217, 119, 6, 0.4)' : 'rgba(253, 145, 57, 0.35)';

  if (placement === 'bottom') {
    // Bubble is below target -> Tail on TOP edge pointing UP
    return (
      <div
        style={{ left: `${arrowLeft}px` }}
        className="absolute -top-[11px] -translate-x-1/2 z-30 pointer-events-none"
      >
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
          <path
            d="M 2 12 C 7 12, 9 7, 11 1 C 13 7, 15 12, 20 12 Z"
            fill={bg}
          />
          <path
            d="M 2 12 C 7 12, 9 7, 11 1 C 13 7, 15 12, 20 12"
            stroke={border}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // Bubble is above target -> Tail on BOTTOM edge pointing DOWN
  return (
    <div
      style={{ left: `${arrowLeft}px` }}
      className="absolute -bottom-[11px] -translate-x-1/2 z-30 pointer-events-none"
    >
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
        <path
          d="M 2 0 C 7 0, 9 5, 11 11 C 13 5, 15 0, 20 0 Z"
          fill={bg}
        />
        <path
          d="M 2 0 C 7 0, 9 5, 11 11 C 13 5, 15 0, 20 0"
          stroke={border}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

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

  // Update target rect with scroll sync
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !activeStage) return;

    const el = locateTargetElement(activeStage.dataTour);

    if (el) {
      // Smoothly scroll target into visible viewport if occluded
      const r = el.getBoundingClientRect();
      const inView = (
        r.top >= 60 &&
        r.bottom <= window.innerHeight - 60 &&
        r.left >= 10 &&
        r.right <= window.innerWidth - 10
      );

      if (!inView) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch (_) {}
      }

      // Re-read fresh bounding box after potential scroll adjustments
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
        setTargetFound(true);
      }, 80);
    } else {
      setTargetRect(null);
      setTargetFound(false);
    }
  }, [isOpen, activeStage, locateTargetElement]);

  // Helper to emit close event
  const dispatchCloseEvent = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('foody:tutorial-closed', {
        detail: { role: resolvedRole }
      })
    );
  }, [resolvedRole]);

  // Emit event whenever step changes or tour opens so active panels auto-open their tabs/drawers
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

    // Give the view component a tick to render newly opened tab/drawer before locating rect
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, resolvedRole, stages, updateTargetPosition]);

  // Recalculate target position whenever stage changes or on window scroll
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 40);

    const handleScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen, currentStep, updateTargetPosition]);

  // Clean-up on unmount if tour was active
  useEffect(() => {
    return () => {
      if (isOpen) {
        dispatchCloseEvent();
      }
    };
  }, [isOpen, dispatchCloseEvent]);

  // Advance to next step or complete
  const handleNext = () => {
    if (currentStep < stages.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveTutorialProgress(userId, resolvedRole, nextStep);
    } else {
      // Completed all steps
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

  // Responsive Message Bubble Positioning Engine
  const cardWidth = Math.min(350, windowDims.width - 24);
  const cardEstimatedHeight = 160;

  // Compute spotlight cutout rectangle with padding
  const padding = 8;
  const cutout = targetRect ? {
    x: Math.max(0, targetRect.left - padding),
    y: Math.max(0, targetRect.top - padding),
    w: targetRect.width + (padding * 2),
    h: targetRect.height + (padding * 2)
  } : null;

  let placement = 'bottom';
  let cardTop = windowDims.height - cardEstimatedHeight - 24;
  let cardLeft = (windowDims.width - cardWidth) / 2;
  let arrowLeft = cardWidth / 2;

  if (targetRect) {
    const spaceBelow = windowDims.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const gap = 16;

    if (spaceBelow >= cardEstimatedHeight + gap) {
      placement = 'bottom';
      cardTop = targetRect.bottom + gap;
    } else if (spaceAbove >= cardEstimatedHeight + gap) {
      placement = 'top';
      cardTop = Math.max(12, targetRect.top - cardEstimatedHeight - gap);
    } else {
      placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      cardTop = placement === 'bottom'
        ? Math.min(windowDims.height - cardEstimatedHeight - 12, targetRect.bottom + gap)
        : Math.max(12, targetRect.top - cardEstimatedHeight - gap);
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
            borderRadius: '18px',
            boxShadow: isLight
              ? '0 0 0 9999px rgba(25, 20, 22, 0.62), 0 0 25px rgba(245, 158, 11, 0.40)'
              : '0 0 0 9999px rgba(10, 8, 9, 0.84), 0 0 30px rgba(253, 145, 57, 0.45)',
          }}
          className={`fixed pointer-events-none z-10 transition-all duration-300 border-2 ${
            isLight
              ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
              : 'border-[#FD9139] shadow-[0_0_30px_rgba(253, 145, 57,0.5),inset_0_0_12px_rgba(253, 145, 57,0.2)]'
          }`}
        />
      ) : (
        /* Fallback Backdrop if target element is not in view */
        <div
          className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-300 ${
            isLight ? 'bg-black/60' : 'bg-black/80'
          }`}
        />
      )}

      {/* CHAT MESSAGE BUBBLE CONTAINER */}
      <div
        ref={cardRef}
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`
        }}
        className={`fixed z-20 flex flex-col rounded-[24px] sm:rounded-[28px] p-4 sm:p-4.5 transition-all duration-300 apple-modal-spring shadow-2xl relative ${
          isLight
            ? 'bg-[#FAF5EB] text-stone-900 border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.25)]'
            : 'bg-[#282526] text-white border border-[#FD9139]/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)]'
        } ${closing ? 'closing' : ''}`}
      >
        {/* Authentic Chat Speech Tail pointing at the element */}
        {targetFound && (
          <SpeechBubbleTail
            placement={placement}
            arrowLeft={arrowLeft}
            isLight={isLight}
          />
        )}

        {/* Top Mini Header: Step Chip & Close */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-outfit border ${
                isLight
                  ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                  : 'bg-[#FD9139]/15 text-[#FD9139] border-[#FD9139]/30'
              }`}
            >
              {tutorialData?.roleLabel || 'Guide'} • {currentStep + 1}/{stages.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isLight
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-600'
                : 'bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white'
            }`}
            title="Skip Tour"
            aria-label="Skip Tour"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* 1 to 2 Liner Message Body */}
        <div className="space-y-1 my-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                  : 'bg-[#FD9139]/15 text-[#FD9139] border-[#FD9139]/30'
              }`}
            >
              <IconComponent size={13} strokeWidth={2.5} />
            </div>
            <h3 className="text-xs sm:text-sm font-black font-outfit tracking-tight truncate">
              {activeStage.title}
            </h3>
          </div>

          {/* Strictly 1 to 2 Lines Max */}
          <p
            className={`text-[11px] sm:text-xs font-medium leading-snug line-clamp-2 pl-8 ${
              isLight ? 'text-stone-600' : 'text-zinc-300'
            }`}
          >
            {activeStage.description || activeStage.subtitle}
          </p>
        </div>

        {/* Relative Navigation Controls Bar: Skip, Back, Next */}
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-stone-200/60 dark:border-white/10">
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="text-[11px] font-bold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer px-1 py-0.5"
          >
            Skip
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {stages.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStep
                    ? isLight
                      ? 'bg-amber-600 w-3'
                      : 'bg-[#FD9139] w-3'
                    : isLight
                      ? 'bg-stone-300'
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Next / Back cluster */}
          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="h-7 px-2.5 rounded-full font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 border bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-800 dark:text-white border-stone-300 dark:border-white/10"
              >
                <ChevronLeft size={12} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`h-7 px-3 rounded-full font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 font-outfit shadow-sm ${
                isLight
                  ? 'bg-stone-900 hover:bg-stone-800 text-white'
                  : 'bg-[#FD9139] hover:bg-[#FCA65E] text-[#121011]'
              }`}
            >
              <span>{isLast ? 'Done' : 'Next'}</span>
              {isLast ? (
                <CheckCircle2 size={12} strokeWidth={2.8} />
              ) : (
                <ChevronRight size={12} strokeWidth={2.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
