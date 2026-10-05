# Graph Report - foody_vrinda_v3  (2026-10-05)

## Corpus Check
- 101 files · ~205,454 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 569 nodes · 1436 edges · 37 communities (25 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1be3374`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CustomerView.jsx
- run-android.js
- .ensureSubscribed
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
- NativeNotificationService
- DeveloperView.jsx
- firebase.js
- Multi-Environment & Production Safety
- verify-delivery-hardened-evidence.js
- test_push_workflow.mjs
- Foody Vrinda — Design System & Theme Architecture Specification
- 🌟 Foody Vrinda: System Architecture & Delivery Verification Updates
- App.jsx
- verify_roles_and_db_sync.mjs
- OwnerView.jsx
- 2. Step-by-Step Recovery Execution Chain
- seed-synthetic-beta-data.js
- AuthContext.jsx
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
- `runAdversarialTestSuite()` --calls--> `generateSecureOrderOTP()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runAdversarialTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/supabase.js
- `runTestSuite()` --calls--> `createCloudOrder()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `generateSecureOrderOTP()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/test-database-sync.js → src/supabase.js

## Import Cycles
- None detected.

## Communities (37 total, 12 thin omitted)

### Community 0 - "CustomerView.jsx"
Cohesion: 0.07
Nodes (38): ActiveOrderCapsule(), ActiveOrderTrackingModal(), Header(), MapPicker(), NotificationPanel(), OrderHistoryDrawer(), QUANTITIES, QuantityPickerSheet() (+30 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - ".ensureSubscribed"
Cohesion: 0.24
Nodes (4): invalidateCache(), RealtimeMultiplexer, subscribeCloudOffers(), subscribeCloudShops()

### Community 4 - "🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Test Execution Matrix (22 / 22 Regression Tests), 3. Security Property Verification & Evidence Status, 4.1 Request Processing & Verification Pipeline, 4.2 Separation of Privilege & Execution Pipelines, 4. Architectural Analysis: End-to-End Control Flow, 5.1 Caller Identity Binding (`claim_order_pickup_atomic` & `verify_delivery_otp_atomic`), 5.2 One-Time Use OTP Verification (+18 more)

### Community 5 - "supabase.js"
Cohesion: 0.07
Nodes (55): ActiveAlarmBanner(), DEFAULT_SEEDS, NotificationContext, NotificationProvider(), getAudioContext(), useAudioAlarm(), useFastNotify(), CACHE_TTL_MS (+47 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Recovery, Foody Vrinda (v3)

### Community 9 - "test-live-rls-regression.mjs"
Cohesion: 0.28
Nodes (7): anonClient, isBlocked(), isBlockedOrEmpty(), log(), results, rpcFunctions, test()

### Community 21 - "NativeNotificationService"
Cohesion: 0.12
Nodes (9): AuthModal(), DESK_CONFIG, SoundTrialsModal(), SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS, NativeNotificationService, nativeNotify (+1 more)

### Community 22 - "DeveloperView.jsx"
Cohesion: 0.17
Nodes (39): AuthProvider(), addDeletedShopId(), adminBlockUser(), adminForceSignout(), adminRevokeUser(), adminUnblockUser(), broadcastAlarmEvent(), createCloudOffer() (+31 more)

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

### Community 29 - "App.jsx"
Cohesion: 0.06
Nodes (41): deliveryAliases, milestoneDesc, mockStorage, negativeRoles, progressAfterStep1, restaurantAliases, App(), CustomerView (+33 more)

### Community 31 - "verify_roles_and_db_sync.mjs"
Cohesion: 0.50
Nodes (4): recordTest(), results, runTestSuite(), supabase

### Community 35 - "OwnerView.jsx"
Cohesion: 0.10
Nodes (39): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), NativeTimePicker() (+31 more)

### Community 36 - "2. Step-by-Step Recovery Execution Chain"
Cohesion: 0.17
Nodes (11): 1. DR Acceptance Criteria Chain, 2. Step-by-Step Recovery Execution Chain, 3. Disaster Recovery Log Template, Foody Vrinda — Enterprise Disaster Recovery (DR) Runbook & Drill Protocol, Phase 1: Backup Selection & Integrity Attestation, Phase 2: Isolated Environment Provisioning (Zero Production Touch), Phase 3: Schema & Migration Parity Verification, Phase 4: RLS & Kernel Security Direct SQL Re-Verification (+3 more)

### Community 37 - "seed-synthetic-beta-data.js"
Cohesion: 0.25
Nodes (6): envName, supabase, SYNTHETIC_MENUS, SYNTHETIC_SHOPS, targetKey, targetUrl

### Community 38 - "AuthContext.jsx"
Cohesion: 0.16
Nodes (20): FVRewardsDashboard(), RewardsModal(), AuthContext, AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_DEV_EMAILS, isAdminUser(), isDeveloperUser(), FV_EXCHANGE_RATE (+12 more)

### Community 39 - "verify-dr-integrity.js"
Cohesion: 0.40
Nodes (3): CRITICAL_TABLES, startTime, supabase

### Community 43 - "runBrowserTests"
Cohesion: 0.36
Nodes (4): CDPClient, fetchJson(), runBrowserTests(), sleep()

## Knowledge Gaps
- **143 isolated node(s):** `__filename`, `__dirname`, `__filename`, `__dirname`, `ROOT_DIR` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `App.jsx` to `CustomerView.jsx`, `OwnerView.jsx`, `supabase.js`, `AuthContext.jsx`, `NativeNotificationService`, `DeveloperView.jsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `__filename` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomerView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0715846994535519 - nodes in this community are weakly interconnected._
- **Should `🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `supabase.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06572769953051644 - nodes in this community are weakly interconnected._
- **Should `NativeNotificationService` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._
- **Should `Multi-Environment & Production Safety` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._