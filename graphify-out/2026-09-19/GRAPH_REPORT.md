# Graph Report - foody_vrinda_v3  (2026-09-19)

## Corpus Check
- 60 files · ~106,534 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 271 nodes · 812 edges · 25 communities (14 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c299feb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthContext.jsx
- run-android.js
- supabase.js
- App.jsx
- CustomerView.jsx
- OwnerView.jsx
- Foody Vrinda (v3)
- RealtimeMultiplexer
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
- UnifiedSearchModal
- NativeNotificationService
- CompleteProfileModal.jsx
- firebase.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 25 edges
3. `dispatchSafeEvent()` - 20 edges
4. `OwnerView()` - 19 edges
5. `setCachedItem()` - 17 edges
6. `CustomerView()` - 16 edges
7. `resolveDishCutout()` - 15 edges
8. `getCloudMenus()` - 15 edges
9. `updateCloudUser()` - 15 edges
10. `AuthProvider()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.jsx → src/context/AuthContext.jsx
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `App()` --calls--> `useBackHandler()`  [EXTRACTED]
  src/App.jsx → src/hooks/useBackHandler.js
- `ActiveOrderTrackingModal()` --calls--> `useNotifications()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/context/NotificationContext.jsx
- `ActiveOrderTrackingModal()` --calls--> `useBottomSheetDrag()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/hooks/useBottomSheetDrag.js

## Import Cycles
- None detected.

## Communities (25 total, 11 thin omitted)

### Community 0 - "AuthContext.jsx"
Cohesion: 0.27
Nodes (17): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), MASTER_DEV_PIN, createCloudUser() (+9 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.14
Nodes (40): broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudMenuItem(), createCloudOffer(), createCloudShop(), DEFAULT_OFFERS (+32 more)

### Community 3 - "App.jsx"
Cohesion: 0.12
Nodes (20): App(), AuthModal(), DESK_CONFIG, EmergencyDevModal(), ErrorBoundary, Header(), NotificationPanel(), OrderHistoryDrawer() (+12 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.09
Nodes (26): ActiveOrderCapsule(), ActiveOrderTrackingModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), REVIEW_TAGS, ReviewModal(), BouncingLoader() (+18 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.20
Nodes (23): ActiveAlarmBanner(), DynamicToast(), useAuth(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext(), useAudioAlarm() (+15 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 9 - "RealtimeMultiplexer"
Cohesion: 0.22
Nodes (5): getCachedItem(), getCloudRoles(), RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 20 - "UnifiedSearchModal"
Cohesion: 0.29
Nodes (3): UnifiedSearchModal(), HitSoochiService, LOCAL_SATVIK_ONTOLOGY

### Community 22 - "CompleteProfileModal.jsx"
Cohesion: 0.67
Nodes (4): CompleteProfileModal(), fetchAddressSuggestions(), getLocalCache(), setLocalCache()

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **43 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `OwnerView.jsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `OwnerView.jsx` to `AuthContext.jsx`, `supabase.js`, `App.jsx`, `CustomerView.jsx`, `UnifiedSearchModal`, `CompleteProfileModal.jsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13526570048309178 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09268292682926829 - nodes in this community are weakly interconnected._