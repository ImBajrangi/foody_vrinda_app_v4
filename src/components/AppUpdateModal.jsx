import { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  Zap, 
  BellRing, 
  ShieldCheck, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import appUpdateService from '../services/appUpdateService';
import FoodyVrindaLogo from './ui/FoodyVrindaLogo';

export default function AppUpdateModal({ isOpen, updateInfo, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeMirror, setActiveMirror] = useState('direct'); // 'direct' | 'github'
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen || !updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = async (mirrorChoice = activeMirror) => {
    setDownloading(true);
    setDownloadStarted(true);
    setDownloadProgress(25);

    try {
      const isMirror = mirrorChoice === 'direct';
      // Step-by-step playful Duolingo progress animation
      const p1 = setTimeout(() => setDownloadProgress(65), 400);
      const p2 = setTimeout(() => setDownloadProgress(95), 900);
      
      await appUpdateService.startUpdate(updateInfo.apkUrl, { useMirror: isMirror });
      
      setTimeout(() => {
        setDownloadProgress(100);
        setDownloading(false);
      }, 1500);

      return () => {
        clearTimeout(p1);
        clearTimeout(p2);
      };
    } catch (err) {
      console.warn('Update trigger notice:', err);
      setDownloading(false);
    }
  };

  const perks = [
    {
      icon: <Zap className="w-5 h-5 text-amber-500 fill-amber-400" />,
      bg: 'bg-amber-500/10 dark:bg-amber-400/15 border-amber-500/30',
      title: '3x Faster Engine',
      desc: 'Instant loading, zero lag & silky 120fps transitions'
    },
    {
      icon: <BellRing className="w-5 h-5 text-emerald-500 fill-emerald-400" />,
      bg: 'bg-emerald-500/10 dark:bg-emerald-400/15 border-emerald-500/30',
      title: 'Divine Chime Alerts',
      desc: 'Lockscreen sound updates for prasad preparation & dispatch'
    },
    {
      icon: <Flame className="w-5 h-5 text-[#FF751F] fill-[#FF751F]" />,
      bg: 'bg-[#FF751F]/10 dark:bg-[#FF751F]/15 border-[#FF751F]/30',
      title: 'Official Mascot & UI',
      desc: 'Crisp brand logos, adaptive app icons & obsidian dark mode'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 dark:bg-black/90 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full sm:max-w-md bg-[#FAF7F2] dark:bg-[#1E1B1C] border-t sm:border-2 border-stone-300/80 dark:border-white/10 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-7 shadow-2xl relative flex flex-col gap-4 text-stone-900 dark:text-white animate-scale-up max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        {/* Duolingo Top Header with Close & XP Badge */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Superpowers Unlocked</span>
          </div>

          {!updateInfo.isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 text-stone-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-stone-300/50 dark:border-white/10 active:scale-95"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Duolingo Mascot + Speech Bubble Section */}
        <div className="flex items-center gap-3.5 pt-1">
          {/* Mascot Avatar Card with 3D Pop */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
            <div className="w-full h-full rounded-[24px] sm:rounded-[28px] p-1 bg-gradient-to-tr from-[#FF751F] via-amber-400 to-[#FF751F] shadow-lg shadow-amber-500/20 border-b-4 border-[#D6590E] flex items-center justify-center animate-bounce-subtle">
              <div className="w-full h-full rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#1E1B1C] flex items-center justify-center p-1">
                <FoodyVrindaLogo className="w-full h-full object-contain" bg="dark" />
              </div>
            </div>
          </div>

          {/* Duolingo Speech Bubble */}
          <div className="flex-1 relative">
            <div className="bg-white dark:bg-[#282526] border-2 border-stone-200 dark:border-white/10 rounded-2xl p-3 shadow-sm relative">
              {/* Bubble Triangle pointing left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[8px] border-r-white dark:border-r-[#282526]" />
              
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-[#FD9139]">
                  v{updateInfo.latestVersion} (Build {updateInfo.latestVersionCode})
                </span>
                <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500">
                  Current: v{updateInfo.currentVersion}
                </span>
              </div>
              <h4 className="text-xs sm:text-[13px] font-black text-stone-900 dark:text-white font-['Outfit'] leading-tight">
                Ta-da! A fresher, faster Foody Vrinda is ready! 🦚
              </h4>
            </div>
          </div>
        </div>

        {/* Duolingo 3D Feature Cards */}
        <div className="space-y-2 pt-1">
          {perks.map((p, idx) => (
            <div 
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${p.bg} transition-all hover:scale-[1.01]`}
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E1B1C] border border-stone-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                {p.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-black text-stone-900 dark:text-white font-['Outfit'] leading-tight">
                  {p.title}
                </h5>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 font-medium leading-snug truncate">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Duolingo-style Progress Bar (Visible during / right after tap) */}
        {downloading && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border-2 border-amber-500/30 animate-pulse">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                Preparing Sacred Update Package...
              </span>
              <span>{downloadProgress}%</span>
            </div>
            {/* Candy-striped 3D progress bar */}
            <div className="h-4 w-full bg-stone-200 dark:bg-white/10 rounded-full border-2 border-stone-300 dark:border-white/20 p-0.5 overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-[#FF751F] via-amber-400 to-[#FF751F] rounded-full transition-all duration-300 relative shadow-inner"
                style={{ width: `${downloadProgress}%` }}
              >
                {/* Glossy shine overlay */}
                <div className="absolute inset-0 bg-white/25 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Anti-Stall / Mirror Switcher (Resolves GitHub 100% Hang Issue) */}
        <div className="p-3 rounded-2xl bg-stone-100 dark:bg-white/[0.04] border border-stone-200 dark:border-white/5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400 font-bold">
            <span>Download Mirror:</span>
            <div className="inline-flex rounded-xl bg-stone-200/80 dark:bg-white/10 p-0.5 border border-stone-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveMirror('direct');
                  if (downloadStarted) handleDownload('direct');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  activeMirror === 'direct'
                    ? 'bg-[#FF751F] text-white shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                ⚡ Fast Server (Recommended)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMirror('github');
                  if (downloadStarted) handleDownload('github');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  activeMirror === 'github'
                    ? 'bg-[#FF751F] text-white shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                🌐 GitHub CDN
              </button>
            </div>
          </div>

          {downloadStarted && (
            <div className="flex items-start gap-1.5 text-stone-500 dark:text-zinc-400 text-[10.5px] leading-tight pt-1 border-t border-stone-200/60 dark:border-white/5">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Download started in your phone's notification bar! If Chrome pauses at 100%, tap the notification or open your <b>Files app &gt; Downloads</b> to install.
              </span>
            </div>
          )}
        </div>

        {/* Duolingo 3D Chunky Action Row */}
        <div className="flex items-center gap-3 pt-2">
          {!updateInfo.isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-stone-600 dark:text-zinc-400 bg-stone-200/70 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 border-b-[3px] border-stone-300 dark:border-white/10 active:border-b-0 active:translate-y-[3px] transition-all cursor-pointer text-center shrink-0"
            >
              Maybe Later
            </button>
          )}

          {/* Duolingo Iconic 3D Primary Button */}
          <button
            type="button"
            onClick={() => handleDownload(activeMirror)}
            disabled={downloading}
            className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              downloading
                ? 'bg-amber-500 border-b-[4px] border-amber-600 opacity-90'
                : 'bg-[#FF751F] hover:bg-[#FF8638] border-b-[5px] border-[#D6590E] active:border-b-0 active:translate-y-[5px] shadow-amber-500/25'
            }`}
          >
            <Download size={16} className={downloading ? 'animate-bounce' : ''} />
            <span>
              {downloading ? 'Starting Download...' : 'Update Now · Chalo!'}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
