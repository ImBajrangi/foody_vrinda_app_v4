import {
  supabase,
  isTableMissing,
  markTableMissing,
  isTableError,
  resolveDishCutout
} from './client.js';
import {
  CACHE_TTL_MS,
  memoryCache,
  pendingRequests,
  safeStorage,
  getCachedItem,
  setCachedItem,
  invalidateCache,
  getDefaultActiveShopId,
  dispatchSafeEvent
} from './cache.js';

// ========================================================================
// MENUS CLOUD APIS (PER-SHOP CACHING WITH DEDUPLICATION)
// ========================================================================

export async function getCloudMenus(shopId = 'all') {
  const cached = getCachedItem('menus', shopId);
  if (cached) return cached;
  if (isTableMissing('foody_menus')) return [];

  const reqKey = `getCloudMenus_${shopId}`;
  if (pendingRequests.has(reqKey)) {
    return pendingRequests.get(reqKey);
  }

  const promise = (async () => {
    try {
      let query = supabase.from('foody_menus').select('*');
      if (shopId && shopId !== 'all') {
        query = query.eq('shop_id', shopId);
      }
      let { data, error } = await query;
      if (error) {
        let fallbackQuery = supabase.from('public_menu_catalog').select('*');
        if (shopId && shopId !== 'all') {
          fallbackQuery = fallbackQuery.eq('shop_id', shopId);
        }
        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data;
        error = fallbackRes.error;
      }
      if (error) {
        if (isTableError(error)) markTableMissing('foody_menus');
        return [];
      }
      if (!data || data.length === 0) {
        setCachedItem('menus', shopId, []);
        return [];
      }
      const mapped = data.map(d => {
        const nut = typeof d.nutrition === 'object' && d.nutrition !== null ? d.nutrition : {};
        const isCombo = Boolean(d.is_combo || nut.isCombo || d.category === 'Combo Offers');
        return {
          id: d.id,
          shopId: d.shop_id,
          name: d.name,
          subtitle: d.subtitle || '',
          description: d.description || '',
          category: d.category || (isCombo ? 'Combo Offers' : 'Main'),
          price: Number(d.price || 0),
          originalPrice: Number(d.original_price || nut.originalPrice || d.price || 0),
          discountPercent: Number(d.discount_percent || nut.discountPercent || 0),
          isCombo,
          comboItems: d.combo_items || nut.comboItems || [],
          image: resolveDishCutout(d.image, d.name, d.category),
          tag: d.tag || '',
          kcal: d.kcal || nut.kcal || '250 kcal',
          nutrition: d.nutrition || nut || { kcal: '250 kcal' },
          isAvailable: d.is_available ?? true
        };
      });

      setCachedItem('menus', shopId, mapped);
      return mapped;
    } catch (err) {
      console.warn('getCloudMenus exception:', err?.message);
      return [];
    } finally {
      pendingRequests.delete(reqKey);
    }
  })();

  pendingRequests.set(reqKey, promise);
  return promise;
}

// -------------------------------------------------------------
// MENUS & COMBOS CRUD
// -------------------------------------------------------------

