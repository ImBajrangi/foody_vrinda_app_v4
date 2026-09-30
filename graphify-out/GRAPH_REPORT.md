# Graph Report - foody_vrinda_v3  (2026-09-30)

## Corpus Check
- 61 files · ~123,581 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 329 nodes · 1008 edges · 24 communities (12 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0a5545e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- run-android.js
- test-database-sync.js
- ErrorBoundary
- CustomerView.jsx
- OwnerView.jsx
- Foody Vrinda (v3)
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

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 30 edges
2. `useAuth()` - 23 edges
3. `dispatchSafeEvent()` - 22 edges
4. `NativeNotificationService` - 21 edges
5. `updateCloudUser()` - 20 edges
6. `runTestSuite()` - 19 edges
7. `getCloudMenus()` - 19 edges
8. `OwnerView()` - 19 edges
9. `resolveDishCutout()` - 17 edges
10. `setCachedItem()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `deleteCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (24 total, 12 thin omitted)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "test-database-sync.js"
Cohesion: 0.17
Nodes (19): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+11 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.10
Nodes (26): ActiveOrderCapsule(), ActiveOrderTrackingModal(), MapPicker(), OrderHistoryDrawer(), QUANTITIES, QuantityPickerSheet(), CHEF_TAGS, ReviewModal() (+18 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.18
Nodes (24): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), NotificationProvider(), getAudioContext(), useAudioAlarm(), useFastNotify(), createCloudNotification() (+16 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.23
Nodes (4): RealtimeMultiplexer, subscribeCloudNotifications(), subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "supabase.js"
Cohesion: 0.10
Nodes (57): AuthProvider(), broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudMenuItem(), createCloudOffer(), createCloudReview() (+49 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Active Engineering Rules"
Cohesion: 0.29
Nodes (6): Active Engineering Rules, Commands, Foody Vrinda v3 — Project Commands & Rules, Rule [GPU Budget Guard]:, Rule [Mobile Touch-First Standard]:, Rule [Native Bottom Sheet Invariant]:

### Community 25 - "App.jsx"
Cohesion: 0.07
Nodes (41): App(), DeveloperView, KitchenView, OwnerView, TransportView, AuthModal(), DESK_CONFIG, CompleteProfileModal() (+33 more)

## Knowledge Gaps
- **56 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `App.jsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `NOTIFICATION_TRIALS` connect `App.jsx` to `NativeNotificationService`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10365853658536585 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10442890442890443 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07319347319347319 - nodes in this community are weakly interconnected._