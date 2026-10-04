# Foody Vrinda — Enterprise Disaster Recovery (DR) Runbook & Drill Protocol

> **Standard Classification:** Operational Disaster Recovery Protocol (Zero Production Mutation)  
> **Target Audience:** Any authorized DevOps / Engineering team member.  
> **Prerequisite Rule:** Recovery must be completely reproducible without tacit knowledge.

---

## 1. DR Acceptance Criteria Chain

```
[Known-Good Backup]
        │
        ▼
[Restore in Isolated Sandbox] (Zero Production Touch)
        │
        ▼
[Schema & Migration Parity Check]
        │
        ▼
[RLS & Security Policy Verification]
        │
        ▼
[Critical Flow Smoke Tests] (Auth → Menu → Order → Payment → Admin)
        │
        ▼
[Metrics Logged: RTO & RPO]
        │
        ▼
[Teardown & Ephemeral Credential Rotation]
        │
        ▼
[Drill Certification: Reproducible by Any Engineer]
```

---

## 2. Step-by-Step Recovery Execution Chain

### Phase 1: Backup Selection & Integrity Attestation
1. **Locate Backup Snapshot**: Identify the latest verified backup from Supabase Dashboard (or S3/Cold Storage).
2. **Compute Checksum**:
   ```bash
   shasum -a 256 backup_foody_vrinda_YYYYMMDD_HHMM.sql > backup_foody_vrinda.sha256
   ```
3. **Record Metadata**:
   - Backup Timestamp: `T_backup`
   - SHA-256 Hash: `Recorded in DR drill log`
   - Total Dump Size: `Recorded in MB/GB`

### Phase 2: Isolated Environment Provisioning (Zero Production Touch)
> ⚠️ **STRICT INVARIANT:** Never execute restore commands against the Production instance URL (`mrsxliwygodtwjuyqmts.supabase.co`). Always restore into a fresh isolated Sandbox or Staging instance.

1. **Verify Target Isolation**:
   ```bash
   # Ensure target environment variable does NOT match production
   export DR_TARGET_DB_URL="postgresql://postgres:[PASSWORD]@[SANDBOX_HOST]:5432/postgres"
   
   # Confirm sandbox connection
   psql "$DR_TARGET_DB_URL" -c "SELECT current_database(), inet_server_addr();"
   ```

2. **Execute Full Logical Restore**:
   ```bash
   psql "$DR_TARGET_DB_URL" --single-transaction -f backup_foody_vrinda_YYYYMMDD_HHMM.sql
   ```

### Phase 3: Schema & Migration Parity Verification
1. **Automated DR Integrity & Table Probe**:
   ```bash
   VITE_SUPABASE_URL="https://[SANDBOX_PROJECT].supabase.co" \
   VITE_SUPABASE_ANON_KEY="[SANDBOX_ANON_KEY]" \
   npm run dr:verify
   ```
   *Performs automated reachability probe, relational integrity check, and RLS default-deny test with zero production touch.*

2. **Migration Alignment Check**:
   ```bash
   npm run lint:migrations
   ```

### Phase 4: RLS & Kernel Security Direct SQL Re-Verification
Ensure restore did not accidentally disable Row-Level Security or bypass kernel triggers:
```bash
psql "$DR_TARGET_DB_URL" -c "
  SELECT relname, relrowsecurity, relforcerowsecurity 
  FROM pg_class 
  WHERE relname IN ('foody_orders', 'foody_menus', 'foody_shops', 'foody_users', 'foody_logged_users');
"
```
*Pass Criteria:* `relrowsecurity = true` on all listed tables.

### Phase 5: Critical Flow Smoke Testing
Connect a local test instance of the application to the restored sandbox:
```bash
VITE_SUPABASE_URL="https://[SANDBOX_PROJECT].supabase.co" \
VITE_SUPABASE_ANON_KEY="[SANDBOX_ANON_KEY]" \
npm run dev
```

Execute automated and manual validation across the 6 critical user flows:
1. **Authentication**: Customer & Store Owner logins validate properly.
2. **Catalog / Menus**: Dishes render with correct prices and categories.
3. **Cart & Pricing**: Subtotal, GST, and delivery calculations match catalog authoritative prices.
4. **Order State Machine**: Transitions (`new` → `preparing` → `ready_for_pickup` → `out_for_delivery` → `completed`) succeed only via authorized RPCs.
5. **Payment Handling**: COD marked collected via authorized store owner role.
6. **Admin / Master Desk**: Emergency elevation and master accounts accessible.

### Phase 6: Operational Metrics (RTO & RPO Calculation)
Record exact metrics in the drill report:
- **RTO (Recovery Time Objective)**: Total wall-clock time from drill initiation to successful smoke test completion.
  $$\text{RTO} = T_{\text{SmokePass}} - T_{\text{DrillStart}}$$
- **RPO (Recovery Point Objective)**: Delta between disaster point (simulated) and the backup snapshot timestamp.
  $$\text{RPO} = T_{\text{DrillStart}} - T_{\text{BackupCreated}}$$

### Phase 7: Post-Drill Credential Rotation & Teardown
1. Revoke all temporary database connection strings used during the drill.
2. Rotate sandbox admin passwords.
3. Flush and terminate any active test sessions.

---

## 3. Disaster Recovery Log Template

| Field | Drill Record |
| :--- | :--- |
| **Drill Date & Time** | `YYYY-MM-DD HH:MM UTC` |
| **Lead Engineer** | `[Engineer Name]` |
| **Independent Verifier** | `[Second Engineer Name]` |
| **Backup Snapshot ID / Hash** | `sha256:...` |
| **Target Sandbox Environment** | `isolated-dr-sandbox-[ID]` |
| **Calculated RTO** | `XX minutes` |
| **Calculated RPO** | `YY minutes` |
| **Smoke Test Result** | `✅ 6/6 Critical Flows Passed` |
| **Credential Rotation Verified** | `✅ Yes` |