export async function createCloudMenuItem(itemData) {
  try {
    const itemId = itemData.id || `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const isCombo = Boolean(itemData.isCombo || itemData.category === 'Combo Offers');

    // Nutrition & extra fields packed into JSONB
    const nutritionObj = typeof itemData.nutrition === 'object' && itemData.nutrition !== null
      ? { ...itemData.nutrition }
      : { kcal: itemData.kcal || '250 kcal' };

    if (itemData.originalPrice || itemData.original_price) {
      nutritionObj.originalPrice = Number(itemData.originalPrice || itemData.original_price);
    }
    if (itemData.discountPercent || itemData.discount_percent) {
      nutritionObj.discountPercent = Number(itemData.discountPercent || itemData.discount_percent);
    }
    if (isCombo) {
      nutritionObj.isCombo = true;
      nutritionObj.comboItems = itemData.comboItems || itemData.combo_items || [];
    }

    const payload = {
      id: itemId,
      shop_id: itemData.shopId || itemData.shop_id || getDefaultActiveShopId(),
      name: itemData.name,
      subtitle: itemData.subtitle || itemData.category || '',
      description: itemData.description || '',
      category: itemData.category || (isCombo ? 'Combo Offers' : 'Main'),
      price: Number(itemData.price || 0),
      image: resolveDishCutout(itemData.imageUrl || itemData.image, itemData.name, itemData.category),
      tag: itemData.tag || (isCombo ? 'Combo Savings' : 'Popular Choice'),
      kcal: itemData.kcal || nutritionObj.kcal || '250 kcal',
      nutrition: nutritionObj,
      is_available: itemData.isAvailable ?? itemData.is_available ?? true
    };

    // Update in-memory & local caches immediately
    const shopKey = payload.shop_id;
    const currentShopMenus = getCachedItem('menus', shopKey) || [];
    const normalizedItem = {
      id: itemId,
      shopId: payload.shop_id,
      name: payload.name,
      subtitle: payload.subtitle,
      description: payload.description,
      category: payload.category,
      price: payload.price,
      originalPrice: Number(itemData.originalPrice || itemData.original_price || payload.price),
      discountPercent: Number(itemData.discountPercent || itemData.discount_percent || 0),
      isCombo,
      comboItems: itemData.comboItems || itemData.combo_items || [],
      image: payload.image,
      tag: payload.tag,
      kcal: payload.kcal,
      nutrition: nutritionObj,
      isAvailable: payload.is_available
    };

    setCachedItem('menus', shopKey, [normalizedItem, ...currentShopMenus.filter(m => m.id !== itemId)]);
    invalidateCache('menus');
    dispatchSafeEvent('foody_menus_changed', { shopId: shopKey, item: normalizedItem });

    if (!isTableMissing('foody_menus')) {
      const { data, error } = await supabase
        .from('foody_menus')
        .upsert([payload])
        .select()
        .single();

      if (error) {
        console.warn('createCloudMenuItem Supabase note:', error.message);
        if (isTableError(error)) markTableMissing('foody_menus');
        return normalizedItem;
      }
      return { ...normalizedItem, ...data };
    }
    return normalizedItem;
  } catch (err) {
    console.error('createCloudMenuItem exception:', err);
    return { id: itemData.id || `menu-${Date.now()}`, ...itemData };
  }
}

export async function updateCloudMenuItem(itemId, itemData) {
  try {
    const payload = {};
    if (itemData.shopId !== undefined || itemData.shop_id !== undefined) {
      payload.shop_id = itemData.shopId || itemData.shop_id;
    }
    if (itemData.name !== undefined) payload.name = itemData.name;
    if (itemData.subtitle !== undefined) payload.subtitle = itemData.subtitle;
    if (itemData.description !== undefined) payload.description = itemData.description;
    if (itemData.category !== undefined) payload.category = itemData.category;
    if (itemData.price !== undefined) payload.price = Number(itemData.price);
    if (itemData.imageUrl !== undefined || itemData.image !== undefined) {
      payload.image = resolveDishCutout(itemData.imageUrl || itemData.image, itemData.name, itemData.category);
    }
    if (itemData.tag !== undefined) payload.tag = itemData.tag;
    if (itemData.kcal !== undefined) payload.kcal = itemData.kcal;

    if (
      itemData.nutrition !== undefined ||
      itemData.originalPrice !== undefined ||
      itemData.original_price !== undefined ||
      itemData.discountPercent !== undefined ||
      itemData.discount_percent !== undefined ||
      itemData.comboItems !== undefined ||
      itemData.combo_items !== undefined
    ) {
      const nutritionObj = typeof itemData.nutrition === 'object' && itemData.nutrition !== null
        ? { ...itemData.nutrition }
        : { kcal: itemData.kcal || '250 kcal' };

      if (itemData.originalPrice !== undefined || itemData.original_price !== undefined) {
        nutritionObj.originalPrice = Number(itemData.originalPrice ?? itemData.original_price);
      }
      if (itemData.discountPercent !== undefined || itemData.discount_percent !== undefined) {
        nutritionObj.discountPercent = Number(itemData.discountPercent ?? itemData.discount_percent);
      }
      if (itemData.comboItems !== undefined || itemData.combo_items !== undefined) {
        nutritionObj.comboItems = itemData.comboItems ?? itemData.combo_items;
      }
      payload.nutrition = nutritionObj;
    }

    if (itemData.isAvailable !== undefined || itemData.is_available !== undefined) {
      payload.is_available = itemData.isAvailable ?? itemData.is_available;
    }

    const clientPayload = {
      ...payload,
      ...(payload.is_available !== undefined ? { isAvailable: payload.is_available } : {})
    };

    // Update in-memory & localStorage caches across all shop buckets
    if (payload.shop_id) {
      Object.keys(memoryCache.menus).forEach(key => {
        if (Array.isArray(memoryCache.menus[key]?.data)) {
          if (key === payload.shop_id || key === 'all') {
            const existing = memoryCache.menus[key].data.find(m => m.id === itemId);
            if (existing) {
              memoryCache.menus[key].data = memoryCache.menus[key].data.map(m => m.id === itemId ? { ...m, ...clientPayload, shopId: payload.shop_id, image: payload.image || m.image } : m);
            } else {
              memoryCache.menus[key].data = [{ id: itemId, ...clientPayload, shopId: payload.shop_id }, ...memoryCache.menus[key].data];
            }
          } else {
            memoryCache.menus[key].data = memoryCache.menus[key].data.filter(m => m.id !== itemId);
          }
        }
      });
    } else {
      Object.keys(memoryCache.menus).forEach(key => {
        if (Array.isArray(memoryCache.menus[key]?.data)) {
          memoryCache.menus[key].data = memoryCache.menus[key].data.map(m => m.id === itemId ? { ...m, ...clientPayload, image: payload.image || m.image } : m);
        }
      });
    }

    invalidateCache('menus');
    dispatchSafeEvent('foody_menus_changed', { itemId, updates: clientPayload, item: { id: itemId, ...clientPayload } });

    if (!isTableMissing('foody_menus')) {
      const { data, error } = await supabase
        .from('foody_menus')
        .update(payload)
        .eq('id', itemId)
        .select();

      if (error) {
        if (error.code === '42703' || error.message?.includes('updated_at')) {
          // Schema trigger mismatch fallback (re-insert with merged values)
          try {
            const { data: existingData } = await supabase.from('foody_menus').select('*').eq('id', itemId).maybeSingle();
            const merged = { ...(existingData || {}), ...payload, id: itemId };
            await supabase.from('foody_menus').delete().eq('id', itemId);
            const { data: insData, error: insErr } = await supabase.from('foody_menus').insert([merged]).select();
            if (!insErr && insData) return insData;
          } catch (e) {
            console.warn('updateCloudMenuItem fallback notice:', e);
          }
        }
        console.warn('updateCloudMenuItem Supabase note:', error.message);
        if (isTableError(error)) markTableMissing('foody_menus');
      }
      return data;
    }
    return null;
  } catch (err) {
    console.error('updateCloudMenuItem exception:', err);
    return null;
  }
}

export async function deleteCloudMenuItem(itemId, shopId = null) {
  try {
    // 1. Instantly purge item from all in-memory menus
    Object.keys(memoryCache.menus).forEach(key => {
      if (Array.isArray(memoryCache.menus[key]?.data)) {
        memoryCache.menus[key].data = memoryCache.menus[key].data.filter(m => m.id !== itemId);
      }
    });

    // 2. Instantly purge item from all localStorage menu caches
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith('foody_cache_menu_') || k.startsWith('foody_customer_menu_v3_'))) {
            try {
              const raw = window.localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  window.localStorage.setItem(k, JSON.stringify(parsed.filter(m => m.id !== itemId)));
                } else if (parsed && Array.isArray(parsed.data)) {
                  parsed.data = parsed.data.filter(m => m.id !== itemId);
                  window.localStorage.setItem(k, JSON.stringify(parsed));
                }
              }
            } catch (e) { }
          }
        }
      }
    } catch (e) { }

    invalidateCache('menus', shopId);
    dispatchSafeEvent('foody_menus_changed', {
      itemId,
      deleted: true,
      eventType: 'DELETE',
      item: { id: itemId }
    });

    if (!isTableMissing('foody_menus')) {
      const { error } = await supabase
        .from('foody_menus')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.warn('deleteCloudMenuItem error:', error.message);
        if (isTableError(error)) markTableMissing('foody_menus');
      }
      return !error;
    }
    return true;
  } catch (err) {
    console.error('deleteCloudMenuItem exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// DEFAULT OFFERS & OFFERS CRUD
// -------------------------------------------------------------

export const DEFAULT_OFFERS = [
  {
    id: 'offer-radhe-108',
    code: 'RADHE108',
    title: 'Divine First Order Blessings',
    subtitle: 'Flat ₹108 off on pure satvik orders above ₹499',
    discountType: 'flat',
    discountValue: 108,
    minOrderAmount: 499,
    maxDiscount: 108,
    shopId: 'all',
    isActive: true,
    tag: 'Popular Devotee Offer',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-vrinda-20',
    code: 'VRINDA20',
    title: 'Vedic Feast 20% Discount',
    subtitle: 'Get 20% off up to ₹150 on sacred prasad meals',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 299,
    maxDiscount: 150,
    shopId: 'all',
    isActive: true,
    tag: 'Best Value',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-freeship',
    code: 'FREESHIP',
    title: 'Zero Delivery Sarathi Fee',
    subtitle: 'Free doorstep delivery anywhere across Vrindavan Dham',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 50,
    shopId: 'all',
    isActive: true,
    tag: 'Free Delivery',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  }
];

export function getCachedOffers() {
  try {
    const raw = safeStorage.getItem('foody_cached_offers');
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { }
  return [];
}

export function saveCachedOffers(offersList) {
  const safeList = Array.isArray(offersList) ? offersList : [];
  try {
    safeStorage.setItem('foody_cached_offers', JSON.stringify(safeList));
  } catch (e) { }
  return safeList;
}

export async function getCloudOffers(forceRefresh = false) {
  if (isTableMissing('foody_offers')) return getCachedOffers();

  try {
    const { data, error } = await supabase
      .from('foody_offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isTableError(error)) {
        markTableMissing('foody_offers');
      }
      return getCachedOffers();
    }

    const mapped = Array.isArray(data) ? data.map(d => ({
      id: d.id,
      code: d.code || '',
      title: d.title || '',
      subtitle: d.subtitle || '',
      discountType: d.discount_type || d.discountType || 'flat',
      discountValue: Number(d.discount_value || d.discountValue || 0),
      minOrderAmount: Number(d.min_order_amount || d.minOrderAmount || 0),
      maxDiscount: Number(d.max_discount || d.maxDiscount || 0),
      shopId: d.shop_id || d.shopId || 'all',
      isActive: d.is_active ?? d.isActive ?? true,
      tag: d.tag || '',
      validUntil: d.valid_until || d.validUntil || '2028-12-31T23:59:59.000Z',
      createdAt: d.created_at || new Date().toISOString()
    })) : [];

    saveCachedOffers(mapped);
    return mapped;
  } catch (err) {
    console.warn('getCloudOffers exception:', err);
  }
  return getCachedOffers();
}

export async function createCloudOffer(offerData) {
  const nowIso = new Date().toISOString();
  const offerId = offerData.id || `offer-${(offerData.code || Date.now()).toString().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const newOffer = {
    id: offerId,
    code: (offerData.code || '').trim().toUpperCase(),
    title: offerData.title || 'Special Promotion',
    subtitle: offerData.subtitle || '',
    discountType: offerData.discountType || 'flat',
    discountValue: Number(offerData.discountValue || 0),
    minOrderAmount: Number(offerData.minOrderAmount || 0),
    maxDiscount: Number(offerData.maxDiscount || offerData.discountValue || 0),
    shopId: offerData.shopId || 'all',
    isActive: offerData.isActive ?? true,
    tag: offerData.tag || 'Special Offer',
    validUntil: offerData.validUntil || '2028-12-31T23:59:59.000Z',
    createdAt: nowIso
  };

  const current = getCachedOffers();
  const nextList = [newOffer, ...current.filter(o => o.id !== offerId)];
  saveCachedOffers(nextList);
  dispatchSafeEvent('foody_offers_changed', { offers: nextList });

  if (!isTableMissing('foody_offers')) {
    try {
      const payload = {
        id: newOffer.id,
        code: newOffer.code,
        title: newOffer.title,
        subtitle: newOffer.subtitle,
        discount_type: newOffer.discountType,
        discount_value: newOffer.discountValue,
        min_order_amount: newOffer.minOrderAmount,
        max_discount: newOffer.maxDiscount,
        shop_id: newOffer.shopId,
        is_active: newOffer.isActive,
        tag: newOffer.tag,
        valid_until: newOffer.validUntil,
        created_at: newOffer.createdAt
      };
      const { error } = await supabase.from('foody_offers').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('createCloudOffer error:', error.message);
    } catch (e) { }
  }

  return newOffer;
}

export async function updateCloudOffer(offerId, updates) {
  const current = getCachedOffers();
  let updatedOffer = null;
  const nextList = current.map(o => {
    if (o.id === offerId) {
      updatedOffer = { ...o, ...updates };
      return updatedOffer;
    }
    return o;
  });

  if (!updatedOffer) return null;
  saveCachedOffers(nextList);
  dispatchSafeEvent('foody_offers_changed', { offers: nextList });

  if (!isTableMissing('foody_offers')) {
    try {
      const payload = {};
      if (updates.code !== undefined) payload.code = updates.code;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
      if (updates.discountType !== undefined) payload.discount_type = updates.discountType;
      if (updates.discountValue !== undefined) payload.discount_value = updates.discountValue;
      if (updates.minOrderAmount !== undefined) payload.min_order_amount = updates.minOrderAmount;
      if (updates.maxDiscount !== undefined) payload.max_discount = updates.maxDiscount;
      if (updates.shopId !== undefined) payload.shop_id = updates.shopId;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.tag !== undefined) payload.tag = updates.tag;
      if (updates.validUntil !== undefined) payload.valid_until = updates.validUntil;

      const { error } = await supabase.from('foody_offers').update(payload).eq('id', offerId);
      if (error) console.warn('updateCloudOffer error:', error.message);
    } catch (e) { }
  }

  return updatedOffer;
}

export async function deleteCloudOffer(offerId) {
  const current = getCachedOffers();
  const nextList = current.filter(o => o.id !== offerId);
  saveCachedOffers(nextList);
  dispatchSafeEvent('foody_offers_changed', { offers: nextList });

  if (!isTableMissing('foody_offers')) {
    try {
      const { error } = await supabase.from('foody_offers').delete().eq('id', offerId);
      if (error) console.warn('deleteCloudOffer error:', error.message);
    } catch (e) { }
  }

  return true;
}

// -------------------------------------------------------------
// PRESET DISHES CLOUD APIS (SWR + DATABASE PARITY)
// -------------------------------------------------------------

export function getCachedPresets() {
  try {
    if (memoryCache.presets?.data && Array.isArray(memoryCache.presets.data) && memoryCache.presets.data.length > 0) {
      return memoryCache.presets.data;
    }
    const raw = safeStorage.getItem('foody_cached_presets') || safeStorage.getItem('foody_cache_presets');
    if (raw) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : (parsed.data || []);
      if (Array.isArray(list) && list.length > 0) {
        memoryCache.presets.data = list;
        return list;
      }
    }
  } catch (e) { }
  return [];
}

