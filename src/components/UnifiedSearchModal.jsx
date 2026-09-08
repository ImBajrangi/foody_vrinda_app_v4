import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getCloudMenus, supabase, resolveDishCutout } from '../supabase';
import { Sparkles, Search, Store, Utensils, Receipt, X, ChevronRight, ShoppingBag, Flame, Clock, MapPin, Plus, Minus, Tag } from 'lucide-react';
import { HitSoochiService } from '../services/hitSoochiService';

export default function UnifiedSearchModal({ isOpen, onClose, onSelectShop, onSelectOrder }) {
  const { user, userRole, currentUserShopId, allShops } = useAuth();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState({ shops: [], menuItems: [], orders: [] });
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchInputRef = useRef(null);

  // Inline detail expansion states
  const [expandedDish, setExpandedDish] = useState(null);
  const [expandedShop, setExpandedShop] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [dishQty, setDishQty] = useState(1);
  const [shopMenuItems, setShopMenuItems] = useState([]);
  const [loadingShopMenu, setLoadingShopMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpandedDish(null);
      setExpandedShop(null);
      setExpandedOrder(null);
      onClose();
    }, 220);
  }, [closing, onClose]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setClosing(false);
      setExpandedDish(null);
      setExpandedShop(null);
      setExpandedOrder(null);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (!isOpen) {
      setSearchTerm('');
      setResults({ shops: [], menuItems: [], orders: [] });
      setClosing(false);
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (expandedDish || expandedShop || expandedOrder) {
          setExpandedDish(null);
          setExpandedShop(null);
          setExpandedOrder(null);
        } else {
          handleAnimatedClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleAnimatedClose, expandedDish, expandedShop, expandedOrder]);

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 1800);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const performSearch = useCallback(async (term) => {
    setLoading(true);
    try {
      // 1. Search Shops (Local filter)
      const matchedShops = allShops.filter(shop =>
        shop.name?.toLowerCase().includes(term) ||
        shop.address?.toLowerCase().includes(term)
      );

      // 2. Search Menu Items (Supabase cloud fetch with HitSoochi ranking)
      const allMenuItems = await getCloudMenus('all');
      let matchedMenuItems = (allMenuItems || []).filter(item => {
        const shop = allShops.find(s => s.id === item.shopId);
        item.shopName = shop ? shop.name : "Satvik Kitchen";
        return (
          item.name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.shopName?.toLowerCase().includes(term)
        );
      });

      // Semantic ranking with Vedic ontology weights
      matchedMenuItems = HitSoochiService.rankItems(matchedMenuItems, term);

      // 3. Search Orders (Supabase query based on role)
      let matchedOrders = [];
      try {
        let queryBuilder = supabase.from('foody_orders').select('*').limit(20);
        if (['kitchen', 'owner', 'delivery'].includes(userRole) && currentUserShopId) {
          queryBuilder = queryBuilder.eq('shop_id', currentUserShopId);
        } else if (user?.uid) {
          queryBuilder = queryBuilder.eq('user_id', user.uid);
        }

        const { data: ordersData } = await queryBuilder;
        if (ordersData) {
          matchedOrders = ordersData.filter(order => {
            const itemsString = order.items?.map(i => i.name.toLowerCase()).join(' ') || '';
            return (
              order.id.toLowerCase().includes(term) ||
              order.customer_name?.toLowerCase().includes(term) ||
              order.customer_phone?.includes(term) ||
              itemsString.includes(term)
            );
          });
        }
      } catch (err) {
        console.warn("Orders search fallback:", err);
      }

      setResults({
        shops: matchedShops.slice(0, 6),
        menuItems: matchedMenuItems.slice(0, 8),
        orders: matchedOrders.slice(0, 5)
      });
    } catch (e) {
      console.error("Unified search error:", e);
    } finally {
      setLoading(false);
    }
  }, [allShops, currentUserShopId, user, userRole]);

  // Handle live search matching
  useEffect(() => {
    if (!searchTerm.trim()) return;

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchTerm.toLowerCase().trim());
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, performSearch]);

  // Load shop menu items when expanding a kitchen
  const handleExpandShop = async (shop) => {
    if (expandedShop?.id === shop.id) {
      setExpandedShop(null);
      return;
    }
    setExpandedShop(shop);
    setExpandedDish(null);
    setExpandedOrder(null);
    setLoadingShopMenu(true);
    try {
      const items = await getCloudMenus(shop.id);
      setShopMenuItems(items || []);
    } catch {
      setShopMenuItems([]);
    } finally {
      setLoadingShopMenu(false);
    }
  };

  const handleExpandDish = (item) => {
    if (expandedDish?.id === item.id) {
      setExpandedDish(null);
      return;
    }
    setExpandedDish(item);
    setExpandedShop(null);
    setExpandedOrder(null);
    setDishQty(1);
  };

  const handleExpandOrder = (order) => {
    if (expandedOrder?.id === order.id) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(order);
    setExpandedShop(null);
    setExpandedDish(null);
  };

  const handleAddDishToCart = (item, qty = 1) => {
    for (let i = 0; i < qty; i++) {
      addToCart(item);
    }
    setToastMsg(`+${qty} ${item.name} · ₹${item.price * qty}`);
  };

  const getStatusColor = (status) => {
    const map = {
      'pending': 'bg-amber-500/20 text-amber-400',
      'in_kitchen': 'bg-orange-500/20 text-orange-400',
      'preparing': 'bg-orange-500/20 text-orange-400',
      'ready': 'bg-emerald-500/20 text-emerald-400',
      'picked_up': 'bg-violet-500/20 text-violet-400',
      'delivered': 'bg-green-500/20 text-green-400',
      'cancelled': 'bg-red-500/20 text-red-400'
    };
    return map[status] || 'bg-white/10 text-white';
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) handleAnimatedClose();
        }}
        className={`fixed inset-0 z-50 flex items-start justify-center p-3 pt-14 sm:pt-20 bg-black/75 apple-overlay ${closing ? 'closing' : ''}`}
      >
        <div className={`w-full max-w-2xl bg-[#242021] border border-white/10 text-white rounded-[32px] sm:rounded-[40px] shadow-[0_25px_70px_rgba(0,0,0,0.7)] relative flex flex-col max-h-[85vh] overflow-hidden apple-modal-spring ${closing ? 'closing' : ''}`}>

          {/* Search Input Area */}
          <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center gap-2.5 sm:gap-3 bg-[#1E1B1C]">
            <Search size={19} className="text-[#E0FF33] flex-shrink-0" strokeWidth={2.5} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes, kitchens, orders..."
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (!val.trim()) {
                  setResults({ shops: [], menuItems: [], orders: [] });
                  setExpandedDish(null);
                  setExpandedShop(null);
                  setExpandedOrder(null);
                }
              }}
              className="flex-1 min-w-0 text-sm sm:text-base bg-transparent border-none outline-none focus:ring-0 p-1 placeholder-zinc-500 text-white font-bold"
            />
            <button
              onClick={handleAnimatedClose}
              className="flex-shrink-0 h-8 px-2.5 sm:px-3 rounded-full bg-[#282526] hover:bg-[#332E30] text-zinc-400 hover:text-white flex items-center justify-center gap-1 text-[11px] font-black transition-all cursor-pointer apple-tap-target border border-white/5"
              title="Close (Esc)"
            >
              <span className="hidden sm:inline text-[10px] font-bold tracking-wider">ESC</span>
              <X size={15} />
            </button>
          </div>

          {/* Results Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
            {loading && (
              <div className="text-center py-10 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#E0FF33] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-400 text-xs font-semibold">Searching cloud kitchens network...</p>
              </div>
            )}

            {!loading && !searchTerm.trim() && (
              <div className="py-4 space-y-6">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 text-[#E0FF33] mx-auto mb-2 opacity-90" />
                  <h3 className="text-sm font-black text-white font-['Outfit']">Foody Discovery</h3>
                  <p className="text-xs text-zinc-400 mt-1">Explore divine Taste, sacred meals, and pure kitchens</p>
                </div>

                {/* Quick Intent Pills */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5 flex items-center gap-1.5">
                    <Tag size={12} className="text-[#E0FF33]" /> Popular Vedic Cravings
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HitSoochiService.getCuratedSuggestions().map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSearchTerm(sugg.keyword);
                          performSearch(sugg.keyword.toLowerCase());
                        }}
                        className="px-3.5 py-2 rounded-2xl bg-[#1E1B1C] hover:bg-[#2A2627] border border-white/5 hover:border-[#E0FF33]/40 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <span>{sugg.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && searchTerm.trim() &&
              results.shops.length === 0 &&
              results.menuItems.length === 0 &&
              results.orders.length === 0 && (
                <p className="text-center text-zinc-400 py-10 text-xs font-medium">No matches found for &ldquo;{searchTerm}&rdquo;.</p>
              )}

            {/* ─── KITCHENS SECTION ─── */}
            {!loading && results.shops.length > 0 && (
              <div>
                <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Store size={14} /> Cloud Kitchens
                  <span className="text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.shops.length})</span>
                </h4>
                <div className="space-y-2">
                  {results.shops.map(shop => (
                    <div key={shop.id} className="bg-[#1E1B1C] rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                      {/* Kitchen Row */}
                      <div
                        onClick={() => handleExpandShop(shop)}
                        className="p-3 sm:p-3.5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03] transition-colors apple-tap-target"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#E0FF33]/20 to-[#E0FF33]/5 border border-[#E0FF33]/20 shrink-0 flex items-center justify-center">
                            <Store size={18} className="text-[#E0FF33]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs sm:text-sm truncate">{shop.name}</p>
                            <p className="text-[10px] sm:text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                              <MapPin size={10} className="shrink-0" />
                              {shop.address || 'Vrindavan Dham'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} className={`text-zinc-500 shrink-0 transition-transform duration-200 ${expandedShop?.id === shop.id ? 'rotate-90' : ''}`} />
                      </div>

                      {/* Expanded Kitchen Detail */}
                      {expandedShop?.id === shop.id && (
                        <div className="border-t border-white/5 px-3 sm:px-4 pb-3 sm:pb-4 animate-fade-in">
                          {/* Quick Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectShop(shop.id, shop.name);
                              handleAnimatedClose();
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] text-xs font-black px-4 py-2.5 rounded-full transition-all cursor-pointer"
                          >
                            <Utensils size={13} />
                            View Full Menu
                          </button>

                          {/* Inline Menu Items Preview */}
                          <div className="mt-3">
                            {loadingShopMenu ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="w-4 h-4 border-2 border-[#E0FF33] border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : shopMenuItems.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Menu Preview</p>
                                {shopMenuItems.slice(0, 4).map((menuItem, idx) => (
                                  <div
                                    key={menuItem.id || idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExpandDish({ ...menuItem, shopName: shop.name, shopId: shop.id });
                                    }}
                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                                  >
                                    <div className="w-9 h-9 rounded-xl bg-[#282526] border border-white/10 shrink-0 flex items-center justify-center p-0.5">
                                      <img
                                        src={resolveDishCutout(menuItem.image || menuItem.imageUrl, menuItem.name, menuItem.category)}
                                        alt={menuItem.name}
                                        className="w-full h-full object-contain drop-shadow-sm"
                                        loading="lazy"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">{menuItem.name}</p>
                                      <p className="text-[10px] text-zinc-500 truncate">{menuItem.category || 'Satvik'}</p>
                                    </div>
                                    <span className="text-[11px] font-black text-[#E0FF33] shrink-0">₹{menuItem.price}</span>
                                  </div>
                                ))}
                                {shopMenuItems.length > 4 && (
                                  <p className="text-[10px] text-zinc-500 text-center pt-1">+{shopMenuItems.length - 4} more items</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-500 text-center py-3">No items listed yet</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── DISHES SECTION ─── */}
            {!loading && results.menuItems.length > 0 && (
              <div>
                <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Utensils size={14} /> Satvik Dishes
                  <span className="text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.menuItems.length})</span>
                </h4>
                <div className="space-y-2">
                  {results.menuItems.map(item => (
                    <div key={item.id} className="bg-[#1E1B1C] rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                      {/* Dish Row */}
                      <div
                        onClick={() => handleExpandDish(item)}
                        className="p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors apple-tap-target"
                      >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#282526] border border-white/10 shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)}
                            alt={item.name}
                            className="w-full h-full object-contain drop-shadow-sm"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-xs sm:text-sm truncate">{item.name}</p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">{item.shopName || 'Satvik Kitchen'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm sm:text-base font-black text-[#E0FF33]">₹{item.price}</span>
                          <ChevronRight size={14} className={`text-zinc-500 transition-transform duration-200 ${expandedDish?.id === item.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Dish Detail */}
                      {expandedDish?.id === item.id && (
                        <div className="border-t border-white/5 animate-fade-in">
                          {/* Hero Image Band */}
                          <div className="bg-gradient-to-b from-[#282526] to-[#1E1B1C] flex items-center justify-center py-4 sm:py-6 relative">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                              <img
                                src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)}
                                alt={item.name}
                                className="w-full h-full object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.25)] select-none"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            {/* Tag Pill */}
                            {item.tag && (
                              <span className="absolute bottom-2 left-3 bg-[#E0FF33]/15 text-[#E0FF33] text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-full border border-[#E0FF33]/20">
                                {item.tag}
                              </span>
                            )}
                          </div>

                          {/* Info Body */}
                          <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3">
                            {/* Category & Kitchen */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{item.category || 'Satvik'}</span>
                              <span className="text-zinc-600 text-[10px]">•</span>
                              <span className="text-[10px] font-semibold text-zinc-500">{item.shopName}</span>
                            </div>

                            {/* Description */}
                            {item.description && (
                              <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed line-clamp-3">{item.description}</p>
                            )}

                            {/* Nutrition Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.kcal && (
                                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                  <Flame size={10} />{item.kcal}
                                </span>
                              )}
                              {item.protein && (
                                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  P {item.protein}
                                </span>
                              )}
                              {item.carbs && (
                                <span className="text-[9px] sm:text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                  C {item.carbs}
                                </span>
                              )}
                              {item.fat && (
                                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  F {item.fat}
                                </span>
                              )}
                            </div>

                            {/* Quantity + Add to Cart Row */}
                            <div className="flex items-center justify-between gap-3 pt-1">
                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-0 bg-[#282526] rounded-full border border-white/10 h-9 sm:h-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDishQty(q => Math.max(1, q - 1)); }}
                                  className="w-9 sm:w-10 h-full flex items-center justify-center text-white hover:bg-white/10 rounded-l-full transition-colors cursor-pointer"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-7 text-center text-xs sm:text-sm font-black text-white select-none">{dishQty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDishQty(q => Math.min(10, q + 1)); }}
                                  className="w-9 sm:w-10 h-full flex items-center justify-center text-white hover:bg-white/10 rounded-r-full transition-colors cursor-pointer"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* Add to Cart CTA */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddDishToCart(item, dishQty);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] text-xs sm:text-sm font-black px-4 py-2.5 sm:py-3 rounded-full transition-all cursor-pointer shadow-lg shadow-[#E0FF33]/10"
                              >
                                <ShoppingBag size={14} />
                                Add · ₹{item.price * dishQty}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── ORDERS SECTION ─── */}
            {!loading && results.orders.length > 0 && (
              <div>
                <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Receipt size={14} /> Orders
                  <span className="text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.orders.length})</span>
                </h4>
                <div className="space-y-2">
                  {results.orders.map(order => (
                    <div key={order.id} className="bg-[#1E1B1C] rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                      {/* Order Row */}
                      <div
                        onClick={() => handleExpandOrder(order)}
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/[0.03] transition-colors apple-tap-target"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs sm:text-sm">
                            Order #{order.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-500 flex items-center gap-1.5">
                            <Clock size={10} className="shrink-0" />
                            {order.items?.length || 0} items · ₹{order.total_amount || order.totalAmount || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full capitalize ${getStatusColor(order.status)}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                          <ChevronRight size={14} className={`text-zinc-500 transition-transform duration-200 ${expandedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Order Detail */}
                      {expandedOrder?.id === order.id && (
                        <div className="border-t border-white/5 px-3.5 sm:px-4 py-3 sm:py-4 space-y-3 animate-fade-in">
                          {/* Customer Info */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Customer</p>
                              <p className="text-xs font-bold text-white">{order.customer_name || order.customerName || 'Guest'}</p>
                              {(order.customer_phone || order.customerPhone) && (
                                <p className="text-[10px] text-zinc-500">{order.customer_phone || order.customerPhone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Total</p>
                              <p className="text-base font-black text-[#E0FF33]">₹{order.total_amount || order.totalAmount || 0}</p>
                            </div>
                          </div>

                          {/* Items List */}
                          {order.items && order.items.length > 0 && (
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Items</p>
                              <div className="space-y-1.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px] sm:text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-5 h-5 rounded-md bg-[#282526] text-[9px] font-black text-zinc-400 flex items-center justify-center shrink-0">
                                        {item.quantity || 1}×
                                      </span>
                                      <span className="text-white font-semibold truncate">{item.name}</span>
                                    </div>
                                    <span className="text-zinc-400 font-bold shrink-0">₹{(item.price || 0) * (item.quantity || 1)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Track Order CTA */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order.id, order);
                              handleAnimatedClose();
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] text-xs font-black px-4 py-2.5 rounded-full transition-all cursor-pointer"
                          >
                            <Receipt size={13} />
                            {['delivered', 'cancelled'].includes(order.status) ? 'View Details' : 'Track Order'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Island Toast — portaled to body so it sits above everything */}
      {toastMsg && createPortal(
        <div
          className="fixed z-[99999999] flex justify-center pointer-events-none"
          style={{ top: 'max(18px, env(safe-area-inset-top, 18px))', left: 0, right: 0 }}
        >
          <aside
            className="dynamic-island-toast toast type-basket-add stage-visible pointer-events-auto cursor-pointer"
            onClick={() => setToastMsg(null)}
            role="status"
            aria-live="polite"
          >
            <div className="dynamic-island-icon-wrap type-basket-add">
              <ShoppingBag size={16} strokeWidth={2.5} className="text-[#E0FF33]" />
            </div>
            <div className="dynamic-island-content">
              <span className="dynamic-island-title">{toastMsg}</span>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
