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

export default function App() {
  const { userRole, isAuthorizedAdmin, isAuthorizedDeveloper } = useAuth();
  const { setSelectedShopId } = useCart();
  const { audioUnlocked, enableAudio } = useAudioAlarm();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState('customer');
  const [prevUserRole, setPrevUserRole] = useState(userRole);

  // Modals Visibility
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);

  // Active Customer Tracking Order ID
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Sync tab with user's role on load/change during rendering
  if (userRole !== prevUserRole) {
    setPrevUserRole(userRole);
    if (['kitchen', 'owner', 'developer'].includes(userRole)) {
      if (userRole === 'owner' && !isAuthorizedAdmin) {
        setCurrentTab('customer');
      } else if (userRole === 'developer' && !isAuthorizedDeveloper) {
        setCurrentTab('customer');
      } else {
        setCurrentTab(userRole);
      }
    } else if (userRole === 'delivery') {
      setCurrentTab('delivery');
    } else {
      setCurrentTab('customer');
    }
  }

  // Global Ctrl+K hotkey for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <div className={`mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 relative ${currentTab === 'customer' ? 'max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl' : 'max-w-7xl'}`}>
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
    </div>
  );
}
