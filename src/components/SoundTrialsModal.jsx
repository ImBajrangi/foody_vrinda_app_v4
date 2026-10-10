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
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 text-stone-900 dark:text-white animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 text-amber-700 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                Notifications & Tone Settings
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Acoustic sound trials & personalized messaging style
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              const token = nativeNotify.getFCMToken();
              if (!token) {
                alert("Push notification token not yet registered. Make sure notification permission is allowed!");
                return;
              }
              try {
                alert("Test push dispatched. Lock your screen or swipe app away now to verify sound.");
                await fetch('https://mrsxliwyqodtwjuyqmts.supabase.co/functions/v1/order-push-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
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
              } catch (e) {
                alert('Test push error: ' + e.message);
              }
            }}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-200 border border-amber-500/30 dark:border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <BellRing size={13} className="text-amber-600 dark:text-[#FD9139]" />
            <span>Test OS Push on Device</span>
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
  );
}
