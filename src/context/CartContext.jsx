/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_payment_config');
      return saved ? JSON.parse(saved) : { onlinePaymentsEnabled: true, codEnabled: true };
    } catch (e) {
      return { onlinePaymentsEnabled: true, codEnabled: true };
    }
  });

  // Keep paymentSettings synchronized across windows and state triggers
  useEffect(() => {
    const handleConfigChange = () => {
      try {
        const saved = localStorage.getItem('foody_payment_config');
        if (saved) {
          setPaymentSettings(JSON.parse(saved));
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('foody_payment_config_changed', handleConfigChange);
    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('foody_payment_config_changed', handleConfigChange);
    };
  }, []);

  const updateGlobalPaymentConfig = useCallback((newConfig) => {
    setPaymentSettings(prev => {
      const updated = typeof newConfig === 'function' ? newConfig(prev) : { ...prev, ...newConfig };
      try {
        localStorage.setItem('foody_payment_config', JSON.stringify(updated));
        window.dispatchEvent(new Event('foody_payment_config_changed'));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Helper to resolve specific shop payment options considering global master flags
  const resolveShopPaymentOptions = useCallback((shop) => {
    const globalOnline = paymentSettings?.onlinePaymentsEnabled !== false;
    const globalCod = paymentSettings?.codEnabled !== false;

    const shopOnline = shop?.paymentSettings?.onlinePaymentsEnabled ?? shop?.onlinePaymentsEnabled ?? true;
    const shopCod = shop?.paymentSettings?.codEnabled ?? shop?.codEnabled ?? true;

    return {
      onlineAvailable: Boolean(globalOnline && shopOnline),
      codAvailable: Boolean(globalCod && shopCod),
      globalOnline,
      globalCod,
      shopOnline,
      shopCod,
      reasonOnlineUnavailable: !globalOnline ? 'Platform Master Disabled' : (!shopOnline ? 'Kitchen Online Pay Disabled' : null),
      reasonCodUnavailable: !globalCod ? 'Platform Master Disabled' : (!shopCod ? 'Kitchen COD Disabled' : null),
      shopName: shop?.name || 'Kitchen'
    };
  }, [paymentSettings]);

  const addToCart = (item, shopId) => {
    const targetShopId = shopId || item.shopId || selectedShopId;
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
      // Switching kitchens smoothly
      setSelectedShopId(targetShopId);
      setCart([{ ...item, quantity: 1, shopId: targetShopId }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prevCart => {
      const updated = prevCart.map(i => {
        if (i.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean);

      if (updated.length === 0) {
        setSelectedShopId(null);
      }
      return updated;
    });
  };

  const setExactQuantity = (itemId, exactQty, itemObj = null) => {
    setCart(prevCart => {
      if (exactQty <= 0) {
        const updated = prevCart.filter(i => i.id !== itemId);
        if (updated.length === 0) setSelectedShopId(null);
        return updated;
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
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const updated = prevCart.filter(i => i.id !== itemId);
      if (updated.length === 0) {
        setSelectedShopId(null);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedShopId(null);
  };

  // Helper to load Razorpay checkout script dynamically
  const loadRazorpay = () => {
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
  };

  const value = {
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
  };

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

