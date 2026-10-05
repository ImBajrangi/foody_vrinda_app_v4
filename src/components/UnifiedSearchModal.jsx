import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getCloudMenus, supabase, resolveDishCutout, getOrderItemSummary } from '../supabase';
import { 
  Search, Store, Utensils, Receipt, X, ChevronRight, ShoppingBag, 
  Flame, Clock, MapPin, Plus, Minus, Tag, TrendingUp, RotateCcw, 
  ArrowRight, Sparkles, Check
} from 'lucide-react';
import { HitSoochiService } from '../services/hitSoochiService';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import DynamicToast from './ui/DynamicToast';

const POPULAR_CATEGORIES = [
  { name: 'Thalis & Meals', keyword: 'thali', icon: '🍛', color: 'from-amber-500/15 to-orange-500/10' },
  { name: 'Satvik Pizza', keyword: 'pizza', icon: '🍕', color: 'from-red-500/15 to-orange-500/10' },
  { name: 'Burgers & Wraps', keyword: 'burger', icon: '🍔', color: 'from-yellow-500/15 to-amber-500/10' },
  { name: 'Sweets & Bhog', keyword: 'kheer', icon: '🍧', color: 'from-pink-500/15 to-rose-500/10' },
  { name: 'Paneer Specials', keyword: 'paneer', icon: '🧀', color: 'from-emerald-500/15 to-teal-500/10' },
  { name: 'Drinks & Shakes', keyword: 'shake', icon: '🥤', color: 'from-blue-500/15 to-cyan-500/10' },
];

const RECENT_SEARCHES_KEY = 'foody_vrinda_recent_searches_v2';

