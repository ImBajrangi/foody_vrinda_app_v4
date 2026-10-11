import { useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Share2,
  PlusSquare,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAppInstall } from '../hooks/useAppInstall';

export default function AppInstallModal({ isOpen, onClose }) {
  const {
    isStandalone,
    canInstallPWA,
    isIOS,
    isAndroid,
    promptInstall,
    downloadApk
  } = useAppInstall();

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePWAInstall = async () => {
    const res = await promptInstall();
    if (res.success) {
      onClose();
    }
  };

  const handleApkDownload = () => {
    setDownloading(true);
    downloadApk();
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
    }, 1500);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full sm:max-w-md bg-[#FAF7F2] dark:bg-[#1E1B1C] border-t sm:border border-stone-200/80 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.25)] sm:shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative flex flex-col text-stone-900 dark:text-white max-h-[90vh] overflow-hidden apple-sheet-spring"
      >
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-3.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/25 transition-colors" />
        </div>

        {/* Header Ribbon & Close Button */}
        <div className="px-5 py-4 flex items-center justify-between select-none shrink-0 bg-[#FAF7F2] dark:bg-[#1E1B1C]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 text-amber-700 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight truncate">
                  Install Foody Vrinda
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  Latest Build
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5 truncate font-['Plus_Jakarta_Sans'] font-medium">
                Fastest experience, instant updates & alerts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 active:scale-95 flex items-center justify-center text-stone-700 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all border border-stone-300/60 dark:border-white/10 cursor-pointer shrink-0 ml-3"
            title="Close"
            aria-label="Dismiss"
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-5 pb-5 space-y-4">

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2.5 py-1">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 dark:bg-[#FD9139]/15 flex items-center justify-center text-amber-700 dark:text-[#FD9139] shrink-0">
                <Zap size={14} />
              </div>
              <span className="text-xs font-bold text-stone-800 dark:text-zinc-200 font-['Outfit']">Instant 0s Boot</span>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <Sparkles size={14} />
              </div>
              <span className="text-xs font-bold text-stone-800 dark:text-zinc-200 font-['Outfit']">Acoustic Chimes</span>
            </div>
          </div>

          {/* Option 1: PWA Add to Home Screen (if available) */}
          {canInstallPWA && (
            <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-[#FD9139]/10 border border-amber-500/30 dark:border-[#FD9139]/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-[#FD9139]">
                  Recommended · Instant Install
                </span>
                <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400">Zero Storage Used</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-300">
                Add directly to your phone screen without downloading large files.
              </p>
              <button
                type="button"
                onClick={handlePWAInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FD9139] hover:bg-[#FCA65E] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer font-['Outfit']"
              >
                <Smartphone size={14} />
                <span>Add to Home Screen</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Option 2: Direct APK Download (Android) */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-zinc-200">
                Android APK Package
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-zinc-300">
                20.2 MB · v1.1.4
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-zinc-300">
              Full native Android installation package with background chimes & full hardware haptics.
            </p>
            <button
              type="button"
              onClick={handleApkDownload}
              disabled={downloading}
              className={`w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer font-['Outfit'] ${downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : downloading
                    ? 'bg-amber-400 text-white animate-pulse'
                    : 'bg-stone-900 hover:bg-stone-800 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:text-white border border-stone-800 dark:border-white/15'
                }`}
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Downloading APK Started! Check Notifications</span>
                </>
              ) : downloading ? (
                <>
                  <Download size={14} className="animate-bounce" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download Android APK</span>
                </>
              )}
            </button>
          </div>

          {/* iOS Safari Guide */}
          {isIOS && (
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-300 text-xs flex items-start gap-2.5">
              <Share2 size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">iPhone / iPad users:</span>
                <p className="text-[11px] leading-relaxed">
                  Tap the <span className="font-bold">Share</span> button at the bottom of Safari, then choose <span className="font-bold">"Add to Home Screen" <PlusSquare size={11} className="inline" /></span>.
                </p>
              </div>
            </div>
          )}

          {/* Security Trust Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Signed & Secure Package from Foody Vrinda</span>
          </div>

          {/* Footer */}
          <div className="pt-1 border-t border-stone-200/80 dark:border-white/5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-zinc-300 font-black text-xs transition-all cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
