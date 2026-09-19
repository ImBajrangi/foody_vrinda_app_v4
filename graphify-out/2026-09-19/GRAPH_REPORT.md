# Graph Report - foody_vrinda_v3  (2026-09-19)

## Corpus Check
- 57 files · ~105,357 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 857 edges · 23 communities (12 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4235c61`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OwnerView.jsx
- run-android.js
- supabase.js
- App.jsx
- CustomerView.jsx
- TransportView.jsx
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
- firebase.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 25 edges
3. `dispatchSafeEvent()` - 22 edges
4. `OwnerView()` - 19 edges
5. `setCachedItem()` - 17 edges
6. `updateCloudUser()` - 17 edges
7. `CustomerView()` - 17 edges
8. `KitchenView()` - 16 edges
9. `resolveDishCutout()` - 15 edges
10. `getCloudMenus()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.jsx → src/context/AuthContext.jsx
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `ActiveOrderTrackingModal()` --calls--> `useNotifications()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/context/NotificationContext.jsx
- `ActiveOrderTrackingModal()` --calls--> `useBackHandler()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/hooks/useBackHandler.js
- `ActiveOrderTrackingModal()` --calls--> `useBottomSheetDrag()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/hooks/useBottomSheetDrag.js

## Import Cycles
- None detected.

## Communities (23 total, 11 thin omitted)

### Community 0 - "OwnerView.jsx"
Cohesion: 0.28
Nodes (18): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), MASTER_DEV_PIN, createCloudUser() (+10 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.09
Nodes (54): CHEF_TAGS, ReviewModal(), RIDER_TAGS, broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudMenuItem() (+46 more)

### Community 3 - "App.jsx"
Cohesion: 0.08
Nodes (27): App(), AuthModal(), DESK_CONFIG, EmergencyDevModal(), ErrorBoundary, Header(), NotificationPanel(), OrderHistoryDrawer() (+19 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.14
Nodes (21): ActiveOrderCapsule(), ActiveOrderTrackingModal(), CompleteProfileModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper (+13 more)

### Community 5 - "TransportView.jsx"
Cohesion: 0.13
Nodes (27): ActiveAlarmBanner(), DynamicToast(), UnifiedSearchModal(), useAuth(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext() (+19 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **44 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `TransportView.jsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `TransportView.jsx` to `OwnerView.jsx`, `supabase.js`, `App.jsx`, `CustomerView.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09472606246799795 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08127721335268505 - nodes in this community are weakly interconnected._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._
- **Should `TransportView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12804878048780488 - nodes in this community are weakly interconnected._