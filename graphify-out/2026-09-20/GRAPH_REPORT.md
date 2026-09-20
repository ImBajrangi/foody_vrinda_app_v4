# Graph Report - foody_vrinda_v3  (2026-09-20)

## Corpus Check
- 60 files · ~112,145 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 293 nodes · 897 edges · 24 communities (13 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0f6e891`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UnifiedSearchModal
- run-android.js
- supabase.js
- App.jsx
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
- AuthContext.jsx
- firebase.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 25 edges
3. `dispatchSafeEvent()` - 22 edges
4. `OwnerView()` - 19 edges
5. `resolveDishCutout()` - 17 edges
6. `setCachedItem()` - 17 edges
7. `getCloudMenus()` - 17 edges
8. `updateCloudUser()` - 17 edges
9. `CustomerView()` - 17 edges
10. `KitchenView()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `resolveDishCutout()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `updateCloudOrderStatus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudOrder()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `deleteCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (24 total, 11 thin omitted)

### Community 0 - "UnifiedSearchModal"
Cohesion: 0.29
Nodes (3): UnifiedSearchModal(), HitSoochiService, LOCAL_SATVIK_ONTOLOGY

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.10
Nodes (51): COLORS, pass(), runTestSuite(), section(), broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL (+43 more)

### Community 3 - "App.jsx"
Cohesion: 0.10
Nodes (25): App(), AuthModal(), DESK_CONFIG, EmergencyDevModal(), ErrorBoundary, Header(), NotificationPanel(), OrderHistoryDrawer() (+17 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.09
Nodes (26): ActiveOrderCapsule(), ActiveOrderTrackingModal(), CompleteProfileModal(), MapPicker(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper (+18 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.15
Nodes (29): ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), useAuth(), DEFAULT_SEEDS, NotificationContext, NotificationProvider() (+21 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 20 - "RealtimeMultiplexer"
Cohesion: 0.26
Nodes (3): RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "AuthContext.jsx"
Cohesion: 0.26
Nodes (18): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), MASTER_DEV_PIN, createCloudUser() (+10 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **45 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `OwnerView.jsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `OwnerView.jsx` to `UnifiedSearchModal`, `supabase.js`, `App.jsx`, `CustomerView.jsx`, `AuthContext.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10491803278688525 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09595959595959595 - nodes in this community are weakly interconnected._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09407665505226481 - nodes in this community are weakly interconnected._