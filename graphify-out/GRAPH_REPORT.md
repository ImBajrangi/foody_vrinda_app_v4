# Graph Report - foody_vrinda_v3  (2026-09-30)

## Corpus Check
- 65 files · ~127,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 348 nodes · 1036 edges · 27 communities (13 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aa3e5db9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ReviewModal.jsx
- run-android.js
- test-database-sync.js
- index.ts
- CustomerView.jsx
- OwnerView.jsx
- Foody Vrinda (v3)
- AppUpdateService
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

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 30 edges
2. `useAuth()` - 23 edges
3. `NativeNotificationService` - 23 edges
4. `dispatchSafeEvent()` - 22 edges
5. `updateCloudUser()` - 20 edges
6. `runTestSuite()` - 19 edges
7. `getCloudMenus()` - 19 edges
8. `OwnerView()` - 19 edges
9. `resolveDishCutout()` - 17 edges
10. `setCachedItem()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `deleteCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (27 total, 14 thin omitted)

### Community 0 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "test-database-sync.js"
Cohesion: 0.20
Nodes (12): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+4 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.11
Nodes (24): ActiveOrderCapsule(), ActiveOrderTrackingModal(), CompleteProfileModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper (+16 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.12
Nodes (33): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), UnifiedSearchModal(), useAuth(), DEFAULT_SEEDS, NotificationContext (+25 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.22
Nodes (5): getCachedItem(), getCloudRoles(), RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "supabase.js"
Cohesion: 0.09
Nodes (64): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), broadcastAlarmEvent(), CACHE_TTL_MS (+56 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "App.jsx"
Cohesion: 0.08
Nodes (31): App(), DeveloperView, KitchenView, OwnerView, TransportView, AppUpdateModal(), AuthModal(), DESK_CONFIG (+23 more)

## Knowledge Gaps
- **58 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `App.jsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `NOTIFICATION_TRIALS` connect `App.jsx` to `NativeNotificationService`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `OwnerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12244897959183673 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09261261261261261 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07987012987012987 - nodes in this community are weakly interconnected._