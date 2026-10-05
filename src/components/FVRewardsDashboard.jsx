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
  Award
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

  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'referral' | 'ledger' | 'leaderboard' | 'community'
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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md apple-overlay ${closing ? 'closing' : ''}`}
    >
      <div 
        className={`relative w-full max-w-lg bg-[#1E1B1C] border border-white/10 text-white rounded-[32px] sm:rounded-[40px] shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] overflow-hidden apple-modal-spring ${closing ? 'closing' : ''}`}
      >
        {/* Glow ambient header effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E0FF33]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/40 flex items-center justify-center text-[#E0FF33] shadow-inner">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] tracking-tight">
                  FV Dynasty & Rewards
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#E0FF33]/20 text-[#E0FF33] text-[10px] font-black tracking-wider uppercase">
                  1 FV = ₹0.10
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Satvik Loyalty Currency & Referral Hub</p>
            </div>
          </div>
          <button 
            onClick={handleAnimatedClose}
            className="w-9 h-9 rounded-full bg-[#282526] hover:bg-[#343031] text-zinc-400 hover:text-white flex items-center justify-center transition-all apple-tap-target border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-[#151314] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'wallet', label: 'Wallet', icon: Coins },
            { id: 'referral', label: 'Referral', icon: Users },
            { id: 'ledger', label: 'Ledger', icon: History },
            { id: 'leaderboard', label: 'Ranks', icon: Trophy },
            { id: 'community', label: 'WhatsApp', icon: MessageCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer apple-tap-target ${
                  isActive 
                    ? 'bg-[#E0FF33] text-[#121011] font-black shadow-sm shadow-[#E0FF33]/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 relative z-10">
          {!userId ? (
            <div className="text-center py-10 space-y-3">
              <ShieldCheck className="w-12 h-12 text-[#E0FF33] mx-auto opacity-75" />
              <h4 className="text-base font-bold text-white">Sign In to Access FV Dynasty</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Create or sign in to your Foody Vrinda account to earn and redeem FV Points and build your referral tree!
              </p>
            </div>
          ) : loading && !wallet ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#E0FF33]/30 border-t-[#E0FF33] animate-spin" />
              <p className="text-xs text-zinc-400">Loading your dynasty vault...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: WALLET OVERVIEW */}
              {activeTab === 'wallet' && (
                <div className="space-y-4">
                  {/* Balance Display Card */}
                  <div className="relative rounded-3xl bg-gradient-to-br from-[#282526] via-[#242021] to-[#181617] border border-[#E0FF33]/30 p-5 sm:p-6 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#E0FF33] flex items-center gap-1.5">
                          <Sparkles size={13} /> Available Balance
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
                            {availablePoints}
                          </span>
                          <span className="text-sm font-bold text-zinc-400">FV Points</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">50 FV = ₹5.00</div>
                        <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-300">
                          Instant at Checkout
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center">
                      <div className="bg-[#151314]/60 p-2.5 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Pending</p>
                        <p className="text-sm font-black text-amber-400 font-['Outfit']">
                          {wallet?.pending_points ?? 0}
                        </p>
                      </div>
                      <div className="bg-[#151314]/60 p-2.5 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Lifetime Won</p>
                        <p className="text-sm font-black text-emerald-400 font-['Outfit']">
                          {wallet?.lifetime_earned ?? 0}
                        </p>
                      </div>
                      <div className="bg-[#151314]/60 p-2.5 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Redeemed</p>
                        <p className="text-sm font-black text-zinc-300 font-['Outfit']">
                          {wallet?.lifetime_redeemed ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Referral Banner */}
                  <div className="rounded-2xl bg-[#282526] border border-white/10 p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">Your Unique Referral Code</p>
                      <p className="text-[11px] text-zinc-400">Share to earn up to 35 FV Points per referral!</p>
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E0FF33] text-[#121011] font-black text-xs hover:bg-[#d4f526] transition-all cursor-pointer apple-tap-target shrink-0"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : referralCode}</span>
                    </button>
                  </div>

                  {/* Fast Action Rows */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40 transition-all font-bold text-xs apple-tap-target cursor-pointer"
                    >
                      <Share2 size={15} />
                      <span>WhatsApp Invite</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('leaderboard')}
                      className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:bg-amber-900/40 transition-all font-bold text-xs apple-tap-target cursor-pointer"
                    >
                      <Trophy size={15} />
                      <span>View Ranks</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: REFERRAL DYNASTY */}
              {activeTab === 'referral' && (
                <div className="space-y-4">
                  <div className="bg-[#282526] border border-white/10 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white font-['Outfit']">Your Referral Dynasty</h4>
                        <p className="text-xs text-zinc-400">Invite friends & earn rewards on genuine milestones</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-[#E0FF33]/10 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
                        <Users size={18} />
                      </div>
                    </div>

                    {/* Share Card */}
                    <div className="bg-[#151314] rounded-2xl p-3.5 border border-white/5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Referral Code</p>
                        <p className="text-base font-black text-[#E0FF33] font-['Outfit'] tracking-wider truncate">
                          {referralCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={copyReferralCode}
                          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all apple-tap-target cursor-pointer"
                          title="Copy Code"
                        >
                          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={handleWhatsAppShare}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all apple-tap-target cursor-pointer"
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Counters */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-[#151314]/80 p-3 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Invited</p>
                        <p className="text-xl font-black text-white font-['Outfit']">
                          {wallet?.referral_summary?.total_referrals ?? 0}
                        </p>
                      </div>
                      <div className="bg-[#151314]/80 p-3 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Qualified / Active</p>
                        <p className="text-xl font-black text-[#E0FF33] font-['Outfit']">
                          {wallet?.referral_summary?.qualified_referrals ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Rewards Breakdown */}
                  <div className="bg-[#282526] border border-white/10 rounded-3xl p-5 space-y-3">
                    <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400">Milestone Rules</h5>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#151314]/60 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#E0FF33]" />
                          <div>
                            <p className="text-zinc-200 font-bold">Friend Sign Up</p>
                            <p className="text-[10px] text-zinc-400">Instant welcome bonus on registration</p>
                          </div>
                        </div>
                        <span className="font-black text-[#E0FF33] shrink-0">+5 FV (Both)</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#151314]/60 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <div>
                            <p className="text-zinc-200 font-bold">First Order (Within 24h)</p>
                            <p className="text-[10px] text-zinc-400">Min. order ₹99 placed within 24 hours</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-amber-400">+10 FV (You)</p>
                          <p className="text-[10px] text-zinc-400">+20 FV (Friend)</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#151314]/60 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <p className="text-zinc-200 font-bold">Rider Fleet Milestones</p>
                            <p className="text-[10px] text-zinc-400">1st (5/10) • 5th (20/25) • 15th (25/35)</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-emerald-400">Up to +50 FV (You)</p>
                          <p className="text-[10px] text-zinc-400">Up to +70 FV (Rider)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: IMMUTABLE LEDGER */}
              {activeTab === 'ledger' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Cryptographic Ledger Entries
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-medium">Append-only audit</span>
                  </div>

                  {(!wallet?.recent_transactions || wallet.recent_transactions.length === 0) ? (
                    <div className="bg-[#282526] border border-white/10 rounded-2xl p-6 text-center space-y-1">
                      <p className="text-xs text-zinc-400">No transactions recorded yet.</p>
                      <p className="text-[11px] text-zinc-500">Your points credits and debits will appear here.</p>
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
                            className="bg-[#282526] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-white/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isCredit ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/60 text-red-400 border border-red-500/20'
                              }`}>
                                {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate capitalize">
                                  {tx.notes || tx.transaction_type.replace(/_/g, ' ')}
                                </p>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <Clock size={10} /> {formattedDate}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`text-xs font-black font-['Outfit'] ${
                                isCredit ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {isCredit ? '+' : ''}{tx.amount} FV
                              </p>
                              <p className="text-[10px] text-zinc-500">
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

              {/* TAB 4: LEADERBOARD */}
              {/* TAB 4: LEADERBOARD */}
              {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                  {/* Category Switcher */}
                  <div className="flex items-center p-1 bg-[#151314] rounded-2xl border border-white/5 gap-1">
                    <button
                      onClick={() => setLeaderboardRole('customer')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        leaderboardRole === 'customer' 
                          ? 'bg-[#E0FF33] text-[#121011] font-black shadow-xs' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Top Customers
                    </button>
                    <button
                      onClick={() => setLeaderboardRole('delivery')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        leaderboardRole === 'delivery' 
                          ? 'bg-[#E0FF33] text-[#121011] font-black shadow-xs' 
                          : 'text-zinc-400 hover:text-white'
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
                      <div className="p-3.5 bg-gradient-to-r from-[#282526] to-[#1E1B1C] border border-[#E0FF33]/25 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center font-black text-xs font-['Outfit'] shrink-0">
                            {myRankItem ? `#${myRankItem.rank}` : '—'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white font-['Outfit'] truncate">
                                Your Standing
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#E0FF33] text-black font-black rounded-full shrink-0">
                                {myRankItem ? 'RANKED' : 'UNRANKED'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {myReferrals} Referrals • {myPoints} FV Points
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleWhatsAppShare}
                          className="px-3 py-1.5 bg-[#E0FF33] hover:bg-[#ccee2b] text-[#121011] text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                          title="Invite devotees to earn rank"
                        >
                          <Share2 size={12} />
                          <span>Invite</span>
                        </button>
                      </div>
                    );
                  })()}

                  {leaderboard.length === 0 ? (
                    <div className="bg-[#282526] border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
                        <Trophy size={24} className="animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white font-['Outfit']">
                          Dynasty Season Is Open!
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                          No ranked participants yet. Be the first devotee to share prasadam, refer friends, and claim the #1 spot!
                        </p>
                      </div>
                      <button
                        onClick={handleWhatsAppShare}
                        className="px-4 py-2 bg-[#E0FF33] text-[#121011] text-xs font-black rounded-xl inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Share2 size={14} />
                        <span>Share on WhatsApp & Claim #1</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <span>Rank & Devotee</span>
                        <span>FV Points</span>
                      </div>
                      {leaderboard.map((item, idx) => {
                        const isSelf = item.user_id === userId;
                        const isTop3 = idx < 3;
                        const medalColors = ['text-amber-400', 'text-zinc-300', 'text-amber-600'];
                        const displayName = maskLeaderboardName(item.display_name, isSelf);

                        return (
                          <div
                            key={item.user_id || idx}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isSelf
                                ? 'bg-[#E0FF33]/10 border-[#E0FF33]/40 shadow-xs'
                                : 'bg-[#282526] border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 text-center font-black font-['Outfit'] shrink-0">
                                {isTop3 ? (
                                  <Award size={18} className={medalColors[idx]} />
                                ) : (
                                  <span className="text-xs text-zinc-500">#{item.rank || idx + 1}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                  <span>{displayName}</span>
                                  {isSelf && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#E0FF33] text-black font-black shrink-0">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-zinc-400">
                                  {item.referrals_count} Successful Referrals
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-[#E0FF33] font-['Outfit']">
                                {item.points_earned} FV
                              </p>
                              <p className="text-[10px] text-zinc-500">
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

              {/* TAB 5: WHATSAPP COMMUNITY CHANNELS */}
              {activeTab === 'community' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-emerald-950/50 to-green-950/20 border border-emerald-500/20 rounded-3xl p-5 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <MessageCircle className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white font-['Outfit']">Official WhatsApp Communities</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Stay connected with direct broadcasts from Sri Vrindavan Dham for secret coupons, instant flash sales, and fleet dispatch updates!
                    </p>
                  </div>

                  <div className="space-y-2">
                    {communityLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-[#282526] hover:bg-[#322E30] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 transition-all apple-tap-target group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                {link.channel_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {link.name}
                            </h5>
                            {link.description && (
                              <p className="text-[11px] text-zinc-400 line-clamp-2">
                                {link.description}
                              </p>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-emerald-500 text-zinc-400 group-hover:text-black flex items-center justify-center transition-all shrink-0">
                            <ExternalLink size={14} />
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

        {/* Modal Bottom Bar */}
        <div className="p-4 sm:p-5 bg-[#151314] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] text-zinc-400 font-medium">Safe & Verified with Ledger Protection</span>
          </div>

          <button
            onClick={handleAnimatedClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all apple-tap-target cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
