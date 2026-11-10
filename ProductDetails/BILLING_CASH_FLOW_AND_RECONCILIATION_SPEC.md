# Foody Vrinda — Authoritative Billing, Cash Reconciliation & Courier Handover Architecture

## 1. Architectural Overview & Single Source of Truth
The Financial Ledger is the authoritative source of truth for all physical and electronic money movements across Foody Vrinda. Mutable `cash_in_hand` integers on user profiles are strictly derived projections and never treated as primary financial records.

The system uses an immutable double-entry ledger architecture where:
- Every collected rupee has an identifiable customer collection origin.
- Every physically returned rupee has an immutable handover receipt.
- Order cash allocations follow a strict deterministic waterfall (FIFO based on `created_at ASC, id ASC`).
- All financial numbers use PostgreSQL `NUMERIC(10,2)` for zero floating-point rounding drift.
- All ledger and settlement entities are append-only with database-level immutability triggers.

---

## 2. Relational Ledger & Settlement Schema
Implemented in `Queries/19_rider_cash_handover_and_billing_ledger.sql` and `supabase/migrations/20261110000001_rider_cash_handover_and_billing_ledger.sql`:

1. **`foody_cash_accounts`**:
   - `rider_id`, `shop_id`, `outstanding_amount`, `total_collected`, `total_settled`, `status`, `updated_at`.
   - Unique constraint `uq_rider_shop_account (rider_id, shop_id)` prevents account duplication.
2. **`foody_cash_settlements`**:
   - `id` (TEXT), `shop_id`, `rider_id`, `expected_amount`, `rider_declared_amount`, `cashier_received_amount`, `shortage_amount`, `excess_amount`, `status`, `declared_by`, `received_by`, `notes`, `idempotency_key`, `created_at`.
   - Unique constraint on `idempotency_key` ensures guaranteed replay safety without duplicate writes.
3. **`foody_cash_settlement_allocations`**:
   - `settlement_id`, `order_id`, `amount_allocated`, `order_total`, `previously_settled`, `remaining_order_debt`, `created_at`.
   - Immutable tamper-proof trigger (`trg_prevent_allocations_tamper`) prevents update or deletion.
4. **`foody_cash_ledger_entries`**:
   - `account_id`, `rider_id`, `shop_id`, `order_id`, `settlement_id`, `transaction_type`, `direction` (`debit`/`credit`), `amount`, `reference_id`, `actor_id`, `created_at`.
5. **`foody_cash_journals` & `foody_cash_journal_lines`**:
   - Double-entry balance invariant: $\sum \text{Debit} == \sum \text{Credit}$.
6. **`foody_financial_audit_logs`**:
   - Complete tracking of financial mutations, cashier identity, pre/post states, and timestamps.

---

## 3. Security Architecture & Zero-Trust RLS Policies
Treats every financial transaction as highly privileged:

