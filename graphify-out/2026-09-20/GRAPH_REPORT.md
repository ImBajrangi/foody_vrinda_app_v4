# Graph Report - foody_vrinda_v3  (2026-09-20)

## Corpus Check
- 60 files · ~116,519 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 301 nodes · 927 edges · 26 communities (13 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db56d21c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test-database-sync.js
- run-android.js
- DeveloperView.jsx
- ErrorBoundary
- CustomerView.jsx
- OwnerView.jsx
- Foody Vrinda (v3)
- SocialLinksBar.jsx
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
- setCachedItem
- NativeNotificationService
- supabase.js
- firebase.js
- HitSoochiService

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 31 edges
2. `useAuth()` - 23 edges
3. `dispatchSafeEvent()` - 22 edges
4. `runTestSuite()` - 19 edges
5. `getCloudMenus()` - 19 edges
6. `OwnerView()` - 19 edges
7. `resolveDishCutout()` - 17 edges
8. `setCachedItem()` - 17 edges
9. `updateCloudUser()` - 17 edges
10. `CustomerView()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `deleteCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getRecommendedRiders()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (26 total, 13 thin omitted)

### Community 0 - "test-database-sync.js"
Cohesion: 0.19
Nodes (16): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+8 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "DeveloperView.jsx"
Cohesion: 0.17
Nodes (40): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), broadcastAlarmEvent(), createCloudMenuItem() (+32 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.09
Nodes (42): App(), ActiveOrderCapsule(), ActiveOrderTrackingModal(), AuthModal(), DESK_CONFIG, CompleteProfileModal(), Header(), NotificationPanel() (+34 more)

### Community 5 - "OwnerView.jsx"
Cohesion: 0.14
Nodes (28): MapPicker(), ActiveAlarmBanner(), DynamicToast(), NativeTimePicker(), SearchableDropdown(), DEFAULT_SEEDS, NotificationContext, NotificationProvider() (+20 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Master Access & Lockout Prevention System, Foody Vrinda (v3)

### Community 9 - "SocialLinksBar.jsx"
Cohesion: 0.40
Nodes (3): SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS

### Community 20 - "setCachedItem"
Cohesion: 0.22
Nodes (5): getCloudRoles(), RealtimeMultiplexer, setCachedItem(), subscribeCloudOffers(), subscribeCloudShops()

### Community 22 - "supabase.js"
Cohesion: 0.08
Nodes (24): CHEF_TAGS, ReviewModal(), RIDER_TAGS, CACHE_TTL_MS, calculateDistanceKm(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL, createCloudReview(), DEFAULT_OFFERS (+16 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

## Knowledge Gaps
- **46 isolated node(s):** `__filename`, `__dirname`, `ROOT_DIR`, `ANDROID_DIR`, `APK_PATH` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `OwnerView.jsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `CustomerView.jsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `RealtimeMultiplexer` connect `setCachedItem` to `DeveloperView.jsx`, `supabase.js`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `ROOT_DIR` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08638625056535504 - nodes in this community are weakly interconnected._
- **Should `OwnerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1423076923076923 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._