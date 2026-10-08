import { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Trophy, 
  History, 
  Users, 
  Sparkles, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  MessageCircle,
  Clock,
  TrendingUp,
  Award,
  Crown,
  Flame,
  Gift,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getWalletDashboard, 
  subscribeUserWallet, 
  getFVLeaderboard, 
  getCommunityLinks,
  generateWhatsAppShareUrl,
  ptsToRupees,
  maskLeaderboardName
} from '../services/fvWalletService';

export default function FVRewardsDashboard({ isOpen, onClose }) {
  const { user, userData, userRole } = useAuth();
  const userId = user?.id || userData?.id;

  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'referral' | 'leaderboard' | 'ledger' | 'community'
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardRole, setLeaderboardRole] = useState(userRole === 'delivery' ? 'delivery' : 'customer');
  const [communityLinks, setCommunityLinks] = useState([]);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  // Load wallet dashboard
  useEffect(() => {
    if (!isOpen || !userId) {
      if (!userId) setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getWalletDashboard(userId).then((data) => {
      if (isMounted && data) {
        setWallet(data);
        setLoading(false);
      }
    });

    const unsubscribe = subscribeUserWallet(userId, (freshData) => {
      if (isMounted && freshData) {
        setWallet(freshData);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, userId]);

  // Load leaderboard when tab active
  useEffect(() => {
    if (isOpen && activeTab === 'leaderboard') {
      getFVLeaderboard('all_time', leaderboardRole, 15).then((data) => {
        setLeaderboard(data || []);
      });
    }
  }, [isOpen, activeTab, leaderboardRole]);

  // Load community links
  useEffect(() => {
    if (isOpen && activeTab === 'community') {
      getCommunityLinks(userRole).then((data) => {
        setCommunityLinks(data || []);
      });
    }
  }, [isOpen, activeTab, userRole]);

  const referralCode = wallet?.referral_code || 'FVPROMO';
  const availablePoints = wallet?.available_points ?? 0;

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = generateWhatsAppShareUrl(referralCode, userRole === 'delivery' ? 'delivery' : 'customer');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md apple-overlay ${closing ? 'closing' : ''}`}
    >
      <div 
        className={`relative w-full max-w-lg bg-[#FCFBF7] dark:bg-[#1E1B1C] border-2 border-b-6 border-stone-300 dark:border-stone-800 text-stone-900 dark:text-white rounded-[36px] sm:rounded-[44px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] overflow-hidden apple-modal-spring ${closing ? 'closing' : ''}`}
      >
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 dark:bg-[#E0FF33]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header (Duolingo Banner Style) */}
        <div className="flex items-center justify-between p-4.5 sm:p-5.5 border-b-2 border-stone-200/90 dark:border-white/10 relative z-10 shrink-0 bg-white/70 dark:bg-[#1E1B1C]/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Duolingo 3D Golden Medallion */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#FFD84D] to-[#F59E0B] border-2 border-b-4 border-[#C97A00] flex items-center justify-center text-stone-950 shadow-[0_3px_0_#A86400] shrink-0">
              <Crown className="w-6 h-6 drop-shadow-xs fill-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                  FV Dynasty
                </h3>
                <span className="px-2.5 py-0.5 rounded-xl bg-[#FFC800] border-2 border-b-3 border-[#D99A00] text-stone-950 text-[10px] font-black tracking-wider uppercase shadow-2xs">
                  1 FV = ₹0.10
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-400 font-bold">
                Satvik Loyalty Currency & Quests
              </p>
            </div>
          </div>

          {/* 3D Round Close Button */}
          <button 
            onClick={handleAnimatedClose}
            className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 border-2 border-b-4 border-stone-300 active:border-b-2 active:translate-y-0.5 text-stone-700 hover:text-stone-950 dark:bg-[#282526] dark:hover:bg-[#343031] dark:border-stone-700 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Duolingo Chunky Segmented Nav Bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-stone-100/90 dark:bg-[#141213] border-b-2 border-stone-200 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'wallet', label: 'Vault', icon: Coins, color: 'text-amber-500' },
            { id: 'referral', label: 'Quests', icon: Gift, color: 'text-emerald-500' },
            { id: 'leaderboard', label: 'League', icon: Trophy, color: 'text-yellow-500' },
            { id: 'ledger', label: 'History', icon: History, color: 'text-blue-500' },
            { id: 'community', label: 'Club', icon: MessageCircle, color: 'text-green-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive 
                    ? 'bg-stone-900 text-white border-2 border-b-4 border-stone-950 dark:bg-[#E0FF33] dark:text-stone-950 dark:border-b-4 dark:border-[#AFC812] shadow-xs' 
                    : 'bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-950 border-2 border-b-4 border-stone-200 hover:border-stone-300 dark:bg-[#221F20] dark:text-zinc-400 dark:border-stone-800 dark:hover:text-white'
                }`}
              >
                <Icon size={14} className={isActive ? '' : tab.color} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 relative z-10">
          {!userId ? (
            <div className="text-center py-10 space-y-4 bg-white dark:bg-[#242021] border-2 border-b-6 border-stone-200 dark:border-stone-800 rounded-3xl p-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-b-4 border-amber-300 flex items-center justify-center text-amber-700 mx-auto shadow-xs">
                <ShieldCheck className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit']">
                  Unlock Your Dynasty Vault!
                </h4>
                <p className="text-xs text-stone-600 dark:text-zinc-400 max-w-xs mx-auto mt-1 font-medium">
                  Sign in to start earning and redeeming FV Points, level up in the League, and claim divine rewards!
                </p>
              </div>
            </div>
          ) : loading && !wallet ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-[#FFC800] animate-spin" />
              <p className="text-xs font-black text-stone-600 dark:text-zinc-400 uppercase tracking-wider">
                Loading your vault...
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: VAULT OVERVIEW */}
              {activeTab === 'wallet' && (
                <div className="space-y-4">
                  {/* Duolingo Hero Treasure Card */}
                  <div className="relative rounded-3xl bg-gradient-to-b from-[#FFFDF2] via-[#FFF9E6] to-[#FFF2C6] dark:from-[#2A2415] dark:via-[#221D12] dark:to-[#19150B] border-2 border-b-[6px] border-[#E8D18C] dark:border-[#5C4A19] p-5 sm:p-6 shadow-xs overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-3.5">
                        {/* 3D Shiny Coin Medallion */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FFAA00] via-[#FFD000] to-[#FFF076] border-2 border-b-4 border-[#B87A00] flex items-center justify-center text-stone-950 shadow-[0_4px_0_#996300] shrink-0">
                          <Coins className="w-7 h-7 drop-shadow-xs" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-[#E0FF33] flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-500 fill-amber-500" /> Available Balance
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                              {availablePoints}
                            </span>
                            <span className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                              FV Points
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-[#1E1B1C] border-2 border-b-4 border-amber-300 dark:border-amber-700 text-stone-900 dark:text-white font-black text-xs shadow-2xs">
                          <span className="text-amber-700 dark:text-amber-400">≈ ₹{(availablePoints * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-black text-stone-600 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-end gap-1">
                          <Zap size={11} className="text-amber-500 fill-amber-500" /> Instant Redeem
                        </div>
                      </div>
                    </div>

                    {/* 3 Chunky 3D Stat Blocks */}
                    <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t-2 border-amber-300/60 dark:border-amber-800/40 relative z-10">
                      {/* Block 1: Pending */}
                      <div className="bg-white/95 dark:bg-[#1C1A1B] p-2.5 sm:p-3 rounded-2xl border-2 border-b-4 border-amber-200 dark:border-stone-800 text-center shadow-2xs">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-0.5">
                          <Clock size={11} className="stroke-[2.5]" />
                          <span>Pending</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 font-['Outfit']">
                          {wallet?.pending_points ?? 0}
                        </p>
                      </div>

                      {/* Block 2: Lifetime Won */}
                      <div className="bg-white/95 dark:bg-[#1C1A1B] p-2.5 sm:p-3 rounded-2xl border-2 border-b-4 border-emerald-200 dark:border-stone-800 text-center shadow-2xs">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-0.5">
                          <Trophy size={11} className="stroke-[2.5]" />
                          <span>Won</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 font-['Outfit']">
                          {wallet?.lifetime_earned ?? 0}
                        </p>
                      </div>

                      {/* Block 3: Redeemed */}
                      <div className="bg-white/95 dark:bg-[#1C1A1B] p-2.5 sm:p-3 rounded-2xl border-2 border-b-4 border-blue-200 dark:border-stone-800 text-center shadow-2xs">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-400 mb-0.5">
                          <Gift size={11} className="stroke-[2.5]" />
                          <span>Used</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-stone-800 dark:text-zinc-200 font-['Outfit']">
                          {wallet?.lifetime_redeemed ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Duolingo Quest Pass (Referral Card) */}
                  <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-[#132219] dark:to-[#17261E] border-2 border-b-5 border-emerald-300 dark:border-emerald-800 p-4 sm:p-4.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#58CC02] border-2 border-b-4 border-[#3FA300] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Flame className="w-5 h-5 fill-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                          <span>Invite Code</span>
                          <span className="text-[10px] bg-emerald-200/90 dark:bg-emerald-800/90 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-lg font-black">
                            +35 FV
                          </span>
                        </p>
                        <p className="text-[11px] text-stone-600 dark:text-zinc-400 font-bold truncate">
                          Share code to earn instant quest rewards!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={copyReferralCode}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#58CC02] hover:bg-[#4EBD02] active:border-b-2 active:translate-y-0.5 text-white font-black text-xs border-2 border-b-4 border-[#3FA300] transition-all cursor-pointer shadow-sm select-none shrink-0"
                    >
                      {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
                      <span className="tracking-wider">{copied ? 'COPIED!' : referralCode}</span>
                    </button>
                  </div>

                  {/* Duolingo 3D Chunky Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex items-center justify-center gap-2 p-3.5 sm:p-4 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] border-2 border-b-[5px] border-[#1CA34D] active:border-b-2 active:translate-y-1 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-sm select-none"
                    >
                      <Share2 size={16} className="stroke-[2.5]" />
                      <span>Share Link</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('leaderboard')}
                      className="flex items-center justify-center gap-2 p-3.5 sm:p-4 rounded-2xl bg-[#FFC800] hover:bg-[#F2BE00] border-2 border-b-[5px] border-[#D69E00] active:border-b-2 active:translate-y-1 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-sm select-none"
                    >
                      <Trophy size={16} className="stroke-[2.5]" />
                      <span>View League</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: QUESTS (REFERRAL DYNASTY) */}
              {activeTab === 'referral' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#242021] border-2 border-b-[5px] border-stone-200 dark:border-stone-800 rounded-3xl p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-stone-900 dark:text-white font-['Outfit'] uppercase tracking-tight">
                          Referral Quests
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-zinc-400 font-bold">
                          Invite friends & level up your Dynasty tree
                        </p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#58CC02] to-[#46A302] border-2 border-b-4 border-[#358000] flex items-center justify-center text-white shadow-xs">
                        <Users size={20} className="stroke-[2.5]" />
                      </div>
                    </div>

                    {/* Code Card */}
                    <div className="bg-stone-50 dark:bg-[#171516] rounded-2xl p-4 border-2 border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-stone-500 dark:text-zinc-500 font-black uppercase tracking-wider">
                          Your Exclusive Code
                        </p>
                        <p className="text-xl font-black text-stone-900 dark:text-[#E0FF33] font-['Outfit'] tracking-wider truncate">
                          {referralCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={copyReferralCode}
                          className="p-2.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-800 border-2 border-b-4 border-stone-200 dark:bg-[#282526] dark:text-white dark:border-stone-700 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
                          title="Copy Code"
                        >
                          {copied ? <Check size={16} className="text-emerald-600 stroke-[3]" /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={handleWhatsAppShare}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] border-2 border-b-4 border-[#1CA34D] active:border-b-2 active:translate-y-0.5 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          <Share2 size={14} className="stroke-[2.5]" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Counters: 2 Chunky 3D Blocks */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-stone-50 dark:bg-[#1A1819] p-3.5 rounded-2xl border-2 border-b-4 border-stone-200 dark:border-stone-800 text-center">
                        <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-black uppercase tracking-wider">
                          Friends Invited
                        </p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white font-['Outfit'] mt-0.5">
                          {wallet?.referral_summary?.total_referrals ?? 0}
                        </p>
                      </div>
                      <div className="bg-amber-50 dark:bg-[#2A2315] p-3.5 rounded-2xl border-2 border-b-4 border-amber-200 dark:border-amber-900 text-center">
                        <p className="text-[10px] text-amber-800 dark:text-amber-400 font-black uppercase tracking-wider">
                          Active / Qualified
                        </p>
                        <p className="text-2xl font-black text-amber-900 dark:text-[#E0FF33] font-['Outfit'] mt-0.5">
                          {wallet?.referral_summary?.qualified_referrals ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Track (Duolingo Quest Checkpoints) */}
                  <div className="bg-white dark:bg-[#242021] border-2 border-b-[5px] border-stone-200 dark:border-stone-800 rounded-3xl p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-zinc-400 flex items-center gap-1.5">
                        <Star size={14} className="text-[#FFC800] fill-[#FFC800]" /> Milestone Rewards
                      </h5>
                      <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                        Instant Credit
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Quest 1 */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-[#181617] border-2 border-b-4 border-stone-200 dark:border-stone-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#58CC02] border-2 border-b-3 border-[#3FA300] flex items-center justify-center text-white shrink-0">
                            <Star size={14} className="fill-white" />
                          </div>
                          <div>
                            <p className="text-stone-900 dark:text-zinc-200 font-black">Friend Sign Up</p>
                            <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium">Instant welcome bonus on registration</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 font-black border border-emerald-300 dark:border-emerald-700 shrink-0">
                          +5 FV Each
                        </span>
                      </div>

                      {/* Quest 2 */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 dark:bg-[#1F1B12] border-2 border-b-4 border-amber-200 dark:border-stone-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#FF9600] border-2 border-b-3 border-[#D67C00] flex items-center justify-center text-white shrink-0">
                            <Zap size={14} className="fill-white" />
                          </div>
                          <div>
                            <p className="text-stone-900 dark:text-zinc-200 font-black">First Order Quest</p>
                            <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium">Min. order ₹99 placed within 24h</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-black border border-amber-300 dark:border-amber-700">
                            +10 FV (You)
                          </span>
                        </div>
                      </div>

                      {/* Quest 3 */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-[#121924] border-2 border-b-4 border-blue-200 dark:border-stone-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#1CB0F6] border-2 border-b-3 border-[#168FC7] flex items-center justify-center text-white shrink-0">
                            <Crown size={14} className="fill-white" />
                          </div>
                          <div>
                            <p className="text-stone-900 dark:text-zinc-200 font-black">Rider Fleet Missions</p>
                            <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium">1st (5/10) • 5th (20/25) • 15th (25/35)</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 font-black border border-blue-300 dark:border-blue-700">
                            Up to +50 FV
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LEADERBOARD (DUOLINGO LEAGUE STYLE) */}
              {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                  {/* Category Switcher: 3D Segmented Control */}
                  <div className="flex items-center p-1.5 bg-stone-100 dark:bg-[#141213] rounded-2xl border-2 border-stone-200 dark:border-stone-800 gap-1.5">
                    <button
                      onClick={() => setLeaderboardRole('customer')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        leaderboardRole === 'customer' 
                          ? 'bg-stone-900 text-white border-2 border-b-4 border-stone-950 dark:bg-[#E0FF33] dark:text-stone-950 dark:border-b-4 dark:border-[#AFC812] shadow-xs' 
                          : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Top Customers
                    </button>
                    <button
                      onClick={() => setLeaderboardRole('delivery')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        leaderboardRole === 'delivery' 
                          ? 'bg-stone-900 text-white border-2 border-b-4 border-stone-950 dark:bg-[#E0FF33] dark:text-stone-950 dark:border-b-4 dark:border-[#AFC812] shadow-xs' 
                          : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Top Riders
                    </button>
                  </div>

                  {/* Personal Rank & Standing Capsule */}
                  {(() => {
                    const myRankItem = leaderboard.find(item => item.user_id === userId);
                    const myPoints = Number(wallet?.available_points) || 0;
                    const myReferrals = Number(wallet?.referrals_count ?? wallet?.referral_summary?.total_referrals ?? 0);
                    
                    return (
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-[#292212] dark:to-[#221B0E] border-2 border-b-4 border-amber-300 dark:border-amber-800 rounded-3xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[#FFC800] border-2 border-b-3 border-[#D99A00] text-stone-950 flex items-center justify-center font-black text-sm font-['Outfit'] shrink-0">
                            {myRankItem ? `#${myRankItem.rank}` : '—'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-['Outfit'] uppercase">
                                Your Standing
                              </span>
                              <span className="text-[9px] px-2 py-0.5 bg-[#FF9600] text-white font-black rounded-lg uppercase tracking-wide">
                                {myRankItem ? 'RANKED' : 'UNRANKED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 dark:text-zinc-400 font-bold truncate">
                              {myReferrals} Referrals • {myPoints} FV Points
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleWhatsAppShare}
                          className="px-3.5 py-2 bg-[#58CC02] hover:bg-[#4EBD02] active:border-b-2 active:translate-y-0.5 text-white text-xs font-black uppercase tracking-wider rounded-xl border-2 border-b-4 border-[#3FA300] flex items-center gap-1 shadow-xs cursor-pointer select-none shrink-0"
                          title="Invite devotees to earn rank"
                        >
                          <Share2 size={12} className="stroke-[2.5]" />
                          <span>Boost</span>
                        </button>
                      </div>
                    );
                  })()}

                  {leaderboard.length === 0 ? (
                    <div className="bg-white dark:bg-[#242021] border-2 border-b-[5px] border-stone-200 dark:border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-2xs">
                      <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-100 border-2 border-b-4 border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
                        <Trophy size={28} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-stone-900 dark:text-white font-['Outfit'] uppercase">
                          Dynasty Season Is Open!
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-zinc-400 max-w-xs mx-auto mt-1 font-medium">
                          No ranked participants yet. Be the first devotee to share prasadam, refer friends, and claim the #1 spot!
                        </p>
                      </div>
                      <button
                        onClick={handleWhatsAppShare}
                        className="px-5 py-2.5 bg-[#FFC800] hover:bg-[#F2BE00] active:border-b-2 active:translate-y-0.5 text-stone-950 text-xs font-black uppercase tracking-wider rounded-2xl border-2 border-b-4 border-[#D99A00] inline-flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
                      >
                        <Share2 size={14} className="stroke-[2.5]" />
                        <span>Claim #1 On WhatsApp</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2 text-[10px] font-black text-stone-500 dark:text-zinc-500 uppercase tracking-wider">
                        <span>Rank & Devotee</span>
                        <span>FV Points</span>
                      </div>
                      {leaderboard.map((item, idx) => {
                        const isSelf = item.user_id === userId;
                        const isFirst = idx === 0;
                        const isSecond = idx === 1;
                        const isThird = idx === 2;
                        const displayName = maskLeaderboardName(item.display_name, isSelf);

                        // Duolingo Podium Colors
                        let rowStyle = 'bg-white dark:bg-[#242021] border-2 border-b-4 border-stone-200 dark:border-stone-800';
                        let badgeBg = 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300';
                        if (isFirst) {
                          rowStyle = 'bg-gradient-to-r from-[#FFF9D6] to-[#FFF3B0] dark:from-[#2E260E] dark:to-[#221B09] border-2 border-b-4 border-[#ECC63F] shadow-xs';
                          badgeBg = 'bg-[#FFD700] border-2 border-b-3 border-[#C9A500] text-stone-950';
                        } else if (isSecond) {
                          rowStyle = 'bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F6] dark:from-[#1E2125] dark:to-[#17191C] border-2 border-b-4 border-[#CBD5E1] shadow-xs';
                          badgeBg = 'bg-[#E2E8F0] border-2 border-b-3 border-[#94A3B8] text-stone-900';
                        } else if (isThird) {
                          rowStyle = 'bg-gradient-to-r from-[#FFF4ED] to-[#FFE8DA] dark:from-[#2B1D16] dark:to-[#1F1510] border-2 border-b-4 border-[#F0B18B] shadow-xs';
                          badgeBg = 'bg-[#FED7AA] border-2 border-b-3 border-[#EA580C] text-stone-950';
                        }

                        if (isSelf) {
                          rowStyle = 'bg-emerald-50 dark:bg-[#122419] border-2 border-b-4 border-emerald-400 dark:border-emerald-600 shadow-xs ring-2 ring-emerald-400/40';
                        }

                        return (
                          <div
                            key={item.user_id || idx}
                            className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${rowStyle}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs font-['Outfit'] shrink-0 ${badgeBg}`}>
                                {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${item.rank || idx + 1}`}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5 truncate">
                                  <span>{displayName}</span>
                                  {isSelf && (
                                    <span className="text-[9px] px-2 py-0.2 rounded-lg bg-[#58CC02] text-white font-black shrink-0">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-bold">
                                  {item.referrals_count} Successful Referrals
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-amber-800 dark:text-[#E0FF33] font-['Outfit']">
                                {item.points_earned} FV
                              </p>
                              <p className="text-[10px] text-stone-500 dark:text-zinc-500 font-bold">
                                ≈ ₹{ptsToRupees(item.points_earned)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HISTORY (LEDGER) */}
              {activeTab === 'ledger' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-zinc-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                      Cryptographic Ledger History
                    </h4>
                    <span className="text-[10px] text-stone-500 dark:text-zinc-500 font-black uppercase">
                      Immutable Log
                    </span>
                  </div>

                  {(!wallet?.recent_transactions || wallet.recent_transactions.length === 0) ? (
                    <div className="bg-white dark:bg-[#242021] border-2 border-b-[5px] border-stone-200 dark:border-stone-800 rounded-3xl p-6 text-center space-y-1 shadow-2xs">
                      <p className="text-xs font-black text-stone-700 dark:text-zinc-300 uppercase">No transactions yet</p>
                      <p className="text-[11px] text-stone-500 dark:text-zinc-500 font-medium">Your earned points and redemptions will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {wallet.recent_transactions.map((tx) => {
                        const isCredit = Number(tx.amount) > 0;
                        const formattedDate = new Date(tx.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div 
                            key={tx.id}
                            className="bg-white dark:bg-[#242021] border-2 border-b-4 border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 border-b-3 ${
                                isCredit 
                                  ? 'bg-[#E8F9D7] text-[#2E7D00] border-[#B9E592]' 
                                  : 'bg-[#FFEBEB] text-[#D32F2F] border-[#FFCDD2]'
                              }`}>
                                {isCredit ? <ArrowDownLeft size={16} className="stroke-[3]" /> : <ArrowUpRight size={16} className="stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-stone-900 dark:text-white truncate capitalize">
                                  {tx.notes || tx.transaction_type.replace(/_/g, ' ')}
                                </p>
                                <p className="text-[10px] text-stone-500 dark:text-zinc-400 flex items-center gap-1 font-bold">
                                  <Clock size={10} /> {formattedDate}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`text-xs font-black font-['Outfit'] ${
                                isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {isCredit ? '+' : ''}{tx.amount} FV
                              </p>
                              <p className="text-[10px] text-stone-500 dark:text-zinc-500 font-bold">
                                Bal: {tx.balance_after}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CLUB (WHATSAPP COMMUNITY CHANNELS) */}
              {activeTab === 'community' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-[#132419] dark:to-[#172B1E] border-2 border-b-[5px] border-emerald-300 dark:border-emerald-800 rounded-3xl p-5 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366] border-2 border-b-3 border-[#1CA34D] flex items-center justify-center text-white">
                        <MessageCircle className="w-4 h-4 fill-white" />
                      </div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-white font-['Outfit'] uppercase">
                        Official Foody Clubs
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-zinc-300 font-medium leading-relaxed">
                      Join direct WhatsApp broadcast groups for secret prasad discounts, flash rewards, and community giveaways!
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {communityLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white dark:bg-[#242021] hover:bg-stone-50 border-2 border-b-4 border-stone-200 dark:border-stone-800 hover:border-emerald-400 rounded-2xl p-4 transition-all group shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase tracking-wider">
                                {link.channel_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h5 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {link.name}
                            </h5>
                            {link.description && (
                              <p className="text-[11px] text-stone-600 dark:text-zinc-400 line-clamp-2 font-medium">
                                {link.description}
                              </p>
                            )}
                          </div>
                          <div className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] border-2 border-b-3 border-[#1CA34D] text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs shrink-0">
                            <span>Join</span>
                            <ExternalLink size={12} className="stroke-[2.5]" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Bar: Duolingo Style Safe Footer */}
        <div className="p-4 sm:p-5 bg-white/80 dark:bg-[#1E1B1C]/80 border-t-2 border-stone-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#58CC02] animate-ping" />
            <span className="text-[11px] text-stone-600 dark:text-zinc-400 font-black uppercase tracking-wide">
              Safe & Protected
            </span>
          </div>

          <button
            onClick={handleAnimatedClose}
            className="px-5 py-2.5 rounded-2xl bg-stone-200 hover:bg-stone-300 border-2 border-b-4 border-stone-300/90 active:border-b-2 active:translate-y-0.5 text-stone-900 dark:bg-[#282526] dark:hover:bg-[#343031] dark:border-stone-700 dark:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

