# Foody Vrinda v3 — Project Commands & Rules

## Commands
- **Run directly on connected Android device / emulator**: `npm run android`
- **Open native project in Android Studio**: `npm run android:open`
- **Build production debug APK**: `npm run android:build`
- **Sync Web updates to Android**: `npm run sync`

---

## Active Engineering Rules

### Rule [Native Bottom Sheet Invariant]:
"Interactive bottom sheets and swipe-down drawers must never use CSS keyframe animations with fill-mode: both/forwards or :not(.sheet-dragging) selectors. Dismissal transitions must interpolate continuously from the user's release position (translate3d(0, ${finalDiff}px, 0)) to 105% with cubic-bezier(0.32, 0.72, 0, 1) without premature React re-renders or origin resets."

### Rule [Mobile Touch-First Standard]:
"All hover styles (hover:...) must be scoped strictly to @media (hover: hover) and (pointer: fine). Touch interactions must rely solely on :active micro-scale feedback (scale(0.975)) with zero sticky hover artifacts."

### Rule [GPU Budget Guard]:
"Avoid continuous looping CSS animations (animate-pulse, infinite keyframe loops, dynamic blur filters) on mobile viewports (max-width: 768px) to ensure 60fps responsiveness and zero thermal throttling on all phone segments."

[Portal & Zero-Shift Modal Invariant]:
"All full-screen dialogs, branch switchers, and dropdown sheets must be rendered using createPortal(..., document.body) with fixed coordinates, and html must maintain scrollbar-gutter: stable; to guarantee zero Cumulative Layout Shift (CLS), zero sibling margin pollution, and zero background jumps on open/close across all devices."

[Mobile Stepper Ergonomics & Gesture Isolation]:
"All quantity steppers and inline action bars on food cards must maintain a minimum 40px touch height (h-10 sm:h-11), minimum 36px interactive button targets with apple-tap-target, touch-manipulation, and must bind onTouchStart={(e) => e.stopPropagation()} alongside onClick to strictly isolate stepper events from parent card click gestures."

When switching app major versions or working across versioned submodules (e.g., v3 to v4), always automatically verify that the local repository's `origin` points to the active target repository, branch upstream is set to `origin/main`, and parent `.gitmodules` entries are synchronized before committing.

Rule: Minimum Mobile Touch Target Guidelines (WCAG 2.5.5):

"All mobile interactive elements (inputs, action pills, steppers, and buttons) must maintain a minimum height of 44px–48px (h-11 or h-12) and minimum padding of px-3 py-2. Never allow editable form inputs or inline editors to render smaller than text-sm (14px) on mobile viewports."

Rule: Automatic Dual-Target Build Verification:

"Whenever changes touch UI components, state management, or assets, automatically execute both npm run build and ./gradlew assembleRelease (or assembleDebug) before concluding the task to guarantee zero runtime and zero packaging failures."

Ensure all cloud edge function calls use supabase.functions.invoke() with standard CORS preflight headers, and ensure mobile notification payloads always set priority to PRIORITY_MAX with high-importance channels for background delivery."

Idempotent PostgreSQL Migrations:
"All PostgreSQL migration scripts modifying RLS policies, triggers, indexes, or functions must be idempotent: always include DROP POLICY IF EXISTS, DROP TRIGGER IF EXISTS, CREATE INDEX IF NOT EXISTS, and CREATE OR REPLACE FUNCTION."

Automated Error Reproduction & Isolation:
"When SQL errors occur during batch executions, provide both the isolated single-statement fix and the fully updated idempotent file to allow immediate resumption without resetting state."

never-overclaim-security-evidence

When generating security or audit reports, always strictly distinguish between (1) properties verified by automated test suites, (2) architectural mechanisms present in DDL/code, and (3) properties requiring multi-session/multi-tenant adversarial validation. Never claim 100% security proof if tests run in a single-connection harness.

clean-sequential-test-numbering

All test suites and audit matrices must use strictly sequential, unpadded integer IDs (e.g., T01 through T22) with zero alphanumeric sub-indices (e.g., avoid T07a/T07b), ensuring test counts match the matrix row count exactly.

database-superuser-boundary-clarity

Never document PostgreSQL triggers or RLS policies as immutable against database superusers (postgres, supabase_admin). Always scope immutability guarantees to application-level SQL and specify external write-once replication for forensic non-repudiation.

detect-permissive-rls-or-conflicts

When auditing or creating Row-Level Security policies, check for multiple permissive policies on the same table and command. Since PostgreSQL evaluates permissive policies using logical OR, a broader policy will silently undermine a more restrictive policy.

enforce-rpc-only-state-mutations

For core workflow tables (e.g., orders, transactions) where state transitions are governed by atomic SECURITY DEFINER RPCs, do not grant client UPDATE or INSERT privileges via RLS. Restrict client table access to SELECT, ensuring all mutations route through audited, locked RPC pipelines.

require-negative-authorization-tests
When claiming write-blocking or RLS default-deny security properties, always provide an executable negative test case demonstrating that an unauthorized caller explicitly triggers SQLSTATE 42501 (insufficient_privilege). Never infer permission denial purely from the absence of a policy.

mandatory-idempotent-ddl-statements
All PostgreSQL DDL statements provided in migration scripts, hotfixes, or audit reports must be unconditionally idempotent. Specifically, every CREATE POLICY must be directly preceded by DROP POLICY IF EXISTS, every CREATE TRIGGER by DROP TRIGGER IF EXISTS, and every index creation must include IF NOT EXISTS to guarantee error-free re-runs (SQLSTATE 42710 prevention).

