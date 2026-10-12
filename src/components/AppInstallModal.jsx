import { useState, useRef, useEffect } from 'react';
import {
  Download,
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAppInstall } from '../hooks/useAppInstall';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import FoodyMascot from '../foody/FoodyMascot';
import FoodyVrindaWordmark from './ui/FoodyVrindaWordmark';

export default function AppInstallModal({ isOpen, onClose }) {
  const {
    canInstallPWA,
    isIOS,
    promptInstall,
    downloadApk
  } = useAppInstall();

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [mascotState, setMascotState] = useState('delivery');
  const [showCheerBubble, setShowCheerBubble] = useState(false);
  const cheerTimerRef = useRef(null);

  // Native 120fps fluid bottom sheet drag controller
  const { sheetRef, overlayRef, handleProps, dismiss } = useBottomSheetDrag(onClose, 35);

  // Keyboard accessibility (Esc to dismiss)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismiss]);

  // Clean mascot cheer timer
  useEffect(() => {
    return () => {
      if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handlePWAInstall = async () => {
    const res = await promptInstall();
    if (res.success) {
      dismiss();
    }
  };

  const handleApkDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setMascotState('happy');
    setShowCheerBubble(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch (_) {}

    downloadApk();

    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
    }, 1200);

    setTimeout(() => {
      setMascotState('delivery');
      setShowCheerBubble(false);
    }, 3200);
  };

  // Playful mascot interaction on tap (Duolingo style delight)
  const handleMascotTap = () => {
    if (mascotState === 'happy') return;
    setMascotState('happy');
    setShowCheerBubble(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (_) {}

    if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
    cheerTimerRef.current = setTimeout(() => {
      setMascotState('delivery');
      setShowCheerBubble(false);
    }, 2200);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md apple-overlay select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full sm:max-w-[390px] bg-[#1E1B1C] border-t sm:border border-white/10 rounded-t-[36px] sm:rounded-[36px] shadow-[0_-16px_50px_rgba(0,0,0,0.85)] sm:shadow-[0_24px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(253,145,57,0.2)] relative flex flex-col text-white overflow-hidden apple-sheet-spring"
      >
        {/* Ambient Warm Duolingo-Grade Radiant Aura */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-[#FD9139]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-[#FD9139]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Swipe Down Drag Bar (Full gesture area for 120fps native drag) */}
        <div 
          {...handleProps}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
        >
          <div className="w-12 h-1.5 rounded-full bg-white/25 active:bg-white/50 transition-colors" />
        </div>

        {/* Top Header: Brand Name + Game-Style XP Badge + Tactile 3D Close */}
        <div className="px-5 pb-2 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF751F] to-[#FD9139] p-[1.5px] shadow-md shrink-0 flex items-center justify-center">
              <img 
                src="/foody-vrinda-logo.webp" 
                alt="Foody Vrinda" 
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div className="flex items-center min-w-0">
              <FoodyVrindaWordmark className="h-[14px] sm:h-[16px] w-auto inline-block text-white shrink-0" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => dismiss()}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border-b-2 border-white/20 active:translate-y-0.5 active:border-b-0 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Center Stage: Duolingo Vignette Pedestal with Animated Mascot */}
        <div className="relative py-3 flex flex-col items-center justify-center">
          {/* Circular Stage Pedestal */}
          <div 
            onClick={handleMascotTap}
            className="group relative w-[220px] h-[210px] rounded-[38px] bg-gradient-to-b from-[#FFF5EB] via-[#FFEADB] to-[#FEDBC2] border-4 border-white/20 shadow-[0_16px_36px_rgba(253,145,57,0.25),inset_0_4px_14px_rgba(255,255,255,0.85)] flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95"
            title="Tap me!"
          >
            {/* Cheer Bubble on Tap */}
            {showCheerBubble && (
              <div className="absolute -top-3 px-3 py-1 bg-white text-[#E45E00] font-black text-xs rounded-full shadow-lg border border-[#FEDBC2] animate-bounce z-20 font-['Outfit'] flex items-center gap-1">
                <span>Hop Fast!</span>
                <span>⚡</span>
              </div>
            )}

            {/* Subtle Pedestal Ambient Ring */}
            <div className="absolute inset-0 rounded-[34px] border border-[#FD9139]/20 pointer-events-none" />

            {/* Mascot Container */}
            <div className="relative w-[190px] h-[175px] flex items-center justify-center select-none pointer-events-none">
              <FoodyMascot
                state={mascotState}
                width={190}
                height={175}
                className="drop-shadow-[0_10px_20px_rgba(194,79,4,0.3)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Actions Cluster: Duolingo 3D Chunky Isometric Button */}
        <div className="px-5 pb-6 pt-1 space-y-2.5 relative z-10">
          {/* Primary 3D Duolingo Button */}
          <button
            type="button"
            onClick={handleApkDownload}
            disabled={downloading}
            className={`w-full h-14 px-4 rounded-2xl font-black text-sm sm:text-[15px] flex items-center justify-center gap-2.5 transition-all cursor-pointer font-['Outfit'] uppercase tracking-wide select-none whitespace-nowrap ${
              downloadSuccess
                ? 'bg-[#58CC02] border-b-[5px] border-[#46A302] text-white active:translate-y-1 active:border-b-0 shadow-[0_8px_20px_rgba(88,204,2,0.35)]'
                : downloading
                ? 'bg-[#FD9139] border-b-[5px] border-[#C24F04] text-white translate-y-1 border-b-0 opacity-90 shadow-none'
                : 'bg-[#FF751F] hover:bg-[#FF8234] border-b-[5px] border-[#C24F04] text-white active:translate-y-[4px] active:border-b-0 shadow-[0_8px_24px_rgba(255,117,31,0.4)] hover:shadow-[0_12px_28px_rgba(255,117,31,0.5)]'
            }`}
          >
            {downloadSuccess ? (
              <div className="flex items-center justify-center gap-2.5 shrink-0">
                <CheckCircle2 size={19} strokeWidth={2.8} className="shrink-0" />
                <span className="whitespace-nowrap leading-none">Downloading APK...</span>
              </div>
            ) : downloading ? (
              <div className="flex items-center justify-center gap-2.5 shrink-0">
                <Download size={19} strokeWidth={2.8} className="animate-bounce shrink-0" />
                <span className="whitespace-nowrap leading-none">Preparing Download...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2.5 shrink-0">
                <Download size={19} strokeWidth={2.8} className="shrink-0" />
                <span className="whitespace-nowrap leading-none">Download Android APK</span>
              </div>
            )}
          </button>

          {/* Quick PWA Add to Home Screen (Tactile Secondary 3D Pill) */}
          {canInstallPWA && (
            <button
              type="button"
              onClick={handlePWAInstall}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 border-b-[3px] border-b-white/20 active:translate-y-0.5 active:border-b-0 text-zinc-200 hover:text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-['Outfit'] uppercase tracking-wider"
            >
              <Sparkles size={14} className="text-[#FD9139]" />
              <span>Add to Home Screen</span>
            </button>
          )}

          {/* iOS Safari Minimal Hint */}
          {isIOS && (
            <div className="py-1 text-center text-[11px] text-zinc-400 font-medium flex items-center justify-center gap-1">
              <span>iOS: Tap</span>
              <Share2 size={11} className="inline text-zinc-300" />
              <span>Share &gt; Add to Home Screen</span>
              <PlusSquare size={11} className="inline text-zinc-300" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
