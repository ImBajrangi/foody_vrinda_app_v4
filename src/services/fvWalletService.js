import { supabase } from '../supabase.js';

const SWR_EXPIRY_MS = 60 * 1000; // 1 minute fresh window, render stale immediately
const CACHE_PREFIX = 'foody_fv_wallet_cache_';
const LEADERBOARD_CACHE_KEY = 'foody_fv_leaderboard_cache_';

/**
 * 1 FV Point = ₹0.10
 * 50 FV Points = ₹5.00
 */
export const FV_EXCHANGE_RATE = 0.10; // ₹ per FV point
export const FV_POINTS_PER_RUPEE = 10; // points per ₹1

export const ptsToRupees = (points) => {
  const pts = Number(points) || 0;
  return Number((pts * FV_EXCHANGE_RATE).toFixed(2));
};

export const rupeesToPts = (rupees) => {
  const rs = Number(rupees) || 0;
  return Math.ceil(rs * FV_POINTS_PER_RUPEE);
};

export const getCachedWallet = (userId) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[FVWallet] Cache read failed:', err);
    return null;
  }
};

export const setCachedWallet = (userId, data) => {
  if (!userId || !data || typeof window === 'undefined') return;
  try {
    const payload = {
      ...data,
      _cachedAt: Date.now()
    };
    localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('[FVWallet] Cache save failed:', err);
  }
};

/**
 * Initializes a new user's wallet with optional referral code binding
 */