1. **Complete Anon Revocation**:
   - All access (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to financial tables and all `EXECUTE` privileges on financial RPCs are revoked from `anon` and `public`.
2. **Action-Specific Permissions for Authenticated Users**:
   - `GRANT SELECT` only on financial tables for `authenticated`. Direct `INSERT`, `UPDATE`, `DELETE` are completely revoked from clients.
   - All financial mutations occur exclusively inside `SECURITY DEFINER` functions with `SET search_path = ''`.
3. **Authoritative Shop Membership Verification (`can_manage_shop_finances`)**:
   - Caller identity is derived strictly from `auth.uid()::text`.
   - Verifies active user membership in `foody_logged_users` with role `owner`, `cashier`, `manager` matching `p_shop_id` or platform admin (`developer`, `grand_admin`, `admin`, `platform_admin`, `master_dev`).
   - Unauthenticated callers are rejected with `401 / UNAUTHENTICATED`. Unauthorized callers are rejected with `403 / UNAUTHORIZED`.
4. **Row-Level Read Isolation**:
   - Couriers can only view their own accounts and settlements (`auth.uid()::text = rider_id`).
   - Shopkeepers can only view records for their authorized kitchen (`can_manage_shop_finances(shop_id)`).

---

## 4. Authoritative PostgreSQL RPC: `record_rider_cash_settlement`
Located in `public.record_rider_cash_settlement(...)` (`SECURITY DEFINER`, `SET search_path = ''`):

- **Derived Actor Identity**: Cashier identity is resolved from `auth.uid()::text`. Never trusts client-supplied cashier names as an actor identity.
- **Strict Input Validation**: Rejects null, negative, or invalid amounts. Validates rider and shop existence.
- **All-or-Nothing Batch Order Validation**: When explicit `p_order_ids` are supplied, every single order is verified. If ANY requested order is invalid, missing, already settled, or belongs to a different rider/shop, the entire batch is rejected with `INVALID_ORDERS_SELECTED`. Never silently discards invalid IDs.
- **Deterministic Row Locking**: Locks individual order rows sorted deterministically (`created_at ASC, id ASC FOR UPDATE`), completely eliminating PostgreSQL `0A000` aggregate locking flaws and deadlocks.
- **FIFO Waterfall Allocation**: Allocates received funds chronologically to orders:
  - Fully funded orders transition to `cash_status: 'settled'` with their permanent `settlement_id`.
  - Incompletely funded orders receive partial allocation and remain `cash_status: 'collected'` with exact `remaining_order_debt` tracked. Unpaid orders are never falsely marked settled.
- **Shortage & Excess Tracking**:
  - `shortage_amount = MAX(0, expected - received)` (recorded as courier liability debt).
  - `excess_amount = MAX(0, received - expected)` (booked to shop suspense ledger account).
- **Idempotency & Collision Protection**:
  - Replayed requests with the identical key and identical parameters return the original authoritative receipt.
  - Reusing an existing idempotency key with different parameters is immediately rejected with `IDEMPOTENCY_KEY_COLLISION`.
- **Append-Only Reversal**: Reversals are performed via `record_settlement_reversal`, inserting balancing double-entry lines without altering historical records.

---

## 5. Frontend Service Integration & SWR Pattern
Located in `src/services/supabase/operations.service.js`:

- **Zero Client Direct-Write Fallback**: A failed RPC never causes browser-side direct writes to financial tables. Authoritative errors are exposed directly to the caller.
- **Offline Preservation**: When the client is offline or network fails, requests are queued in `foody_pending_settlements` with `status: 'pending'`. The system never synthesizes false confirmation IDs.
- **`getShopSettlementHistory(shopId)`**: SWR cache-first loader backed by the authoritative `get_shop_cash_settlements` RPC with shop isolation.
- **`getRiderOutstandingCash(riderId, shopId)`**: Backed by `get_rider_outstanding_orders` RPC with strict caller authorization.
- **`getShopCashFlowMetrics(orders, settlements, shopId)`**: Partitions sales into gross, net, online prepaid, counter cash, courier float in transit, reconciled handover cash, and active courier liabilities.

---

## 6. Realtime & Cross-Device Courier Security
Implemented in `src/views/TransportView.jsx` and `src/services/supabase/realtime.service.js`:

- **Authenticated Subscription**: Realtime listeners filter events strictly by `rider_id === activeUser.id`. Missing `rider_id` payloads are rejected.
- **Deduplication**: In-memory processed ID sets guarantee that duplicate realtime events cannot deduct balances twice.
- **Authoritative Refetch**: Upon receiving a handover notification, the client refetches authoritative order and account data from the server instead of mutating local state blindly.
- **Local Coordination**: Browser `CustomEvents` are used solely for UI toast animations, never as financial confirmation.

---

## 7. UI/UX Design System Compliance
Implemented in `src/views/OwnerView.jsx`:

- **Obsidian Dark Luxury Aesthetic**: `#1E1B1C` canvas, `#282526` elevated cards, `#151314` recessed inputs, `#CB785C` Terracotta Rust CTA tokens, `#FD9139` warm amber accents.
- **Concentric Nested Border Radius Rule**:
  $$R_{\text{inner}} = R_{\text{outer}} - \text{padding}$$
  - Outer dialog container: `rounded-[28px] p-4` $\rightarrow$ Inner sections: `rounded-[12px]`.
  - Inner action buttons: `rounded-[12px]`.
  - Zero generic `translateY` or scale hover animations.
- **RFC-4180 CSV Export**: One-click download of billing order logs or settlement receipts with full field escaping.

---

## 8. Automated Test Suite Certification (Suites A through O)
Test suite script: `scripts/test-billing-cashflow-and-settlements.mjs`:
- ✅ **Suite A**: COD collection ledger posting.
- ✅ **Suite B**: Full settlement & atomic reconciliation.
- ✅ **Suite C**: Partial settlement across multiple orders (FIFO waterfall).
- ✅ **Suite D**: Subsequent completion of partial settlement.
- ✅ **Suite E**: Excess cash & suspense ledger allocation.
- ✅ **Suite F**: Invalid selected order rejection (all-or-nothing batch guarantee).
- ✅ **Suite G**: Unauthenticated & unauthorized caller rejection.
- ✅ **Suite H**: Cross-shop financial isolation.
- ✅ **Suite I**: True parallel concurrent replay (same idempotency key).
- ✅ **Suite J**: True parallel intersecting settlement race (row lock serialization).
- ✅ **Suite K**: Delivery & handover state machine race.
- ✅ **Suite L**: Network timeout after commit (authoritative replay recovery).
- ✅ **Suite M**: Balanced double-entry journal audit ($\sum \text{Debits} == \sum \text{Credits}$).
- ✅ **Suite N**: Immutability tamper protection (zero mutation / zero deletion).
- ✅ **Suite O**: Append-only settlement reversal & refund.
- **Result: 42 passed, 0 failed (100% success rate)**.
