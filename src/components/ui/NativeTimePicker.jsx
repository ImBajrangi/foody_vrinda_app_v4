import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronUp, ChevronDown, Check, Sparkles, X } from 'lucide-react';

/**
 * NativeTimePicker - Universal Luxury Clock Picker
 * 
 * Works seamlessly across:
 * - Web Desktop (Interactive accessible clock popover with hour/min grids, steppers, and quick presets)
 * - Mobile Android (Triggers native Android radial clock dial dialog)
 * - Full Dark/Light theme harmony (Vedic Warm Stone & Obsidian Neon)
 */
export default function NativeTimePicker({
  value = '08:00',
  onChange,
  label = '',
  disabled = false,
  className = '',
  id,
  name
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const nativeInputRef = useRef(null);

  // Parse "HH:mm" into { hours24, hours12, minutes, period }
  const timeState = useMemo(() => {
    if (!value || typeof value !== 'string' || !value.includes(':')) {
      return { hours24: 8, hours12: 8, minutes: 0, period: 'AM', formatted12: '08:00 AM' };
    }
    const [hStr, mStr] = value.split(':');
    const h24 = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    const formattedHours = String(h12).padStart(2, '0');
    const formattedMinutes = String(m).padStart(2, '0');

    return {
      hours24: h24,
      hours12: h12,
      minutes: m,
      period,
      formattedTime: `${formattedHours}:${formattedMinutes}`,
      formatted12: `${formattedHours}:${formattedMinutes} ${period}`
    };
  }, [value]);

  // Convert 12-hour values back to "HH:mm" 24-hour string and trigger onChange
  const emitChange = (newH12, newMin, newPeriod) => {
    let h24 = newH12 % 12;
    if (newPeriod === 'PM') {
      h24 += 12;
    }
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(newMin).padStart(2, '0');
    onChange?.(`${hStr}:${mStr}`);
  };

  const handleHourSelect = (h) => {
    emitChange(h, timeState.minutes, timeState.period);
  };

  const handleMinuteSelect = (m) => {
    emitChange(timeState.hours12, m, timeState.period);
  };

  const handlePeriodToggle = (p) => {
    if (p !== timeState.period) {
      emitChange(timeState.hours12, timeState.minutes, p);
    }
  };

  const handleStepHour = (direction) => {
    let nextH = timeState.hours12 + direction;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    emitChange(nextH, timeState.minutes, timeState.period);
  };

  const handleStepMinute = (direction) => {
    let nextM = timeState.minutes + direction * 5;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    emitChange(timeState.hours12, nextM, timeState.period);
  };

  // Close clock popover when clicked outside or Escape pressed
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const QUICK_PRESETS = [
    { label: '06:00 AM (Early)', value: '06:00' },
    { label: '08:00 AM (Morning)', value: '08:00' },
    { label: '11:30 AM (Midday)', value: '11:30' },
    { label: '01:00 PM (Lunch)', value: '13:00' },
    { label: '06:00 PM (Evening)', value: '18:00' },
    { label: '10:30 PM (Closing)', value: '22:30' },
    { label: '11:59 PM (Midnight)', value: '23:59' }
  ];

  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-stone-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 font-['Outfit']">
          <Clock size={13} className="text-amber-600 dark:text-[#E0FF33]" />
          <span>{label}</span>
        </label>
      )}

      {/* Main Trigger Card */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            try {
              // Also attempt native picker on mobile devices
              if (window.innerWidth < 768 && nativeInputRef.current?.showPicker) {
                nativeInputRef.current.showPicker();
              }
            } catch {}
          }
        }}
        className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 select-none cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/5'
            : isOpen
            ? 'bg-stone-100 dark:bg-[#252223] border-amber-600 dark:border-[#E0FF33] ring-2 ring-amber-500/20 dark:ring-[#E0FF33]/20 shadow-md'
            : 'bg-white hover:bg-stone-50 dark:bg-[#1C1A1B] dark:hover:bg-[#252223] border-stone-200/90 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/25 shadow-2xs active:scale-[0.99]'
        }`}
      >
        {/* Visual Clock Time Display */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 ${
            isOpen
              ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black scale-105 shadow-sm'
              : 'bg-amber-500/10 dark:bg-[#E0FF33]/15 text-amber-700 dark:text-[#E0FF33] group-hover:scale-105'
          }`}>
            <Clock size={18} strokeWidth={2.3} />
          </div>

          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
              {timeState.formattedTime}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-neutral-300 border border-stone-200/60 dark:border-white/5">
              {timeState.period}
            </span>
          </div>
        </div>

        {/* Action Cue */}
        <div className="flex items-center gap-1.5 text-stone-400 dark:text-neutral-500 group-hover:text-amber-600 dark:group-hover:text-[#E0FF33] text-xs font-semibold">
          <span className="text-[11px] font-bold">{isOpen ? 'Adjust' : 'Set Time'}</span>
          <div className={`w-2 h-2 rounded-full transition-colors ${
            isOpen
              ? 'bg-amber-600 dark:bg-[#E0FF33]'
              : 'bg-amber-500/40 dark:bg-[#E0FF33]/40 group-hover:bg-amber-600 dark:group-hover:bg-[#E0FF33]'
          }`} />
        </div>

        {/* Hidden Native Input (Ensures mobile OS native picker is also supported) */}
        <input
          ref={nativeInputRef}
          type="time"
          id={id}
          name={name}
          disabled={disabled}
          value={value || '08:00'}
          onChange={(e) => onChange?.(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Accessible Interactive Web Clock Popover */}
      {isOpen && (
        <div
          className="absolute z-[250] top-full mt-2 left-0 right-0 sm:right-auto sm:w-[320px] rounded-3xl bg-white dark:bg-[#181617] border border-stone-200 dark:border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header with Close button */}
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-[#E0FF33]" />
              <span className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white font-['Outfit']">
                Select Time
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper Digital Display */}
          <div className="flex items-center justify-center gap-2 bg-stone-100/80 dark:bg-white/5 p-3 rounded-2xl border border-stone-200/80 dark:border-white/5">
            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepHour(1)}
                className="w-8 h-6 flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-[#E0FF33] active:scale-95 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4 stroke-[3]" />
              </button>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight w-10 text-center select-none">
                {String(timeState.hours12).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => handleStepHour(-1)}
                className="w-8 h-6 flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-[#E0FF33] active:scale-95 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <span className="text-2xl font-black text-stone-400 dark:text-neutral-500 font-['Outfit'] -mt-1 select-none">
              :
            </span>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepMinute(1)}
                className="w-8 h-6 flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-[#E0FF33] active:scale-95 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4 stroke-[3]" />
              </button>
              <span className="text-2xl font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight w-10 text-center select-none">
                {String(timeState.minutes).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => handleStepMinute(-1)}
                className="w-8 h-6 flex items-center justify-center text-stone-400 hover:text-amber-600 dark:hover:text-[#E0FF33] active:scale-95 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* AM / PM Toggle Pill */}
            <div className="flex flex-col gap-1 ml-2 bg-stone-200/80 dark:bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handlePeriodToggle('AM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timeState.period === 'AM'
                    ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                    : 'text-stone-600 dark:text-neutral-400 hover:text-stone-950 dark:hover:text-white'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handlePeriodToggle('PM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timeState.period === 'PM'
                    ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                    : 'text-stone-600 dark:text-neutral-400 hover:text-stone-950 dark:hover:text-white'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Hour Selection Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-stone-400 dark:text-neutral-500 uppercase tracking-wider">
              Hours (1 - 12)
            </span>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map((h) => {
                const isSelected = timeState.hours12 === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-neutral-300 hover:bg-stone-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minute Selection Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-stone-400 dark:text-neutral-500 uppercase tracking-wider">
              Minutes (:00 - :55)
            </span>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map((m) => {
                const isSelected = timeState.minutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-neutral-300 hover:bg-stone-200 dark:hover:bg-white/10'
                    }`}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-white/5">
            <span className="text-[10px] font-bold text-stone-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-[#E0FF33]" />
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChange?.(preset.value)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    value === preset.value
                      ? 'bg-amber-600/15 text-amber-700 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border border-amber-600/30 dark:border-[#E0FF33]/40'
                      : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-neutral-400 hover:bg-stone-200 dark:hover:bg-white/10 border border-stone-200/60 dark:border-white/5'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Footer */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                onChange?.(`${h}:${m}`);
              }}
              className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white px-2 py-1 cursor-pointer transition-colors"
            >
              Current Time
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer font-['Outfit']"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
