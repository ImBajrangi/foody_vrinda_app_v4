# Graph Report - foody_vrinda_v3  (2026-09-08)

## Corpus Check
- 43 files · ~43,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 144 nodes · 341 edges · 20 communities (9 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fad2c39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthContext.jsx
- UnifiedSearchModal.jsx
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
- `OrderHistoryDrawer()` --calls--> `useCart()`  [EXTRACTED]
  src/components/OrderHistoryDrawer.jsx → src/context/CartContext.jsx
- `UnifiedSearchModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/AuthContext.jsx
- `UnifiedSearchModal()` --calls--> `useCart()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/CartContext.jsx
- `CustomerView()` --calls--> `useAuth()`  [EXTRACTED]
  src/views/CustomerView.jsx → src/context/AuthContext.jsx
- `KitchenView()` --calls--> `useAuth()`  [EXTRACTED]
  src/views/KitchenView.jsx → src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (20 total, 11 thin omitted)

### Community 0 - "AuthContext.jsx"
Cohesion: 0.25
Nodes (9): AuthContext, AuthProvider(), isDeveloperUser(), app, auth, db, firebaseConfig, getCachedItem() (+1 more)

### Community 1 - "UnifiedSearchModal.jsx"
Cohesion: 0.36
Nodes (5): UnifiedSearchModal(), HitSoochiService, LOCAL_SATVIK_ONTOLOGY, getCloudMenus(), resolveDishCutout()

### Community 2 - "supabase.js"
Cohesion: 0.22
Nodes (15): MapPicker(), CACHE_TTL_MS, createCloudMenuItem(), DEFAULT_PRASAD_ITEMS, deleteCloudMenuItem(), invalidateCache(), markCloudOrderCashCollected(), memoryCache (+7 more)

### Community 3 - "App.jsx"
Cohesion: 0.19
Nodes (17): App(), AuthModal(), DESK_CONFIG, Header(), NotificationPanel(), RewardsModal(), useAuth(), CartContext (+9 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.14
Nodes (16): ActiveOrderTrackingModal(), OrderHistoryDrawer(), QUANTITIES, QuantityPickerSheet(), REVIEW_TAGS, ReviewModal(), BouncingLoader(), StyledWrapper (+8 more)

### Community 5 - "KitchenView.jsx"
Cohesion: 0.45
Nodes (8): DynamicToast(), useFastNotify(), createCloudNotification(), createCloudOrder(), subscribeCloudOrders(), updateCloudOrderStatus(), KitchenView(), TransportView()

### Community 6 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **27 isolated node(s):** `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS`, `StyledWrapper`, `StyledWrapper` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `App.jsx` to `AuthContext.jsx`, `UnifiedSearchModal.jsx`, `supabase.js`, `CustomerView.jsx`, `KitchenView.jsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `RealtimeMultiplexer` connect `RealtimeMultiplexer` to `supabase.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._