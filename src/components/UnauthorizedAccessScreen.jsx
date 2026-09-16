import { ShieldAlert, LogIn, ArrowLeft, KeyRound } from 'lucide-react';

export default function UnauthorizedAccessScreen({ 
  requiredRole = 'Administrator', 
  onAuthenticate, 
  onReturnStore,
  onEmergencyOverride 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center animate-fade-in">
      <div className="w-full max-w-md bg-[#18181A] border border-white/10 rounded-[32px] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col items-center gap-5 text-white">
        
        {/* Shield Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/25">
            Access Restricted
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] tracking-tight">
            {requiredRole} Privileges Required
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-['Plus_Jakarta_Sans'] leading-relaxed max-w-xs mx-auto">
            This operational console is restricted to authorized platform administrators and developers only.
          </p>
        </div>

        <div className="w-full pt-3 space-y-2.5">
          <button
            onClick={onAuthenticate}
            className="w-full py-3.5 px-5 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer font-['Outfit']"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Admin Account</span>
          </button>

          {onEmergencyOverride && (
            <button
              onClick={onEmergencyOverride}
              className="w-full py-3 px-5 rounded-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-['Outfit']"
            >
              <KeyRound className="w-4 h-4" />
              <span>Emergency Master Key Override</span>
            </button>
          )}

          <button
            onClick={onReturnStore}
            className="w-full py-3 px-5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-['Outfit']"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 font-mono">
          Security policy: RBAC verification enforced. (Press <kbd className="text-[#E0FF33]">Ctrl+Shift+D</kbd> for Emergency Recovery)
        </p>
      </div>
    </div>
  );
}