export function saveCachedPresets(presets) {
  const safeList = Array.isArray(presets) ? presets : [];
  memoryCache.presets = { data: safeList, timestamp: Date.now() };
  try {
    safeStorage.setItem('foody_cached_presets', JSON.stringify(safeList));
    safeStorage.setItem('foody_cache_presets', JSON.stringify({ data: safeList, timestamp: Date.now() }));
  } catch (e) { }
  return safeList;
}

export async function getCloudPresets(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memoryCache.presets?.data && Array.isArray(memoryCache.presets.data) && memoryCache.presets.data.length > 0 && (now - (memoryCache.presets.timestamp || 0) < CACHE_TTL_MS.PRESETS)) {
    return memoryCache.presets.data;
  }

  const cached = getCachedPresets();
  if (isTableMissing('foody_presets')) return cached;

  try {
    const { data, error } = await supabase
      .from('foody_presets')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (isTableError(error)) {
        markTableMissing('foody_presets');
      }
      return cached;
    }

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category || 'Main',
        basePrice: Number(d.base_price || d.basePrice || 100),
        description: d.description || '',
        imageUrl: d.image_url || d.imageUrl || '',
        isAvailable: d.is_available ?? d.isAvailable ?? true,
        isCustom: d.is_custom ?? d.isCustom ?? false,
        sortOrder: Number(d.sort_order || d.sortOrder || 999),
        tags: Array.isArray(d.tags) ? d.tags : [],
        createdAt: d.created_at || new Date().toISOString()
      }));

      saveCachedPresets(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('getCloudPresets exception:', err);
  }

  return cached;
}

