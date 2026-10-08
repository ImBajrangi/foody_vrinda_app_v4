/**
 * ========================================================================
 * FOODY VRINDA - CORE SUPABASE CLOUD & PERSISTENCE ARCHITECTURE FACADE
 * ========================================================================
 * High-performance, domain-driven modular architecture.
 *
 * This facade preserves 100% backward compatibility for all downstream UI
 * consumers while isolating business domains into independent services:
 *
 *  - client.js: Core Supabase Client, Schema Fault Tolerance, Seed Data
 *  - cache.js: SWR Cache, In-flight Request Deduplication, Math Utils
 *  - shops.service.js: Shop Management & Operating Hours Engine
 *  - menus.service.js: Dishes, Combos, Categories & Preset Management
 *  - notifications.service.js: Role-targeted Notifications
 *  - orders.service.js: Authoritative Order Totals & State Machine
 *  - realtime.service.js: Singleton Multiplexer & Channel Subscriptions
 *  - users.service.js: User Authentication, Roles, RBAC & Profiles
 *  - reviews.service.js: Customer Reviews & Multi-Staff Recognition
 *  - riders.service.js: OTP Security, Geofencing, Dispatch & Waterfall
 *  - operations.service.js: Trust Score, Cash Settlements, Fee Engine
 *  - schema.js: Complete Hardened Database Schema DDL
 * ========================================================================
 */

// 1. Client & Resilience
export * from './services/supabase/client.js';

// 2. Cache, Deduplication & Spatial Math
export * from './services/supabase/cache.js';

// 3. Shops & Venues
export * from './services/supabase/shops.service.js';

// 4. Menus, Offers & Presets
export * from './services/supabase/menus.service.js';

// 5. Notifications
export * from './services/supabase/notifications.service.js';

// 6. Orders & Financial State Machine
export * from './services/supabase/orders.service.js';

// 7. Supabase Realtime Channels
export * from './services/supabase/realtime.service.js';

// 8. Users, Roles & Profiles
export * from './services/supabase/users.service.js';

// 9. Customer Reviews & Multi-Staff Recognition
export * from './services/supabase/reviews.service.js';

// 10. Riders, Logistics & OTP Security
export * from './services/supabase/riders.service.js';

// 11. Operations, Trust Scores & Cash Settlements
export * from './services/supabase/operations.service.js';

// 12. Database SQL Schema & DDL
export * from './services/supabase/schema.js';
