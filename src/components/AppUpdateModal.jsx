import { useState } from 'react';
import { Sparkles, Download, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import appUpdateService from '../services/appUpdateService';

export default function AppUpdateModal({ isOpen, updateInfo, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await appUpdateService.startUpdate(updateInfo.apkUrl);
    } catch (err) {
      console.warn('Update trigger notice:', err);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 dark:bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative flex flex-col gap-4 text-stone-900 dark:text-white animate-scale-up"
      >
        {/* Header Ribbon & Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 text-amber-700 dark:text-[#E0FF33] border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                  Update Available
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border border-amber-500/30 dark:border-[#E0FF33]/30">
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                Current: v{updateInfo.currentVersion} • 100% Free OTA
              </p>
            </div>
          </div>

          {!updateInfo.isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* What's New Section */}
        <div className="space-y-2 py-1">
          <p className="text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>What's New in this version:</span>
          </p>
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/5 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {updateInfo.releaseNotes.map((note, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-stone-700 dark:text-zinc-300 leading-relaxed">
                <span className="text-amber-500 dark:text-[#E0FF33] font-black shrink-0">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Verification Badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
          <ShieldCheck size={14} className="shrink-0" />
          <span>Signed & Verified Release from Foody Vrinda Sacred Engine</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-stone-200/80 dark:border-white/5">
          {!updateInfo.isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all cursor-pointer text-center"
            >
              Later
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={`flex-1 py-3 px-5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              downloading
                ? 'bg-amber-400 text-stone-950 dark:bg-[#E0FF33] dark:text-black opacity-80 animate-pulse'
                : 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#E0FF33] dark:hover:bg-[#c9e826] dark:text-black hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Download size={15} />
            <span>{downloading ? 'Downloading APK...' : 'Update Now (1-Tap)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
