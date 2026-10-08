import { supabase, resolveDishCutout } from './client.js';
import {
  getCachedItem,
  setCachedItem,
  invalidateCache,
  dispatchSafeEvent,
  normalizeShop,
  getDeletedShopIds,
  getCachedShops,
  saveCachedShops,
  getDefaultActiveShopId
} from './cache.js';
import {
  getCachedOffers,
  saveCachedOffers,
  getCachedPresets
} from './menus.service.js';

export class RealtimeMultiplexer {
  constructor() {
    this.channel = null;
    this.orderListeners = new Set();
    this.singleOrderListeners = new Map(); // [orderId]: Set of callbacks
    this.notificationListeners = new Set();
    this.userListeners = new Set();
    this.menuListeners = new Set();
    this.shopListeners = new Set();
    this.offerListeners = new Set();
    this.isSubscribed = false;
    this.userDebounceTimer = null;
    this.pendingUserChanges = [];
  }

  ensureSubscribed() {
    if (this.isSubscribed || this.channel) return;

    // Reuse existing channel if already registered on Supabase client
    try {
      const existingChannels = typeof supabase.getChannels === 'function' ? supabase.getChannels() : [];
      const existing = existingChannels.find(c => c && (c.topic === 'realtime:foody-global-multiplex' || c.topic === 'foody-global-multiplex'));
      if (existing) {
        this.channel = existing;
        if (existing.state === 'joined') {
          this.isSubscribed = true;
        }
        return;
      }
    } catch (e) { }

    try {
      this.channel = supabase
        .channel('foody-global-multiplex')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_orders' },
          (payload) => {
            const raw = payload.new || payload.old;
            if (!raw) return;

            const normalized = {
              id: raw.id,
              ...raw,
              shopId: raw.shop_id,
              customerName: raw.customer_name,
              customerPhone: raw.customer_phone,
              customerAddress: raw.customer_address,
              deliveryAddress: raw.delivery_address,
              deliveryCoordinates: raw.delivery_coordinates,
              totalAmount: raw.total_amount,
              paymentMethod: raw.payment_method,
              cashStatus: raw.cash_status,
              cookingNotes: raw.cooking_notes,
              riderId: raw.rider_id,
              riderName: raw.rider_name,
              riderPhone: raw.rider_phone,
              createdAt: raw.created_at
            };

            // Synchronize memory and local caches strictly scoped to raw.shop_id
            try {
              if (raw.shop_id) {
                const k = raw.shop_id;
                const currentList = getCachedItem('orders', k) || [];
                if (payload.eventType === 'DELETE') {
                  setCachedItem('orders', k, currentList.filter(o => o.id !== raw.id));
                } else {
                  const idx = currentList.findIndex(o => o.id === raw.id);
                  if (idx >= 0) {
                    const copy = [...currentList];
                    copy[idx] = { ...copy[idx], ...normalized };
                    setCachedItem('orders', k, copy);
                  } else {
                    setCachedItem('orders', k, [normalized, ...currentList]);
                  }
                }
              }
            } catch (e) { }

            // Broadcast strictly to desk listeners matching this exact shop_id
            this.orderListeners.forEach(listener => {
              try {
                if (listener.shopId && raw.shop_id && listener.shopId === raw.shop_id) {
                  listener.callback(normalized, payload.eventType);
                }
              } catch (e) {
                console.error('Order listener error:', e);
              }
            });

            // Broadcast to customer single-order listeners
            const singleListeners = this.singleOrderListeners.get(raw.id);
            if (singleListeners) {
              singleListeners.forEach(cb => {
                try {
                  cb(normalized);
                } catch (e) { }
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'foody_notifications' },
          (payload) => {
            if (!payload.new) return;
            const notif = {
              id: payload.new.id,
              userId: payload.new.user_id,
              role: payload.new.role,
              shopId: payload.new.shop_id,
              orderId: payload.new.order_id,
              message: payload.new.message,
              read: payload.new.read,
              createdAt: payload.new.created_at
            };

            this.notificationListeners.forEach(listener => {
              try {
                if (!listener.userId || listener.userId === notif.userId) {
                  listener.callback(notif);
                }
              } catch (e) { }
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_logged_users' },
          (payload) => this.handleUserChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_users' },
          (payload) => this.handleUserChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_menus' },
          (payload) => this.handleMenuChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_shops' },
          (payload) => this.handleShopChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_offers' },
          (payload) => this.handleOfferChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_presets' },
          (payload) => this.handlePresetChangePayload(payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // On reconnect: invalidate stale cache and refetch authoritative data from DB
            if (this._wasDisconnected) {
              this._wasDisconnected = false;
              invalidateCache('orders');
              invalidateCache('menus');
              invalidateCache('shops');
              invalidateCache('users');
              invalidateCache('presets');
              // Dispatch event so UI components know to refetch
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('foody_realtime_reconnected'));
              }
            }
            this.isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this._wasDisconnected = true;
            this.isSubscribed = false;
            this.channel = null;
          }
        });
    } catch (err) {
      this.isSubscribed = false;
      this.channel = null;
    }
  }

  handleMenuChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const nut = typeof raw.nutrition === 'object' && raw.nutrition !== null ? raw.nutrition : {};
    const isCombo = Boolean(raw.is_combo || nut.isCombo || raw.category === 'Combo Offers');
    const normalized = {
      id: raw.id,
      shopId: raw.shop_id || getDefaultActiveShopId(),
      name: raw.name,
      subtitle: raw.subtitle || '',
      description: raw.description || '',
      category: raw.category || 'Main',
      price: Number(raw.price || 0),
      originalPrice: Number(raw.original_price || nut.originalPrice || raw.price || 0),
      discountPercent: Number(raw.discount_percent || nut.discountPercent || 0),
      isCombo,
      comboItems: raw.combo_items || nut.comboItems || [],
      image: resolveDishCutout(raw.image, raw.name, raw.category),
      tag: raw.tag,
      kcal: raw.kcal || nut.kcal || '250 kcal',
      nutrition: raw.nutrition || { carbs: '35g', fat: '12g', protein: '16g', kcal: '250 kcal' },
      isAvailable: raw.is_available ?? true
    };

    const shopKey = normalized.shopId;
    ['all', shopKey].filter(Boolean).forEach(k => {
      const currentList = getCachedItem('menus', k) || [];
      if (payload.eventType === 'DELETE') {
        setCachedItem('menus', k, currentList.filter(m => m.id !== raw.id));
      } else {
        const idx = currentList.findIndex(m => m.id === raw.id);
        if (idx >= 0) {
          const copy = [...currentList];
          copy[idx] = { ...copy[idx], ...normalized };
          setCachedItem('menus', k, copy);
        } else {
          setCachedItem('menus', k, [normalized, ...currentList]);
        }
      }
    });

    invalidateCache('menus');
    dispatchSafeEvent('foody_menus_changed', {
      shopId: shopKey, item: normalized, eventType: payload.eventType
    });

    this.menuListeners.forEach(cb => {
      try { cb(normalized, payload.eventType); } catch (e) { console.error('Menu listener error:', e); }
    });
  }

  handleShopChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const normalized = normalizeShop(raw);
    const deletedSet = getDeletedShopIds();
    const current = getCachedShops();
    let next;
    if (payload.eventType === 'DELETE' || raw.is_deleted === true || deletedSet.has(raw.id)) {
      next = current.filter(s => s.id !== raw.id);
    } else {
      const idx = current.findIndex(s => s.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = normalized;
      } else {
        next = [...current, normalized];
      }
    }

    saveCachedShops(next);
    memoryCache.shops = { data: next, timestamp: Date.now() };

    dispatchSafeEvent('foody_shops_changed', {
      shopId: raw.id, shopData: normalized, shops: next, eventType: payload.eventType
    });

    this.shopListeners.forEach(cb => {
      try { cb(next, normalized, payload.eventType); } catch (e) { console.error('Shop listener error:', e); }
    });
  }

  handleOfferChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const normalized = {
      id: raw.id,
      code: raw.code,
      title: raw.title,
      subtitle: raw.subtitle,
      discountType: raw.discount_type || raw.discountType || 'flat',
      discountValue: Number(raw.discount_value || raw.discountValue || 0),
      minOrderAmount: Number(raw.min_order_amount || raw.minOrderAmount || 0),
      maxDiscount: Number(raw.max_discount || raw.maxDiscount || 0),
      shopId: raw.shop_id || raw.shopId || 'all',
      isActive: raw.is_active ?? raw.isActive ?? true,
      tag: raw.tag || 'Special Offer',
      validUntil: raw.valid_until || raw.validUntil || '2028-12-31T23:59:59.000Z',
      createdAt: raw.created_at
    };

    const current = getCachedOffers();
    let next;
    if (payload.eventType === 'DELETE') {
      next = current.filter(o => o.id !== raw.id);
    } else {
      const idx = current.findIndex(o => o.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...current];
      }
    }

    saveCachedOffers(next);
    dispatchSafeEvent('foody_offers_changed', {
      offers: next, offer: normalized, eventType: payload.eventType
    });

    this.offerListeners.forEach(cb => {
      try { cb(normalized, next, payload.eventType); } catch (e) { console.error('Offer listener error:', e); }
    });
  }

  handlePresetChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    invalidateCache('presets');

    const normalized = {
      id: raw.id,
      name: raw.name || '',
      category: raw.category || 'Snacks',
      price: Number(raw.price || 0),
      originalPrice: raw.original_price ? Number(raw.original_price) : Number(raw.price || 0),
      description: raw.description || '',
      image: raw.image || '',
      cdnImage: raw.cdn_image || raw.image || '',
      tag: raw.tag || '',
      rating: Number(raw.rating || 4.9),
      calories: raw.calories || '250 kcal',
      nutrition: typeof raw.nutrition === 'object' ? raw.nutrition : { kcal: raw.calories || '250 kcal', carbs: '30g', protein: '10g', fat: '8g' },
      spicyLevel: raw.spicy_level || 'Mild',
      isVeg: raw.is_veg ?? true,
      isActive: raw.is_active ?? true,
      sortOrder: Number(raw.sort_order || 0)
    };

    const current = getCachedPresets();
    let next;
    if (payload.eventType === 'DELETE') {
      next = current.filter(p => p.id !== raw.id);
    } else {
      const idx = current.findIndex(p => p.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...current];
      }
    }

    saveCachedPresets(next);
    dispatchSafeEvent('foody_presets_changed', {
      presets: next, item: normalized, eventType: payload.eventType
    });
  }

  handleUserChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    // Architectural Rule: Realtime payloads must be partial and non-destructive.
    // Missing fields do NOT imply 'customer' role or 'User' displayName.
    const cleanId = raw.id ? String(raw.id).trim() : '';
    const rawName = (raw.display_name || raw.displayName || '').trim();
    const cleanDisplayName = (rawName && rawName !== 'User') ? rawName : undefined;
    const cleanRole = (raw.role && typeof raw.role === 'string' && raw.role.trim()) ? raw.role.trim() : undefined;
    const cleanEmail = raw.email ? String(raw.email).toLowerCase().trim() : undefined;
    const cleanPhone = raw.phone ? String(raw.phone).replace(/\D/g, '') : undefined;
    const cleanAvatar = raw.avatar_url || raw.avatarUrl || undefined;
    const cleanShopId = raw.shop_id || raw.shopId || undefined;
    const cleanShopIds = raw.shop_ids || raw.shopIds || undefined;
    const cleanPermissions = raw.dev_permissions || raw.devPermissions || undefined;

    const normalizedUpdates = {
      ...(cleanId ? { id: cleanId } : {}),
      ...(cleanDisplayName ? { displayName: cleanDisplayName } : {}),
      ...(cleanRole ? { role: cleanRole } : {}),
      ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
      ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
      ...(cleanAvatar !== undefined ? { avatarUrl: cleanAvatar } : {}),
      ...(cleanShopId !== undefined ? { shopId: cleanShopId } : {}),
      ...(cleanShopIds !== undefined ? { shopIds: cleanShopIds } : {}),
      ...(cleanPermissions !== undefined ? { devPermissions: cleanPermissions } : {}),
      ...(raw.last_login_at ? { lastLoginAt: raw.last_login_at } : {}),
      ...(raw.updated_at ? { updatedAt: raw.updated_at } : {})
    };

    // 1. In-memory & local cache sync with zero egress
    const current = getCachedUsers();
    let next;
    let mergedUserObj;
    if (payload.eventType === 'DELETE') {
      next = current.filter(u => u.id !== raw.id);
      mergedUserObj = { id: raw.id, ...normalizedUpdates };
    } else {
      const idx = current.findIndex(u =>
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      );

      if (idx >= 0) {
        const existing = current[idx];
        // Protect staff roles from silent downgrade via partial broadcasts
        const STAFF_ROLES = ['kitchen', 'delivery', 'owner', 'developer', 'grand_admin'];
        const existingIsStaff = STAFF_ROLES.includes(existing.role);
        const resolvedRole = (existingIsStaff && (!normalizedUpdates.role || normalizedUpdates.role === 'customer'))
          ? existing.role
          : (normalizedUpdates.role || existing.role || 'customer');

        mergedUserObj = {
          ...existing,
          ...normalizedUpdates,
          role: resolvedRole,
          displayName: normalizedUpdates.displayName || existing.displayName || (existing.email ? existing.email.split('@')[0] : 'Devotee')
        };
        next = [...current];
        next[idx] = mergedUserObj;
      } else {
        const fallbackName = cleanDisplayName || (cleanEmail ? cleanEmail.split('@')[0] : (cleanPhone ? `Member (${cleanPhone.slice(-4)})` : 'Devotee'));
        mergedUserObj = {
          id: cleanId,
          displayName: fallbackName,
          email: cleanEmail || '',
          phone: cleanPhone || '',
          avatarUrl: cleanAvatar || '',
          role: cleanRole || 'customer',
          shopId: cleanShopId || getDefaultActiveShopId(),
          shopIds: cleanShopIds || (cleanShopId ? [cleanShopId] : []),
          devPermissions: cleanPermissions || [],
          createdAt: raw.created_at || new Date().toISOString(),
          updatedAt: raw.updated_at || new Date().toISOString()
        };
        next = [mergedUserObj, ...current];
      }
    }

    saveCachedUsers(next);
    setCachedItem('users', 'all', next);

    // 2. Debounced notification dispatch to prevent React rendering storms
    clearTimeout(this.userDebounceTimer);
    this.userDebounceTimer = setTimeout(() => {
      dispatchSafeEvent('foody_users_changed', {
        users: next, updatedUser: mergedUserObj, eventType: payload.eventType
      });

      this.userListeners.forEach(listener => {
        try {
          listener(next, mergedUserObj, payload.eventType);
        } catch (e) {
          console.error('User listener error:', e);
        }
      });
    }, 150);
  }

  subscribeOrders(shopId, callback) {
    const clean = shopId && typeof shopId === 'string' ? shopId.trim().toLowerCase() : '';
    if (!shopId || typeof shopId !== 'string' || clean === '' || clean === 'all' || clean === '*' || clean.includes('all shop') || clean.includes('broadcast')) {
      console.warn('[SHOP ISOLATION] Refusing order subscription without a valid specific shopId:', shopId);
      return null;
    }
    const cleanShopId = shopId.trim();
    this.ensureSubscribed();
    const listenerObj = { shopId: cleanShopId, callback };
    this.orderListeners.add(listenerObj);

    return () => {
      this.orderListeners.delete(listenerObj);
    };
  }

  subscribeSingleOrder(orderId, callback) {
    if (!orderId) return () => { };
    this.ensureSubscribed();

    if (!this.singleOrderListeners.has(orderId)) {
      this.singleOrderListeners.set(orderId, new Set());
    }
    const set = this.singleOrderListeners.get(orderId);
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.singleOrderListeners.delete(orderId);
      }
    };
  }

  subscribeNotifications(userId, callback) {
    this.ensureSubscribed();
    const listenerObj = { userId, callback };
    this.notificationListeners.add(listenerObj);

    return () => {
      this.notificationListeners.delete(listenerObj);
    };
  }

  subscribeUsers(callback) {
    this.ensureSubscribed();
    this.userListeners.add(callback);

    return () => {
      this.userListeners.delete(callback);
    };
  }

  subscribeMenus(callback) {
    this.ensureSubscribed();
    this.menuListeners.add(callback);

    return () => {
      this.menuListeners.delete(callback);
    };
  }

  subscribeShops(callback) {
    this.ensureSubscribed();
    this.shopListeners.add(callback);

    return () => {
      this.shopListeners.delete(callback);
    };
  }

  subscribeOffers(callback) {
    this.ensureSubscribed();
    this.offerListeners.add(callback);

    return () => {
      this.offerListeners.delete(callback);
    };
  }
}

export const multiplexer = new RealtimeMultiplexer();

export function subscribeCloudOrders(shopId, onUpdate) {
  const clean = shopId && typeof shopId === 'string' ? shopId.trim().toLowerCase() : '';
  if (!shopId || typeof shopId !== 'string' || clean === '' || clean === 'all' || clean === '*' || clean.includes('all shop') || clean.includes('broadcast')) {
    console.warn('[SHOP ISOLATION] subscribeCloudOrders rejected: invalid shopId', shopId);
    return null;
  }
  return multiplexer.subscribeOrders(shopId, onUpdate);
}

export function subscribeSingleCloudOrder(orderId, onUpdate) {
  return multiplexer.subscribeSingleOrder(orderId, onUpdate);
}

export function subscribeCloudNotifications(userId, onNotification) {
  return multiplexer.subscribeNotifications(userId, onNotification);
}

export function subscribeCloudMenus(onUpdate) {
  return multiplexer.subscribeMenus(onUpdate);
}

export function subscribeCloudShops(onUpdate) {
  return multiplexer.subscribeShops(onUpdate);
}

export function subscribeCloudOffers(onUpdate) {
  return multiplexer.subscribeOffers(onUpdate);
}

// ==========================================