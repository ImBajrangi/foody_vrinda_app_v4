# Graph Report - foody_vrinda_v3  (2026-10-01)

## Corpus Check
- 82 files · ~166,321 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 438 nodes · 1152 edges · 29 communities (17 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `406491e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CustomerView.jsx
- run-android.js
- supabase.js
- index.ts
- 🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete
- OwnerView.jsx
- Foody Vrinda (v3)
- test-live-rls-regression.mjs
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
- .ensureSubscribed
- NativeNotificationService
- DeveloperView.jsx
- firebase.js
- Active Engineering Rules
- App.jsx
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 30 edges
2. `NativeNotificationService` - 25 edges
3. `useAuth()` - 23 edges
4. `dispatchSafeEvent()` - 22 edges
5. `updateCloudUser()` - 20 edges
6. `runTestSuite()` - 19 edges
7. `setCachedItem()` - 19 edges
8. `getCloudMenus()` - 19 edges
9. `OwnerView()` - 19 edges
10. `TransportView()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `verifyOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `calculateAuthoritativeOrderTotals()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (29 total, 12 thin omitted)

### Community 0 - "CustomerView.jsx"
Cohesion: 0.11
Nodes (29): ActiveOrderCapsule(), ActiveOrderTrackingModal(), Header(), MapPicker(), NotificationPanel(), OrderHistoryDrawer(), CHEF_TAGS, ReviewModal() (+21 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.07
Nodes (50): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), QUANTITIES (+42 more)

### Community 4 - "🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Test Execution Matrix (22 / 22 Regression Tests), 3. Security Property Verification & Evidence Status, 4.1 Request Processing & Verification Pipeline, 4.2 Separation of Privilege & Execution Pipelines, 4. Architectural Analysis: End-to-End Control Flow, 5.1 Caller Identity Binding (`claim_order_pickup_atomic` & `verify_delivery_otp_atomic`), 5.2 One-Time Use OTP Verification (+18 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.10
Nodes (38): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), POPULAR_CATEGORIES, UnifiedSearchModal(), useAuth(), DEFAULT_SEEDS (+30 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Recovery, Foody Vrinda (v3)

### Community 9 - "test-live-rls-regression.mjs"
Cohesion: 0.28
Nodes (7): anonClient, isBlocked(), isBlockedOrEmpty(), log(), results, rpcFunctions, test()

### Community 20 - ".ensureSubscribed"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 21 - "NativeNotificationService"
Cohesion: 0.12
Nodes (9): AuthModal(), DESK_CONFIG, SoundTrialsModal(), SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS, NativeNotificationService, nativeNotify (+1 more)

### Community 22 - "DeveloperView.jsx"
Cohesion: 0.18
Nodes (37): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), broadcastAlarmEvent(), createCloudOffer() (+29 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "App.jsx"
Cohesion: 0.07
Nodes (24): App(), CustomerView, DeveloperView, KitchenView, OwnerView, TransportView, AppUpdateModal(), CompleteProfileModal() (+16 more)

### Community 27 - "Foody Vrinda — Design System & Theme Architecture Specification"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & Philosophy, 2.1 CSS Semantic Tokens Definition, 2. Global Semantic Color Token Matrix, 3.1 Typography Scale & Weights, 3.2 Spacing & Padding Scale, 3.3 Component Dimensions & Touch Targets, 3.4 Iconography Sizing Matrix, 3. Comprehensive Sizing, Spacing & Dimension Matrix (+15 more)

### Community 28 - "🌟 Foody Vrinda: System Architecture & Delivery Verification Updates"
Cohesion: 0.22
Nodes (8): 🧪 Build & Quality Verification, 🛡️ Daily Rotating Sarathi Token (`getDailySarathiCode`), 📊 End-to-End Chain-of-Custody Audit Fields, 📌 Executive Summary of System Enhancements, 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates, 📁 Key File Links, 🗄️ Supabase Database Migration DDL, 🔄 Two-Stage OTP Handover Lifecycle

## Knowledge Gaps
- **102 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `OwnerView.jsx` to `CustomerView.jsx`, `supabase.js`, `NativeNotificationService`, `DeveloperView.jsx`, `App.jsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10741971207087486 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06573426573426573 - nodes in this community are weakly interconnected._
- **Should `🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `OwnerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.103424178895877 - nodes in this community are weakly interconnected._
- **Should `NativeNotificationService` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._