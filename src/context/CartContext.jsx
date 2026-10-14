import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCachedShops, getCloudShops } from '../supabase';

const CartContext = createContext(null);

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
    try {
      const saved = localStorage.getItem('foody_payment_config');
      if (saved) return JSON.parse(saved);
    } catch (e) { }

    // Instant SWR: check synchronous local cached shops for explicit global flags
    try {
      const cachedShops = getCachedShops();
      if (Array.isArray(cachedShops) && cachedShops.length > 0) {
        for (const s of cachedShops) {
          const ps = s.paymentSettings || s.payment_settings;
          if (ps?.globalOnlinePaymentsEnabled !== undefined) {
            return {
              onlinePaymentsEnabled: Boolean(ps.globalOnlinePaymentsEnabled),
              codEnabled: ps.globalCodEnabled !== undefined ? Boolean(ps.globalCodEnabled) : true
            };
          }
        }
      }
    } catch (_) { }

    return { onlinePaymentsEnabled: true, codEnabled: true };
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

      if (Array.isArray(shops) && shops.length > 0) {
        let masterOnline = null;
        let masterCod = null;

        // 1. Inspect any shop that holds the platform master payment descriptor
        for (const s of shops) {
          const ps = s.payment_settings || s.paymentSettings || {};
          if (ps.globalOnlinePaymentsEnabled !== undefined) {
            masterOnline = Boolean(ps.globalOnlinePaymentsEnabled);
          } else if (ps.global_payment_config?.onlinePaymentsEnabled !== undefined) {
            masterOnline = Boolean(ps.global_payment_config.onlinePaymentsEnabled);
          }
          if (ps.globalCodEnabled !== undefined) {
            masterCod = Boolean(ps.globalCodEnabled);
          } else if (ps.global_payment_config?.codEnabled !== undefined) {
            masterCod = Boolean(ps.global_payment_config.codEnabled);
          }
        }

        // 2. Fail-Safe: If no explicit platform master flag, check active kitchens.
        // If ALL active kitchens have online payments disabled in database, platform online payment is OFF
        const activeShops = shops.filter(s => s.is_active !== false && !s.is_deleted);
        if (masterOnline === null && activeShops.length > 0) {
          const anyShopHasOnline = activeShops.some(s => {
            const ps = s.payment_settings || s.paymentSettings || {};
            const val = ps.onlinePaymentsEnabled ?? s.onlinePaymentsEnabled ?? false;
            return val === true;
          });
          if (!anyShopHasOnline) {
            masterOnline = false;
          }
        }

        // 3. Fallback to localStorage if database did not specify master override
        const localSaved = (() => {
          try {
            const raw = localStorage.getItem('foody_payment_config');
            return raw ? JSON.parse(raw) : null;
          } catch (_) { return null; }
        })();

        const finalOnline = masterOnline !== null
          ? Boolean(masterOnline)
          : (localSaved?.onlinePaymentsEnabled !== undefined ? Boolean(localSaved.onlinePaymentsEnabled) : true);

        const finalCod = masterCod !== null
          ? Boolean(masterCod)
          : (localSaved?.codEnabled !== undefined ? Boolean(localSaved.codEnabled) : true);

        const nextConfig = {
          onlinePaymentsEnabled: finalOnline,
          codEnabled: finalCod
        };

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
    const globalCod = paymentSettings ? paymentSettings.codEnabled === true : false;

    const rawShopOnline = shop?.paymentSettings?.onlinePaymentsEnabled
      ?? shop?.payment_settings?.onlinePaymentsEnabled
      ?? shop?.onlinePaymentsEnabled
      ?? shop?.online_payments_enabled
      ?? false;

    const rawShopCod = shop?.paymentSettings?.codEnabled
      ?? shop?.payment_settings?.codEnabled
      ?? shop?.codEnabled
      ?? shop?.cod_enabled
      ?? false;

    const shopOnline = Boolean(rawShopOnline);
    const shopCod = Boolean(rawShopCod);

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
    const targetShopId = shopId || item.shopId || selectedShopId;
    
    // Check if user is attempting to add item from a different kitchen while having items in cart
    if (selectedShopId && targetShopId && selectedShopId !== targetShopId && cart.length > 0) {
      const confirmSwitch = typeof window !== 'undefined' ? window.confirm(
        'Your cart already contains sacred prasad from another kitchen.\n\nSwitching kitchens will clear your existing cart. Do you want to clear your cart and continue with this kitchen?'
      ) : true;

      if (!confirmSwitch) {
        return; // Preserve existing user cart
      }
      // User confirmed switch: Clear previous cart and initialize with new kitchen item
      setSelectedShopId(targetShopId);
      setCart([{ ...item, quantity: 1, shopId: targetShopId }]);
      return;
    }

    if (targetShopId && (!selectedShopId || selectedShopId === targetShopId)) {
      setSelectedShopId(targetShopId);
      setCart(prevCart => {
        const existing = prevCart.find(i => i.id === item.id);
        if (existing) {
          return prevCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prevCart, { ...item, quantity: 1, shopId: targetShopId }];
      });
    } else {
      setSelectedShopId(targetShopId);
      setCart([{ ...item, quantity: 1, shopId: targetShopId }]);
    }
  }, [selectedShopId, cart.length]);

  const updateQuantity = useCallback((itemId, delta) => {
    setCart(prevCart => {
      const updated = prevCart.map(i => {
        if (i.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean);

      return updated;
    });
  }, []);

  const setExactQuantity = useCallback((itemId, exactQty, itemObj = null) => {
    setCart(prevCart => {
      if (exactQty <= 0) {
        return prevCart.filter(i => i.id !== itemId);
      }
      const existing = prevCart.find(i => i.id === itemId);
      if (existing) {
        return prevCart.map(i => i.id === itemId ? { ...i, quantity: exactQty } : i);
      }
      if (itemObj) {
        const targetShopId = itemObj.shopId || selectedShopId;
        if (targetShopId) setSelectedShopId(targetShopId);
        return [...prevCart, { ...itemObj, quantity: exactQty, shopId: targetShopId }];
      }
      return prevCart;
    });
  }, [selectedShopId]);

  const removeFromCart = useCallback((itemId) => {
    setCart(prevCart => {
      return prevCart.filter(i => i.id !== itemId);
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