export async function createCloudPreset(presetData) {
  const nowIso = new Date().toISOString();
  const presetId = presetData.id || `preset-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const newPreset = {
    id: presetId,
    name: presetData.name,
    category: presetData.category || 'Main',
    basePrice: Number(presetData.basePrice || 100),
    description: presetData.description || '',
    imageUrl: presetData.imageUrl || '',
    isAvailable: presetData.isAvailable ?? true,
    isCustom: presetData.isCustom ?? true,
    sortOrder: Number(presetData.sortOrder || 999),
    tags: Array.isArray(presetData.tags) ? presetData.tags : [],
    createdAt: nowIso
  };

  const current = getCachedPresets();
  const nextList = [newPreset, ...current.filter(p => p.id !== presetId)];
  saveCachedPresets(nextList);
  dispatchSafeEvent('foody_presets_changed', { presets: nextList });

  if (!isTableMissing('foody_presets')) {
    try {
      const payload = {
        id: newPreset.id,
        name: newPreset.name,
        category: newPreset.category,
        base_price: newPreset.basePrice,
        description: newPreset.description,
        image_url: newPreset.imageUrl,
        is_available: newPreset.isAvailable,
        is_custom: newPreset.isCustom,
        sort_order: newPreset.sortOrder,
        tags: newPreset.tags,
        created_at: newPreset.createdAt
      };
      const { error } = await supabase.from('foody_presets').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('createCloudPreset error:', error.message);
    } catch (e) { }
  }

  return newPreset;
}

export async function updateCloudPreset(presetId, updates) {
  const current = getCachedPresets();
  let updatedPreset = null;
  const nextList = current.map(p => {
    if (p.id === presetId) {
      updatedPreset = { ...p, ...updates };
      return updatedPreset;
    }
    return p;
  });

  if (!updatedPreset) return null;
  saveCachedPresets(nextList);
  dispatchSafeEvent('foody_presets_changed', { presets: nextList });

  if (!isTableMissing('foody_presets')) {
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;
      if (updates.isCustom !== undefined) payload.is_custom = updates.isCustom;
      if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
      if (updates.tags !== undefined) payload.tags = updates.tags;

      const { error } = await supabase.from('foody_presets').update(payload).eq('id', presetId);
      if (error) console.warn('updateCloudPreset error:', error.message);
    } catch (e) { }
  }

  return updatedPreset;
}

export async function deleteCloudPreset(presetId) {
  const current = getCachedPresets();
  const nextList = current.filter(p => p.id !== presetId);
  saveCachedPresets(nextList);
  dispatchSafeEvent('foody_presets_changed', { presets: nextList });

  if (!isTableMissing('foody_presets')) {
    try {
      const { error } = await supabase.from('foody_presets').delete().eq('id', presetId);
      if (error) console.warn('deleteCloudPreset error:', error.message);
    } catch (e) { }
  }

  return true;
}

export function subscribeCloudPresets(callback) {
  if (typeof window === 'undefined') return () => { };
  const handler = (e) => {
    if (typeof callback === 'function') {
      callback(e?.detail?.presets || getCachedPresets(), e?.detail);
    }
  };
  window.addEventListener('foody_presets_changed', handler);
  return () => window.removeEventListener('foody_presets_changed', handler);
}
