#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_PATH = path.resolve(__dirname, '../src/supabase.monolith.backup.js');
const TARGET_PATH = path.resolve(__dirname, '../src/supabase.js');

function resolveExports(filePath, visited = new Set()) {
  const fullPath = path.resolve(filePath);
  if (visited.has(fullPath)) return new Set();
  visited.add(fullPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`[Parity Check] File not found: ${fullPath}`);
    return new Set();
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const exports = new Set();

  for (const m of content.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g)) {
    exports.add(m[1]);
  }
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g)) {
    exports.add(m[1]);
  }
  for (const m of content.matchAll(/export\s+class\s+([a-zA-Z0-9_$]+)/g)) {
    exports.add(m[1]);
  }
  for (const m of content.matchAll(/export\s*\{([^}]+)\}(?:\s*from\s*['"]([^'"]+)['"])?/g)) {
    const list = m[1];
    const source = m[2];
    if (source) {
      const ext = source.endsWith('.js') ? '' : '.js';
      const resolvedTarget = path.resolve(path.dirname(fullPath), source + ext);
      list.split(',').forEach(item => {
        const parts = item.trim().split(/\s+as\s+/);
        const exportedName = (parts[1] || parts[0]).trim();
        if (exportedName) exports.add(exportedName);
      });
    } else {
      list.split(',').forEach(item => {
        const parts = item.trim().split(/\s+as\s+/);
        const name = (parts[1] || parts[0]).trim();
        if (name) exports.add(name);
      });
    }
  }
  for (const m of content.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    const source = m[1];
    const ext = source.endsWith('.js') ? '' : '.js';
    const resolvedTarget = path.resolve(path.dirname(fullPath), source + ext);
    const subExports = resolveExports(resolvedTarget, visited);
    subExports.forEach(e => exports.add(e));
  }

  return exports;
}

if (!fs.existsSync(BACKUP_PATH)) {
  console.error(`[Parity Check] Backup file not found at ${BACKUP_PATH}`);
  process.exit(1);
}

const baselineExports = resolveExports(BACKUP_PATH);
const currentExports = resolveExports(TARGET_PATH);

const missingExports = [];
for (const exp of baselineExports) {
  if (!currentExports.has(exp)) {
    missingExports.push(exp);
  }
}

console.log('----------------------------------------------------');
console.log('   FOODY VRINDA - SUPABASE EXPORT PARITY VERIFIER   ');
console.log('----------------------------------------------------');
console.log(`Baseline Monolith Exports: ${baselineExports.size}`);
console.log(`Current Facade Exports:   ${currentExports.size}`);

if (missingExports.length > 0) {
  console.error('\n❌ PARITY CHECK FAILED: Missing Exports detected!');
  missingExports.forEach(m => console.error(`  - ${m}`));
  console.error(`\nTotal Missing: ${missingExports.length} / ${baselineExports.size}`);
  process.exit(1);
} else {
  console.log('\n✅ 100% PUBLIC EXPORT PARITY MAINTAINED! (0 Missing)');
  process.exit(0);
}
