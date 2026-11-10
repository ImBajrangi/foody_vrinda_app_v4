# Foody Vrinda Billing & Cash Reconciliation — Final Audit Handoff

**Audit date:** 10 November 2026  
**Repository:** `ImBajrangi/foody_vrinda_app_v4`  
**Working branch:** `feature/billing-cash-reconciliation`  
**Last fully CI-verified source/workflow commit:** `1faeabbf62602c5b1162a9eb5a946dad42e39545`  
**Main branch at audit:** `87926e0fe6f26fdd889a136aceb64dec7c7b00e7` (unchanged)

## Executive result

The feature branch has been hardened with five ordered SQL migrations, five matching manual SQL mirrors, a corrected integration harness, more honest test labelling, and safer CI environment gates.

**Code and CI status: PASS. Database deployment status: NOT APPLIED / NOT VERIFIED.**

No Supabase schema changes were applied during this audit. No merge to `main`, Beta deployment, or Production deployment was performed.

## Changes committed

| Migration | Purpose |
|---|---|
| `20261110000001_rider_cash_handover_and_billing_ledger.sql` | Canonical rider/shop cash accounts, allocations, settlements, journals, reversal registry, RLS and atomic settlement/query RPCs. |
| `20261110000002_financial_authorization_and_cod_insert_trigger.sql` | Removes the `session_user = postgres` shortcut from the shop-authorization helper; binds authorization to the authenticated JWT user or signed service-role claim. Makes COD collection run on INSERT and status transition. Revokes direct API execution from the trigger-only function after trigger creation. |
| `20261110000003_cod_collection_exact_once.sql` | Adds a partial unique index for one COD collection ledger event per order. The trigger updates the cash account and journal only if the canonical event is newly inserted. It refuses to proceed if historical duplicate collection events need reconciliation. |
| `20261110000004_reversal_account_first_locking.sql` | Aligns reversal locks with settlement lock order: rider/shop cash account, settlement, then deterministically ordered orders. Adds a guarded account restoration update and explicit reconciliation error instead of permitting an invalid restoration. |
| `20261110000005_settlement_idempotency_order_payload.sql` | Stores normalized requested order IDs and validates them on idempotency replay, including explicit-list versus automatic-selection mismatches. Existing legacy rows keep their allocation-based compatibility path because their original request mode cannot be reconstructed. |

Each migration has a corresponding byte-for-byte mirror under `Queries/19` through `Queries/23`. The repository tree was checked and all five migration/mirror pairs have identical Git blob hashes.

The older audit reports were marked **SUPERSEDED** so their earlier commit and test claims are not mistaken for the present state.

## Tests and CI

Latest fully verified workflow run for source/workflow changes:

- [GitHub Actions run #133](https://github.com/ImBajrangi/foody_vrinda_app_v4/actions/runs/42782785551) — **success**.
- Build, migration validation, billing checks and production bundle verification passed.
- Alpha/Dev was a gate only; no remote deployment or database migration was executed.
- Beta and Production jobs were skipped.

The Node billing script was relabelled to distinguish its actual coverage:
- Its live checks cover anonymous Data API/RPC denial and a service rejection path.
- The queue worker check can be an empty-queue smoke check.
- Its cashflow, partial-settlement arithmetic, journal arithmetic and reversal registry sections are local JavaScript fixture/model checks, **not live database integration tests**.

The separate SQL harness is:
`ProductDetails/v5_4_billing_reconciliation_integration_suite.sql`.

It includes isolated shop/rider fixtures, COD trigger and journal checks, cross-shop settlement/reversal denial, two partial handovers, idempotent replay, reversal/trigger suppression, immutable-ledger protection, and the new idempotency payload mismatch assertion. It now raises an exception if any result row is not PASS.

**That SQL harness is not executed by CI.** It must be run manually on a disposable Alpha/Dev database after migrations 1–5 have been applied. No 10/10 live SQL result is claimed in this handoff.

## Database environment verification

The connected Supabase project was read-only inspected:

- Project name: `Foody Vrinda`
- Project ref: `mrsxliwyqodtwjuyqmts`
- Region: `ap-northeast-1`
- Project state: `ACTIVE_HEALTHY`
- Supabase development branch list: empty.
- Migration list returned empty; `supabase_migrations.schema_migrations` was not present.

The live catalog still showed the earlier shop helper with the `session_user IN ('postgres', 'supabase_admin')` bypass, an UPDATE-only COD trigger, and anonymous EXECUTE on the old public helper/trigger function. This is evidence that follow-up migrations 2–5 are not reflected in that connected database.

The project is named only “Foody Vrinda”; its identity as Alpha/Dev versus Production could not be established from the available project metadata. Therefore, **no migrations were applied**. This avoids changing a potentially live database without a verified target.

A read-only duplicate scan found no existing duplicate `cod_collection` ledger rows in that connected project at audit time. This does not replace the migration preflight, which will stop if duplicates are found in the actual target database.

## CI safety correction

The workflow `.github/workflows/ci-cd-enforcement.yml` was corrected:
- Feature-branch tests use only `DEV_SUPABASE_URL` and `DEV_SUPABASE_ANON_KEY`; generic Supabase/production-looking secret fallbacks were removed.
- Alpha/Dev, Beta/Staging and Production jobs are explicitly named as **gates only**.
- Their messages state that no deployment and no database migration is executed by this workflow.

This workflow is a validation gate, not an automated deployment pipeline.

## Required final environment steps

1. Confirm the exact Supabase project ref that is the disposable Alpha/Dev target. Do not use the connected `mrsxliwyqodtwjuyqmts` project until its environment is explicitly confirmed.
2. Apply migrations `20261110000001` through `20261110000005` in order to that Alpha/Dev target.
3. Run `ProductDetails/v5_4_billing_reconciliation_integration_suite.sql` there and require every result row to be PASS, including `TEST_10`.
4. Verify in the target catalog that:
   - `can_manage_shop_finances(text)` no longer uses `session_user` as a caller bypass;
   - `trg_cod_collection_ledger` is `AFTER INSERT OR UPDATE OF cash_status`;
   - `anon` cannot EXECUTE the shop helper, settlement/reversal RPCs, or trigger-only function;
   - `authenticated` can execute only the intended financial RPC/helper functions;
   - the partial unique COD index exists.
5. Run Supabase security and performance advisors again and review any remaining project-wide findings. Existing advisor findings outside the billing objects are not certified as remediated by this branch.

## Release decision

**Do not merge or release to Production yet.** The feature-branch code and CI gates are green, but financial database acceptance is incomplete until the target Alpha/Dev environment is confirmed, migrations are applied there, and the SQL integration harness passes against that database. Once those steps pass, run a final review before a separately approved merge/release.
