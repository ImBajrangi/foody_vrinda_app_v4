import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  MapPin, 
  Compass, 
  User, 
  Check, 
  X, 
  ArrowRight,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAddressSuggestions } from '../services/addressService';

export default function CompleteProfileModal({ isOpen, onClose, onSaveComplete }) {
  const { user, userData, updateUserProfile } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [shakeField, setShakeField] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const initialName = userData?.displayName || user?.user_metadata?.displayName || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
      const initialPhone = (userData?.phone || user?.phone || user?.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const initialAddr = userData?.address || userData?.customerAddress || '';
      
      setName(initialName);
      setPhone(initialPhone);
      setAddress(initialAddr);

      // Smooth auto-focus first empty field
      setTimeout(() => {
        if (!initialPhone && phoneRef.current) {
          phoneRef.current.focus();
        } else if (!initialAddr && addressRef.current) {
          addressRef.current.focus();
        }
      }, 200);
    }
  }, [isOpen, userData, user]);

  // Debounced address autocomplete
  useEffect(() => {
    if (!address || address.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await fetchAddressSuggestions(address);
        setSuggestions(results || []);
        setShowSuggestions(results && results.length > 0);
      } catch (err) {
        console.warn("Address suggestions query notice:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [address]);

  if (!isOpen) return null;

  const handleAutoFillGPS = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddr = parts.slice(0, 3).join(',').trim();
            setAddress(shortAddr || data.display_name);
          }
        } catch (_) {
          setAddress(`Vrindavan Dham (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setShakeField('phone');
      phoneRef.current?.focus();
      setTimeout(() => setShakeField(null), 1000);
      return;
    }

    const cleanAddress = address.trim();
    if (cleanAddress.length < 3) {
      setShakeField('address');
      addressRef.current?.focus();
      setTimeout(() => setShakeField(null), 1000);
      return;
    }

    setIsSaving(true);
    try {
      if (updateUserProfile) {
        await updateUserProfile({
          displayName: name.trim() || user?.email?.split('@')[0] || 'Devotee',
          phone: cleanPhone,
          address: cleanAddress,
          customerAddress: cleanAddress
        });
      }
      
      if (onSaveComplete) {
        onSaveComplete({
          displayName: name.trim(),
          phone: cleanPhone,
          address: cleanAddress
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('foody_profile_prompt_dismissed_at', Date.now().toString());
    } catch (_) {}
    onClose();
  };

  const avatar = user?.photoURL || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const firstName = name.trim().split(' ')[0] || 'Devotee';

  return (
    <div 
      onClick={handleDismiss}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[410px] bg-white dark:bg-[#171516] border border-stone-200 dark:border-white/10 rounded-[28px] p-5 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_25px_rgba(224,255,51,0.08)] relative overflow-hidden"
      >
        {/* Soft Ambient Top Glow */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-400/60 dark:via-[#E0FF33]/70 to-transparent" />
        
        {/* Close Icon */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-stone-200/60 dark:border-white/5 active:scale-90"
        >
          <X size={14} />
        </button>

        {/* Emotion-Carrying Welcome Header */}
        <div className="flex items-center gap-3 mb-4.5 pt-1">
          {avatar ? (
            <img 
              src={avatar} 
              alt={firstName} 
              className="w-11 h-11 rounded-full border border-amber-400/60 dark:border-[#E0FF33]/60 object-cover shrink-0 shadow-md"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-amber-500/10 dark:bg-[#201D1E] border border-amber-500/40 dark:border-[#E0FF33]/40 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0 shadow-md">
              <User size={18} />
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-amber-600 dark:text-[#E0FF33] flex items-center gap-1 font-['Outfit']">
                <span>Radhe Radhe</span>
                <Heart size={10} className="fill-amber-500 text-amber-500 dark:fill-[#E0FF33] dark:text-[#E0FF33]" />
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white font-['Outfit'] truncate">
              Namaste, {firstName}!
            </h3>
            <p className="text-[11.5px] text-stone-500 dark:text-zinc-400 font-['Plus_Jakarta_Sans']">
              Where should we deliver your fresh Prasad?
            </p>
          </div>
        </div>

        {/* Effortless Form */}
        <form onSubmit={handleSave} className="space-y-3">
          {/* Recipient Name (Compact & Clean) */}
          <div className="bg-stone-50 dark:bg-[#1D1B1C] border border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/70 dark:focus-within:border-[#E0FF33]/50 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all shadow-xs">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-200/80 dark:bg-white/10 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0 border border-stone-300/50 dark:border-white/10">
              <User size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400 leading-none mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full text-sm sm:text-base font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-400 font-['Plus_Jakarta_Sans']"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div className={`border rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all shadow-xs ${
            shakeField === 'phone'
              ? 'animate-shake border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20'
              : 'bg-stone-50 dark:bg-[#1D1B1C] border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/70 dark:focus-within:border-[#E0FF33]/50 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20'
          }`}>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${
              shakeField === 'phone' ? 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30' : 'bg-stone-200/80 dark:bg-white/10 text-amber-600 dark:text-[#E0FF33] border-stone-300/50 dark:border-white/10'
            }`}>
              <Phone size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400 leading-none mb-1">
                  Mobile Number
                </label>
                {shakeField === 'phone' && (
                  <span className="text-[10px] font-bold text-red-500 dark:text-red-400 leading-none mb-1">10 digits required</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-stone-500 dark:text-zinc-300 select-none">+91</span>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    if (shakeField === 'phone') setShakeField(null);
                  }}
                  placeholder="9876543210"
                  className="w-full text-sm sm:text-base font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-400 font-['Plus_Jakarta_Sans']"
                />
              </div>
            </div>
            {phone.length === 10 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-[#E0FF33] text-white dark:text-black flex items-center justify-center animate-scale-up shrink-0 shadow-sm font-black">
                <Check size={12} strokeWidth={3.5} />
              </span>
            )}
          </div>

          {/* Delivery Address with 1-Tap GPS */}
          <div className="relative">
            <div className={`border rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all shadow-xs ${
              shakeField === 'address'
                ? 'animate-shake border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20'
                : 'bg-stone-50 dark:bg-[#1D1B1C] border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/70 dark:focus-within:border-[#E0FF33]/50 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20'
            }`}>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${
                shakeField === 'address' ? 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30' : 'bg-stone-200/80 dark:bg-white/10 text-amber-600 dark:text-[#E0FF33] border-stone-300/50 dark:border-white/10'
              }`}>
                <MapPin size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400 leading-none mb-1">
                    Delivery Address
                  </label>
                  {shakeField === 'address' && (
                    <span className="text-[10px] font-bold text-red-500 dark:text-red-400 leading-none mb-1">Address required</span>
                  )}
                </div>
                <input
                  ref={addressRef}
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (shakeField === 'address') setShakeField(null);
                  }}
                  placeholder="e.g. Near ISKCON Temple, Raman Reti"
                  className="w-full text-sm sm:text-base font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-400 font-['Plus_Jakarta_Sans']"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoFillGPS}
                disabled={isLocating}
                className="h-7 px-2.5 rounded-xl bg-amber-500/15 dark:bg-[#E0FF33]/15 hover:bg-amber-500/25 dark:hover:bg-[#E0FF33]/25 border border-amber-500/30 dark:border-[#E0FF33]/30 text-amber-700 dark:text-[#E0FF33] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Detect GPS Address"
              >
                <Compass size={12} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'GPS...' : 'Locate'}</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#201D1E] border border-stone-200 dark:border-[#E0FF33]/30 rounded-2xl p-1.5 shadow-2xl z-30 max-h-40 overflow-y-auto no-scrollbar space-y-0.5 backdrop-blur-xl">
                {isSearchingAddress && (
                  <p className="text-[10px] text-stone-400 dark:text-zinc-500 px-2.5 py-1">Searching landmarks...</p>
                )}
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const chosenAddr = item.address || item.display_name || item.title || item.name || '';
                      setAddress(chosenAddr);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-all text-xs flex items-start gap-2 text-stone-700 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                  >
                    <MapPin size={13} className="text-amber-600 dark:text-[#E0FF33] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900 dark:text-white truncate text-[11px]">{item.title || item.name || (item.address ? item.address.split(',')[0] : 'Landmark')}</p>
                      <p className="text-[9px] text-stone-500 dark:text-zinc-400 truncate">{item.address || item.display_name || ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Quick Vrindavan Landmarks & Ashrams */}
            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                'Near ISKCON Temple',
                'Prem Mandir Road',
                'Banke Bihari Dham',
                'Radha Raman Area',
                'Gaudiya Math Ashram',
                'Chaitanya Kuti'
              ].map((lm) => (
                <button
                  key={lm}
                  type="button"
                  onClick={() => {
                    setAddress(prev => prev ? `${prev}, ${lm}, Vrindavan` : `${lm}, Vrindavan`);
                    if (shakeField === 'address') setShakeField(null);
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-200/70 dark:bg-white/5 hover:bg-stone-300 dark:hover:bg-white/10 text-stone-700 dark:text-zinc-300 text-[10px] font-bold shrink-0 transition-all border border-stone-300/60 dark:border-white/10 cursor-pointer"
                >
                  + {lm}
                </button>
              ))}
            </div>
          </div>

          {/* Action Row: Primary Save + Effortless "I'll add later" */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-11 px-4 rounded-full bg-[#D4F420] dark:bg-[#E0FF33] hover:bg-[#c2e415] dark:hover:bg-[#D4FF00] text-stone-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 font-['Outfit'] shadow-md shadow-lime-500/20 dark:shadow-[0_4px_18px_rgba(224,255,51,0.25)]"
            >
              <span>{isSaving ? 'Saving details...' : 'Save & Continue'}</span>
              <ArrowRight size={14} className="stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-center text-[11px] font-bold text-stone-500 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              I'll add details at checkout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
