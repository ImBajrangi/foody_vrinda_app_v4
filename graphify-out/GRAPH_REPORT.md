# Graph Report - foody_vrinda_v3  (2026-09-19)

## Corpus Check
- 60 files · ~110,058 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 279 nodes · 836 edges · 25 communities (13 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `22b9d353`
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
- RealtimeMultiplexer
- NativeNotificationService
- ReviewModal.jsx
- firebase.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 25 edges
3. `dispatchSafeEvent()` - 22 edges
4. `OwnerView()` - 19 edges
5. `setCachedItem()` - 17 edges
6. `CustomerView()` - 17 edges
7. `updateCloudUser()` - 16 edges
8. `resolveDishCutout()` - 15 edges
9. `getCloudMenus()` - 15 edges
10. `KitchenView()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.jsx → src/context/AuthContext.jsx
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `ActiveOrderTrackingModal()` --calls--> `resolveDishCutout()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/supabase.js
- `ActiveOrderTrackingModal()` --calls--> `subscribeSingleCloudOrder()`  [EXTRACTED]
  src/components/ActiveOrderTrackingModal.jsx → src/supabase.js
- `AuthModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (25 total, 12 thin omitted)

### Community 0 - "AuthContext.jsx"
Cohesion: 0.27
Nodes (17): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), MASTER_DEV_PIN, createCloudUser() (+9 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.12
Nodes (44): broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudMenuItem(), createCloudOffer(), createCloudShop(), DEFAULT_OFFERS (+36 more)

### Community 3 - "App.jsx"
Cohesion: 0.11
Nodes (26): App(), ActiveOrderTrackingModal(), AuthModal(), DESK_CONFIG, EmergencyDevModal(), Header(), NotificationPanel(), OrderHistoryDrawer() (+18 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.11
Nodes (22): ActiveOrderCapsule(), CompleteProfileModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper, SocialLinksBar() (+14 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.15
Nodes (26): ActiveAlarmBanner(), DynamicToast(), UnifiedSearchModal(), useAuth(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext() (+18 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.22
Nodes (5): getCachedItem(), getCloudRoles(), RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **44 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `OwnerView.jsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `OwnerView.jsx` to `AuthContext.jsx`, `supabase.js`, `App.jsx`, `CustomerView.jsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12163265306122449 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11416490486257928 - nodes in this community are weakly interconnected._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11174242424242424 - nodes in this community are weakly interconnected._