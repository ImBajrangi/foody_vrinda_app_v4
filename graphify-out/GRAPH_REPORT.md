# Graph Report - foody_vrinda_v3  (2026-09-30)

## Corpus Check
- 66 files · ~132,747 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 375 nodes · 1062 edges · 28 communities (15 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `786985a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ReviewModal.jsx
- run-android.js
- AuthContext.jsx
- index.ts
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
- CustomerView.jsx
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- ErrorBoundary

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
- `runTestSuite()` --calls--> `markCloudOrderCashCollected()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `resolveDishCutout()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `updateCloudOrderStatus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `verifyOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (28 total, 13 thin omitted)

### Community 0 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "AuthContext.jsx"
Cohesion: 0.22
Nodes (21): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), CartProvider(), ThemeProvider() (+13 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.15
Nodes (30): MapPicker(), ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), DEFAULT_SEEDS, NotificationContext, NotificationProvider() (+22 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 9 - "appUpdateService.js"
Cohesion: 0.22
Nodes (3): AppUpdateModal(), AppUpdateService, CURRENT_APP_VERSION

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 21 - "NativeNotificationService"
Cohesion: 0.16
Nodes (4): SoundTrialsModal(), NativeNotificationService, nativeNotify, NOTIFICATION_TRIALS

### Community 22 - "supabase.js"
Cohesion: 0.08
Nodes (59): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+51 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "CustomerView.jsx"
Cohesion: 0.06
Nodes (51): App(), DeveloperView, KitchenView, OwnerView, TransportView, ActiveOrderCapsule(), ActiveOrderTrackingModal(), AuthModal() (+43 more)

### Community 27 - "Foody Vrinda — Design System & Theme Architecture Specification"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & Philosophy, 2.1 CSS Semantic Tokens Definition, 2. Global Semantic Color Token Matrix, 3.1 Typography Scale & Weights, 3.2 Spacing & Padding Scale, 3.3 Component Dimensions & Touch Targets, 3.4 Iconography Sizing Matrix, 3. Comprehensive Sizing, Spacing & Dimension Matrix (+15 more)

## Knowledge Gaps
- **75 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NOTIFICATION_TRIALS` connect `NativeNotificationService` to `CustomerView.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `CustomerView.jsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OwnerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1475609756097561 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08105022831050228 - nodes in this community are weakly interconnected._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06413730803974707 - nodes in this community are weakly interconnected._
- **Should `Foody Vrinda — Design System & Theme Architecture Specification` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._