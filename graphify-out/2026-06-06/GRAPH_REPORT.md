# Graph Report - foody_vrinda_v3  (2026-06-06)

## Corpus Check
- 21 files · ~18,093 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 52 nodes · 137 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9eed63bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Src App|Src App]]
- [[_COMMUNITY_Context Notificationcontext|Context Notificationcontext]]
- [[_COMMUNITY_Views Ownerview|Views Ownerview]]
- [[_COMMUNITY_Context Authcontext|Context Authcontext]]
- [[_COMMUNITY_Src Firebase|Src Firebase]]
- [[_COMMUNITY_Views Customerview|Views Customerview]]
- [[_COMMUNITY_Readme React|Readme React]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 23 edges
2. `db` - 11 edges
3. `useAudioAlarm()` - 9 edges
4. `useCart()` - 5 edges
5. `useNotifications()` - 5 edges
6. `auth` - 5 edges
7. `useFastNotify()` - 5 edges
8. `KitchenView()` - 4 edges
9. `TransportView()` - 4 edges
10. `App()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.jsx → src/context/AuthContext.jsx
- `AuthModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/context/AuthContext.jsx
- `AuthModal()` --calls--> `useCart()`  [EXTRACTED]
  src/components/AuthModal.jsx → src/context/CartContext.jsx
- `Header()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Header.jsx → src/context/AuthContext.jsx
- `NotificationPanel()` --calls--> `useNotifications()`  [EXTRACTED]
  src/components/NotificationPanel.jsx → src/context/NotificationContext.jsx

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Src App"
Cohesion: 0.40
Nodes (7): useAudioAlarm(), useFastNotify(), App(), db, DeveloperView(), KitchenView(), TransportView()

### Community 1 - "Context Notificationcontext"
Cohesion: 0.39
Nodes (5): Header(), NotificationPanel(), NotificationContext, NotificationProvider(), useNotifications()

### Community 2 - "Views Ownerview"
Cohesion: 0.32
Nodes (4): UnifiedSearchModal(), useAuth(), DAYS_OF_WEEK, OwnerView()

### Community 3 - "Context Authcontext"
Cohesion: 0.43
Nodes (4): AuthContext, AuthProvider(), CartContext, CartProvider()

### Community 4 - "Src Firebase"
Cohesion: 0.40
Nodes (4): AuthModal(), app, auth, firebaseConfig

### Community 5 - "Views Customerview"
Cohesion: 0.67
Nodes (3): useCart(), CustomerView(), DAYS_OF_WEEK

### Community 6 - "Readme React"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **9 isolated node(s):** `AuthContext`, `CartContext`, `NotificationContext`, `firebaseConfig`, `app` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Views Ownerview` to `Src App`, `Context Notificationcontext`, `Context Authcontext`, `Src Firebase`, `Views Customerview`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `db` connect `Src App` to `Context Notificationcontext`, `Views Ownerview`, `Context Authcontext`, `Src Firebase`, `Views Customerview`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `AuthContext`, `CartContext`, `NotificationContext` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._