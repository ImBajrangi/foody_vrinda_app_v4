import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useAudioAlarm } from './hooks/useAudioAlarm';
import Header from './components/Header';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-split overlay modals to load strictly on demand
const AuthModal = lazyWithRetry(() => import('./components/AuthModal'));
const NotificationPanel = lazyWithRetry(() => import('./components/NotificationPanel'));
const UnifiedSearchModal = lazyWithRetry(() => import('./components/UnifiedSearchModal'));
const RewardsModal = lazyWithRetry(() => import('./components/RewardsModal'));
const UnauthorizedAccessScreen = lazyWithRetry(() => import('./components/UnauthorizedAccessScreen'));
const CompleteProfileModal = lazyWithRetry(() => import('./components/CompleteProfileModal'));
const AppUpdateModal = lazyWithRetry(() => import('./components/AppUpdateModal'));
const RoleBasedTutorialModal = lazyWithRetry(() => import('./components/RoleBasedTutorialModal'));
const AppInstallModal = lazyWithRetry(() => import('./components/AppInstallModal'));

import {
  isTutorialCompleted,
  getTutorialKeyForRole,
  markTutorialCompleted,
  initAppVisitTracking,
  shouldAutoLaunchTutorial,
  clearNewUserTutorialEligibility
} from './services/tutorialService';
import appUpdateService from './services/appUpdateService';
import { ErrorBoundary } from './components/ErrorBoundary';

// Code-split all role views to reduce initial boot payload with auto-retry on stale deployments
const CustomerView = lazyWithRetry(() => import('./views/CustomerView'));
const KitchenView = lazyWithRetry(() => import('./views/KitchenView'));
const TransportView = lazyWithRetry(() => import('./views/TransportView'));
const OwnerView = lazyWithRetry(() => import('./views/OwnerView'));
const DeveloperView = lazyWithRetry(() => import('./views/DeveloperView'));
import { useTheme } from './context/ThemeContext';
import { useBackHandler } from './hooks/useBackHandler';
import { executeTopBackHandler, shouldAllowAppExit, handleKeyboardOrInputDismiss } from './services/backHandlerService';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import FoodySplash from './foody/FoodySplash';
import ActiveAlarmBanner from './components/ui/ActiveAlarmBanner';
import OfflineInfoBar from './components/ui/OfflineInfoBar';

