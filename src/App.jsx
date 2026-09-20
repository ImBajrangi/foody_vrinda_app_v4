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
import CompleteProfileModal from './components/CompleteProfileModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './context/ThemeContext';
import { useBackHandler } from './hooks/useBackHandler';
import { executeTopBackHandler, shouldAllowAppExit } from './services/backHandlerService';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export default function App() {

  const { userRole, isAuthorizedAdmin, isAuthorizedDeveloper } = useAuth();
  const { setSelectedShopId } = useCart();
  const { audioUnlocked, enableAudio } = useAudioAlarm();
  const { isLight, theme } = useTheme();

  // Native Android & iOS Status Bar + Splash Screen Lifecycle Management
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupNativeUI = async () => {
      try {
        // Prevent WebView from sliding behind the Android system status bar / camera notch
        await StatusBar.setOverlaysWebView({ overlay: false });
        
        // Sync status bar theme with application light / dark palette
        if (isLight) {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#FAF7F2' });
        } else {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#1E1B1C' });
        }
      } catch (err) {
        console.warn('Native status bar sync error:', err);
      }

      try {
        // Smoothly dismiss native splash screen once React UI has fully mounted
        await SplashScreen.hide();
      } catch (_) {}
    };

    setupNativeUI();
  }, [isLight, theme]);

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

  // Global Ctrl+K (search) hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
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
    window.addEventListener('foody-open-auth', handleOpenAuth);
    window.addEventListener('foody_open_auth', handleOpenAuth);
    window.addEventListener('foody-complete-profile', handleOpenCompleteProfile);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('foody-open-auth', handleOpenAuth);
      window.removeEventListener('foody_open_auth', handleOpenAuth);
      window.removeEventListener('foody-complete-profile', handleOpenCompleteProfile);
    };
  }, []);

  // Web-to-App Relay Bridge for Mobile OAuth Callbacks
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    const hasAuthParams = 
      hash.includes('access_token=') || 
      search.includes('code=') || 
      hash.includes('refresh_token=');

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (hasAuthParams && isMobile) {
      const appDeepLink = `com.foodyvrinda.app://auth/callback${search}${hash}`;
      
      // Auto-bounce back into the native Android app
      const timer = setTimeout(() => {
        try {
          window.location.href = appDeepLink;
        } catch (_) {}
      }, 250);

      return () => clearTimeout(timer);
    }
  }, []);

  // Top-level Application Modals registered to Back Handler Stack
  useBackHandler(isAuthOpen, () => setIsAuthOpen(false), 'app_auth_modal', 10);
  useBackHandler(isSearchOpen, () => setIsSearchOpen(false), 'app_search_modal', 10);
  useBackHandler(isNotificationsOpen, () => setIsNotificationsOpen(false), 'app_notifications_modal', 10);
  useBackHandler(isRewardsOpen, () => setIsRewardsOpen(false), 'app_rewards_modal', 10);
  useBackHandler(isCompleteProfileOpen, () => setIsCompleteProfileOpen(false), 'app_complete_profile_modal', 15);

  // Centralized Native Hardware Back Button & Web Escape Key Controller
  useEffect(() => {
    let backListenerPromise = null;

    if (Capacitor.isNativePlatform()) {
      backListenerPromise = CapApp.addListener('backButton', () => {
        // 1. Check if any open modal/sheet/drawer was registered across the entire app
        if (executeTopBackHandler()) {
          return;
        }

        // 2. If switched to another desk/workspace, navigate back to customer storefront
        if (currentTab !== 'customer') {
          setCurrentTab('customer');
          return;
        }

        // 3. Root Screen Double-Back-To-Exit Protection
        if (shouldAllowAppExit()) {
          CapApp.exitApp();
        } else {
          window.dispatchEvent(new CustomEvent('foody_toast', {
            detail: {
              message: 'Press back again to exit Foody Vrinda',
              type: 'info',
              desc: 'Double-tap back button to leave'
            }
          }));
        }
      });
    }

    // Web Browser Escape Key Support
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        executeTopBackHandler();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (backListenerPromise) {
        backListenerPromise.then(l => l.remove()).catch(() => {});
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTab]);

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

  useEffect(() => {
    const handleSystemOrderOpen = (event) => {
      const orderId = event?.detail?.orderId;
      if (orderId) {
        handleNotificationOrderClick(orderId);
      }
    };

    window.addEventListener('foody:open-notification-order', handleSystemOrderOpen);
    return () => {
      window.removeEventListener('foody:open-notification-order', handleSystemOrderOpen);
    };
  }, []);

  const handleSearchOrderSelect = (orderId) => {
    setTrackingOrderId(orderId);
    setCurrentTab('customer');
    setIsSearchOpen(false);
  };

  return (
    <div className="mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 safe-area-top safe-area-bottom relative overflow-x-hidden w-full max-w-7xl">
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
    </div>
  );
}
