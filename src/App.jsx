import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useAudioAlarm } from './hooks/useAudioAlarm';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import NotificationPanel from './components/NotificationPanel';
import UnifiedSearchModal from './components/UnifiedSearchModal';
import CustomerView from './views/CustomerView';
import KitchenView from './views/KitchenView';
import TransportView from './views/TransportView';
import OwnerView from './views/OwnerView';
import DeveloperView from './views/DeveloperView';
import RewardsModal from './components/RewardsModal';
import UnauthorizedAccessScreen from './components/UnauthorizedAccessScreen';
import EmergencyDevModal from './components/EmergencyDevModal';
import CompleteProfileModal from './components/CompleteProfileModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const { userRole, isAuthorizedAdmin, isAuthorizedDeveloper } = useAuth();
  const { setSelectedShopId } = useCart();
  const { audioUnlocked, enableAudio } = useAudioAlarm();

  // Navigation tab (instantly hydrated to user's saved tab or authorized role view)
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('foody_active_tab');
      if (savedTab && ['customer', 'kitchen', 'delivery', 'owner', 'developer'].includes(savedTab)) {
        return savedTab;
      }
      const saved = localStorage.getItem('foody_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role) {
          if (parsed.role === 'grand_admin') return 'developer';
          if (['kitchen', 'delivery', 'owner', 'developer'].includes(parsed.role)) return parsed.role;
        }
      }
    } catch (e) {}
    return 'customer';
  });

  // Persist active tab across browser reloads
  useEffect(() => {
    if (currentTab) {
      try {
        localStorage.setItem('foody_active_tab', currentTab);
      } catch (e) {}
    }
  }, [currentTab]);

  // Modals Visibility
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isEmergencyDevOpen, setIsEmergencyDevOpen] = useState(false);

  // Active Customer Tracking Order ID (persisted across reloads)
  const [trackingOrderId, setTrackingOrderId] = useState(() => {
    try {
      return localStorage.getItem('foody_active_tracking_id') || null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (trackingOrderId) {
        localStorage.setItem('foody_active_tracking_id', trackingOrderId);
      } else {
        localStorage.removeItem('foody_active_tracking_id');
      }
    } catch (e) {}
  }, [trackingOrderId]);

  // Sanitize privileged views if user loses permissions, without disrupting active storefront browsing
  useEffect(() => {
    if (currentTab === 'owner' && !isAuthorizedAdmin) {
      setCurrentTab('customer');
    } else if (currentTab === 'developer' && !isAuthorizedDeveloper) {
      setCurrentTab('customer');
    }
  }, [currentTab, isAuthorizedAdmin, isAuthorizedDeveloper]);

  // Global Ctrl+K (search) & Ctrl+Shift+D (Emergency Dev Console) hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Emergency Developer Mode Hotkey: Ctrl+Shift+D / Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsEmergencyDevOpen(true);
      }
    };
    const handleOpenEmergency = () => setIsEmergencyDevOpen(true);
    const handleOpenAuth = () => setIsAuthOpen(true);
    const handleOpenCompleteProfile = (e) => {
      const isForced = e?.detail?.force === true;
      if (!isForced) {
        try {
          const lastDismissed = localStorage.getItem('foody_profile_prompt_dismissed_at');
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;
          if (lastDismissed && (Date.now() - parseInt(lastDismissed, 10)) < ONE_DAY_MS) {
            // User dismissed recently; keep it side and do not impose on user
            return;
          }
        } catch (_) {}
      }
      setIsCompleteProfileOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('foody_open_emergency_dev', handleOpenEmergency);
    window.addEventListener('foody-open-auth', handleOpenAuth);
    window.addEventListener('foody_open_auth', handleOpenAuth);
    window.addEventListener('foody-complete-profile', handleOpenCompleteProfile);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('foody_open_emergency_dev', handleOpenEmergency);
      window.removeEventListener('foody-open-auth', handleOpenAuth);
      window.removeEventListener('foody_open_auth', handleOpenAuth);
      window.removeEventListener('foody-complete-profile', handleOpenCompleteProfile);
    };
  }, []);

  // Dynamic Tab Meta Updates for Search Engines
  useEffect(() => {
    const titleMap = {
      customer: "Foody Vrinda | 100% Pure Satvik Desi Ghee Prasad Delivery",
      kitchen: "Kitchen Dashboard | Foody Vrinda",
      delivery: "Sarathi Fleet Dispatch | Foody Vrinda",
      owner: "Temple Kitchen Operations Desk | Foody Vrinda",
      developer: "Developer Console | Foody Vrinda Platform"
    };

    const descMap = {
      kitchen: "Real-time kitchen management and order processing for Foody Vrinda partners and chefs.",
      delivery: "Interactive route maps, GPS tracking, and delivery dispatch for Foody Vrinda riders.",
      owner: "Track sales, manage kitchens, modify menus, and monitor user profiles in real-time.",
      developer: "Developer controls, user impersonation, and debugging tools."
    };

    if (currentTab !== 'customer') {
      const title = titleMap[currentTab] || "Foody Vrinda";
      const description = descMap[currentTab] || "Authentic Satvik Cloud Kitchen";
      
      document.title = title;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', title);
      
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }
  }, [currentTab]);

  const handleNotificationOrderClick = (orderId) => {
    setTrackingOrderId(orderId);
    setCurrentTab('customer');
    setIsNotificationsOpen(false);
  };

  const handleSearchOrderSelect = (orderId) => {
    setTrackingOrderId(orderId);
    setCurrentTab('customer');
    setIsSearchOpen(false);
  };

  return (
    <div className={`mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 relative overflow-x-hidden w-full ${currentTab === 'customer' ? 'max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl' : 'max-w-7xl'}`}>
      <Header 
        audioUnlocked={audioUnlocked}
        enableAudio={enableAudio}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        onToggleAuth={() => setIsAuthOpen(!isAuthOpen)}
        onToggleOrders={() => {
          setTrackingOrderId(null);
          setCurrentTab('customer');
        }}
        onOpenCart={() => {
          if (currentTab !== 'customer') {
            setCurrentTab('customer');
          }
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('foody-open-cart'));
          }, 30);
        }}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <main className="w-full">
        <ErrorBoundary>
          {currentTab === 'customer' && (
            <CustomerView 
              trackingOrderId={trackingOrderId}
              setTrackingOrderId={setTrackingOrderId}
            />
          )}
          
          {currentTab === 'kitchen' && <KitchenView />}

          {currentTab === 'delivery' && <TransportView />}

          {currentTab === 'owner' && (
            isAuthorizedAdmin ? (
              <OwnerView />
            ) : (
              <UnauthorizedAccessScreen 
                requiredRole="Administrator" 
                onAuthenticate={() => setIsAuthOpen(true)}
                onReturnStore={() => setCurrentTab('customer')}
                onEmergencyOverride={() => setIsEmergencyDevOpen(true)}
              />
            )
          )}

          {currentTab === 'developer' && (
            isAuthorizedDeveloper ? (
              <DeveloperView setCurrentTab={setCurrentTab} />
            ) : (
              <UnauthorizedAccessScreen 
                requiredRole="Developer" 
                onAuthenticate={() => setIsAuthOpen(true)}
                onReturnStore={() => setCurrentTab('customer')}
                onEmergencyOverride={() => setIsEmergencyDevOpen(true)}
              />
            )
          )}
        </ErrorBoundary>
      </main>

      {/* OVERLAY MODALS */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <CompleteProfileModal
        isOpen={isCompleteProfileOpen}
        onClose={() => setIsCompleteProfileOpen(false)}
        onSaveComplete={() => {
          setIsCompleteProfileOpen(false);
        }}
      />

      <RewardsModal 
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
      />

      <NotificationPanel 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNotificationClick={handleNotificationOrderClick}
      />

      <UnifiedSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectShop={(shopId) => {
          if (shopId) setSelectedShopId(shopId);
          setCurrentTab('customer');
        }}
        onSelectOrder={handleSearchOrderSelect}
      />

      {/* Emergency Developer Console Reclaim Modal */}
      <EmergencyDevModal
        isOpen={isEmergencyDevOpen}
        onClose={() => setIsEmergencyDevOpen(false)}
        onSuccess={() => {
          setCurrentTab('developer');
        }}
      />
    </div>
  );
}
