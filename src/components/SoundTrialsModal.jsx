import { useState, useCallback } from 'react';
import { Volume2, Play, Check, X, Sparkles, Music, Waves, BellRing } from 'lucide-react';
import nativeNotify, { NOTIFICATION_TRIALS } from '../services/nativeNotificationService';

export default function SoundTrialsModal({ isOpen, onClose }) {
  const [activeTrial, setActiveTrial] = useState(() => {
    return nativeNotify.getActiveTrial();
  });
  const [playingId, setPlayingId] = useState(null);
  const [isDevotional, setIsDevotional] = useState(() => {
    return nativeNotify.getDevotionalTone();
  });

  const handleToggleDevotional = useCallback(() => {
    const nextVal = !isDevotional;
    setIsDevotional(nextVal);
    nativeNotify.setDevotionalTone(nextVal);
  }, [isDevotional]);

  const handlePlayTrial = useCallback((trialId, e) => {
    if (e) e.stopPropagation();
    setPlayingId(trialId);
    nativeNotify.playTrialSound(trialId);
    setTimeout(() => {
      setPlayingId((curr) => (curr === trialId ? null : curr));
    }, 700);
  }, []);

  const handleSelectTrial = useCallback((trialId) => {
    nativeNotify.setActiveTrial(trialId);
    setActiveTrial(trialId);
    nativeNotify.playTrialSound(trialId);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-full sm:max-w-lg bg-[#FAF7F2] dark:bg-[#1E1B1C] border-t sm:border border-stone-200/80 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.25)] sm:shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative flex flex-col text-stone-900 dark:text-white max-h-[90vh] overflow-hidden">
        
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-3.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/25 transition-colors" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between select-none shrink-0 bg-[#FAF7F2] dark:bg-[#1E1B1C]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 text-amber-700 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center shrink-0 shadow-xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight truncate">
                Notifications & Tone Settings
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 truncate font-['Plus_Jakarta_Sans'] font-medium mt-0.5">
                Acoustic sound trials & personalized messaging style
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 active:scale-95 flex items-center justify-center text-stone-700 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all border border-stone-300/60 dark:border-white/10 cursor-pointer shrink-0 ml-3"
            title="Close"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-5 pb-5 space-y-4">

        {/* Messaging Tone Selector (Clean / Devotional) */}
        <div className="p-3.5 rounded-2xl bg-stone-100/80 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Messaging Tone
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isDevotional 
                  ? 'bg-amber-500/15 text-amber-800 dark:bg-[#FD9139]/15 dark:text-[#FD9139]' 
                  : 'bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-zinc-300'
              }`}>
                {isDevotional ? 'Devotional Tone' : 'Professional Tone'}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-zinc-300 mt-0.5 font-medium">
              {isDevotional 
                ? 'Spiritual Vedic phrasing, temple blessings & sacred greetings' 
                : 'Clean, direct, and informative updates for fast food & general orders'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleDevotional}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              isDevotional ? 'bg-amber-600 dark:bg-[#FD9139]' : 'bg-stone-300 dark:bg-zinc-700'
            }`}
            title="Toggle devotional notification tone"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-black transition-transform shadow-xs ${
              isDevotional ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Section Label */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-black uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Select Notification Sound Trial
          </span>
        </div>

        {/* Trials List */}
        <div className="space-y-2.5">
          {NOTIFICATION_TRIALS.map((trial) => {
            const isSelected = activeTrial === trial.id;
            const isCurrentlyPlaying = playingId === trial.id;

            return (
              <div
                key={trial.id}
                onClick={() => handleSelectTrial(trial.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-[#FD9139]/10 border-amber-500/40 dark:border-[#FD9139]/40 shadow-xs'
                    : 'bg-stone-50/80 dark:bg-white/[0.03] hover:bg-stone-100 dark:hover:bg-white/[0.06] border-stone-200/80 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Radio Indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-amber-600 dark:border-[#FD9139] bg-amber-500/20 dark:bg-[#FD9139]/20'
                      : 'border-stone-300 dark:border-white/20'
                  }`}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-[#FD9139]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black font-['Outfit'] truncate ${
                        isSelected
                          ? 'text-amber-950 dark:text-[#FD9139]'
                          : 'text-stone-900 dark:text-white'
                      }`}>
                        {trial.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-white/10 text-stone-600 dark:text-zinc-300 shrink-0">
                        {trial.duration}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5 truncate">
                      {trial.description}
                    </p>
                  </div>
                </div>

                {/* Actions: Test Play Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handlePlayTrial(trial.id, e)}
                    className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isCurrentlyPlaying
                        ? 'bg-amber-500 text-white dark:bg-[#FD9139] dark:text-white font-black animate-pulse'
                        : 'bg-white dark:bg-white/10 hover:bg-amber-50 dark:hover:bg-white/15 text-stone-800 dark:text-zinc-200 border border-stone-200/80 dark:border-white/10'
                    }`}
                    title="Play sound preview"
                  >
                    <Play size={12} className={isCurrentlyPlaying ? 'fill-current' : ''} />
                    <span>{isCurrentlyPlaying ? 'Playing' : 'Test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Footer Info & OS Push Test */}
        <div className="pt-2 border-t border-stone-200/70 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-stone-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={async () => {
              try {
                // 1. Instantly trigger acoustic sound wave, local push, and haptic feedback
                await nativeNotify.dispatchTestAlert(activeTrial);

                // 2. If FCM push token is registered on native, also dispatch cloud webhook
                const token = nativeNotify.getFCMToken();
                if (token) {
                  try {
                    await fetch('https://mrsxliwyqodtwjuyqmts.supabase.co/functions/v1/order-push-notification', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg'
                      },
                      body: JSON.stringify({
                        type: 'INSERT',
                        fcm_token: token,
                        record: {
                          id: 'TEST-108',
                          status: 'cooking',
                          total_amount: 108
                        }
                      })
                    });
                  } catch (_) {}
                }
              } catch (e) {
                console.warn('Test notification error:', e);
              }
            }}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-200 border border-amber-500/30 dark:border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <BellRing size={13} className="text-amber-600 dark:text-[#FD9139]" />
            <span>Test Notification & Sound</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-stone-900 text-white dark:bg-[#FD9139] dark:text-white font-black text-xs hover:opacity-90 transition-all cursor-pointer text-center"
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
