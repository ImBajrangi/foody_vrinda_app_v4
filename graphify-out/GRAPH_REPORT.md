# Graph Report - foody_vrinda_v3  (2026-09-19)

## Corpus Check
- 60 files · ~107,002 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 271 nodes · 815 edges · 24 communities (12 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e1b6470`
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
- ErrorBoundary
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
- NativeNotificationService
- CompleteProfileModal.jsx
- firebase.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 25 edges
3. `dispatchSafeEvent()` - 20 edges
4. `OwnerView()` - 19 edges
5. `setCachedItem()` - 17 edges
6. `CustomerView()` - 17 edges
7. `resolveDishCutout()` - 15 edges
8. `getCloudMenus()` - 15 edges
9. `updateCloudUser()` - 15 edges
10. `AuthProvider()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `App()` --calls--> `useBackHandler()`  [EXTRACTED]
  src/App.jsx → src/hooks/useBackHandler.js
- `ActiveOrderTrackingModal()` --calls--> `useBottomSheetDrag()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/hooks/useBottomSheetDrag.js
- `AuthModal()` --calls--> `updateCloudUser()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/supabase.js
- `CompleteProfileModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/CompleteProfileModal.jsx → src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (24 total, 12 thin omitted)

### Community 0 - "AuthContext.jsx"
Cohesion: 0.14
Nodes (21): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), MASTER_DEV_PIN, createCloudUser() (+13 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.14
Nodes (40): broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudMenuItem(), createCloudOffer(), createCloudShop(), DEFAULT_OFFERS (+32 more)

### Community 3 - "App.jsx"
Cohesion: 0.12
Nodes (22): App(), AuthModal(), DESK_CONFIG, EmergencyDevModal(), Header(), NotificationPanel(), OrderHistoryDrawer(), RewardsModal() (+14 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.09
Nodes (27): ActiveOrderCapsule(), ActiveOrderTrackingModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), REVIEW_TAGS, ReviewModal(), BouncingLoader() (+19 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.19
Nodes (23): ActiveAlarmBanner(), DynamicToast(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext(), useAudioAlarm(), useFastNotify() (+15 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 22 - "CompleteProfileModal.jsx"
Cohesion: 0.67
Nodes (4): CompleteProfileModal(), fetchAddressSuggestions(), getLocalCache(), setLocalCache()

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **43 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `OwnerView.jsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.jsx` to `AuthContext.jsx`, `supabase.js`, `CustomerView.jsx`, `OwnerView.jsx`, `CompleteProfileModal.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13825757575757575 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13526570048309178 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12317073170731707 - nodes in this community are weakly interconnected._