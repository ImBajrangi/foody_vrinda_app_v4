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

export default function App() {
  const { userRole, isAuthorizedAdmin, isAuthorizedDeveloper } = useAuth();
  const { setSelectedShopId } = useCart();
  const { audioUnlocked, enableAudio } = useAudioAlarm();

  // Navigation tab (instantly hydrated to user's authorized role view)
  const [currentTab, setCurrentTab] = useState(() => {
    try {
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

  // Modals Visibility
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isEmergencyDevOpen, setIsEmergencyDevOpen] = useState(false);

  // Active Customer Tracking Order ID
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Sync tab with user's role on load or role change
  useEffect(() => {
    if (userRole === 'grand_admin' || userRole === 'developer') {
      setCurrentTab('developer');
    } else if (['kitchen', 'owner'].includes(userRole)) {
      if (userRole === 'owner' && !isAuthorizedAdmin) {
        setCurrentTab('customer');
      } else {
        setCurrentTab(userRole);
      }
    } else if (userRole === 'delivery') {
      setCurrentTab('delivery');
    } else {
      setCurrentTab('customer');
    }
  }, [userRole, isAuthorizedAdmin, isAuthorizedDeveloper]);

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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('foody_open_emergency_dev', handleOpenEmergency);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('foody_open_emergency_dev', handleOpenEmergency);
    };
  }, []);

  // Dynamic Tab Meta Updates for Search Engines
  useEffect(() => {
    const titleMap = {
      kitchen: "Kitchen Operations Console | Foody Vrinda",
      delivery: "Rider Dispatch Board | Foody Vrinda Express",
      owner: "Management Console & Analytics | Foody Vrinda",
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
        onToggleRewards={() => setIsRewardsOpen(!isRewardsOpen)}
        onOpenCart={() => window.dispatchEvent(new CustomEvent('foody-open-cart'))}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <main className="min-h-[70vh]">
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
      </main>

      {/* OVERLAY MODALS */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
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
