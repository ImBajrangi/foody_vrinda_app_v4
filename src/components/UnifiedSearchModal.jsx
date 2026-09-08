import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCloudMenus, supabase, resolveDishCutout } from '../supabase';
import { Sparkles, Search, Store, Utensils, Receipt, X } from 'lucide-react';

export default function UnifiedSearchModal({ isOpen, onClose, onSelectShop, onSelectOrder }) {
  const { user, userRole, currentUserShopId, allShops } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState({ shops: [], menuItems: [], orders: [] });
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchInputRef = useRef(null);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setClosing(false);
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
        handleAnimatedClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleAnimatedClose]);

  const performSearch = useCallback(async (term) => {
    setLoading(true);
    try {
      // 1. Search Shops (Local filter)
      const matchedShops = allShops.filter(shop => 
        shop.name?.toLowerCase().includes(term) || 
        shop.address?.toLowerCase().includes(term)
      );

      // 2. Search Menu Items (Supabase cloud fetch)
      const allMenuItems = await getCloudMenus('all');
      const matchedMenuItems = (allMenuItems || []).filter(item => {
        const shop = allShops.find(s => s.id === item.shopId);
        item.shopName = shop ? shop.name : "Satvik Kitchen";
        return (
          item.name?.toLowerCase().includes(term) || 
          item.description?.toLowerCase().includes(term) ||
          item.shopName?.toLowerCase().includes(term)
        );
      });

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
        shops: matchedShops.slice(0, 5),
        menuItems: matchedMenuItems.slice(0, 5),
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

  if (!isOpen) return null;

  return (
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
          {loading && (
            <div className="text-center py-10 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-[#E0FF33] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-400 text-xs font-semibold">Searching cloud kitchens network...</p>
            </div>
          )}

          {!loading && !searchTerm.trim() && (
            <div className="text-center py-10 text-zinc-400">
              <Sparkles className="w-8 h-8 text-[#E0FF33] mx-auto mb-2 opacity-90" />
              <p className="text-xs font-medium">Type keywords to search kitchens, dishes, or orders.</p>
            </div>
          )}

          {!loading && searchTerm.trim() && 
            results.shops.length === 0 && 
            results.menuItems.length === 0 && 
            results.orders.length === 0 && (
              <p className="text-center text-zinc-400 py-10 text-xs font-medium">No matches found for "{searchTerm}".</p>
          )}

          {/* Kitchens Section */}
          {!loading && results.shops.length > 0 && (
            <div>
              <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Store size={14} /> Cloud Kitchens
              </h4>
              <div className="divide-y divide-white/5 bg-[#1E1B1C] rounded-2xl p-2 border border-white/5">
                {results.shops.map(shop => (
                  <div 
                    key={shop.id}
                    onClick={() => {
                      onSelectShop(shop.id, shop.name);
                      handleAnimatedClose();
                    }}
                    className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex justify-between items-center apple-tap-target"
                  >
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">{shop.name}</p>
                      <p className="text-[11px] text-zinc-400">{shop.address || 'Vrindavan Dham'}</p>
                    </div>
                    <span className="text-[11px] font-black text-[#1E1B1C] bg-[#E0FF33] hover:bg-[#CCFF00] px-3 py-1 rounded-full">
                      View Menu
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dishes Section */}
          {!loading && results.menuItems.length > 0 && (
            <div>
              <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Utensils size={14} /> Satvik Dishes
              </h4>
              <div className="divide-y divide-white/5 bg-[#1E1B1C] rounded-2xl p-2 border border-white/5">
                {results.menuItems.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      onSelectShop(item.shopId, item.shopName);
                      handleAnimatedClose();
                    }}
                    className="p-2.5 sm:p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex justify-between items-center gap-3 apple-tap-target"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#282526] border border-white/10 shrink-0 flex items-center justify-center p-0.5">
                        <img 
                          src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)} 
                          alt={item.name}
                          className="w-full h-full object-contain drop-shadow-sm"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">{item.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">From {item.shopName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#E0FF33] shrink-0">₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Section */}
          {!loading && results.orders.length > 0 && (
            <div>
              <h4 className="text-[11px] font-black text-[#E0FF33] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Receipt size={14} /> Orders
              </h4>
              <div className="divide-y divide-white/5 bg-[#1E1B1C] rounded-2xl p-2 border border-white/5">
                {results.orders.map(order => (
                  <div 
                    key={order.id}
                    onClick={() => {
                      onSelectOrder(order.id, order);
                      handleAnimatedClose();
                    }}
                    className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex justify-between items-center apple-tap-target"
                  >
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[11px] text-zinc-400">
                        {order.customerName} • {order.items?.length || 0} items • ₹{order.totalAmount}
                      </p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full capitalize bg-white/10 text-white">
                      {order.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