export async function initUserWallet(userId, referralCode = null, channel = 'direct') {
  if (!userId) return { success: false, error: 'User ID is required' };

  try {
    const { data, error } = await supabase.rpc('create_wallet_on_signup', {
      p_user_id: userId,
      p_referral_code: referralCode ? referralCode.trim() : null,
      p_channel: channel || 'direct'
    });

    if (error) {
      console.error('[FVWallet] initUserWallet RPC error:', error);
      return { success: false, error: error.message };
    }

    // Refresh wallet in cache
    await getWalletDashboard(userId, true);
    return { success: true, data };
  } catch (err) {
    console.error('[FVWallet] initUserWallet exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches the complete wallet dashboard (balances, ledger, referral stats)
 * Implements SWR: returns cached data immediately while fetching updates
 */
export async function getWalletDashboard(userId, forceFresh = false) {
  if (!userId) return null;

  const cached = getCachedWallet(userId);
  const isFresh = cached && (Date.now() - (cached._cachedAt || 0) < SWR_EXPIRY_MS);

  // If cached and fresh (and not forcing refresh), return synchronously
  if (isFresh && !forceFresh) {
    return cached;
  }

  try {
    const { data, error } = await supabase.rpc('get_wallet_dashboard', {
      p_user_id: userId
    });

    if (error) {
      console.warn('[FVWallet] get_wallet_dashboard RPC error, falling back to cache:', error);
      return cached;
    }

    if (data && data.success) {
      setCachedWallet(userId, data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foody:wallet-updated', { detail: data }));
      }
      return data;
    }
    return cached;
  } catch (err) {
    console.error('[FVWallet] getWalletDashboard error:', err);
    return cached;
  }
}

/**
 * Redeems FV Points atomically at checkout against an order
 */
export async function redeemFVPoints(userId, pointsToRedeem, orderId) {
  if (!userId || !pointsToRedeem || !orderId) {
    return { success: false, error: 'Missing required parameters for redemption' };
  }

  try {
    const { data, error } = await supabase.rpc('redeem_fv_points', {
      p_user_id: userId,
      p_points_to_redeem: Number(pointsToRedeem),
      p_order_id: String(orderId)
    });

    if (error) {
      console.error('[FVWallet] redeem_fv_points error:', error);
      return { success: false, error: error.message };
    }

    // Invalidate & refresh cache
    await getWalletDashboard(userId, true);
    return { success: true, data };
  } catch (err) {
    console.error('[FVWallet] redeemFVPoints exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches dynamic community links (WhatsApp Channels, Fleet Groups, etc.)
 */
export async function getCommunityLinks(targetRole = 'all') {
  try {
    let query = supabase
      .from('foody_community_links')
      .select('*')
      .eq('is_active', true);

    if (targetRole && targetRole !== 'all') {
      query = query.in('target_role', ['all', targetRole]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[FVWallet] Error fetching community links:', err);
    return [
      {
        id: 'comm_default_whatsapp',
        name: 'Foody Vrinda VIP WhatsApp Channel',
        description: 'Exclusive deals, instant delivery updates, and secret discounts',
        channel_type: 'whatsapp_channel',
        target_role: 'customer',
        link_url: 'https://whatsapp.com/channel/foodyvrinda',
        is_active: true
      }
    ];
  }
}

/**
 * Privacy-compliant display name mask for public leaderboards
 * Prevents leaking full names, student IDs, phone numbers, or email handles
 */
export function maskLeaderboardName(name, isSelf = false) {
  if (isSelf) return name || 'You';
  if (!name || typeof name !== 'string') return 'Foody Devotee';

  let clean = name.trim();

  // 1. Strip student roll number / alphanumeric registration IDs (e.g., '24F2004883 HARSH SHARMA')
  clean = clean.replace(/^[0-9][0-9A-Za-z_-]{4,}\s+/i, '');

  // 2. Strip internal user role wrappers
  if (clean.toLowerCase().includes('chef_')) return 'Kitchen Chef';
  if (clean.toLowerCase().startsWith('user (')) clean = clean.replace(/^user\s*\((.*?)\)/i, '$1');

  // 3. Test/Auto-generated accounts with trailing digits (e.g. 'vrindatest31514')
  if (/^[a-zA-Z]+[0-9]{3,}$/.test(clean)) {
    return 'Devotee •••' + clean.slice(-3);
  }

  // 4. Phone numbers
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return 'Devotee •••' + digitsOnly.slice(-4);
  }

  // 5. Email addresses
  if (clean.includes('@')) {
    const userPart = clean.split('@')[0];
    return 'Devotee •••' + userPart.slice(-3);
  }

  // 6. Multi-word names: First name + Last name initial masked (e.g. 'Kunvar Singh' -> 'Kunvar S***')
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInitial = parts[1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}***`;
  }

  // 7. Single word names (e.g. 'Radharani' -> 'Radh***')
  if (clean.length > 3) {
    return clean.slice(0, 3) + '***';
  }

  return clean + '***';
}

/**
 * Fetches leaderboard rankings (customer or delivery)
 * Filters out zero-achievement accounts and ensures privacy
 */
export async function getFVLeaderboard(periodType = 'all_time', roleType = 'customer', limit = 10) {
  const cacheKey = `${LEADERBOARD_CACHE_KEY}${periodType}_${roleType}`;
  try {
    const { data, error } = await supabase.rpc('get_fv_leaderboard', {
      p_period_type: periodType,
      p_role_type: roleType,
      p_limit: limit
    });

    if (error) throw error;
    if (data?.success && Array.isArray(data.leaderboard)) {
      // Filter out zero-achievement accounts and internal accounts
      const qualified = data.leaderboard.filter(item => {
        const hasPoints = Number(item.points_earned) > 0;
        const hasRefs = Number(item.referrals_count) > 0;
        const isInternal = String(item.user_id || '').startsWith('chef_') ||
                           String(item.user_id || '').startsWith('master-') ||
                           String(item.display_name || '').toLowerCase().includes('chef_') ||
                           String(item.display_name || '').toLowerCase().startsWith('vrindatest');
        return (hasPoints || hasRefs) && !isInternal;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(qualified));
      }
      return qualified;
    }
  } catch (err) {
    console.warn('[FVWallet] get_fv_leaderboard error, using cached fallback:', err);
  }

  // Fallback to cache if available
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => (Number(item.points_earned) > 0 || Number(item.referrals_count) > 0));
        }
      } catch (e) {
        // ignore
      }
    }
  }
  return [];
}

// In-memory multiplex registry for user wallet realtime channels (userId -> { channel, listeners })
const activeWalletSubscriptions = new Map();

/**
 * Realtime subscription to wallet balance updates (Multiplexed singleton per user)
 */
export function subscribeUserWallet(userId, onUpdate) {
  if (!userId || !supabase) return () => {};

  const cleanId = String(userId).trim();
  let entry = activeWalletSubscriptions.get(cleanId);

  if (!entry) {
    const listeners = new Set();
    if (typeof onUpdate === 'function') listeners.add(onUpdate);

    const channelName = `fv_wallet_${cleanId}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'foody_wallets',
          filter: `user_id=eq.${cleanId}`
        },
        async () => {
          try {
            const fresh = await getWalletDashboard(cleanId, true);
            if (fresh) {
              const currentEntry = activeWalletSubscriptions.get(cleanId);
              if (currentEntry) {
                currentEntry.listeners.forEach((listener) => {
                  try {
                    listener(fresh);
                  } catch (e) {
                    console.warn('[FVWallet] Listener notification error:', e);
                  }
                });
              }
            }
          } catch (err) {
            console.warn('[FVWallet] Realtime refresh error:', err);
          }
        }
      );

    channel.subscribe();

    entry = { channel, listeners };
    activeWalletSubscriptions.set(cleanId, entry);
  } else {
    if (typeof onUpdate === 'function') {
      entry.listeners.add(onUpdate);
    }
  }

  return () => {
    const currentEntry = activeWalletSubscriptions.get(cleanId);
    if (!currentEntry) return;

    if (typeof onUpdate === 'function') {
      currentEntry.listeners.delete(onUpdate);
    }

    if (currentEntry.listeners.size === 0) {
      activeWalletSubscriptions.delete(cleanId);
      try {
        supabase.removeChannel(currentEntry.channel);
      } catch (_) {}
    }
  };
}

/**
 * Builds WhatsApp share link with referral code
 */
export function generateWhatsAppShareUrl(referralCode, role = 'customer') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://foodyvrinda.com';
  const referralLink = `${origin}/?ref=${encodeURIComponent(referralCode)}`;

  let text = '';
  if (role === 'delivery') {
    text = `🚀 Join Foody Vrinda Delivery Fleet! Use my referral code *${referralCode}* to earn milestone cash bonuses on every delivery.\n\nSign up here: ${referralLink}`;
  } else {
    text = `🥗 Order 100% Satvik Pure food from Foody Vrinda in Sri Vrindavan Dham! Use my referral code *${referralCode}* to get ₹10 OFF your first order.\n\nTaste the Divine: ${referralLink}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
