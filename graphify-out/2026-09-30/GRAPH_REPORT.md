# Graph Report - foody_vrinda_v3  (2026-09-30)

## Corpus Check
- 65 files · ~128,741 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 350 nodes · 1039 edges · 27 communities (13 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `279a9a02`
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

## Communities (27 total, 14 thin omitted)

### Community 0 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "AuthContext.jsx"
Cohesion: 0.26
Nodes (21): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), createCloudUser(), deleteCloudShop() (+13 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.12
Nodes (25): ActiveOrderCapsule(), ActiveOrderTrackingModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper, useNotifications() (+17 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.17
Nodes (27): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext() (+19 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "supabase.js"
Cohesion: 0.08
Nodes (59): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+51 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "App.jsx"
Cohesion: 0.07
Nodes (34): App(), DeveloperView, KitchenView, OwnerView, TransportView, AppUpdateModal(), AuthModal(), DESK_CONFIG (+26 more)

## Knowledge Gaps
- **58 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `App.jsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `NOTIFICATION_TRIALS` connect `App.jsx` to `NativeNotificationService`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11522048364153627 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07990867579908675 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06634615384615385 - nodes in this community are weakly interconnected._