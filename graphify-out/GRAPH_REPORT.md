# Graph Report - foody_vrinda_v3  (2026-10-04)

## Corpus Check
- 93 files · ~192,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 511 nodes · 1274 edges · 37 communities (23 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8d7d75d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CustomerView.jsx
- run-android.js
- test-database-sync.js
- 🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete
- TransportView.jsx
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
- AuthContext.jsx
- NativeNotificationService
- supabase.js
- firebase.js
- Multi-Environment & Production Safety
- supabase
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates
- ErrorBoundary
- verify_roles_and_db_sync.mjs
- .ensureSubscribed
- ReviewModal.jsx
- 2. Step-by-Step Recovery Execution Chain
- seed-synthetic-beta-data.js
- verify-dr-integrity.js
- lint-migrations.js

## God Nodes (most connected - your core abstractions)
1. `DeveloperView()` - 30 edges
2. `dispatchSafeEvent()` - 27 edges
3. `NativeNotificationService` - 25 edges
4. `useAuth()` - 23 edges
5. `TransportView()` - 21 edges
6. `updateCloudUser()` - 20 edges
7. `OwnerView()` - 20 edges
8. `runTestSuite()` - 19 edges
9. `setCachedItem()` - 19 edges
10. `getCloudMenus()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `runAdversarialTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `deleteCloudMenuItem()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (37 total, 14 thin omitted)

### Community 0 - "CustomerView.jsx"
Cohesion: 0.06
Nodes (56): App(), CustomerView, DeveloperView, KitchenView, OwnerView, TransportView, ActiveOrderCapsule(), ActiveOrderTrackingModal() (+48 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "test-database-sync.js"
Cohesion: 0.14
Nodes (20): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), ALLOWED_ORDER_TRANSITIONS (+12 more)

### Community 4 - "🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Test Execution Matrix (22 / 22 Regression Tests), 3. Security Property Verification & Evidence Status, 4.1 Request Processing & Verification Pipeline, 4.2 Separation of Privilege & Execution Pipelines, 4. Architectural Analysis: End-to-End Control Flow, 5.1 Caller Identity Binding (`claim_order_pickup_atomic` & `verify_delivery_otp_atomic`), 5.2 One-Time Use OTP Verification (+18 more)

### Community 5 - "TransportView.jsx"
Cohesion: 0.13
Nodes (33): ActiveAlarmBanner(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext(), useAudioAlarm(), useFastNotify(), calculateDistanceInMeters() (+25 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Recovery, Foody Vrinda (v3)

### Community 9 - "test-live-rls-regression.mjs"
Cohesion: 0.28
Nodes (7): anonClient, isBlocked(), isBlockedOrEmpty(), log(), results, rpcFunctions, test()

### Community 20 - "AuthContext.jsx"
Cohesion: 0.17
Nodes (13): DESK_CONFIG, SoundTrialsModal(), SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS, AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS (+5 more)

### Community 22 - "supabase.js"
Cohesion: 0.07
Nodes (75): NativeTimePicker(), activePresetDishes, DEFAULT_PRESET_DISHES, findPresetByKeyword(), getPresetDishById(), getPresetDishes(), loadPresetDishes(), PRESET_CATEGORIES (+67 more)

### Community 23 - "firebase.js"
Cohesion: 0.50
Nodes (3): app, auth, db

### Community 24 - "Multi-Environment & Production Safety"
Cohesion: 0.13
Nodes (14): Active Engineering Rules, Commands, Credentials, Deployment Rules, Disaster Recovery & Rollback Standard, Environment Isolation, Foody Vrinda v3 — Project Commands & Rules, Migration Rules (+6 more)

### Community 25 - "supabase"
Cohesion: 0.15
Nodes (9): banner(), clampServerRadius(), COLORS, computeHaversineKm(), runDeliveryHardeningEvidence(), sanitizeCoordinates(), AppUpdateService, CURRENT_APP_VERSION (+1 more)

### Community 27 - "Foody Vrinda — Design System & Theme Architecture Specification"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & Philosophy, 2.1 CSS Semantic Tokens Definition, 2. Global Semantic Color Token Matrix, 3.1 Typography Scale & Weights, 3.2 Spacing & Padding Scale, 3.3 Component Dimensions & Touch Targets, 3.4 Iconography Sizing Matrix, 3. Comprehensive Sizing, Spacing & Dimension Matrix (+15 more)

### Community 28 - "🌟 Foody Vrinda: System Architecture & Delivery Verification Updates"
Cohesion: 0.22
Nodes (8): 🧪 Build & Quality Verification, 🛡️ Daily Rotating Sarathi Token (`getDailySarathiCode`), 📊 End-to-End Chain-of-Custody Audit Fields, 📌 Executive Summary of System Enhancements, 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates, 📁 Key File Links, 🗄️ Supabase Database Migration DDL, 🔄 Two-Stage OTP Handover Lifecycle

### Community 31 - "verify_roles_and_db_sync.mjs"
Cohesion: 0.50
Nodes (4): recordTest(), results, runTestSuite(), supabase

### Community 34 - ".ensureSubscribed"
Cohesion: 0.24
Nodes (4): invalidateCache(), RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 35 - "ReviewModal.jsx"
Cohesion: 0.40
Nodes (5): CHEF_TAGS, ReviewModal(), RIDER_TAGS, createCloudReview(), recordMultiStaffReview()

### Community 36 - "2. Step-by-Step Recovery Execution Chain"
Cohesion: 0.17
Nodes (11): 1. DR Acceptance Criteria Chain, 2. Step-by-Step Recovery Execution Chain, 3. Disaster Recovery Log Template, Foody Vrinda — Enterprise Disaster Recovery (DR) Runbook & Drill Protocol, Phase 1: Backup Selection & Integrity Attestation, Phase 2: Isolated Environment Provisioning (Zero Production Touch), Phase 3: Schema & Migration Parity Verification, Phase 4: RLS & Kernel Security Direct SQL Re-Verification (+3 more)

### Community 37 - "seed-synthetic-beta-data.js"
Cohesion: 0.25
Nodes (6): envName, supabase, SYNTHETIC_MENUS, SYNTHETIC_SHOPS, targetKey, targetUrl

### Community 39 - "verify-dr-integrity.js"
Cohesion: 0.40
Nodes (3): CRITICAL_TABLES, startTime, supabase

## Knowledge Gaps
- **134 isolated node(s):** `__filename`, `__dirname`, `__filename`, `__dirname`, `ROOT_DIR` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NativeNotificationService` connect `NativeNotificationService` to `AuthContext.jsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `NOTIFICATION_TRIALS` connect `AuthContext.jsx` to `CustomerView.jsx`, `NativeNotificationService`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `CustomerView.jsx` to `AuthContext.jsx`, `TransportView.jsx`, `supabase.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `__filename` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056948798328108674 - nodes in this community are weakly interconnected._
- **Should `test-database-sync.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Should `🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._