export default function UnifiedSearchModal({ isOpen, onClose, onSelectShop, onSelectOrder }) {
  const { user, userData, userRole, currentUserShopId, allShops } = useAuth();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [results, setResults] = useState({ shops: [], menuItems: [], orders: [] });
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchInputRef = useRef(null);

  // Detail expansion & cart interaction states
  const [expandedDish, setExpandedDish] = useState(null);
  const [expandedShop, setExpandedShop] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [dishQty, setDishQty] = useState(1);
  const [shopMenuItems, setShopMenuItems] = useState([]);
  const [loadingShopMenu, setLoadingShopMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [addedItemIds, setAddedItemIds] = useState({});

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (Array.isArray(stored)) {
        setRecentSearches(stored.slice(0, 6));
      }
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

  const saveRecentSearch = (term) => {
    const clean = term?.trim();
    if (!clean || clean.length < 2) return;
    try {
      const existing = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      const updated = [clean, ...existing.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {
      // Ignore storage errors
    }
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpandedDish(null);
      setExpandedShop(null);
      setExpandedOrder(null);
      onClose();
    }, 200);
  }, [closing, onClose]);

  const { sheetRef, handleProps, dismiss } = useBottomSheetDrag(handleAnimatedClose, 45);

  // Focus input on mount ONLY for desktop devices (avoids virtual keyboard disturbance on mobile)
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setExpandedDish(null);
      setExpandedShop(null);
      setExpandedOrder(null);

      const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
      if (!isMobile) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 80);
      }
    } else {
      setSearchTerm('');
      setResults({ shops: [], menuItems: [], orders: [] });
      setClosing(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (expandedDish || expandedShop || expandedOrder) {
          setExpandedDish(null);
          setExpandedShop(null);
          setExpandedOrder(null);
        } else {
          dismiss();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismiss, expandedDish, expandedShop, expandedOrder]);

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 1800);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const performSearch = useCallback(async (term) => {
    if (!term || !term.trim()) {
      setResults({ shops: [], menuItems: [], orders: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const cleanTerm = term.toLowerCase().trim();

      // 1. Search Shops (Local filter)
      const matchedShops = allShops.filter(shop =>
        shop.name?.toLowerCase().includes(cleanTerm) ||
        shop.address?.toLowerCase().includes(cleanTerm)
      );

      // 2. Search Menu Items (Supabase cloud fetch with HitSoochi ranking)
      const allMenuItems = await getCloudMenus('all');
      let matchedMenuItems = (allMenuItems || []).filter(item => {
        const shop = allShops.find(s => s.id === item.shopId);
        item.shopName = shop ? shop.name : "Satvik Kitchen";
        return (
          item.name?.toLowerCase().includes(cleanTerm) ||
          item.description?.toLowerCase().includes(cleanTerm) ||
          item.category?.toLowerCase().includes(cleanTerm) ||
          item.shopName?.toLowerCase().includes(cleanTerm)
        );
      });

      // Semantic ranking with Vedic ontology weights
      matchedMenuItems = HitSoochiService.rankItems(matchedMenuItems, cleanTerm);

      // 3. Search Orders (Role-based & strictly user-isolated)
      let matchedOrders = [];
      try {
        const cleanPhone = (userData?.phone || user?.phone || user?.user_metadata?.phone)
          ? String(userData?.phone || user?.phone || user?.user_metadata?.phone).replace(/\D/g, '')
          : '';
        const currentUserId = user?.id || user?.uid || userData?.id;
        const sessionOrderIds = (() => {
          try {
            return JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
          } catch {
            return [];
          }
        })();

        let queryBuilder = supabase.from('foody_orders').select('*').order('created_at', { ascending: false }).limit(20);

        if (['kitchen', 'owner', 'delivery'].includes(userRole) && currentUserShopId) {
          queryBuilder = queryBuilder.eq('shop_id', currentUserShopId);
        } else if (['admin', 'master_admin', 'developer'].includes(userRole)) {
          // Admins search across orders
        } else {
          // Customer / Guest isolation
          if (currentUserId && cleanPhone && cleanPhone.length >= 10) {
            queryBuilder = queryBuilder.or(`user_id.eq.${currentUserId},customer_phone.eq.${cleanPhone}`);
          } else if (currentUserId) {
            queryBuilder = queryBuilder.eq('user_id', currentUserId);
          } else if (cleanPhone && cleanPhone.length >= 10) {
            queryBuilder = queryBuilder.eq('customer_phone', cleanPhone);
          } else if (sessionOrderIds.length > 0) {
            queryBuilder = queryBuilder.in('id', sessionOrderIds);
          } else {
            queryBuilder = null;
          }
        }

        if (queryBuilder) {
          const { data: ordersData } = await queryBuilder;
          if (ordersData) {
            matchedOrders = ordersData.filter(order => {
              const itemsString = order.items?.map(i => (i.name || '').toLowerCase()).join(' ') || '';
              const orderId = (order.id || '').toLowerCase();
              const custName = (order.customer_name || order.customerName || '').toLowerCase();
              const custPhone = (order.customer_phone || order.customerPhone || '');
              return (
                orderId.includes(cleanTerm) ||
                custName.includes(cleanTerm) ||
                custPhone.includes(cleanTerm) ||
                itemsString.includes(cleanTerm)
              );
            });
          }
        }
      } catch (err) {
        console.warn("Orders search fallback:", err);
      }

      setResults({
        shops: matchedShops.slice(0, 8),
        menuItems: matchedMenuItems.slice(0, 15),
        orders: matchedOrders.slice(0, 6)
      });
    } catch (e) {
      console.error("Unified search error:", e);
    } finally {
      setLoading(false);
    }
  }, [allShops, currentUserShopId, user, userData, userRole]);

  // Handle live search matching
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({ shops: [], menuItems: [], orders: [] });
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchTerm);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, performSearch]);

  const handleSelectSuggestion = (keyword) => {
    setSearchTerm(keyword);
    saveRecentSearch(keyword);
    performSearch(keyword);
  };

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

  const handleDirectAddToCart = (e, item) => {
    e.stopPropagation();
    addToCart(item);
    setAddedItemIds(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [item.id]: false }));
    }, 1200);
    setToastMsg(`+1 ${item.name} added (₹${item.price})`);
  };

  const handleAddDishWithQty = (item, qty = 1) => {
    for (let i = 0; i < qty; i++) {
      addToCart(item);
    }
    setToastMsg(`+${qty} ${item.name} · ₹${item.price * qty}`);
  };

  const getStatusColor = (status) => {
    const map = {
      'pending': 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30',
      'in_kitchen': 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border border-orange-500/30',
      'preparing': 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border border-orange-500/30',
      'ready': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      'picked_up': 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30',
      'delivered': 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30',
      'cancelled': 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30'
    };
    return map[status] || 'bg-stone-500/20 text-stone-600 dark:text-zinc-300';
  };

  const totalResultsCount = results.shops.length + results.menuItems.length + results.orders.length;

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) dismiss();
        }}
        className={`fixed inset-0 z-[99999] flex items-end sm:items-start justify-center p-0 sm:p-4 pt-0 sm:pt-14 md:pt-20 bg-black/60 dark:bg-black/80 backdrop-blur-xs apple-overlay ${closing ? 'closing' : ''}`}
      >
        <div 
          ref={sheetRef}
          className={`w-full max-w-2xl bg-[#FAF7F2] dark:bg-[#1E1B1C] border-t sm:border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-t-[32px] sm:rounded-[36px] shadow-2xl relative flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-hidden apple-sheet-spring ${closing ? 'closing' : ''}`}
        >

          {/* Top Sticky Header (Unified Seamless Container with Consistent Theme & Swipe-Down Gesture) */}
          <div 
            {...handleProps}
            className="bg-white dark:bg-[#282526] border-b border-stone-200 dark:border-white/10 shrink-0 select-none cursor-grab active:cursor-grabbing"
          >
            {/* Top Grabber Indicator for Mobile */}
            <div className="w-full pt-3 pb-1.5 flex justify-center sm:hidden touch-none">
              <div className="w-12 h-1.5 bg-stone-300 dark:bg-white/20 rounded-full transition-colors"></div>
            </div>

            {/* Search Input Bar (Ultra-Premium Apple / Arc Style Search Capsule + Crisp Cancel) */}
            <div className="p-3 sm:p-4 pt-1 sm:pt-3.5 flex items-center gap-2.5 sm:gap-3">
              {/* Integrated Search Input Capsule */}
              <div className="flex-1 min-w-0 h-11 sm:h-12 bg-stone-100/90 dark:bg-[#181617] border border-stone-200/90 dark:border-white/15 rounded-2xl px-3 sm:px-3.5 flex items-center gap-2.5 focus-within:border-amber-500/70 dark:focus-within:border-[#E0FF33]/60 focus-within:ring-2 focus-within:ring-amber-500/15 dark:focus-within:ring-[#E0FF33]/20 focus-within:bg-white dark:focus-within:bg-[#141213] transition-all shadow-inner">
                <Search size={18} strokeWidth={2.2} className="text-amber-600 dark:text-[#E0FF33] shrink-0 pointer-events-none" />

                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search dishes, kitchens, cravings..."
                  value={searchTerm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      saveRecentSearch(searchTerm);
                    }
                  }}
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
                  className="flex-1 min-w-0 text-sm sm:text-base bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-stone-400 dark:placeholder-zinc-500 text-stone-900 dark:text-white font-bold tracking-tight"
                />

                {/* Inline Clear Button */}
                {searchTerm.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setResults({ shops: [], menuItems: [], orders: [] });
                    }}
                    className="w-5 h-5 rounded-full bg-stone-300 hover:bg-stone-400 dark:bg-white/20 dark:hover:bg-white/30 text-stone-700 dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
                    title="Clear search text"
                    aria-label="Clear text"
                  >
                    <X size={11} strokeWidth={2.8} />
                  </button>
                )}
              </div>

              {/* Distinct Cancel / Dismiss CTA */}
              <button
                type="button"
                onClick={() => dismiss()}
                className="h-9 sm:h-10 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 hover:text-stone-950 dark:text-zinc-300 dark:hover:text-white text-xs sm:text-sm font-black font-['Outfit'] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs select-none"
                title="Close search"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Results / Discovery Content Area (Auto-dismisses keyboard on touch/scroll) */}
          <div 
            onScroll={() => {
              if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
              }
            }}
            onTouchMove={() => {
              if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
              }
            }}
            className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5 no-scrollbar bg-[#FAF7F2] dark:bg-[#1E1B1C]"
          >
            
            {/* Loading Indicator */}
            {loading && (
              <div className="text-center py-10 flex flex-col items-center gap-2.5">
                <div className="w-6 h-6 border-2 border-amber-600 dark:border-[#E0FF33] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 dark:text-zinc-400 text-xs font-semibold">Searching freshly prepared satvik dishes & kitchens...</p>
              </div>
            )}

            {/* ─── DEFAULT DISCOVERY DASHBOARD (When search input is empty) ─── */}
            {!loading && !searchTerm.trim() && (
              <div className="space-y-5 py-1">
                
                {/* Recent Searches (If Any) */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 flex items-center gap-1.5 font-['Outfit']">
                        <Clock size={12} className="text-amber-600 dark:text-[#E0FF33]" />
                        Recent Searches
                      </p>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[10px] font-bold text-stone-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={10} /> Clear
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSuggestion(term)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#282526] hover:bg-amber-500/10 dark:hover:bg-[#322E30] border border-stone-200 dark:border-white/10 text-xs font-bold text-stone-800 dark:text-zinc-200 hover:text-amber-700 dark:hover:text-[#E0FF33] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Search size={11} className="text-stone-400 dark:text-zinc-500" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Category Grid (Full Width, Zero Blank Spaces) */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5 font-['Outfit']">
                    <Tag size={12} className="text-amber-600 dark:text-[#E0FF33]" />
                    Explore by Category
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPULAR_CATEGORIES.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(cat.keyword)}
                        className={`p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br ${cat.color} bg-white dark:bg-[#282526] border border-stone-200 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 flex items-center gap-2.5 transition-all cursor-pointer group shadow-2xs active:scale-[0.98] text-left`}
                      >
                        <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform shrink-0">{cat.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-stone-900 dark:text-white truncate font-['Outfit']">{cat.name}</p>
                          <p className="text-[10px] text-stone-500 dark:text-zinc-400 font-semibold flex items-center gap-0.5">
                            Search now <ArrowRight size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Vedic Cravings (Balanced 2-Column Responsive Grid) */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5 font-['Outfit']">
                    <Flame size={13} className="text-amber-600 dark:text-orange-500" />
                    Trending Satvik Cravings
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HitSoochiService.getCuratedSuggestions().map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(sugg.keyword)}
                        className="p-2.5 rounded-2xl bg-white dark:bg-[#282526] hover:bg-amber-500/5 dark:hover:bg-[#322E30] border border-stone-200 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-[#E0FF33]/10 text-amber-700 dark:text-[#E0FF33] flex items-center justify-center shrink-0">
                            <Utensils size={13} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-900 dark:text-white block truncate">{sugg.title}</span>
                            <span className="text-[10px] text-stone-500 dark:text-zinc-400 capitalize font-medium">{sugg.type || 'Pure satvik'}</span>
                          </div>
                        </div>
                        <TrendingUp size={14} className="text-stone-400 group-hover:text-amber-600 dark:text-zinc-600 dark:group-hover:text-[#E0FF33] shrink-0 ml-2 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ─── EMPTY STATE (When no results found) ─── */}
            {!loading && searchTerm.trim() && totalResultsCount === 0 && (
              <div className="py-10 sm:py-14 text-center px-4">
                {/* Visual Anchor with subtle glowing aura */}
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 blur-xl"></div>
                  <div className="relative w-16 h-16 rounded-2xl bg-stone-100 dark:bg-[#282526] border border-stone-200 dark:border-white/10 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shadow-md">
                    <Search size={24} strokeWidth={2.2} />
                  </div>
                </div>

                <div className="max-w-sm mx-auto space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                    No results for &ldquo;{searchTerm}&rdquo;
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 leading-relaxed font-medium">
                    We couldn&apos;t find matching items. Check spelling or try popular categories:
                  </p>
                </div>

                {/* Popular Cravings Quick Chips */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                  {['Thali', 'Paneer', 'Sweets', 'Pizza', 'Chai'].map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSelectSuggestion(query.toLowerCase())}
                      className="px-4 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-[#282526] dark:hover:bg-[#322E30] border border-stone-200 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 text-xs font-semibold text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-[#E0FF33] transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {query}
                    </button>
                  ))}
                </div>

                {/* Clear search CTA */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setResults({ shops: [], menuItems: [], orders: [] });
                    }}
                    className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-[#E0FF33] transition-colors cursor-pointer inline-flex items-center gap-1 hover:underline"
                  >
                    Clear search query
                  </button>
                </div>
              </div>
            )}

            {/* ─── DISHES SECTION (With 1-Tap Quick Add Button!) ─── */}
            {!loading && results.menuItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-black text-amber-700 dark:text-[#E0FF33] uppercase tracking-wider flex items-center gap-1.5 font-['Outfit']">
                    <Utensils size={13} />
                    Dishes & Prasad
                    <span className="text-stone-400 dark:text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.menuItems.length})</span>
                  </h4>
                  <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500">Tap item for details</span>
                </div>

                <div className="space-y-2">
                  {results.menuItems.map(item => {
                    const isAdded = !!addedItemIds[item.id];
                    return (
                      <div key={item.id} className="bg-white dark:bg-[#282526] rounded-2xl border border-stone-200 dark:border-white/10 overflow-hidden shadow-2xs transition-all">
                        {/* Dish Card Row */}
                        <div
                          onClick={() => handleExpandDish(item)}
                          className="p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Dish Image */}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 shrink-0 flex items-center justify-center p-1 relative overflow-hidden">
                            <img
                              src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)}
                              alt={item.name}
                              className="w-full h-full object-contain drop-shadow-sm select-none"
                              loading="lazy"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm truncate font-['Outfit']">{item.name}</p>
                            <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-zinc-400 truncate flex items-center gap-1">
                              <span>{item.shopName || 'Satvik Kitchen'}</span>
                              {item.category && (
                                <>
                                  <span className="text-stone-300 dark:text-zinc-600">•</span>
                                  <span className="text-amber-700 dark:text-[#E0FF33] font-medium">{item.category}</span>
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-[#E0FF33]">₹{item.price}</span>
                              {item.kcal && (
                                <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500 flex items-center gap-0.5">
                                  <Flame size={9} />{item.kcal} kcal
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Direct Quick-Add Button (Zero Friction UX) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => handleDirectAddToCart(e, item)}
                              className={`h-8 px-3 rounded-full text-xs font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs ${
                                isAdded 
                                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-black' 
                                  : 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#E0FF33] dark:hover:bg-[#d4f828] dark:text-[#121011]'
                              }`}
                              title="Quick add to basket"
                            >
                              {isAdded ? (
                                <>
                                  <Check size={12} strokeWidth={3} />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={13} strokeWidth={3} />
                                  <span>Add</span>
                                </>
                              )}
                            </button>

                            <ChevronRight size={14} className={`text-stone-400 dark:text-zinc-500 transition-transform duration-200 ${expandedDish?.id === item.id ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded Dish Details */}
                        {expandedDish?.id === item.id && (
                          <div className="border-t border-stone-200 dark:border-white/10 p-3 sm:p-4 bg-stone-50/70 dark:bg-[#1E1B1C]/80 space-y-3 animate-fade-in">
                            {item.description && (
                              <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">{item.description}</p>
                            )}

                            {/* Macro Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.kcal && (
                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                  🔥 {item.kcal} kcal
                                </span>
                              )}
                              {item.protein && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  Protein: {item.protein}
                                </span>
                              )}
                              {item.carbs && (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                  Carbs: {item.carbs}
                                </span>
                              )}
                            </div>

                            {/* Quantity Stepper + Add Button */}
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <div className="flex items-center bg-white dark:bg-[#282526] rounded-full border border-stone-200 dark:border-white/10 h-9">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDishQty(q => Math.max(1, q - 1)); }}
                                  className="w-9 h-full flex items-center justify-center text-stone-700 dark:text-white hover:bg-stone-100 dark:hover:bg-white/10 rounded-l-full cursor-pointer"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="w-7 text-center text-xs font-black text-stone-900 dark:text-white">{dishQty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDishQty(q => Math.min(10, q + 1)); }}
                                  className="w-9 h-full flex items-center justify-center text-stone-700 dark:text-white hover:bg-stone-100 dark:hover:bg-white/10 rounded-r-full cursor-pointer"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddDishWithQty(item, dishQty);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#d4f828] text-white dark:text-[#121011] text-xs font-black px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-sm"
                              >
                                <ShoppingBag size={14} />
                                Add {dishQty > 1 ? `${dishQty} items` : ''} · ₹{item.price * dishQty}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── KITCHENS SECTION ─── */}
            {!loading && results.shops.length > 0 && (
              <div>
                <h4 className="text-[11px] font-black text-amber-700 dark:text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-['Outfit']">
                  <Store size={13} />
                  Kitchens & Outlets
                  <span className="text-stone-400 dark:text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.shops.length})</span>
                </h4>

                <div className="space-y-2">
                  {results.shops.map(shop => (
                    <div key={shop.id} className="bg-white dark:bg-[#282526] rounded-2xl border border-stone-200 dark:border-white/10 overflow-hidden shadow-2xs transition-all">
                      <div
                        onClick={() => handleExpandShop(shop)}
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-[#E0FF33]/10 border border-amber-500/20 dark:border-[#E0FF33]/20 shrink-0 flex items-center justify-center">
                            <Store size={18} className="text-amber-600 dark:text-[#E0FF33]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm truncate font-['Outfit']">{shop.name}</p>
                            <p className="text-[10px] text-stone-500 dark:text-zinc-400 flex items-center gap-1 truncate font-medium">
                              <MapPin size={10} className="shrink-0" />
                              {shop.address || 'Sri Vrindavan Dham'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveRecentSearch(shop.name);
                              onSelectShop(shop.id, shop.name);
                              handleAnimatedClose();
                            }}
                            className="px-3 py-1.5 bg-stone-100 dark:bg-white/10 hover:bg-amber-600 hover:text-white dark:hover:bg-[#E0FF33] dark:hover:text-black rounded-full text-xs font-bold text-stone-700 dark:text-zinc-200 transition-all cursor-pointer"
                          >
                            Open Menu
                          </button>
                          <ChevronRight size={15} className={`text-stone-400 dark:text-zinc-500 transition-transform duration-200 ${expandedShop?.id === shop.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Kitchen Preview */}
                      {expandedShop?.id === shop.id && (
                        <div className="border-t border-stone-200 dark:border-white/10 p-3 sm:p-4 bg-stone-50/70 dark:bg-[#1E1B1C]/80 space-y-2.5 animate-fade-in">
                          {loadingShopMenu ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="w-5 h-5 border-2 border-amber-600 dark:border-[#E0FF33] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : shopMenuItems.length > 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Top Items from this kitchen</p>
                              {shopMenuItems.slice(0, 4).map((menuItem, idx) => (
                                <div
                                  key={menuItem.id || idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandDish({ ...menuItem, shopName: shop.name, shopId: shop.id });
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#282526] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#1E1B1C] p-0.5 shrink-0 flex items-center justify-center">
                                      <img
                                        src={resolveDishCutout(menuItem.image || menuItem.imageUrl, menuItem.name, menuItem.category)}
                                        alt={menuItem.name}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">{menuItem.name}</span>
                                  </div>
                                  <span className="text-xs font-black text-amber-700 dark:text-[#E0FF33] shrink-0 ml-2">₹{menuItem.price}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-stone-500 dark:text-zinc-400 text-center py-2">No menu items published yet.</p>
                          )}
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
                <h4 className="text-[11px] font-black text-amber-700 dark:text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-['Outfit']">
                  <Receipt size={13} />
                  Matched Orders
                  <span className="text-stone-400 dark:text-zinc-500 font-semibold normal-case tracking-normal ml-1">({results.orders.length})</span>
                </h4>

                <div className="space-y-2">
                  {results.orders.map(order => (
                    <div key={order.id} className="bg-white dark:bg-[#282526] rounded-2xl border border-stone-200 dark:border-white/10 overflow-hidden shadow-2xs transition-all">
                      <div
                        onClick={() => handleExpandOrder(order)}
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm truncate font-['Outfit']">
                            {getOrderItemSummary(order) || `Order #${order.id.slice(-6).toUpperCase()}`}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-medium">
                            <Clock size={10} className="shrink-0" />
                            <span>{order.items?.length || 0} items</span>
                            <span>•</span>
                            <span className="font-bold text-amber-700 dark:text-[#E0FF33]">₹{order.total_amount || order.totalAmount || 0}</span>
                            <span>•</span>
                            <span className="font-mono">#{order.id.slice(-5).toUpperCase()}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9.5px] font-black px-2.5 py-1 rounded-full capitalize ${getStatusColor(order.status)}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                          <ChevronRight size={14} className={`text-stone-400 dark:text-zinc-500 transition-transform duration-200 ${expandedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Order Detail */}
                      {expandedOrder?.id === order.id && (
                        <div className="border-t border-stone-200 dark:border-white/10 p-3 sm:p-4 bg-stone-50/70 dark:bg-[#1E1B1C]/80 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase">Customer</p>
                              <p className="font-bold text-stone-900 dark:text-white">{order.customer_name || order.customerName || 'Guest'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase">Order Total</p>
                              <p className="font-black text-amber-700 dark:text-[#E0FF33] text-sm">₹{order.total_amount || order.totalAmount || 0}</p>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order.id, order);
                              handleAnimatedClose();
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#d4f828] text-white dark:text-[#121011] text-xs font-black py-2.5 rounded-full transition-all cursor-pointer shadow-xs"
                          >
                            <Receipt size={13} />
                            {['delivered', 'cancelled'].includes(order.status) ? 'View Order Summary' : 'Live Track Order'}
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

      {/* Dynamic Island Toast */}
      {toastMsg && (
        <DynamicToast
          message={toastMsg}
          type="success"
          onDismiss={() => setToastMsg(null)}
        />
      )}
    </>
  );
}
