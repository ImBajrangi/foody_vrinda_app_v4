/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState({
    onlinePaymentsEnabled: true,
    codEnabled: true
  });

  // Load payment settings dynamically from settings/paymentConfig
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const docRef = doc(db, "settings", "paymentConfig");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPaymentSettings(docSnap.data());
        }
      } catch (err) {
        console.warn("Failed to load payment settings:", err);
      }
    };
    fetchPaymentSettings();
  }, []);

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
    addToCart,
    updateQuantity,
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
