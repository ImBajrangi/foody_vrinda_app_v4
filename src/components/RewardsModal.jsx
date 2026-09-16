import { useState, useCallback } from 'react';
import { Sparkles, Tag, Gift, Bike, HeartHandshake, Coins, X, CheckCircle2 } from 'lucide-react';

export default function RewardsModal({ isOpen, onClose }) {
  const [coins, setCoins] = useState(() => {
    const cached = localStorage.getItem('satvik_coins');
    return cached ? parseInt(cached, 10) : 240;
  });
  const [redeemedAlert, setRedeemedAlert] = useState(null);
  const [closing, setClosing] = useState(false);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  if (!isOpen) return null;

  const rewardsList = [
    { id: 1, title: '₹50 Off Next Order', cost: 100, icon: <Tag className="w-4 h-4 text-amber-400" />, desc: 'Valid on all Satvik Thalis' },
    { id: 2, title: 'Free Kesar Peda Box', cost: 200, icon: <Gift className="w-4 h-4 text-[#E0FF33]" />, desc: 'Added to your next purchase' },
    { id: 3, title: 'Free Delivery Pass', cost: 80, icon: <Bike className="w-4 h-4 text-sky-400" />, desc: 'No delivery fee on 1 order' },
    { id: 4, title: 'Donate ₹100 to Gaushala', cost: 150, icon: <HeartHandshake className="w-4 h-4 text-emerald-400" />, desc: 'Feed cows at Vrindavan sanctuary' },
  ];

  const handleRedeem = (reward) => {
    if (coins >= reward.cost) {
      const newBalance = coins - reward.cost;
      setCoins(newBalance);
      localStorage.setItem('satvik_coins', newBalance.toString());
      setRedeemedAlert(`Successfully redeemed: ${reward.title}!`);
      setTimeout(() => setRedeemedAlert(null), 3500);
    } else {
      setRedeemedAlert('Insufficient Satvik Coins balance.');
      setTimeout(() => setRedeemedAlert(null), 3500);
    }
  };

  const handleDailyClaim = () => {
    const lastClaim = localStorage.getItem('satvik_last_claim');
    const today = new Date().toDateString();
    
    if (lastClaim === today) {
      setRedeemedAlert("You've already claimed your daily Prasad coins today!");
      setTimeout(() => setRedeemedAlert(null), 3000);
    } else {
      const newBalance = coins + 20;
      setCoins(newBalance);
      localStorage.setItem('satvik_coins', newBalance.toString());
      localStorage.setItem('satvik_last_claim', today);
      setRedeemedAlert('Claimed 20 Daily Prasad Coins!');
      setTimeout(() => setRedeemedAlert(null), 3000);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 apple-overlay ${closing ? 'closing' : ''}`}
    >
      {/* Modal Box */}
      <div className={`relative w-full max-w-md bg-[#242021] border border-white/10 text-white rounded-[32px] sm:rounded-[38px] p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.7)] flex flex-col gap-5 overflow-hidden apple-modal-spring ${closing ? 'closing' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#E0FF33]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight font-['Outfit']">Satvik Rewards</h3>
              <p className="text-[11px] text-zinc-400 font-bold">Blessed Vrindavan Coins</p>
            </div>
          </div>
          <button 
            onClick={handleAnimatedClose}
            className="w-8 h-8 rounded-full bg-[#1E1B1C] hover:bg-[#322E30] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert Container */}
        {redeemedAlert && (
          <div className="bg-[#E0FF33]/15 border border-[#E0FF33]/40 text-[#E0FF33] px-4 py-2.5 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 size={14} />
            <span>{redeemedAlert}</span>
          </div>
        )}

        {/* Coins Status Card */}
        <div className="bg-gradient-to-br from-[#2D2829] to-[#1E1B1C] border border-[#E0FF33]/30 rounded-3xl p-5 text-white flex items-center justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E0FF33]/10 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <p className="text-[10px] text-[#E0FF33] font-black uppercase tracking-wider">Your Balance</p>
            <h4 className="text-3xl font-black mt-1 flex items-center gap-2 leading-none font-['Outfit']">
              <Coins className="w-6 h-6 text-[#E0FF33]" />
              <span>{coins}</span>
              <span className="text-xs font-bold text-zinc-400 ml-1">Coins</span>
            </h4>
          </div>
          <button 
            onClick={handleDailyClaim}
            className="bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black px-4 py-2.5 rounded-full text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer apple-tap-target"
          >
            <Sparkles size={13} />
            <span>Claim Daily</span>
          </button>
        </div>

        {/* Rewards List */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Redeem Rewards</h4>
          
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
            {rewardsList.map((reward) => (
              <div 
                key={reward.id} 
                className="flex items-center justify-between bg-[#1E1B1C] border border-white/5 p-3 rounded-2xl hover:border-white/10 transition-all gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#282526] flex items-center justify-center flex-shrink-0 border border-white/5">
                    {reward.icon}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-white truncate leading-snug">{reward.title}</h5>
                    <p className="text-[10px] text-zinc-400 truncate leading-none mt-0.5">{reward.desc}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRedeem(reward)}
                  disabled={coins < reward.cost}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-black shadow-sm flex-shrink-0 transition-all flex items-center gap-1 apple-tap-target ${
                    coins >= reward.cost 
                      ? 'bg-[#E0FF33] text-[#1E1B1C] hover:bg-[#CCFF00] cursor-pointer' 
                      : 'bg-white/5 text-zinc-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Coins size={11} />
                  <span>{reward.cost}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Help footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 text-center font-bold">
          <Sparkles size={11} className="text-[#E0FF33]" />
          <span>Order pure Satvik foods cooked with love and devotion to earn more Coins!</span>
        </div>
      </div>
    </div>
  );
}
