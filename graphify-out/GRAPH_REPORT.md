# Graph Report - foody_vrinda_v3  (2026-09-08)

## Corpus Check
- 44 files · ~44,924 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 354 edges · 19 communities (8 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `914c6ca6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthContext.jsx
- supabase.js
- App.jsx
- CustomerView.jsx
- KitchenView.jsx
- React + Vite
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

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 21 edges
2. `useCart()` - 13 edges
3. `getCloudMenus()` - 10 edges
4. `subscribeCloudOrders()` - 10 edges
5. `KitchenView()` - 10 edges
6. `OwnerView()` - 10 edges
7. `useAudioAlarm()` - 9 edges
8. `CustomerView()` - 9 edges
9. `supabase` - 8 edges
10. `resolveDishCutout()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `OrderHistoryDrawer()` --calls--> `useCart()`  [EXTRACTED]
  src/components/OrderHistoryDrawer.jsx → src/context/CartContext.jsx
- `UnifiedSearchModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/AuthContext.jsx
- `UnifiedSearchModal()` --calls--> `useCart()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/CartContext.jsx
- `AuthProvider()` --calls--> `getCloudShops()`  [EXTRACTED]
  src/context/AuthContext.jsx → src/supabase.js

## Import Cycles
- None detected.

## Communities (19 total, 11 thin omitted)

### Community 0 - "AuthContext.jsx"
Cohesion: 0.27
Nodes (10): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), app, auth (+2 more)

### Community 2 - "supabase.js"
Cohesion: 0.16
Nodes (21): UnifiedSearchModal(), HitSoochiService, LOCAL_SATVIK_ONTOLOGY, CACHE_TTL_MS, createCloudMenuItem(), DEFAULT_PRASAD_ITEMS, deleteCloudMenuItem(), getCachedItem() (+13 more)

### Community 3 - "App.jsx"
Cohesion: 0.18
Nodes (17): App(), AuthModal(), DESK_CONFIG, Header(), NotificationPanel(), RewardsModal(), UnauthorizedAccessScreen(), useAuth() (+9 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.13
Nodes (18): ActiveOrderTrackingModal(), MapPicker(), OrderHistoryDrawer(), QUANTITIES, QuantityPickerSheet(), REVIEW_TAGS, ReviewModal(), BouncingLoader() (+10 more)

### Community 5 - "KitchenView.jsx"
Cohesion: 0.43
Nodes (8): DynamicToast(), useAudioAlarm(), useFastNotify(), createCloudNotification(), subscribeCloudOrders(), updateCloudOrderStatus(), KitchenView(), TransportView()

### Community 6 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **27 isolated node(s):** `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS`, `StyledWrapper`, `StyledWrapper` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `App.jsx` to `AuthContext.jsx`, `supabase.js`, `CustomerView.jsx`, `KitchenView.jsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `RealtimeMultiplexer` connect `RealtimeMultiplexer` to `supabase.js`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._