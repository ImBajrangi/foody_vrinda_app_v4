import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCachedShops, getCloudShops } from '../supabase';

const CartContext = createContext(null);

/**
 * Evaluates payment settings directly from Supabase Database Shops
 * Zero hardcoding — strictly derived from active shop rows in the DB.
 */
function derivePaymentSettingsFromDatabaseShops(shops) {
  if (!Array.isArray(shops) || shops.length === 0) return null;

  // 1. Inspect any shop that holds the platform master payment descriptor in Supabase
  for (const s of shops) {
    const ps = s.payment_settings || s.paymentSettings || {};
    if (ps.globalOnlinePaymentsEnabled !== undefined) {
      return {
        onlinePaymentsEnabled: Boolean(ps.globalOnlinePaymentsEnabled),
        codEnabled: ps.globalCodEnabled !== undefined ? Boolean(ps.globalCodEnabled) : true
      };
    }
    if (ps.global_payment_config?.onlinePaymentsEnabled !== undefined) {
      return {
        onlinePaymentsEnabled: Boolean(ps.global_payment_config.onlinePaymentsEnabled),
        codEnabled: ps.global_payment_config?.codEnabled !== undefined ? Boolean(ps.global_payment_config.codEnabled) : true
      };
    }
  }

  // 2. Derive directly from active shops in database:
  const activeShops = shops.filter(s => s.is_active !== false && !s.is_deleted);
  if (activeShops.length === 0) return null;

  const anyShopHasOnline = activeShops.some(s => {
    const ps = s.payment_settings || s.paymentSettings || {};
    return (ps.onlinePaymentsEnabled ?? s.onlinePaymentsEnabled ?? s.online_payments_enabled) === true;
  });

  const anyShopHasCod = activeShops.some(s => {
    const ps = s.payment_settings || s.paymentSettings || {};
    const val = ps.codEnabled ?? s.codEnabled ?? s.cod_enabled;
    return val === undefined ? true : Boolean(val);
  });

  return {
    onlinePaymentsEnabled: anyShopHasOnline,
    codEnabled: anyShopHasCod
  };
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedShopId, setSelectedShopId] = useState(() => {
    try {
      return localStorage.getItem('foody_cart_shop_id') || null;
    } catch (e) {
      return null;
    }
  });

  // Sync cart & shop ID to localStorage to prevent refresh wipe
  useEffect(() => {
    try {
      localStorage.setItem('foody_user_cart', JSON.stringify(cart));
      if (selectedShopId) {
        localStorage.setItem('foody_cart_shop_id', selectedShopId);
      } else {
        localStorage.removeItem('foody_cart_shop_id');
      }
    } catch (e) { }
  }, [cart, selectedShopId]);

  const [paymentSettings, setPaymentSettings] = useState(() => {
    // 1. Instant SWR: strictly compute from synchronous local database cached shops
    try {
      const cachedShops = getCachedShops();
      const dbSettings = derivePaymentSettingsFromDatabaseShops(cachedShops);
      if (dbSettings) return dbSettings;
    } catch (_) { }

    // 2. Check localStorage cache
    try {
      const saved = localStorage.getItem('foody_payment_config');
      if (saved) return JSON.parse(saved);
    } catch (e) { }

    // 3. Fallback initial state before cloud sync completes (online false, COD true)
    return { onlinePaymentsEnabled: false, codEnabled: true };
  });

  // Synchronize paymentSettings directly from Supabase Cloud shops (Single Source of Truth)
  const syncPaymentSettingsFromCloud = useCallback(async (providedShops = null) => {
    try {
      let shops = providedShops;
      if (!shops || !Array.isArray(shops) || shops.length === 0) {
        shops = getCachedShops();
      }
      if (!shops || shops.length === 0) {
        shops = await getCloudShops();
      }

      const nextConfig = derivePaymentSettingsFromDatabaseShops(shops);
      if (nextConfig) {
        setPaymentSettings(prev => {
          if (prev.onlinePaymentsEnabled === nextConfig.onlinePaymentsEnabled && prev.codEnabled === nextConfig.codEnabled) {
            return prev;
          }
          try {
            localStorage.setItem('foody_payment_config', JSON.stringify(nextConfig));
          } catch (_) { }
          return nextConfig;
        });
      }
    } catch (err) {
      console.warn('Payment settings cloud sync note:', err);
    }
  }, []);

  // Keep paymentSettings synchronized across windows, storage triggers, and real-time database updates
  useEffect(() => {
    // Initial Cloud Fetch
    syncPaymentSettingsFromCloud();

    const handleConfigChange = (e) => {
      if (e && e.type === 'storage' && e.key && e.key !== 'foody_payment_config') {
        return;
      }
      try {
        const saved = localStorage.getItem('foody_payment_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setPaymentSettings(prev => JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed);
        }
      } catch (e) { }
    };

    const handleShopsChanged = (e) => {
      const shops = e?.detail?.shops;
      syncPaymentSettingsFromCloud(shops);
    };

    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('foody_payment_config_changed', handleConfigChange);
    window.addEventListener('foody_shops_changed', handleShopsChanged);
    window.addEventListener('foody_realtime_reconnected', () => syncPaymentSettingsFromCloud());

    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('foody_payment_config_changed', handleConfigChange);
      window.removeEventListener('foody_shops_changed', handleShopsChanged);
      window.removeEventListener('foody_realtime_reconnected', () => syncPaymentSettingsFromCloud());
    };
  }, [syncPaymentSettingsFromCloud]);

  const updateGlobalPaymentConfig = useCallback((newConfig) => {
    setPaymentSettings(prev => {
      const updated = typeof newConfig === 'function' ? newConfig(prev) : { ...prev, ...newConfig };
      try {
        localStorage.setItem('foody_payment_config', JSON.stringify(updated));
        window.dispatchEvent(new Event('foody_payment_config_changed'));
      } catch (e) { }
      return updated;
    });
  }, []);

  // Helper to resolve specific shop payment options considering global master flags (Fail-Closed Architecture)
  const resolveShopPaymentOptions = useCallback((shop) => {
    // Fail-Closed: If payment settings cannot be loaded, do not assume open by default
    const globalOnline = paymentSettings ? paymentSettings.onlinePaymentsEnabled === true : false;
    const globalCod = paymentSettings ? (paymentSettings.codEnabled !== false) : true;

    const rawShopOnline = shop?.paymentSettings?.onlinePaymentsEnabled
      ?? shop?.payment_settings?.onlinePaymentsEnabled
      ?? shop?.onlinePaymentsEnabled
      ?? shop?.online_payments_enabled
      ?? false;

    const rawShopCod = shop?.paymentSettings?.codEnabled
      ?? shop?.payment_settings?.codEnabled
      ?? shop?.codEnabled
      ?? shop?.cod_enabled
      ?? true;

    const shopOnline = Boolean(rawShopOnline);
    const shopCod = rawShopCod !== false;

    const onlineAvailable = Boolean(globalOnline && shopOnline);
    const codAvailable = Boolean(globalCod && shopCod);

    return {
      onlineAvailable,
      codAvailable,
      globalOnline,
      globalCod,
      shopOnline,
      shopCod,
      reasonOnlineUnavailable: !globalOnline ? 'Platform Online Payments Temporarily Unavailable' : (!shopOnline ? 'Kitchen Online Pay Disabled' : null),
      reasonCodUnavailable: !globalCod ? 'Platform COD Temporarily Unavailable' : (!shopCod ? 'Kitchen COD Disabled' : null),
      shopName: shop?.name || 'Kitchen'
    };
  }, [paymentSettings]);

  const addToCart = useCallback((item, shopId) => {
    const targetShopId = shopId || item.shopId || selectedShopId || 'shop-vrinda-main';
    
    // Multi-Shop Cart: Allow adding items across multiple kitchens simultaneously with shop tagging
    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(i => i.id === item.id && (i.shopId === targetShopId || !i.shopId));
      if (existingIdx >= 0) {
        const next = [...prevCart];
        next[existingIdx] = { 
          ...next[existingIdx], 
          quantity: (next[existingIdx].quantity || 1) + 1,
          shopId: targetShopId
        };
        return next;
      }
      return [...prevCart, { ...item, quantity: 1, shopId: targetShopId }];
    });
  }, [selectedShopId]);

  const updateQuantity = useCallback((itemId, delta, shopId = null) => {
    setCart(prevCart => {
      const updated = prevCart.map(i => {
        const matches = shopId ? (i.id === itemId && i.shopId === shopId) : (i.id === itemId);
        if (matches) {
          const newQty = (i.quantity || 1) + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean);

      return updated;
    });
  }, []);

  const setExactQuantity = useCallback((itemId, exactQty, itemObj = null) => {
    setCart(prevCart => {
      const targetShopId = itemObj?.shopId || selectedShopId;
      if (exactQty <= 0) {
        return prevCart.filter(i => targetShopId ? !(i.id === itemId && i.shopId === targetShopId) : i.id !== itemId);
      }
      const existing = prevCart.find(i => targetShopId ? (i.id === itemId && i.shopId === targetShopId) : i.id === itemId);
      if (existing) {
        return prevCart.map(i => (targetShopId ? (i.id === itemId && i.shopId === targetShopId) : i.id === itemId) ? { ...i, quantity: exactQty } : i);
      }
      if (itemObj) {
        return [...prevCart, { ...itemObj, quantity: exactQty, shopId: targetShopId }];
      }
      return prevCart;
    });
  }, [selectedShopId]);

  const removeFromCart = useCallback((itemId, shopId = null) => {
    setCart(prevCart => {
      return prevCart.filter(i => shopId ? !(i.id === itemId && i.shopId === shopId) : i.id !== itemId);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Helper to load Razorpay checkout script dynamically
  const loadRazorpay = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const value = useMemo(() => ({
    cart,
    selectedShopId,
    setSelectedShopId,
    paymentSettings,
    updateGlobalPaymentConfig,
    resolveShopPaymentOptions,
    addToCart,
    updateQuantity,
    setExactQuantity,
    removeFromCart,
    clearCart,
    loadRazorpay
  }), [
    cart,
    selectedShopId,
    paymentSettings,
    updateGlobalPaymentConfig,
    resolveShopPaymentOptions,
    addToCart,
    updateQuantity,
    setExactQuantity,
    removeFromCart,
    clearCart,
    loadRazorpay
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