export default function App() {

  const {
    user,
    userData,
    userRole,
    isAuthenticated,
    loading: authLoading,
    isAuthorizedAdmin,
    isAuthorizedDeveloper,
    isPlatformAdmin,
    currentUserShopId
  } = useAuth();
  const { setSelectedShopId } = useCart();
  const { audioUnlocked, enableAudio, isPlaying, activeAlert, stopAlarm } = useAudioAlarm();
  const { isLight, theme } = useTheme();

  // Instant Native Splash Dismissal on Initial React Mount (Zero Startup Latency)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Immediately dismiss splash screen as soon as JavaScript boots
    requestAnimationFrame(async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 120 });
      } catch (_) { }
    });

    const setupNativeUI = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
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
    } catch (e) { }
    return 'customer';
  });

  // Persist active tab across browser reloads
  useEffect(() => {
    if (currentTab) {
      try {
        localStorage.setItem('foody_active_tab', currentTab);
      } catch (e) { }
    }
  }, [currentTab]);

  // Splash / First-Time Onboarding Animation Visibility
  // Website: NEVER show splash screen (instantly enter the store)
  // Native App: ONLY show once for genuine first-time users on onboarding, never on normal re-opens
  const [showSplash, setShowSplash] = useState(() => {
    try {
      // 1. Website (Browser): Splash screen completely disabled
      if (!Capacitor.isNativePlatform()) {
        return false;
      }
      // 2. Native App: only for first-time onboarding users, never on subsequent opens
      const alreadyOnboarded = localStorage.getItem('fv_onboarding_splash_shown') || localStorage.getItem('foody_onboarding_completed');
      if (alreadyOnboarded) {
        return false;
      }
      localStorage.setItem('fv_onboarding_splash_shown', 'true');
      return true;
    } catch (_) {
      return false;
    }
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialPanel, setTutorialPanel] = useState(null);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    try {
      localStorage.setItem('fv_onboarding_splash_shown', 'true');
    } catch (_) { }
  }, []);

  useEffect(() => {
    const handleReplaySplash = () => {
      setShowSplash(true);
    };
    window.addEventListener('foody:show-splash', handleReplaySplash);

    const handleOpenSearch = (e) => {
      setSearchInitialQuery(e?.detail?.query || '');
      setIsSearchOpen(true);
    };
    const handleOpenRewards = () => {
      setIsRewardsOpen(true);
    };
    const handleOpenInstall = () => {
      setIsInstallOpen(true);
    };

    window.addEventListener('foody:open-search', handleOpenSearch);
    window.addEventListener('foody_open_rewards', handleOpenRewards);
    window.addEventListener('foody:open-rewards', handleOpenRewards);
    window.addEventListener('foody:open-install-app', handleOpenInstall);
    return () => {
      window.removeEventListener('foody:show-splash', handleReplaySplash);
      window.removeEventListener('foody:open-search', handleOpenSearch);
      window.removeEventListener('foody_open_rewards', handleOpenRewards);
      window.removeEventListener('foody:open-rewards', handleOpenRewards);
      window.removeEventListener('foody:open-install-app', handleOpenInstall);
    };
  }, []);

  const handleToggleAuth = (mode = 'login') => {
    if (typeof mode === 'string' && (mode === 'login' || mode === 'signup')) {
      setAuthInitialMode(mode);
      setIsAuthOpen(true);
    } else {
      setIsAuthOpen(prev => !prev);
    }
  };

  // Background Auto-Update Engine (Checks Supabase Cloud for new APK release)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const isDismissed = typeof window !== 'undefined' && sessionStorage.getItem('foody_update_dismissed_session') === 'true';
        const info = await appUpdateService.checkForUpdates();
        if (info?.hasUpdate) {
          setUpdateInfo(info);
          if (!isDismissed || info.isMandatory) {
            setIsUpdateOpen(true);
          }
        }
      } catch (err) {
        console.warn('Auto update check notice:', err);
      }
    }, 1000);

    const handleManualCheck = async () => {
      try {
        const info = await appUpdateService.checkForUpdates();
        if (info?.hasUpdate) {
          setUpdateInfo(info);
          setIsUpdateOpen(true);
        }
      } catch (_) { }
    };

    window.addEventListener('foody:check-app-update', handleManualCheck);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('foody:check-app-update', handleManualCheck);
    };
  }, []);

  // Initialize device first-visit tracking on app boot
  useEffect(() => {
    initAppVisitTracking();
  }, []);

  // Panel-Specific First-Time User Tutorial (Auto-tour ONLY for eligible brand-new users on first visit)
  useEffect(() => {
    // 1. Guard against unauthenticated state or pending auth resolution
    if (authLoading || !isAuthenticated) return;

    // 2. Ensure real user ID exists
    const uid = user?.id || userData?.id;
    if (!uid) return;

    const activePanel = currentTab || 'customer';
    if (!getTutorialKeyForRole(activePanel)) return;

    // 3. Auto-launch tutorial ONLY if brand-new registered user on first visit & not completed
    try {
      if (shouldAutoLaunchTutorial(uid, activePanel)) {
        clearNewUserTutorialEligibility();
        const timer = setTimeout(() => {
          setTutorialPanel(activePanel);
          setIsTutorialOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (_) { }
  }, [authLoading, isAuthenticated, user?.id, userData?.id, currentTab]);

  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  // Replay Tutorial event listener (triggered from Settings / Profile / Help)
  useEffect(() => {
    const handleOpenTutorial = (e) => {
      const targetPanel = e?.detail?.panel || currentTabRef.current || 'customer';
      setTutorialPanel(targetPanel);
      setIsTutorialOpen(true);
    };
    window.addEventListener('foody:open-tutorial', handleOpenTutorial);
    return () => window.removeEventListener('foody:open-tutorial', handleOpenTutorial);
  }, []);

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
    } catch (e) { }
  }, [trackingOrderId]);

  // Sanitize privileged views if user loses permissions or lacks assigned shop
  useEffect(() => {
    if (authLoading) return;
    if (currentTab === 'owner') {
      if (!isAuthorizedAdmin || (!isPlatformAdmin && !currentUserShopId)) {
        setCurrentTab('customer');
      }
    } else if (currentTab === 'kitchen') {
      const hasKitchenPermission = Boolean(
        isPlatformAdmin || 
        (userRole === 'kitchen' && currentUserShopId) ||
        (userRole === 'owner' && currentUserShopId && (userData?.can_manage_kitchen !== false && !(userData?.devPermissions || []).includes('kitchen_disabled')))
      );
      if (!hasKitchenPermission) {
        setCurrentTab('customer');
      }
    } else if (currentTab === 'delivery') {
      const hasDeliveryPermission = Boolean(
        isPlatformAdmin || 
        userRole === 'delivery' ||
        ((userRole === 'owner' || userRole === 'kitchen') && (
          userData?.can_deliver || 
          userData?.canDeliver || 
          userData?.self_delivery || 
          (userData?.devPermissions || []).includes('can_deliver')
        ))
      );
      if (!hasDeliveryPermission) {
        setCurrentTab('customer');
      }
    } else if (currentTab === 'developer') {
      if (!isAuthorizedDeveloper && !isPlatformAdmin) {
        setCurrentTab('customer');
      }
    }
  }, [currentTab, isAuthorizedAdmin, isAuthorizedDeveloper, isPlatformAdmin, userRole, currentUserShopId, authLoading, userData]);

  // Global Ctrl+K (search) hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    const handleOpenAuth = (e) => {
      const mode = e?.detail?.mode || (typeof e?.detail === 'string' ? e.detail : 'login');
      setAuthInitialMode(mode);
      setIsAuthOpen(true);
    };
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
        } catch (_) { }
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
        } catch (_) { }
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
        // 0. If soft keyboard or an input field is active, dismiss it and consume the back press
        if (handleKeyboardOrInputDismiss()) {
          return;
        }

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
        if (handleKeyboardOrInputDismiss()) {
          return;
        }
        executeTopBackHandler();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (backListenerPromise) {
        backListenerPromise.then(l => l.remove()).catch(() => { });
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

  const handleNotificationOrderClick = (orderId, type) => {
    setTrackingOrderId(orderId);
    if (type === 'owner_order' || type === 'owner' || type === 'payment_settled') {
      setCurrentTab('owner');
    } else if (type === 'kitchen') {
      setCurrentTab('kitchen');
    } else if (type === 'driver' || type === 'early_dispatch' || type === 'pickup_ready') {
      setCurrentTab('transport');
    } else {
      setCurrentTab('customer');
    }
    setIsNotificationsOpen(false);
  };

  useEffect(() => {
    const handleSystemOrderOpen = (event) => {
      const orderId = event?.detail?.orderId;
      const type = event?.detail?.type;
      if (orderId) {
        handleNotificationOrderClick(orderId, type);
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

  // Capture referral code from URL parameters (?ref=... or ?referral=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('referral');
      if (refCode && refCode.trim()) {
        const cleanCode = refCode.trim().toUpperCase();
        localStorage.setItem('foody_pending_referral_code', cleanCode);
        window.dispatchEvent(new CustomEvent('foody:referral-detected', { detail: { code: cleanCode } }));
      }
    } catch (_) { }
  }, []);

  return (
    <>
      {/* Chrome-Style Native Top Slide-Down Offline Info Bar */}
      <OfflineInfoBar />

      {/* Pure Vector Animated Splash Screen (Zero-load, 60fps, tap to dismiss) */}
      {showSplash && (
        <FoodySplash
          speed={1.0}
          onDone={handleSplashDone}
        />
      )}

      <div className={`mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 safe-area-top safe-area-bottom relative overflow-x-hidden w-full max-w-7xl min-h-screen flex flex-col transition-opacity duration-300 ease-out ${showSplash ? 'opacity-90' : 'opacity-100'
        }`}>
        <Header
          audioUnlocked={audioUnlocked}
          enableAudio={enableAudio}
          onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
          onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
          onToggleAuth={handleToggleAuth}
          onToggleRewards={() => setIsRewardsOpen(!isRewardsOpen)}
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

        <main className="w-full flex-1 flex flex-col">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 dark:border-[#FD9139]/30 border-t-amber-500 dark:border-t-[#FD9139] animate-spin" />
              </div>
            }>
              {currentTab === 'customer' && (
                <CustomerView
                  trackingOrderId={trackingOrderId}
                  setTrackingOrderId={setTrackingOrderId}
                />
              )}

              {currentTab === 'kitchen' && (
                (isPlatformAdmin || (userRole === 'kitchen' && currentUserShopId) || (userRole === 'owner' && currentUserShopId && userData?.can_manage_kitchen !== false && !(userData?.devPermissions || []).includes('kitchen_disabled'))) ? (
                  <KitchenView />
                ) : (
                  <CustomerView
                    trackingOrderId={trackingOrderId}
                    setTrackingOrderId={setTrackingOrderId}
                  />
                )
              )}

              {currentTab === 'delivery' && (
                (isPlatformAdmin || userRole === 'delivery' || ((userRole === 'owner' || userRole === 'kitchen') && (userData?.can_deliver || userData?.canDeliver || userData?.self_delivery || (userData?.devPermissions || []).includes('can_deliver')))) ? (
                  <TransportView />
                ) : (
                  <CustomerView
                    trackingOrderId={trackingOrderId}
                    setTrackingOrderId={setTrackingOrderId}
                  />
                )
              )}

              {currentTab === 'owner' && (
                (isPlatformAdmin || (isAuthorizedAdmin && currentUserShopId)) ? (
                  <OwnerView />
                ) : (
                  <CustomerView
                    trackingOrderId={trackingOrderId}
                    setTrackingOrderId={setTrackingOrderId}
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
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* OVERLAY MODALS (Dynamically loaded on demand) */}
        <Suspense fallback={null}>
          {isAuthOpen && (
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              initialMode={authInitialMode}
            />
          )}

          {isCompleteProfileOpen && (
            <CompleteProfileModal
              isOpen={isCompleteProfileOpen}
              onClose={() => setIsCompleteProfileOpen(false)}
              onSaveComplete={() => {
                setIsCompleteProfileOpen(false);
              }}
            />
          )}

          {isRewardsOpen && (
            <RewardsModal
              isOpen={isRewardsOpen}
              onClose={() => setIsRewardsOpen(false)}
            />
          )}

          {isNotificationsOpen && (
            <NotificationPanel
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onNotificationClick={handleNotificationOrderClick}
            />
          )}

          {isSearchOpen && (
            <UnifiedSearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              initialQuery={searchInitialQuery}
              onSelectShop={(shopId) => {
                if (shopId) setSelectedShopId(shopId);
                setCurrentTab('customer');
              }}
              onSelectOrder={handleSearchOrderSelect}
            />
          )}

          {isUpdateOpen && (
            <AppUpdateModal
              isOpen={isUpdateOpen}
              updateInfo={updateInfo}
              onClose={() => setIsUpdateOpen(false)}
            />
          )}

          {isTutorialOpen && (
            <RoleBasedTutorialModal
              isOpen={isTutorialOpen}
              forceRole={tutorialPanel || currentTab}
              onClose={() => {
                const uid = user?.id || userData?.id;
                const panel = tutorialPanel || currentTab || 'customer';
                if (uid) markTutorialCompleted(uid, panel);
                setIsTutorialOpen(false);
              }}
              onComplete={() => {
                const uid = user?.id || userData?.id;
                const panel = tutorialPanel || currentTab || 'customer';
                if (uid) markTutorialCompleted(uid, panel);
                setIsTutorialOpen(false);
              }}
            />
          )}

          {isInstallOpen && (
            <AppInstallModal
              isOpen={isInstallOpen}
              onClose={() => setIsInstallOpen(false)}
            />
          )}

          {['customer', 'developer'].includes(currentTab) && isPlaying && activeAlert && (
            <ActiveAlarmBanner
              isPlaying={isPlaying}
              activeAlert={activeAlert}
              onSilence={stopAlarm}
              onActionClick={(alert) => {
                const targetRole = alert?.role || 'kitchen';
                if (['kitchen', 'owner', 'delivery'].includes(targetRole)) {
                  setCurrentTab(targetRole);
                }
              }}
            />
          )}
        </Suspense>
      </div>
    </>
  );
}
