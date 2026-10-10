// ==========================================
// FOODY REVIEWS & MULTI-STAFF RECOGNITION SERVICE
// Customer reviews, Chef feedback, Rider feedback,
// and CIBIL trust score awards
// ==========================================

import { supabase } from './client.js';
import { safeStorage, dispatchSafeEvent, getDefaultActiveShopId } from './cache.js';
import { updateUserTrustScore } from './operations.service.js';

// ========================================================================
// 1. REVIEWS & RATINGS CLOUD APIS
// ========================================================================

export async function createCloudReview(reviewData) {
  const localKey = `foody_reviews_${reviewData.shop_id || reviewData.shopId || 'all'}`;
  try {
    const existing = JSON.parse(safeStorage.getItem(localKey) || '[]');
    const nextReviews = [reviewData, ...existing];
    safeStorage.setItem(localKey, JSON.stringify(nextReviews));
    dispatchSafeEvent('foody_reviews_changed', { reviews: nextReviews });
  } catch (e) { }

  try {
    const payload = {
      order_id: reviewData.order_id || reviewData.orderId || `REV-${Date.now()}`,
      shop_id: reviewData.shop_id || reviewData.shopId || getDefaultActiveShopId(),
      customer_name: reviewData.customer_name || reviewData.customerName || 'Devotee Customer',
      rating: Number(reviewData.rating || 5),
      tags: reviewData.tags || [],
      comment: reviewData.comment || '',
      chef_feedback: reviewData.chef_feedback || reviewData.chefFeedback || {},
      rider_feedback: reviewData.rider_feedback || reviewData.riderFeedback || {},
      created_at: reviewData.created_at || new Date().toISOString()
    };

    // 1. Try secure verified review submission RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_verified_review', {
        p_order_id: payload.order_id,
        p_rating: payload.rating,
        p_comment: payload.comment,
        p_customer_phone: reviewData.customer_phone || reviewData.customerPhone || null,
        p_tags: payload.tags,
        p_chef_feedback: payload.chef_feedback,
        p_rider_feedback: payload.rider_feedback
      });

      if (!rpcError && rpcData) {
        return rpcData;
      }
    } catch (rpcErr) {
      // Fallback to standard insert
    }

    const { data, error } = await supabase
      .from('foody_reviews')
      .insert([payload])
      .select();

    if (error) {
      console.warn('createCloudReview cloud notice:', error.message);
    }
    return data ? data[0] : payload;
  } catch (e) {
    console.warn('createCloudReview notice:', e.message);
    return reviewData;
  }
}

export async function getCloudReviews(shopId = 'all') {
  const localKey = `foody_reviews_${shopId}`;
  let localData = [];
  try {
    localData = JSON.parse(safeStorage.getItem(localKey) || '[]');
  } catch (e) { }

  try {
    let query = supabase.from('foody_reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try {
        safeStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) { }
      return data;
    }
    return localData;
  } catch (e) {
    return localData;
  }
}

// ========================================================================
// 2. MULTI-STAKEHOLDER REVIEW & RECOGNITION (CHEF + RIDER + SHOP)
// ========================================================================

export async function recordMultiStaffReview({
  orderId,
  shopId,
  customerName = 'Devotee Customer',
  chefId,
  chefName,
  chefRating = 5,
  chefTags = [],
  riderId,
  riderName,
  riderRating = 5,
  riderTags = [],
  overallComment = ''
}) {
  const nowIso = new Date().toISOString();

  // 1. Award / Deduct CIBIL Points for Chef
  if (chefId && !String(chefId).startsWith('chef_shop-')) {
    const chefPoints = chefRating >= 4 ? (chefRating === 5 ? 12 : 6) : -15;
    await updateUserTrustScore(chefId, chefPoints, `Customer Food Review (${chefRating}⭐) for Order #${orderId?.slice(-5) || ''}`);
  }

  // 2. Award / Deduct CIBIL Points for Delivery Sarathi
  if (riderId) {
    const riderPoints = riderRating >= 4 ? (riderRating === 5 ? 12 : 6) : -15;
    await updateUserTrustScore(riderId, riderPoints, `Customer Delivery Review (${riderRating}⭐) for Order #${orderId?.slice(-5) || ''}`);
  }

  // 3. Save comprehensive review in Supabase
  const combinedReview = {
    order_id: orderId || `REV-${Date.now()}`,
    shop_id: shopId || getDefaultActiveShopId(),
    customer_name: customerName,
    rating: Math.round(((Number(chefRating) + Number(riderRating)) / 2) * 10) / 10,
    tags: [...chefTags, ...riderTags],
    comment: overallComment,
    chef_feedback: { rating: chefRating, tags: chefTags, chefName },
    rider_feedback: { rating: riderRating, tags: riderTags, riderName },
    created_at: nowIso
  };

  return createCloudReview(combinedReview);
}
