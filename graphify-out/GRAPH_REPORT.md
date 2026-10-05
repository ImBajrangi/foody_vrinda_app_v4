# Graph Report - foody_vrinda_v3  (2026-10-05)

## Corpus Check
- 103 files · ~206,921 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 581 nodes · 1450 edges · 40 communities (25 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf4b4f5b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- run-android.js
- UnifiedSearchModal.jsx
- 🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete
- supabase.js
- Foody Vrinda (v3)
- test-live-rls-regression.mjs
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
- ErrorBoundary
- NativeNotificationService
- DeveloperView.jsx
- firebase.js
- Multi-Environment & Production Safety
- verify-delivery-hardened-evidence.js
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates
- test-role-and-tutorial.mjs
- test-wallet-multiplex.mjs
- verify_roles_and_db_sync.mjs
- CustomerView.jsx
- .ensureSubscribed
- 2. Step-by-Step Recovery Execution Chain
- seed-synthetic-beta-data.js
- appUpdateService.js
- verify-dr-integrity.js
- lint-migrations.js
- runBrowserTests

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 34 edges
2. `dispatchSafeEvent()` - 30 edges
3. `useAuth()` - 27 edges
4. `NativeNotificationService` - 25 edges
5. `setCachedItem()` - 22 edges
6. `TransportView()` - 21 edges
7. `updateCloudUser()` - 20 edges
8. `OwnerView()` - 20 edges
9. `runTestSuite()` - 19 edges
10. `getCloudMenus()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `calculateAuthoritativeOrderTotals()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `generateSecureOrderOTP()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (40 total, 15 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (49): filtered, rawMockDbLeaderboard, App(), CustomerView, DeveloperView, KitchenView, OwnerView, TransportView (+41 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "UnifiedSearchModal.jsx"
Cohesion: 0.23
Nodes (5): DynamicToast(), POPULAR_CATEGORIES, UnifiedSearchModal(), HitSoochiService, LOCAL_SATVIK_ONTOLOGY

### Community 4 - "🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Test Execution Matrix (22 / 22 Regression Tests), 3. Security Property Verification & Evidence Status, 4.1 Request Processing & Verification Pipeline, 4.2 Separation of Privilege & Execution Pipelines, 4. Architectural Analysis: End-to-End Control Flow, 5.1 Caller Identity Binding (`claim_order_pickup_atomic` & `verify_delivery_otp_atomic`), 5.2 One-Time Use OTP Verification (+18 more)

### Community 5 - "supabase.js"
Cohesion: 0.06
Nodes (82): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ActiveAlarmBanner() (+74 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Recovery, Foody Vrinda (v3)

### Community 9 - "test-live-rls-regression.mjs"
Cohesion: 0.28
Nodes (7): anonClient, isBlocked(), isBlockedOrEmpty(), log(), results, rpcFunctions, test()

### Community 22 - "DeveloperView.jsx"
Cohesion: 0.15
Nodes (45): AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, AuthProvider(), isAdminUser(), isDeveloperUser(), addDeletedShopId(), adminBlockUser() (+37 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Multi-Environment & Production Safety"
Cohesion: 0.12
Nodes (15): Active Engineering Rules, CI/CD, Token & Cost Protection Invariant, Commands, Credentials, Deployment Rules, Disaster Recovery & Rollback Standard, Environment Isolation, Foody Vrinda v3 — Project Commands & Rules (+7 more)

### Community 25 - "verify-delivery-hardened-evidence.js"
Cohesion: 0.32
Nodes (9): banner(), clampServerRadius(), COLORS, computeHaversineKm(), NOTE: delivery_coordinates is intentionally omitted pre-claim, runDeliveryHardeningEvidence(), sanitizeCoordinates(), simulateDiscoveryQuery() (+1 more)

### Community 27 - "Foody Vrinda — Design System & Theme Architecture Specification"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & Philosophy, 2.1 CSS Semantic Tokens Definition, 2. Global Semantic Color Token Matrix, 3.1 Typography Scale & Weights, 3.2 Spacing & Padding Scale, 3.3 Component Dimensions & Touch Targets, 3.4 Iconography Sizing Matrix, 3. Comprehensive Sizing, Spacing & Dimension Matrix (+15 more)

### Community 28 - "🌟 Foody Vrinda: System Architecture & Delivery Verification Updates"
Cohesion: 0.22
Nodes (8): 🧪 Build & Quality Verification, 🛡️ Daily Rotating Sarathi Token (`getDailySarathiCode`), 📊 End-to-End Chain-of-Custody Audit Fields, 📌 Executive Summary of System Enhancements, 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates, 📁 Key File Links, 🗄️ Supabase Database Migration DDL, 🔄 Two-Stage OTP Handover Lifecycle

### Community 29 - "test-role-and-tutorial.mjs"
Cohesion: 0.26
Nodes (16): deliveryAliases, milestoneDesc, mockStorage, negativeRoles, progressAfterStep1, restaurantAliases, RoleBasedTutorialModal(), getCanonicalRole() (+8 more)

### Community 30 - "test-wallet-multiplex.mjs"
Cohesion: 0.29
Nodes (5): activeWalletSubscriptions, createdChannels, mockSupabase, removedChannels, unsubA

### Community 31 - "verify_roles_and_db_sync.mjs"
Cohesion: 0.50
Nodes (4): recordTest(), results, runTestSuite(), supabase

### Community 32 - "CustomerView.jsx"
Cohesion: 0.10
Nodes (30): ActiveOrderCapsule(), ActiveOrderTrackingModal(), CompleteProfileModal(), MapPicker(), NotificationPanel(), QUANTITIES, QuantityPickerSheet(), CHEF_TAGS (+22 more)

### Community 35 - ".ensureSubscribed"
Cohesion: 0.12
Nodes (18): activePresetDishes, DEFAULT_PRESET_DISHES, findPresetByKeyword(), getPresetDishById(), getPresetDishes(), loadPresetDishes(), PRESET_CATEGORIES, createCloudPreset() (+10 more)

### Community 36 - "2. Step-by-Step Recovery Execution Chain"
Cohesion: 0.17
Nodes (11): 1. DR Acceptance Criteria Chain, 2. Step-by-Step Recovery Execution Chain, 3. Disaster Recovery Log Template, Foody Vrinda — Enterprise Disaster Recovery (DR) Runbook & Drill Protocol, Phase 1: Backup Selection & Integrity Attestation, Phase 2: Isolated Environment Provisioning (Zero Production Touch), Phase 3: Schema & Migration Parity Verification, Phase 4: RLS & Kernel Security Direct SQL Re-Verification (+3 more)

### Community 37 - "seed-synthetic-beta-data.js"
Cohesion: 0.25
Nodes (6): envName, supabase, SYNTHETIC_MENUS, SYNTHETIC_SHOPS, targetKey, targetUrl

### Community 39 - "verify-dr-integrity.js"
Cohesion: 0.40
Nodes (3): CRITICAL_TABLES, startTime, supabase

### Community 43 - "runBrowserTests"
Cohesion: 0.36
Nodes (4): CDPClient, fetchJson(), runBrowserTests(), sleep()

## Knowledge Gaps
- **151 isolated node(s):** `__filename`, `__dirname`, `__filename`, `__dirname`, `ROOT_DIR` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `App.jsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.jsx` to `CustomerView.jsx`, `UnifiedSearchModal.jsx`, `supabase.js`, `DeveloperView.jsx`, `test-role-and-tutorial.mjs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.jsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `__filename` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0593607305936073 - nodes in this community are weakly interconnected._
- **Should `🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0551930876388644 - nodes in this community are weakly interconnected._