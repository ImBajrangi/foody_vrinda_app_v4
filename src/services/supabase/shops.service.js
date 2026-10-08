import { supabase, isTableWriteForbidden } from './client.js';
import {
  memoryCache,
  pendingRequests,
  getDeletedShopIds,
  removeDeletedShopId,
  addDeletedShopId,
  normalizeShop,
  saveCachedShops,
  getCachedShops,
  getDefaultActiveShopId,
  dispatchSafeEvent
} from './cache.js';

// ========================================================================
// SHOPS CLOUD APIS (CACHE-FIRST WITH ZERO REDUNDANT EGRESS)
// ========================================================================

export async function getCloudShops() {
  if (memoryCache.shops?.data && Array.isArray(memoryCache.shops.data) && memoryCache.shops.data.length > 0) {
    return memoryCache.shops.data;
  }

  // Deduplicate concurrent in-flight calls
  if (pendingRequests.has('getCloudShops')) {
    return pendingRequests.get('getCloudShops');
  }

  const promise = (async () => {
    try {
      let res = await supabase.from('foody_shops').select('*').order('name');
      if (res.error || !res.data || res.data.length === 0) {
        res = await supabase.from('public_shop_catalog').select('*').order('name');
      }

      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        const deletedSet = getDeletedShopIds();
        const activeOnly = res.data.filter(d => d.is_active !== false && d.is_deleted !== true && !deletedSet.has(d.id));
        const normalized = activeOnly.map(d => normalizeShop(d));
        const finalShops = saveCachedShops(normalized);
        memoryCache.shops = { data: finalShops, timestamp: Date.now() };
        return finalShops;
      }
      const localCached = getCachedShops();
      memoryCache.shops = { data: localCached, timestamp: Date.now() };
      return localCached;
    } catch (err) {
      console.warn('Supabase getCloudShops notice:', err?.message);
      const localCached = getCachedShops();
      memoryCache.shops = { data: localCached, timestamp: Date.now() };
      return localCached;
    } finally {
      pendingRequests.delete('getCloudShops');
    }
  })();

  pendingRequests.set('getCloudShops', promise);
  return promise;
}

/**
 * Validates whether a kitchen is currently open based on operating schedule and manual online status
 */
export function checkShopOperatingStatus(shop) {
  if (!shop) return { isOpen: true, reason: 'ok' };

  // 1. Manual switch check
  if (shop.is_open === false || shop.isOpen === false || shop.is_online === false || shop.isOnline === false) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      message: 'Kitchen is currently taking a break'
    };
  }

  // 2. Schedule Operating Hours Check
  const openTime = shop.operating_hours?.openTime || shop.payment_settings?.openingTime || shop.openingTime || '08:00';
  const closeTime = shop.operating_hours?.closeTime || shop.payment_settings?.closingTime || shop.closingTime || '22:30';

  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = istFormatter.formatToParts(now);
  const curHour = parseInt(parts.find(p => p.type === 'hour')?.value || String(now.getHours()), 10);
  const curMin = parseInt(parts.find(p => p.type === 'minute')?.value || String(now.getMinutes()), 10);
  const curTotalMinutes = curHour * 60 + curMin;

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openTotalMinutes = (openH || 8) * 60 + (openM || 0);
  const closeTotalMinutes = (closeH || 22) * 60 + (closeM || 30);

  if (curTotalMinutes < openTotalMinutes || curTotalMinutes > closeTotalMinutes) {
    return {
      isOpen: false,
      reason: 'outside_hours',
      message: `Kitchen closed. Opens daily at ${openTime}`,
      openingTime: openTime,
      closingTime: closeTime
    };
  }

  return { isOpen: true, reason: 'ok', openingTime: openTime, closingTime: closeTime };
}

// -------------------------------------------------------------
// SHOPS & KITCHENS CRUD
// -------------------------------------------------------------