never-recreate-deprecated-policies
When a migration or hotfix script drops deprecated or overly-permissive RLS policies (e.g., Shop-scoped update orders), verify that the same script does not accidentally recreate them in subsequent statements. Always cross-check the final DDL block against the architectural specification to ensure dropped policies remain dropped.

rely-on-rls-default-deny-for-mutations
When designing tables with RPC-only mutations, do not create explicit dummy policies like WITH CHECK (null) or USING (false). Prefer total policy omission for INSERT, UPDATE, and DELETE on the authenticated role. This cleanly enforces PostgreSQL's native default-deny (SQLSTATE 42501) and avoids cluttering the pg_policies catalog.

verify-live-catalog-after-rls-changes
Never consider RLS migration or consolidation tasks complete until a live query against pg_policies is executed and inspected. The live catalog output is the sole source of truth for confirming policy names, command scopes, and the complete elimination of unwanted permissive policies.

preserve-exact-catalog-evidence-in-reports
Whenever a report or documentation marks a security property or RLS configuration as "Live Catalog Verified", the exact raw SQL query and verbatim catalog output (e.g. pg_policies query results) must be embedded directly within the report alongside the specification to serve as auditable primary evidence.

supabase-jwt-uuid-and-non-recursive-rls
When generating PostgreSQL test harnesses or simulating JWT contexts for Supabase, always format simulated actor IDs as canonical UUID v4 strings (e.g. 11111111-1111-1111-1111-111111111111), and avoid direct subqueries on tables with active RLS inside their own policies by wrapping tenant lookups in SECURITY DEFINER helper functions to prevent ERROR 22P02 and ERROR 42P17.

rule-transitional-otp-v5.4:
“In v5.4, execute complete removal of pickup_otp and delivery_otp from software payloads and drop ELSIF v_order.pickup_otp IS NOT NULL fallback branches from claim_order_pickup_atomic and verify_delivery_otp_atomic.”
rule-zero-drift-schema-resilience:
“All database upserts in src/supabase.js must maintain resilience against missing transitional schema columns by intercepting PostgREST 400 column errors and retrying with strict canonical payloads.”

<RULE[agent_efficiency]>
When auditing or generating production migrations, always pair declarative RLS policies with PostgreSQL BEFORE UPDATE triggers for financial, identity, and OTP immutability, and explicitly verify error codes (SQLSTATE 42501) rather than relying solely on HTTP 200 empty array responses.
</RULE[agent_efficiency]>

Rule [Android Adaptive Icon Invariant]:
"All adaptive launcher icon foregrounds (ic_launcher_foreground.png) must have a 100% transparent background (alpha = 0) with the active emblem scaled between 55%–62% of the canvas to adhere to Android's 66dp safe zone. Backgrounds must use the signature Obsidian (#1E1B1C) vector, and legacy fallback icons must never retain opaque white corner bounding boxes."

Rule — Automatic SQL Trigger & Constraint Awareness:

"When writing SQL test fixtures or batch cleanup scripts, always filter out immutable/protected system roles (e.g. role <> 'grand_admin') to respect database-level permanent account protection triggers."

Rule — Migration Schema Parity Enforcement:

"Always ensure column names in RPC procedures (foody_logged_users, foody_shops, foody_menus) match active schema definitions exactly before generating or running migrations."

## Multi-Environment & Production Safety

### Environment Isolation

- Alpha/Dev, Beta/Staging, and Production MUST use separate Supabase projects.
- Production customer, order, payment, address, and restaurant data MUST NOT be copied into Alpha or Beta in raw form.
- Beta may use synthetic or sanitized/anonymized production-like data only.

### Production Database Rules

NEVER directly perform:
- DROP
- TRUNCATE
- DELETE without an explicit WHERE clause
- destructive UPDATE without an explicit WHERE clause
- mock/test seed insertion
- ad-hoc schema modifications

against the Production database.

### Migration Rules

- Every schema change MUST be implemented as a version-controlled migration.
- Every migration MUST be tested on Alpha first.
- Every production-bound migration MUST pass Beta/Staging validation.
- Production migrations MUST be backward-compatible whenever possible.
- Prefer Expand → Migrate → Contract for breaking schema changes.

### Deployment Rules

feature/* → Alpha/Dev
beta → Beta/Staging
main → Production

Production deployment requires:
1. Migration validation
2. Application tests
3. Security/RLS validation
4. Beta/UAT approval
5. Backup/recovery readiness

### Credentials

- Environment credentials MUST never be committed to Git.
- Production service-role credentials MUST never be exposed to frontend code.
- Each environment MUST use its own Supabase credentials.

### Production Data

Production data MUST be treated as immutable business data.
Testing MUST use synthetic/test accounts and test shops.

### Disaster Recovery & Rollback Standard

All disaster recovery procedures and rollback drills MUST strictly follow the reproducible runbook at `ProductDetails/DISASTER_RECOVERY_RUNBOOK.md`. A DR drill is certified successful only when an independent authorized engineer can reproduce the full restore, schema verification, and critical smoke flows with logged RTO and RPO metrics without touching production infrastructure.

### CI/CD, Token & Cost Protection Invariant

1. **Atomic Final Push Protocol**: Never trigger multiple micro-pushes. Group related code, test fixes, and docs into a single consolidated commit and push only after all local tests and builds (`npm run build`) pass cleanly.
2. **CI/CD Resource Efficiency**: Documentation and metadata changes MUST never burn GitHub Actions or Vercel runner quotas (enforce `paths-ignore` for `**.md`, `docs/**`, `graphify-out/**`).
3. **Token & LLM Conservation**: Keep all context exchanges focused, high-density, and free of redundant verbosity to prevent token exhaustion.


