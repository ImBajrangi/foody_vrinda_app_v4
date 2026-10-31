# Graph Report - foody_vrinda_v3  (2026-10-31)

## Corpus Check
- 165 files · ~311,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1045 nodes · 2554 edges · 64 communities (50 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c69a3126`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fvWalletService.js
- run-android.js
- supabase.monolith.backup.js
- 🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete
- AuthContext.jsx
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
- App.jsx
- test-wallet-multiplex.mjs
- verify_roles_and_db_sync.mjs
- CustomerView.jsx
- Implementation Sequence
- 🏛️ MASTER UI/UX & FULL-STACK APP ENGINEERING PLAYBOOK
- isTableMissing
- 2. Step-by-Step Recovery Execution Chain
- seed-synthetic-beta-data.js
- OneTimeCode.tsx
- verify-dr-integrity.js
- lint-migrations.js
- dispatchSafeEvent
- .ensureSubscribed
- runBrowserTests
- getCachedItem
- release-apk.mjs
- QuantityPickerSheet.jsx
- getCachedShops
- verify-supabase-parity.js
- Foody Vrinda animations (React + Capacitor)
- test-shop-isolation.mjs
- test-developer-api-sync.mjs
- StackedBars.tsx
- presetDishes.js
- AppUpdateService
- CreateMenu.tsx
- RollingCounter.tsx
- test-combo-engine.mjs
- run-all-tests.mjs
- runAtomicShopDeletionTests
- test-user-flow-e2e.mjs
- foodySplash.core.js

## God Nodes (most connected - your core abstractions)
1. `dispatchSafeEvent()` - 41 edges
2. `DeveloperView()` - 40 edges
3. `getCachedShops()` - 32 edges
4. `NativeNotificationService` - 31 edges
5. `setCachedItem()` - 30 edges
6. `dispatchSafeEvent()` - 30 edges
7. `CustomerView()` - 29 edges
8. `useAuth()` - 27 edges
9. `resolveDishCutout()` - 25 edges
10. `getCachedItem()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `updateCloudOrderStatus()`  [EXTRACTED]
  scripts/test-database-sync.js → src/services/supabase/orders.service.js
- `runTestSuite()` --calls--> `getCloudShops()`  [EXTRACTED]
  scripts/verify-delivery-and-counter-handover.mjs → src/services/supabase/shops.service.js
- `runTestSuite()` --calls--> `getCloudUsers()`  [EXTRACTED]
  scripts/verify-delivery-and-counter-handover.mjs → src/services/supabase/users.service.js
- `testRealtime()` --calls--> `subscribeCloudOrders()`  [EXTRACTED]
  scripts/verify-realtime-orders.mjs → src/services/supabase/realtime.service.js
- `runAdversarialTestSuite()` --calls--> `getCloudMenus()`  [EXTRACTED]
  scripts/test-adversarial-security.js → src/services/supabase/menus.service.js

## Import Cycles
- None detected.

## Communities (64 total, 14 thin omitted)

### Community 0 - "fvWalletService.js"
Cohesion: 0.08
Nodes (31): filtered, rawMockDbLeaderboard, AppInstallModal(), FVRewardsDashboard(), hasDevPermission(), Header(), FoodyVrindaLogo(), FoodyVrindaWordmark() (+23 more)

### Community 1 - "run-android.js"
Cohesion: 0.27
Nodes (10): ANDROID_DIR, APK_PATH, __dirname, ensureDeviceReady(), __filename, getConnectedDevices(), log(), main() (+2 more)

### Community 2 - "supabase.monolith.backup.js"
Cohesion: 0.05
Nodes (33): ALLOWED_ORDER_TRANSITIONS, broadcastAlarmEvent(), CACHE_TTL_MS, calculateDistanceInMeters(), calculateDistanceKm(), calculateOptimalDispatchWindow(), checkDeliveryGeofence(), COMPLETE_FOODY_DATABASE_SCHEMA_SQL (+25 more)

### Community 4 - "🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Test Execution Matrix (22 / 22 Regression Tests), 3. Security Property Verification & Evidence Status, 4.1 Request Processing & Verification Pipeline, 4.2 Separation of Privilege & Execution Pipelines, 4. Architectural Analysis: End-to-End Control Flow, 5.1 Caller Identity Binding (`claim_order_pickup_atomic` & `verify_delivery_otp_atomic`), 5.2 One-Time Use OTP Verification (+18 more)

### Community 5 - "AuthContext.jsx"
Cohesion: 0.05
Nodes (71): testRealtime(), AuthModal(), MapPicker(), OrderHistoryDrawer(), CHEF_TAGS, ReviewModal(), RIDER_TAGS, ActiveAlarmBanner() (+63 more)

### Community 6 - "Foody Vrinda (v3)"
Cohesion: 0.40
Nodes (4): ⚡ Architecture & Tech Stack, 🚀 Development & Build, 🔐 Emergency Recovery, Foody Vrinda (v3)

### Community 9 - "test-live-rls-regression.mjs"
Cohesion: 0.28
Nodes (7): anonClient, isBlocked(), isBlockedOrEmpty(), log(), results, rpcFunctions, test()

### Community 20 - "ErrorBoundary"
Cohesion: 0.18
Nodes (4): ErrorBoundary, createFoodyHop(), hopMarkup, FoodyOrderHop

### Community 21 - "NativeNotificationService"
Cohesion: 0.09
Nodes (12): DESK_CONFIG, SoundTrialsModal(), clamp(), LabelInput(), LabelInputProps, SocialLinksBar(), SOCIAL_CHANNELS, SOCIAL_LINKS (+4 more)

### Community 22 - "DeveloperView.jsx"
Cohesion: 0.06
Nodes (112): COLORS, runAdversarialTestSuite(), section(), COLORS, pass(), runTestSuite(), section(), AuthProvider() (+104 more)

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
Nodes (58): deliveryAliases, mockSessionStorage, mockStorage, negativeRoles, ownerAliases, progressAfterStep1, restaurantAliases, App() (+50 more)

### Community 30 - "test-wallet-multiplex.mjs"
Cohesion: 0.29
Nodes (5): activeWalletSubscriptions, createdChannels, mockSupabase, removedChannels, unsubA

### Community 31 - "verify_roles_and_db_sync.mjs"
Cohesion: 0.50
Nodes (4): recordTest(), results, runTestSuite(), supabase

### Community 32 - "CustomerView.jsx"
Cohesion: 0.06
Nodes (42): MockLocalStorage, mockStorage, autoGenCases, scenario1, scenario2, scenario3, testCases, CDPClient (+34 more)

### Community 33 - "Implementation Sequence"
Cohesion: 0.06
Nodes (32): Anti-Fraud Enforcement Points, Architecture Overview, Core RPCs, Critical Constraints & Indexes, Database Schema Design, Estimated File Count, 🏛️ Foody Vrinda — Digital Dynasty & FV Referral System, Frontend Components (+24 more)

### Community 34 - "🏛️ MASTER UI/UX & FULL-STACK APP ENGINEERING PLAYBOOK"
Cohesion: 0.07
Nodes (29): 1.1 The Golden Rule of Modern Aesthetics, 1.2 Dual-Theme Chromatic Architecture, 1.3 Modern Typography Stack, 1.4 Tactile Surface Physics & Glassmorphism, 1. CORE DESIGN ENGINEERING & VISUAL HIERARCHY, 2.1 Hardware-Accelerated Rendering (GPU Offloading), 2.2 Eliminating Re-Render Storms in React, 2.3 DOM Capping & Asset Delivery (+21 more)

### Community 35 - "isTableMissing"
Cohesion: 0.20
Nodes (21): createCloudMenuItem(), createCloudOffer(), createCloudPreset(), deleteCloudMenuItem(), deleteCloudOffer(), deleteCloudPreset(), getCachedOffers(), getCachedPresets() (+13 more)

### Community 36 - "2. Step-by-Step Recovery Execution Chain"
Cohesion: 0.17
Nodes (11): 1. DR Acceptance Criteria Chain, 2. Step-by-Step Recovery Execution Chain, 3. Disaster Recovery Log Template, Foody Vrinda — Enterprise Disaster Recovery (DR) Runbook & Drill Protocol, Phase 1: Backup Selection & Integrity Attestation, Phase 2: Isolated Environment Provisioning (Zero Production Touch), Phase 3: Schema & Migration Parity Verification, Phase 4: RLS & Kernel Security Direct SQL Re-Verification (+3 more)

### Community 37 - "seed-synthetic-beta-data.js"
Cohesion: 0.25
Nodes (6): envName, supabase, SYNTHETIC_MENUS, SYNTHETIC_SHOPS, targetKey, targetUrl

### Community 38 - "OneTimeCode.tsx"
Cohesion: 0.26
Nodes (10): clamp(), MERGE, mix(), OneTimeCode(), OneTimeCodeProps, Otp, Phase, smooth() (+2 more)

### Community 39 - "verify-dr-integrity.js"
Cohesion: 0.40
Nodes (3): CRITICAL_TABLES, startTime, supabase

### Community 41 - "dispatchSafeEvent"
Cohesion: 0.30
Nodes (20): adminBlockUser(), adminRevokeUser(), adminUnblockUser(), createCloudReview(), createCloudUser(), deleteCloudUser(), dispatchSafeEvent(), getCachedUsers() (+12 more)

### Community 42 - ".ensureSubscribed"
Cohesion: 0.15
Nodes (10): claimDeliveryOrder(), invalidateCache(), RealtimeMultiplexer, subscribeCloudMenus(), subscribeCloudNotifications(), subscribeCloudOffers(), subscribeCloudOrders(), subscribeCloudShops() (+2 more)

### Community 43 - "runBrowserTests"
Cohesion: 0.36
Nodes (4): CDPClient, fetchJson(), runBrowserTests(), sleep()

### Community 44 - "getCachedItem"
Cohesion: 0.15
Nodes (17): calculateAuthoritativeOrderTotals(), claimOrderPickupAtomic(), computeSha256Hex(), createCloudOrder(), dispatchOrderPushNotificationAsync(), generateSecureOrderOTP(), generateWhatsAppOrderShareLink(), getCachedItem() (+9 more)

### Community 45 - "release-apk.mjs"
Cohesion: 0.19
Nodes (12): ANDROID_DIR, BUILD_GRADLE_PATH, BUILT_APK_PATH, __dirname, __filename, getGitHubToken(), LATEST_APK_PATH, log() (+4 more)

### Community 47 - "getCachedShops"
Cohesion: 0.44
Nodes (10): addDeletedShopId(), createCloudShop(), deleteCloudShop(), getCachedShops(), getCloudShops(), getDeletedShopIds(), normalizeShop(), removeDeletedShopId() (+2 more)

### Community 48 - "verify-supabase-parity.js"
Cohesion: 0.22
Nodes (7): BACKUP_PATH, baselineExports, currentExports, __dirname, __filename, missingExports, TARGET_PATH

### Community 49 - "Foody Vrinda animations (React + Capacitor)"
Cohesion: 0.29
Nodes (6): 1. Copy, 2. Fonts (important in a Capacitor app: it must work offline), 3. Capacitor: native splash -> animated React splash, 4. Order-done hop (web + app), Foody Vrinda animations (React + Capacitor), Notes

### Community 50 - "test-shop-isolation.mjs"
Cohesion: 0.67
Nodes (3): assert(), runTests(), supabase

### Community 53 - "test-developer-api-sync.mjs"
Cohesion: 0.67
Nodes (3): assert(), runDeveloperApiSyncTests(), supabase

### Community 56 - "StackedBars.tsx"
Cohesion: 0.19
Nodes (11): Bar, CATS, fmt(), fmtDay(), LAST, makeBars(), Mode, MONTHS (+3 more)

### Community 58 - "presetDishes.js"
Cohesion: 0.33
Nodes (8): activePresetDishes, DEFAULT_PRESET_DISHES, findPresetByKeyword(), getPresetDishById(), getPresetDishes(), loadPresetDishes(), PRESET_CATEGORIES, PRESET_DISHES

### Community 61 - "CreateMenu.tsx"
Cohesion: 0.29
Nodes (6): clamp(), Create(), CreateMenu, ITEMS, LIQUID, LIQUID_STILL

### Community 62 - "RollingCounter.tsx"
Cohesion: 0.36
Nodes (6): clamp(), Col, Counter(), RollingCounter, springOf(), stillness()

### Community 64 - "test-combo-engine.mjs"
Cohesion: 0.53
Nodes (5): assert(), calculateComboFinancials(), runComboEngineTests(), supabase, validateComboPayload()

### Community 65 - "run-all-tests.mjs"
Cohesion: 0.67
Nodes (3): main(), runChildSuite(), SUITES

### Community 66 - "runAtomicShopDeletionTests"
Cohesion: 0.67
Nodes (3): assert(), runAtomicShopDeletionTests(), supabase

### Community 68 - "test-user-flow-e2e.mjs"
Cohesion: 0.67
Nodes (3): assert(), runRealUserFlowTests(), supabase

### Community 70 - "foodySplash.core.js"
Cohesion: 0.23
Nodes (8): ACD, Cp, createFoodySplash(), DOTD, G, splashMarkup, uTable, FoodySplash()

## Knowledge Gaps
- **282 isolated node(s):** `__filename`, `__dirname`, `__filename`, `__dirname`, `ROOT_DIR` (+277 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `STAFF_ROLES` connect `AuthContext.jsx` to `dispatchSafeEvent`, `DeveloperView.jsx`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `dispatchSafeEvent()` connect `dispatchSafeEvent` to `supabase.monolith.backup.js`, `isTableMissing`, `.ensureSubscribed`, `getCachedShops`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `__filename` to the rest of the system?**
  _282 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fvWalletService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0786308973172988 - nodes in this community are weakly interconnected._
- **Should `supabase.monolith.backup.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04653061224489796 - nodes in this community are weakly interconnected._
- **Should `🛡️ Foody Vrinda v5.3.1 — Core Production Security Validation Complete` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `AuthContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.051344286781179985 - nodes in this community are weakly interconnected._