export async function createCloudShop(shopData) {
  const shopId = shopData.id || `shop-vrinda-${Date.now().toString(36)}`;
  removeDeletedShopId(shopId);
  const onlinePayments = shopData.paymentSettings?.onlinePaymentsEnabled ?? shopData.onlinePaymentsEnabled ?? true;
  const cod = shopData.paymentSettings?.codEnabled ?? shopData.codEnabled ?? true;

  const normalized = normalizeShop({
    id: shopId,
    name: shopData.name || 'New Vrinda Kitchen',
    address: shopData.address || 'Vrindavan Dham',
    phone: shopData.phone || '+91 9876543210',
    coordinates: shopData.coordinates || { lat: 27.5706, lng: 77.6593 },
    isOpen: shopData.isOpen ?? true,
    minimumOrderAmount: Number(shopData.minimumOrderAmount || 0),
    deliveryCharge: Number(shopData.deliveryCharge || 0),
    gstPercentage: Number(shopData.gstPercentage || 5),
    paymentSettings: { onlinePaymentsEnabled: onlinePayments, codEnabled: cod },
    onlinePaymentsEnabled: onlinePayments,
    codEnabled: cod,
    alarmSettings: shopData.alarmSettings || { kitchenNew: true, kitchenReady: false, deliveryReady: true }
  });

  const current = getCachedShops();
  const nextList = [normalized, ...current.filter(s => s.id !== shopId)];
  saveCachedShops(nextList);
  memoryCache.shops = { data: nextList, timestamp: Date.now() };

  dispatchSafeEvent('foody_shops_changed', {
    shopId, shopData: normalized, shops: nextList
  });

  try {
    const payload = {
      id: normalized.id,
      name: normalized.name,
      address: normalized.address,
      phone: normalized.phone,
      coordinates: normalized.coordinates,
      is_open: normalized.isOpen,
      is_online: normalized.isOnline,
      shop_type: normalized.shopType,
      minimum_order_amount: normalized.minimumOrderAmount,
      delivery_charge: normalized.deliveryCharge,
      gst_percentage: normalized.gstPercentage,
      operating_hours: {
        openTime: normalized.openingTime,
        closeTime: normalized.closingTime,
        autoSchedule: true
      },
      payment_settings: {
        ...normalized.paymentSettings,
        shopType: normalized.shopType,
        openingTime: normalized.openingTime,
        closingTime: normalized.closingTime,
        isOnline: normalized.isOnline
      },
      alarm_settings: normalized.alarmSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('foody_shops').upsert(payload, { onConflict: 'id' });
    if (error) console.warn("createCloudShop cloud error:", error.message);
  } catch (e) {
    console.warn("createCloudShop cloud notice:", e);
  }

  return normalized;
}

export async function updateCloudShop(shopId, shopData) {
  if (!shopId) return null;
  try {
    const currentList = getCachedShops();
    let updatedShop = null;
    let found = false;

    const nextList = currentList.map(s => {
      if (s.id === shopId) {
        found = true;
        const merged = { ...s, ...shopData };

        if (shopData.paymentSettings) {
          merged.paymentSettings = {
            onlinePaymentsEnabled: shopData.paymentSettings.onlinePaymentsEnabled !== undefined ? shopData.paymentSettings.onlinePaymentsEnabled : (s.paymentSettings?.onlinePaymentsEnabled ?? true),
            codEnabled: shopData.paymentSettings.codEnabled !== undefined ? shopData.paymentSettings.codEnabled : (s.paymentSettings?.codEnabled ?? true)
          };
          merged.onlinePaymentsEnabled = merged.paymentSettings.onlinePaymentsEnabled;
          merged.codEnabled = merged.paymentSettings.codEnabled;
        } else if (shopData.onlinePaymentsEnabled !== undefined || shopData.codEnabled !== undefined) {
          merged.paymentSettings = {
            onlinePaymentsEnabled: shopData.onlinePaymentsEnabled !== undefined ? shopData.onlinePaymentsEnabled : (s.onlinePaymentsEnabled ?? true),
            codEnabled: shopData.codEnabled !== undefined ? shopData.codEnabled : (s.codEnabled ?? true)
          };
          merged.onlinePaymentsEnabled = merged.paymentSettings.onlinePaymentsEnabled;
          merged.codEnabled = merged.paymentSettings.codEnabled;
        }

        updatedShop = normalizeShop(merged);
        return updatedShop;
      }
      return normalizeShop(s);
    });

    if (!found) {
      updatedShop = normalizeShop({ id: shopId, ...shopData });
      nextList.push(updatedShop);
    }

    const saved = saveCachedShops(nextList);
    memoryCache.shops = { data: saved, timestamp: Date.now() };

    dispatchSafeEvent('foody_shops_changed', {
      shopId, shopData: updatedShop, shops: saved
    });

    try {
      const fullShopPayload = {
        id: updatedShop.id,
        name: updatedShop.name,
        address: updatedShop.address,
        phone: updatedShop.phone,
        coordinates: updatedShop.coordinates,
        is_open: updatedShop.isOpen,
        is_online: updatedShop.isOnline,
        shop_type: updatedShop.shopType,
        minimum_order_amount: updatedShop.minimumOrderAmount,
        delivery_charge: updatedShop.deliveryCharge,
        gst_percentage: updatedShop.gstPercentage,
        operating_hours: {
          openTime: updatedShop.openingTime,
          closeTime: updatedShop.closingTime,
          autoSchedule: true
        },
        payment_settings: {
          onlinePaymentsEnabled: updatedShop.onlinePaymentsEnabled,
          codEnabled: updatedShop.codEnabled,
          shopType: updatedShop.shopType,
          openingTime: updatedShop.openingTime,
          closingTime: updatedShop.closingTime,
          isOnline: updatedShop.isOnline
        },
        alarm_settings: updatedShop.alarmSettings,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('foody_shops')
        .upsert(fullShopPayload, { onConflict: 'id' });

      if (error) {
        console.warn("Supabase shop update note:", error.message);
      }
    } catch (sbErr) {
      console.warn("Supabase shop update note:", sbErr?.message);
    }

    return updatedShop;
  } catch (err) {
    console.warn('updateCloudShop exception:', err.message);
    return null;
  }
}

export async function deleteCloudShop(shopId) {
  if (!shopId) return false;
  addDeletedShopId(shopId);

  const current = getCachedShops();
  const nextList = current.filter(s => s.id !== shopId);
  saveCachedShops(nextList);
  memoryCache.shops = { data: nextList, timestamp: Date.now() };

  dispatchSafeEvent('foody_shops_changed', {
    shopId, deleted: true, shops: nextList
  });

  try {
    // 1. Reassign menu foreign keys if needed
    const fallbackShop = getDefaultActiveShopId();
    try {
      if (!isTableWriteForbidden('foody_menus') && fallbackShop) await supabase.from('foody_menus').update({ shop_id: fallbackShop }).eq('shop_id', shopId);
    } catch (e) { }

    try {
      if (!isTableWriteForbidden('foody_logged_users') && fallbackShop) await supabase.from('foody_logged_users').update({ shop_id: fallbackShop }).eq('shop_id', shopId);
    } catch (e) { }

    try {
      if (!isTableWriteForbidden('foody_users') && fallbackShop) await supabase.from('foody_users').update({ shop_id: fallbackShop }).eq('shop_id', shopId);
    } catch (e) { }

    // 2. Perform shop deletion / soft-delete (orders retain immutable historical shop reference)
    try {
      const { error } = await supabase.from('foody_shops').delete().eq('id', shopId);
      if (error) {
        // Fallback: Soft-delete in foody_shops
        await supabase.from('foody_shops').update({ is_active: false, is_deleted: true, is_online: false }).eq('id', shopId);
      }
    } catch (e) {
      try {
        await supabase.from('foody_shops').update({ is_active: false, is_deleted: true, is_online: false }).eq('id', shopId);
      } catch (err) { }
    }
  } catch (e) {
    console.warn("deleteCloudShop notice:", e);
  }

  return true;
}
