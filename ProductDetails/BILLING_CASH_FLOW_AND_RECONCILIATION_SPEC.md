# Foody Vrinda — Authoritative Billing, Cash Reconciliation & Courier Handover Architecture

## 1. Architectural Overview & Single Source of Truth
The Financial Ledger is the authoritative source of truth for all physical and electronic money movements across Foody Vrinda. Never treat mutable `cash_in_hand` integers on user profiles as the primary financial record.

The system uses an immutable double-entry ledger architecture where:
- Every collected rupee has an identifiable customer collection origin.
- Every physically returned rupee has an immutable handover receipt.
- Order cash allocations follow a strict deterministic waterfall (FIFO based on `created_at`).
- All financial numbers use PostgreSQL `NUMERIC(10,2)` for zero rounding drift.

---

## 2. Relational Ledger & Settlement Schema
Implemented in `Queries/19_rider_cash_handover_and_billing_ledger.sql` and `supabase/migrations/20261110000001_rider_cash_handover_and_billing_ledger.sql`:

1. **`foody_cash_accounts`**:
   - `rider_id`, `shop_id`, `outstanding_amount`, `account_status`, `updated_at`.
2. **`foody_cash_settlements`**:
   - `id` (UUID), `shop_id`, `rider_id`, `expected_amount`, `rider_declared_amount`, `cashier_received_amount`, `shortage_amount`, `excess_amount`, `status`, `received_by`, `notes`, `idempotency_key`, `created_at`.
   - Unique constraint on `idempotency_key` ensures guaranteed replay safety without duplicate writes.
3. **`foody_cash_settlement_allocations`**:
   - `settlement_id`, `order_id`, `allocated_amount`, `remaining_debt`, `is_fully_settled`, `created_at`.
   - Immutable tamper-proof trigger (`trg_prevent_allocations_tamper`) prevents update or deletion.
4. **`foody_cash_ledger_entries`**:
   - `account_id`, `rider_id`, `shop_id`, `order_id`, `transaction_type`, `direction` (`debit`/`credit`), `amount`, `reference_id`, `actor_id`, `created_at`.
5. **`foody_cash_journals` & `foody_cash_journal_lines`**:
   - Double-entry balance invariant: `SUM(debit) == SUM(credit)`.
6. **`foody_financial_audit_logs`**:
   - Complete tracking of financial mutations, cashier identity, pre/post states, and IP signatures.

---

## 3. Authoritative PostgreSQL RPC: `record_rider_cash_settlement`
Located in `public.record_rider_cash_settlement(...)` (`SECURITY DEFINER`, `search_path = public, pg_temp`):
- **Transaction Safety**: Avoids `FOR UPDATE` on aggregate queries by locking eligible orders deterministically row-by-row into a temporary session table (`tmp_orders_to_settle`).
- **Waterfall Allocation**: Iterates locked orders in `created_at ASC` sequence, applying `cashier_received_amount` to satisfy order debts. Orders fully paid transition to `cash_status: 'settled'` with their permanent `settlement_id`.
- **Shortage & Excess Tracking**:
  - `shortage_amount = MAX(0, expected - received)` (recorded as courier liability debt).
  - `excess_amount = MAX(0, received - expected)` (booked to shop suspense account).
- **Idempotency Protection**: Repeated calls with identical idempotency UUID immediately return the committed settlement record without re-mutating balances or allocating funds twice.

---

## 4. Frontend Service Integration & SWR Pattern
Located in `src/services/supabase/operations.service.js`:
- `settleRiderCashHandover({ riderId, shopId, cashierReceivedAmount, riderDeclaredAmount, orderIds, cashierId, notes, idempotencyKey })`:
  Executes database RPC with automatic schema cache retry, client-side fallback with FIFO order allocation, offline queueing (`foody_pending_settlements`), and event broadcasting (`foody_cash_settled`).
- `getShopSettlementHistory(shopId)`:
  SWR cache-first loader that returns cached receipts instantly and fetches updates from cloud in the background.
- `getRiderOutstandingCash(riderId, shopId)`:
  Derives floating cash liability from un-settled COD orders.
- `getShopCashFlowMetrics(orders, settlements, shopId)`:
  Partitions gross order revenue into:
  - `grossSales`
  - `netSales`
  - `onlinePayments` (prepaid UPI / cards)
  - `counterCash` (direct pickup / counter orders)
  - `riderCashInTransit` (floating cash held in couriers' custody awaiting return)
  - `riderCashSettled` (reconciled cash returned to the till)
  - `activeRidersHoldingCash` (itemized list of couriers with outstanding balances)
  - `cashVariance` (net sum of excesses minus shortages)

---

## 5. UI/UX Design System & Mobile Ergonomics
Implemented in `src/views/OwnerView.jsx` and `src/views/TransportView.jsx`:
- **Obsidian Dark Luxury Aesthetic**: `#1E1B1C` canvas, `#282526` elevated cards, `#151314` recessed inputs, `#CB785C` Terracotta Rust CTA tokens, `#FD9139` warm amber accents.
- **Concentric Nested Border Radius Rule**:
  Every container and nested element strictly follows:
  $$R_{\text{inner}} = R_{\text{outer}} - \text{padding}$$
  - Outer panel: `rounded-[28px] p-4` $\rightarrow$ Inner cards: `rounded-[12px]`.
  - Subtab bar: `rounded-[16px] p-1` $\rightarrow$ Subtab buttons: `rounded-[12px]`.
  - Inner cards: `rounded-[16px] p-3` $\rightarrow$ Inner action buttons: `rounded-[4px]`.
  - Zero generic translateY or scale hover animation leaks.
- **Apple Dynamic Island Notifications**: Instant cross-device notifications when couriers return cash to counter (`foody_cash_settled`).
- **RFC-4180 CSV Export**: One-click download of all billing records (`foody_vrinda_billing_[shopId]_[date].csv`).

---

## 6. Automated Test Suite Certification
Test suite script: `scripts/test-billing-cashflow-and-settlements.mjs`:
- ✅ **Test Case A**: COD order completion and floating cash custody increase.
- ✅ **Test Case B**: Full cash settlement and waterfall order status update (`cash_status: 'settled'`).
- ✅ **Test Case C**: Partial settlement with shortage tracking.
- ✅ **Test Case D**: Excess settlement with suspense allocation.
- ✅ **Test Case E**: Concurrency & idempotency test with replayed UUID.
- ✅ **Test Case F**: Double-entry ledger balance check ($\sum \text{Debits} == \sum \text{Credits}$, Gross Sales == Online + Counter + InTransit + Settled).
- Result: **27 passed, 0 failed**.

