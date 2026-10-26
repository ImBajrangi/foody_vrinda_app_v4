/**
 * ============================================================================
 * FOODY VRINDA — MASTER VERIFICATION & TEST SUITE RUNNER
 * ============================================================================
 * 
 * PURPOSE:
 * Orchestrates and executes the complete enterprise test suite for Foody Vrinda,
 * aggregating results from all specialized test harnesses into a consolidated
 * executive report for developers and QA engineers.
 * 
 * SUITES INCLUDED IN MASTER RUN:
 * 1. test-user-flow-e2e.mjs        (Real User Interaction Flow: Nav, Cart, Checkout)
 * 2. test-developer-api-sync.mjs    (Schema Parity, SWR Caching & Realtime Handshake)
 * 3. test-atomic-shop-deletion.mjs  (Zero Menu Bleed & Asynchronous Shop Deletion)
 * 4. test-combo-engine.mjs          (10-Item Constraints, Margins & Cleanup)
 * 5. test-shop-isolation.mjs        (Strict Kitchen Boundaries & Leak Prevention)
 * 
 * EXECUTION COMMAND:
 * node scripts/run-all-tests.mjs
 * or: npm run test:all
 * ============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';

const SUITES = [
  { name: '1. Real User Flow E2E', file: 'scripts/test-user-flow-e2e.mjs' },
  { name: '2. Developer API & DB Sync', file: 'scripts/test-developer-api-sync.mjs' },
  { name: '3. Atomic Shop Deletion & Zero-Bleed', file: 'scripts/test-atomic-shop-deletion.mjs' },
  { name: '4. Combo Offer Engine & Margins', file: 'scripts/test-combo-engine.mjs' },
  { name: '5. Strict Shop Isolation & Leaks', file: 'scripts/test-shop-isolation.mjs' }
];

async function runChildSuite(suite) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn('node', [suite.file], {
      stdio: 'inherit',
      shell: false
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      resolve({
        name: suite.name,
        file: suite.file,
        duration,
        passed: code === 0
      });
    });

    child.on('error', (err) => {
      resolve({
        name: suite.name,
        file: suite.file,
        duration: '0.00',
        passed: false,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log('\n====================================================================');
  console.log('   FOODY VRINDA — COMPREHENSIVE PRODUCTION TEST AUDIT              ');
  console.log('====================================================================\n');

  const summary = [];
  let allPass = true;

  for (const suite of SUITES) {
    console.log(`\n--------------------------------------------------------------------`);
    console.log(`🚀 Executing: ${suite.name} (${suite.file})`);
    console.log(`--------------------------------------------------------------------`);
    const result = await runChildSuite(suite);
    summary.push(result);
    if (!result.passed) allPass = false;
  }

  console.log('\n\n====================================================================');
  console.log('   EXECUTIVE TEST SUMMARY REPORT                                   ');
  console.log('====================================================================');
  console.log('Suite Name                                | Status   | Duration     ');
  console.log('------------------------------------------|----------|--------------');
  for (const item of summary) {
    const padName = item.name.padEnd(41, ' ');
    const statusText = item.passed ? '✅ PASS  ' : '❌ FAIL  ';
    const durationText = `${item.duration}s`.padEnd(12, ' ');
    console.log(`${padName} | ${statusText} | ${durationText}`);
  }
  console.log('====================================================================\n');

  if (!allPass) {
    console.error('⚠️ One or more test suites failed! Review logs above for details.');
    process.exit(1);
  } else {
    console.log('🌟 100% of test suites passed successfully! System is production-ready.\n');
  }
}

main().catch(err => {
  console.error('Fatal Master Runner Exception:', err);
  process.exit(1);
});
