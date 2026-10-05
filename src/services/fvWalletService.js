import { supabase } from '../supabase';

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
 * Fetches leaderboard rankings (customer or delivery)
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(data.leaderboard));
      }
      return data.leaderboard;
    }
  } catch (err) {
    console.warn('[FVWallet] get_fv_leaderboard error, using cached fallback:', err);
  }

  // Fallback to cache if available
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        // ignore
      }
    }
  }
  return [];
}

/**
 * Realtime subscription to wallet balance updates
 */
export function subscribeUserWallet(userId, onUpdate) {
  if (!userId || !supabase) return () => {};

  const channel = supabase
    .channel(`fv_wallet_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'foody_wallets',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const fresh = await getWalletDashboard(userId, true);
        if (onUpdate && fresh) onUpdate(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
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
