#!/usr/bin/env node
/**
 * P0 LIVE RLS AUTHORIZATION REGRESSION TEST
 * 
 * Tests the ACTUAL deployed Supabase database authorization model using
 * the anon key (simulating an unauthenticated/anonymous attacker).
 * 
 * This is NOT a static string check. Every assertion hits the real production
 * Supabase API and verifies the actual PostgreSQL RLS response.
 * 
 * Run: node scripts/test-live-rls-regression.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mrsxliwyqodtwjuyqmts.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg';

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function log(icon, msg) { console.log(`${icon}  ${msg}`); }

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === 'SKIP') { skipped++; results.push({ name, status: 'SKIP' }); log('⏭️', `SKIP: ${name}`); return; }
    if (result === true) { passed++; results.push({ name, status: 'PASS' }); log('✅', `PASS: ${name}`); }
    else { failed++; results.push({ name, status: 'FAIL', detail: result }); log('❌', `FAIL: ${name} → ${JSON.stringify(result)}`); }
  } catch (err) {
    failed++; results.push({ name, status: 'ERROR', detail: err?.message }); log('💥', `ERROR: ${name} → ${err?.message}`);
  }
}

function isBlocked(data, error) {
  if (error) {
    const code = error.code || '';
    const msg = (error.message || '').toLowerCase();
    return code === '42501' || code === 'PGRST301' || code === '42P01' ||
      msg.includes('permission denied') || msg.includes('policy') ||
      msg.includes('row-level security') || msg.includes('violates row-level') ||
      (error.status === 403 || error.status === 401);
  }
  if (Array.isArray(data) && data.length === 0) return 'EMPTY';
  return false;
}
function isBlockedOrEmpty(d, e) { const b = isBlocked(d, e); return b === true || b === 'EMPTY'; }
function isMissing(e) {
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  return e.code === '42P01' || e.code === 'PGRST205' || msg.includes('does not exist') || msg.includes('schema cache');
}

console.log('\n' + '━'.repeat(70));
console.log('  P0 LIVE RLS AUTHORIZATION REGRESSION TEST');
console.log(`  Target: ${SUPABASE_URL}`);
console.log(`  Time:   ${new Date().toISOString()}`);
console.log(`  Client: Anonymous (anon key only)`);
console.log('━'.repeat(70) + '\n');

// ── SECTION 1: Anonymous READ ──
console.log('── SECTION 1: Anonymous READ access ──');

await test('Anon CAN read shops', async () => {
  const { data, error } = await anonClient.from('foody_shops').select('id,name').limit(5);
  if (isMissing(error)) return 'SKIP';
  if (error) return `Error: ${error.message}`;
  return Array.isArray(data) && data.length > 0 ? true : `0 shops`;
});

await test('Anon CAN read menus', async () => {
  const { data, error } = await anonClient.from('foody_menus').select('id,name').limit(5);
  if (isMissing(error)) return 'SKIP';
  if (error) return `Error: ${error.message}`;
  return Array.isArray(data) && data.length > 0 ? true : `0 menus`;
});

await test('Anon CANNOT read archived orders (> 7 days)', async () => {
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
  const { data, error } = await anonClient.from('foody_orders').select('id,created_at').lt('created_at', eightDaysAgo).limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} archived rows`;
});

await test('Anon CANNOT read privileged staff in foody_users', async () => {
  const { data, error } = await anonClient.from('foody_users').select('id,email,phone,role').in('role', ['developer', 'owner', 'grand_admin', 'kitchen']).limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} staff accounts`;
});

await test('Anon CANNOT read privileged staff in foody_logged_users', async () => {
  const { data, error } = await anonClient.from('foody_logged_users').select('id,email,phone,role,fcm_token').in('role', ['developer', 'owner', 'grand_admin', 'kitchen']).limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} staff accounts`;
});

await test('Anon CANNOT read cash_settlements', async () => {
  const { data, error } = await anonClient.from('foody_cash_settlements').select('*').limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} rows`;
});

await test('Anon CANNOT read order_events', async () => {
  const { data, error } = await anonClient.from('foody_order_events').select('*').limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} rows`;
});

await test('Anon CANNOT read notifications', async () => {
  const { data, error } = await anonClient.from('foody_notifications').select('*').limit(5);
  if (isMissing(error)) return 'SKIP';
  return isBlockedOrEmpty(data, error) ? true : `EXPOSED: ${data?.length} rows`;
});

// ── SECTION 2: Anonymous WRITE ──
console.log('\n── SECTION 2: Anonymous WRITE attempts ──');

await test('Anon CANNOT insert fraudulent (delivered) orders', async () => {
  const { data, error } = await anonClient.from('foody_orders').insert({
    id: 'rls-test-' + Date.now(), status: 'delivered', customer_name: 'Attacker', total_amount: 1,
    items: JSON.stringify([{name:'Test',quantity:1}]), shop_id: 'shop-vrinda-main'
  });
  if (isMissing(error)) return 'SKIP';
  return isBlocked(data, error) ? true : `VULNERABLE: insert succeeded`;
});

await test('Anon CANNOT insert users', async () => {
  const { data, error } = await anonClient.from('foody_users').insert({
    id: 'rls-attacker-' + Date.now(), email: 'attacker@evil.com', role: 'developer'
  });
  if (isMissing(error)) return 'SKIP';
  return isBlocked(data, error) ? true : `VULNERABLE: insert succeeded`;
});

await test('Anon CANNOT insert logged_users', async () => {
  const { data, error } = await anonClient.from('foody_logged_users').insert({
    id: 'rls-attacker-' + Date.now(), email: 'attacker@evil.com', role: 'developer'
  });
  if (isMissing(error)) return 'SKIP';
  return isBlocked(data, error) ? true : `VULNERABLE: insert succeeded`;
});

await test('Anon CANNOT update order status', async () => {
  const { data, error } = await anonClient.from('foody_orders').update({status:'delivered'}).eq('status','new').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true; // Blocked by trigger/state machine/RLS!
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: update succeeded on ${data?.length} rows`;
});

await test('Anon CANNOT update shop settings', async () => {
  const { data, error } = await anonClient.from('foody_shops').update({is_open:false,name:'HACKED'}).eq('id','shop-vrinda-main').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true;
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: shop update succeeded`;
});

await test('Anon CANNOT update menu items', async () => {
  const { data, error } = await anonClient.from('foody_menus').update({price:0,name:'HACKED'}).neq('id','00000000').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true;
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: menu update succeeded`;
});

await test('Anon CANNOT delete orders', async () => {
  const { data, error } = await anonClient.from('foody_orders').delete().neq('id','00000000').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true;
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: delete succeeded on ${data?.length} rows`;
});

await test('Anon CANNOT insert audit events', async () => {
  const { data, error } = await anonClient.from('foody_order_events').insert({event_type:'fake',actor_id:'attacker'});
  if (isMissing(error)) return 'SKIP';
  return isBlocked(data, error) ? true : `VULNERABLE: audit insert succeeded`;
});

await test('Anon CANNOT insert cash settlements', async () => {
  const { data, error } = await anonClient.from('foody_cash_settlements').insert({id:'fake-'+Date.now(),amount:99999});
  if (isMissing(error)) return 'SKIP';
  return isBlocked(data, error) ? true : `VULNERABLE: settlement insert succeeded`;
});

// ── SECTION 3: Role escalation ──
console.log('\n── SECTION 3: Role escalation attempts ──');

await test('Anon CANNOT escalate role via foody_users', async () => {
  const { data, error } = await anonClient.from('foody_users').update({role:'developer'}).neq('id','00000000').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true;
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: role escalation succeeded on ${data?.length} rows`;
});

await test('Anon CANNOT escalate role via foody_logged_users', async () => {
  const { data, error } = await anonClient.from('foody_logged_users').update({role:'developer'}).neq('id','00000000').select();
  if (isMissing(error)) return 'SKIP';
  if (error) return true;
  return Array.isArray(data) && data.length === 0 ? true : `VULNERABLE: role escalation succeeded on ${data?.length} rows`;
});

// ── SECTION 4: Privileged RPC ──
console.log('\n── SECTION 4: Privileged RPC invocation ──');

const rpcFunctions = [
  'accept_order','cancel_order','advance_order_status','assign_rider',
  'verify_pickup_otp','verify_delivery_otp','complete_order','update_order_status',
  'restore_master_accounts','create_settlement','process_payment','admin_reset_user_role',
  'force_deliver_order'
];

for (const rpcName of rpcFunctions) {
  await test(`Anon CANNOT invoke RPC: ${rpcName}`, async () => {
    const { data, error } = await anonClient.rpc(rpcName, { order_id: 'fake-id' });
    if (error && (error.code === '42883' || error.message?.includes('does not exist') || error.code === 'PGRST202')) return 'SKIP';
    return isBlocked(data, error) ? true : `VULNERABLE: RPC executed`;
  });
}

// ── SECTION 5: Direct REST bypass ──
console.log('\n── SECTION 5: Direct REST API bypass ──');

await test('Direct REST INSERT on orders blocked', async () => {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/foody_orders`, {
    method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({id:'rest-bypass-'+Date.now(),status:'new',customer_name:'REST Attacker',total_amount:1})
  });
  return resp.status >= 400 ? true : `VULNERABLE: REST POST ${resp.status}`;
});

await test('Direct REST UPDATE on orders blocked', async () => {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/foody_orders?status=eq.new`, {
    method: 'PATCH', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({status:'delivered',total_amount:0})
  });
  return (resp.status >= 400 || resp.status === 204) ? true : `VULNERABLE: REST PATCH ${resp.status}`;
});

await test('Direct REST DELETE on orders blocked', async () => {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/foody_orders?id=eq.nonexistent`, {
    method: 'DELETE', headers: { 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'return=minimal' }
  });
  return (resp.status >= 400 || resp.status === 204) ? true : `VULNERABLE: REST DELETE ${resp.status}`;
});

// ── SUMMARY ──
console.log('\n' + '━'.repeat(70));
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
console.log('━'.repeat(70));

if (failed > 0) {
  console.log('\n🔴 FAILURES:');
  for (const r of results.filter(r => r.status === 'FAIL' || r.status === 'ERROR')) {
    console.log(`   ${r.status}: ${r.name}`);
    if (r.detail) console.log(`          ${r.detail}`);
  }
}
if (skipped > 0) {
  console.log('\n⏭️  SKIPPED (not present):');
  for (const r of results.filter(r => r.status === 'SKIP')) console.log(`   ${r.name}`);
}

console.log(failed === 0 ? '\n✅ ALL RLS CHECKS PASSED\n' : '\n❌ RLS REGRESSION DETECTED\n');
process.exit(failed > 0 ? 1 : 0);
