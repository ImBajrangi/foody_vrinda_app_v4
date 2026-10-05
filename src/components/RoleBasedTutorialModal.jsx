import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ROLE_TUTORIAL_DATA,
  getTutorialKeyForRole,
  markTutorialCompleted,
  saveTutorialProgress
} from '../services/tutorialService';

export default function RoleBasedTutorialModal({ isOpen, onClose, onComplete, forceRole = null }) {
  const { user, userData, userRole, isAuthenticated, loading } = useAuth();
  const userId = user?.id || userData?.id;

  // Determine active role & tutorial dataset
  const resolvedRole = forceRole || userRole || 'customer';
  const tutorialKey = getTutorialKeyForRole(resolvedRole) || 'customer_v1';
  const tutorialData = ROLE_TUTORIAL_DATA[tutorialKey] || ROLE_TUTORIAL_DATA.customer_v1;
  const stages = tutorialData.stages;

  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [closing, setClosing] = useState(false);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setClosing(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const activeStage = stages[currentStep] || stages[0];
  const IconComponent = activeStage.icon || Sparkles;
  const isLast = currentStep === stages.length - 1;
  const progressPercent = ((currentStep + 1) / stages.length) * 100;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md apple-overlay ${closing ? 'closing' : ''}`}
    >
      <div 
        className={`relative w-full max-w-lg bg-[#1E1B1C] border border-white/10 text-white rounded-[32px] sm:rounded-[40px] shadow-[0_30px_90px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] overflow-hidden apple-modal-spring ${closing ? 'closing' : ''}`}
      >
        {/* Ambient glow effect based on role accent */}
        <div 
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: tutorialData.accentColor }}
        />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner"
              style={{
                backgroundColor: `${tutorialData.accentColor}18`,
                borderColor: `${tutorialData.accentColor}40`,
                color: tutorialData.accentColor
              }}
            >
              <IconComponent size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] tracking-tight">
                  {tutorialData.roleLabel}
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: `${tutorialData.accentColor}25`,
                    color: tutorialData.accentColor
                  }}
                >
                  Step {currentStep + 1}/{stages.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Foody Vrinda Onboarding</p>
            </div>
          </div>

          <button 
            onClick={handleSkip}
            className="w-8 h-8 rounded-full bg-[#282526] hover:bg-[#343031] text-zinc-400 hover:text-white flex items-center justify-center transition-all apple-tap-target border border-white/10 cursor-pointer"
            title="Skip Tutorial"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-[#151314] h-1.5 relative overflow-hidden">
          <div 
            className="h-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: tutorialData.accentColor 
            }}
          />
        </div>

        {/* Step Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 relative z-10">
          {/* Main Stage Banner */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span 
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: tutorialData.accentColor }}
              >
                {activeStage.tag}
              </span>
              {activeStage.badgeText && (
                <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-bold">
                  {activeStage.badgeText}
                </span>
              )}
              {activeStage.uiElement && (
                <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white font-extrabold flex items-center gap-1">
                  <Compass size={11} className="text-[#E0FF33]" />
                  <span>{activeStage.uiElement}</span>
                </span>
              )}
            </div>

            <h4 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] leading-tight">
              {activeStage.title}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              {activeStage.subtitle}
            </p>
          </div>

          {/* Highlights Card */}
          <div className="bg-[#282526] border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3 shadow-xl">
            {activeStage.highlights.map((h, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-2xl bg-[#151314]/70 border border-white/5 hover:border-white/10 transition-all"
              >
                <div 
                  className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${tutorialData.accentColor}15`,
                    color: tutorialData.accentColor
                  }}
                >
                  <CheckCircle2 size={14} />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs font-bold text-white tracking-tight">{h.label}</p>
                  <p className="text-[11px] text-zinc-400 leading-snug">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {stages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep 
                    ? 'w-7' 
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                style={{
                  backgroundColor: idx === currentStep ? tutorialData.accentColor : undefined
                }}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 sm:p-5 bg-[#151314] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none self-start sm:self-center">
            <input 
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 text-[#E0FF33] focus:ring-0 bg-[#282526] cursor-pointer"
            />
            <span className="text-[11px] text-zinc-400 font-medium">Don't show automatically again</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="px-3.5 py-2.5 rounded-full text-zinc-400 hover:text-white font-bold text-xs transition-all apple-tap-target cursor-pointer"
              >
                Skip
              </button>
            )}

            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1 transition-all apple-tap-target cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-full font-black text-xs flex items-center gap-1.5 transition-all apple-tap-target cursor-pointer shadow-md"
              style={{
                backgroundColor: tutorialData.accentColor,
                color: tutorialData.role === 'customer' ? '#121011' : '#FFFFFF'
              }}
            >
              <span>{isLast ? 'Finish' : 'Next'}</span>
              {isLast ? <ArrowRight size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
