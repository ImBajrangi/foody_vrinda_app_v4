import { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, X, Terminal, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EmergencyDevModal({ isOpen, onClose, onSuccess }) {
  const { emergencyElevateToDev } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = emergencyElevateToDev(pin);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 600);
    } else {
      setError(res.message);
    }
  };

  const handleQuickUnlock = () => {
    const res = emergencyElevateToDev('108108');
    if (res.success) {
      setSuccessMsg('Master Developer Access Granted (God-Mode Activated)');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#1E1B1C] border border-[#E0FF33]/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-[0_20px_80px_rgba(224,255,51,0.15)] relative animate-scaleUp">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-xl bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 text-[#E0FF33] flex items-center justify-center shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30">
              Emergency Master Key
            </span>
            <h3 className="text-lg font-black text-white font-['Outfit'] mt-1">
              Reclaim Developer Console
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed font-['Plus_Jakarta_Sans']">
          If all developer roles were accidentally demoted or locked out, enter the master passcode or trigger instant recovery to restore Developer & Admin god-mode privileges.
        </p>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5 font-mono">
              Master Developer PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (e.g. 108108)"
              autoFocus
              className="w-full bg-[#282526] text-white border border-white/10 rounded-2xl p-3 text-sm focus:outline-none focus:border-[#E0FF33] font-mono tracking-widest placeholder:tracking-normal"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#E0FF33] hover:bg-[#d4f820] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 font-['Outfit']"
          >
            <span>Unlock Developer Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-white/5 space-y-2">
          <button
            type="button"
            onClick={handleQuickUnlock}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Terminal className="w-3.5 h-3.5 text-[#E0FF33]" />
            <span>1-Click Emergency Master Reclaim (108108)</span>
          </button>

          <p className="text-[10px] text-neutral-500 text-center font-mono">
            Pro-Tip: Press <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-neutral-300">Ctrl+Shift+D</kbd> anywhere or open <span className="text-[#E0FF33]">?dev_override=108</span>
          </p>
        </div>
      </div>
    </div>
  );
}
