# Graph Report - foody_vrinda_v3  (2026-09-30)

## Corpus Check
- 66 files · ~131,826 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 369 nodes · 1056 edges · 32 communities (18 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19137072`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ReviewModal.jsx
- run-android.js
- AuthContext.jsx
- index.ts
- CustomerView.jsx
- OwnerView.jsx
- Foody Vrinda (v3)
- appUpdateService.js
- Loader.jsx
- AMPMToggle.jsx
- DayNightSwitch.jsx
- HamburgerToggle.jsx
- NeumorphicToggle.jsx
- ProductCard.jsx
- RealismButton.jsx
- RewardButton.jsx
- SciFiLoader.jsx
- StarRating.jsx
- RealtimeMultiplexer
- NativeNotificationService
- supabase.js
- firebase.js
- Active Engineering Rules
- App.jsx
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- useBottomSheetDrag
- ErrorBoundary
- fetchAddressSuggestions
- CartContext.jsx

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 30 edges
2. `NativeNotificationService` - 25 edges
3. `useAuth()` - 23 edges
4. `dispatchSafeEvent()` - 22 edges
5. `updateCloudUser()` - 20 edges
6. `runTestSuite()` - 19 edges
7. `getCloudMenus()` - 19 edges
8. `OwnerView()` - 19 edges
9. `resolveDishCutout()` - 17 edges
10. `setCachedItem()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `getOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `resolveDishCutout()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `updateCloudOrderStatus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `verifyOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `calculateAuthoritativeOrderTotals()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (32 total, 14 thin omitted)

### Community 0 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "AuthContext.jsx"
Cohesion: 0.28
Nodes (19): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), createCloudUser(), deleteCloudUser() (+11 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.18
Nodes (15): ActiveOrderCapsule(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper, useGeolocation(), isShopCurrentlyOpen() (+7 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.12
Nodes (32): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), POPULAR_CATEGORIES, UnifiedSearchModal(), useAuth(), DEFAULT_SEEDS (+24 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 21 - "NativeNotificationService"
Cohesion: 0.12
Nodes (9): AuthModal(), DESK_CONFIG, SoundTrialsModal(), SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS, NativeNotificationService, nativeNotify (+1 more)

### Community 22 - "supabase.js"
Cohesion: 0.08
Nodes (61): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+53 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "App.jsx"
Cohesion: 0.15
Nodes (14): App(), DeveloperView, KitchenView, OwnerView, TransportView, AppUpdateModal(), RewardsModal(), UnauthorizedAccessScreen() (+6 more)

### Community 27 - "Foody Vrinda — Design System & Theme Architecture Specification"
Cohesion: 0.11
Nodes (17): 1. Executive Summary & Philosophy, 2.1 CSS Semantic Tokens Definition, 2. Global Semantic Color Token Matrix, 3.1 Button Hierarchy, 3.2 Live Maps, GPS Tracking & Pins (Sarathi / Rider), 3.3 Role Switcher & Header Navigation, 3.4 Modal Dialogs & Bottom Sheets, 3.5 Status Badges & Lifecycle States (+9 more)

### Community 28 - "useBottomSheetDrag"
Cohesion: 0.33
Nodes (9): ActiveOrderTrackingModal(), Header(), NotificationPanel(), OrderHistoryDrawer(), useCart(), useNotifications(), ThemeContext, useTheme() (+1 more)

### Community 30 - "fetchAddressSuggestions"
Cohesion: 0.67
Nodes (4): CompleteProfileModal(), fetchAddressSuggestions(), getLocalCache(), setLocalCache()

### Community 31 - "CartContext.jsx"
Cohesion: 0.50
Nodes (3): CartContext, CartProvider(), ThemeProvider()

## Knowledge Gaps
- **70 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.jsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OwnerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12056737588652482 - nodes in this community are weakly interconnected._
- **Should `NativeNotificationService` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07964912280701754 - nodes in this community are weakly interconnected._
- **Should `Foody Vrinda — Design System & Theme Architecture Specification` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._