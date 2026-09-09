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
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[410px] bg-[#171516]/95 border border-white/10 rounded-[28px] p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_25px_rgba(224,255,51,0.08)] relative overflow-hidden backdrop-blur-xl"
      >
        {/* Soft Ambient Top Glow */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#E0FF33]/70 to-transparent" />
        
        {/* Close Icon */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={14} />
        </button>

        {/* Emotion-Carrying Welcome Header */}
        <div className="flex items-center gap-3 mb-4.5 pt-1">
          {avatar ? (
            <img 
              src={avatar} 
              alt={firstName} 
              className="w-11 h-11 rounded-full border border-[#E0FF33]/60 object-cover shrink-0 shadow-md"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#201D1E] border border-[#E0FF33]/40 flex items-center justify-center text-[#E0FF33] shrink-0 shadow-md">
              <User size={18} />
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-[#E0FF33] flex items-center gap-1 font-['Outfit']">
                <span>Radhe Radhe</span>
                <Heart size={10} className="fill-[#E0FF33] text-[#E0FF33]" />
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white font-['Outfit'] truncate">
              Namaste, {firstName}!
            </h3>
            <p className="text-[11.5px] text-zinc-400 font-['Plus_Jakarta_Sans']">
              Where should we deliver your fresh Prasad?
            </p>
          </div>
        </div>

        {/* Effortless Form */}
        <form onSubmit={handleSave} className="space-y-2.5">
          {/* Recipient Name (Compact & Clean) */}
          <div className="bg-[#1D1B1C] border border-white/8 hover:border-white/15 focus-within:border-[#E0FF33]/50 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[#E0FF33] shrink-0">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div className={`border rounded-2xl px-3.5 py-2 flex items-center gap-2.5 transition-all ${
            shakeField === 'phone'
              ? 'animate-shake border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
              : 'bg-[#1D1B1C] border-white/8 hover:border-white/15 focus-within:border-[#E0FF33]/50'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              shakeField === 'phone' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[#E0FF33]'
            }`}>
              <Phone size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                  Mobile Number
                </label>
                {shakeField === 'phone' && (
                  <span className="text-[9px] font-bold text-red-400 leading-none mb-1">10 digits required</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-400 select-none">+91</span>
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
                  className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
                />
              </div>
            </div>
            {phone.length === 10 && (
              <span className="w-4.5 h-4.5 rounded-full bg-[#E0FF33]/20 text-[#E0FF33] flex items-center justify-center animate-scale-up shrink-0">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
          </div>

          {/* Delivery Address with 1-Tap GPS */}
          <div className="relative">
            <div className={`border rounded-2xl px-3.5 py-2 flex items-center gap-2.5 transition-all ${
              shakeField === 'address'
                ? 'animate-shake border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                : 'bg-[#1D1B1C] border-white/8 hover:border-white/15 focus-within:border-[#E0FF33]/50'
            }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                shakeField === 'address' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[#E0FF33]'
              }`}>
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                    Delivery Address
                  </label>
                  {shakeField === 'address' && (
                    <span className="text-[9px] font-bold text-red-400 leading-none mb-1">Address required</span>
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
                  placeholder="Ashram, Street, or Landmark..."
                  className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoFillGPS}
                disabled={isLocating}
                className="h-7 px-2.5 rounded-xl bg-[#E0FF33]/15 hover:bg-[#E0FF33]/25 border border-[#E0FF33]/30 text-[#E0FF33] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Detect GPS Address"
              >
                <Compass size={12} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'GPS...' : 'Locate'}</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#201D1E] border border-[#E0FF33]/30 rounded-2xl p-1.5 shadow-2xl z-30 max-h-40 overflow-y-auto no-scrollbar space-y-0.5 backdrop-blur-xl">
                {isSearchingAddress && (
                  <p className="text-[10px] text-zinc-500 px-2.5 py-1">Searching landmarks...</p>
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
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-all text-xs flex items-start gap-2 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <MapPin size={13} className="text-[#E0FF33] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate text-[11px]">{item.title || item.name || (item.address ? item.address.split(',')[0] : 'Landmark')}</p>
                      <p className="text-[9px] text-zinc-400 truncate">{item.address || item.display_name || ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Row: Primary Save + Effortless "I'll add later" */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-11 px-4 rounded-full bg-[#E0FF33] hover:bg-[#D4FF00] text-[#141213] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 font-['Outfit'] shadow-[0_4px_18px_rgba(224,255,51,0.25)]"
            >
              <span>{isSaving ? 'Saving details...' : 'Save & Continue'}</span>
              <ArrowRight size={14} className="stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-center text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              I'll add details at checkout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
