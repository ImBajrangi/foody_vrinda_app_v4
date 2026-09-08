# Graph Report - foody_vrinda_v3  (2026-09-08)

## Corpus Check
- 43 files · ~43,302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 183 nodes · 470 edges · 20 communities (9 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fad2c39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- main.jsx
- supabase.js
- App.jsx
- CustomerView.jsx
- NotificationContext.jsx
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
1. `useAuth()` - 23 edges
2. `useAuth()` - 21 edges
3. `useCart()` - 13 edges
4. `db` - 13 edges
5. `getCloudMenus()` - 10 edges
6. `subscribeCloudOrders()` - 10 edges
7. `KitchenView()` - 10 edges
8. `OwnerView()` - 10 edges
9. `useAudioAlarm()` - 9 edges
10. `CustomerView()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.jsx → src/context/AuthContext.jsx
- `App()` --calls--> `useAudioAlarm()`  [EXTRACTED]
  src/App.jsx → src/hooks/useAudioAlarm.js
- `Header()` --calls--> `useNotifications()`  [EXTRACTED]
  src/components/Header.jsx → src/context/NotificationContext.jsx
- `UnifiedSearchModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/AuthContext.jsx
- `UnifiedSearchModal()` --calls--> `useCart()`  [EXTRACTED]
  src/components/UnifiedSearchModal.jsx → src/context/CartContext.jsx

## Import Cycles
- None detected.

## Communities (20 total, 11 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.15
Nodes (20): AuthModal(), UnifiedSearchModal(), AuthContext, useAuth(), CartContext, CartProvider(), useCart(), useAudioAlarm() (+12 more)

### Community 1 - "main.jsx"
Cohesion: 0.23
Nodes (8): Header(), NotificationPanel(), AuthProvider(), NotificationContext, NotificationProvider(), useNotifications(), CartContext, CartProvider()

### Community 2 - "supabase.js"
Cohesion: 0.11
Nodes (28): MapPicker(), REVIEW_TAGS, ReviewModal(), UnifiedSearchModal(), AuthContext, AuthProvider(), isDeveloperUser(), HitSoochiService (+20 more)

### Community 3 - "App.jsx"
Cohesion: 0.23
Nodes (16): App(), AuthModal(), DESK_CONFIG, Header(), OrderHistoryDrawer(), RewardsModal(), DynamicToast(), useAuth() (+8 more)

### Community 4 - "CustomerView.jsx"
Cohesion: 0.18
Nodes (13): ActiveOrderTrackingModal(), QUANTITIES, QuantityPickerSheet(), BouncingLoader(), StyledWrapper, useGeolocation(), fetchAddressSuggestions(), getLocalCache() (+5 more)

### Community 5 - "NotificationContext.jsx"
Cohesion: 0.36
Nodes (7): NotificationPanel(), NotificationContext, NotificationProvider(), useNotifications(), createCloudNotification(), markCloudNotificationRead(), subscribeCloudNotifications()

### Community 6 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **32 isolated node(s):** `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS`, `StyledWrapper`, `StyledWrapper` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `useAuth` to `main.jsx`, `App.jsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `RealtimeMultiplexer` connect `RealtimeMultiplexer` to `supabase.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.jsx` to `supabase.js`, `CustomerView.jsx`, `NotificationContext.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `DESK_CONFIG`, `StyledWrapper`, `REVIEW_TAGS` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11379800853485064 - nodes in this community are weakly interconnected._