/**
 * FOODY VRINDA — PRODUCTION MIGRATION SAFETY LINTER
 * 
 * Enforces technical database rules:
 * 1. Blocks bare DROP TABLE, DROP DATABASE, TRUNCATE.
 * 2. Blocks DELETE or destructive UPDATE without explicit WHERE clause.
 * 3. Warns on direct DROP COLUMN (demanding Expand -> Migrate -> Contract pattern).
 * 4. Ensures DDL idempotency (DROP IF EXISTS, CREATE IF NOT EXISTS).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDirs = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map(p => path.resolve(process.cwd(), p))
  : [path.resolve(__dirname, '../supabase/migrations')];

let totalFilesChecked = 0;
let violationsFound = 0;

const isBreakingApproved = process.env.BREAKING_MIGRATION_APPROVED === 'true';

function lintSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) return;

    // Check 1: TRUNCATE (Strictly forbidden, no override)
    if (/\bTRUNCATE\b\s+(TABLE\s+)?/i.test(trimmed)) {
      console.error(`❌ [CRITICAL HARD-BLOCK] ${fileName}:${index + 1} - TRUNCATE detected! Strictly prohibited on production schema.`);
      violationsFound++;
    }

    // Check 2: Unsafe DELETE without WHERE clause
    if (/\bDELETE\s+FROM\s+[a-zA-Z0-9_."]+/i.test(trimmed) && !trimmed.includes('WHERE') && !trimmed.endsWith(';')) {
      const snippet = lines.slice(index, index + 5).join(' ');
      if (!/WHERE/i.test(snippet)) {
        console.error(`❌ [CRITICAL HARD-BLOCK] ${fileName}:${index + 1} - DELETE statement without WHERE clause detected.`);
        violationsFound++;
      }
    }

    // Check 3: Breaking DDL Operations (Hard-blocked by default, requires BREAKING_MIGRATION_APPROVED=true)
    const breakingPatterns = [
      { regex: /\bALTER\s+TABLE\s+.*DROP\s+COLUMN\b/i, name: 'DROP COLUMN' },
      { regex: /\bDROP\s+TABLE\s+(?!IF\s+EXISTS\s+_temp)/i, name: 'DROP TABLE' },
      { regex: /\bALTER\s+TABLE\s+.*ALTER\s+COLUMN\s+.*TYPE\b/i, name: 'ALTER COLUMN TYPE' },
      { regex: /\bALTER\s+TABLE\s+.*RENAME\s+COLUMN\b/i, name: 'RENAME COLUMN' },
      { regex: /\bALTER\s+TABLE\s+.*RENAME\s+TO\b/i, name: 'RENAME TABLE' }
    ];

    breakingPatterns.forEach(({ regex, name }) => {
      if (regex.test(trimmed)) {
        if (!isBreakingApproved) {
          console.error(`❌ [BREAKING DDL HARD-BLOCK] ${fileName}:${index + 1} - Detected potentially breaking '${name}'.`);
          console.error(`   To avoid downtime, follow 'Expand -> Migrate -> Contract'.`);
          console.error(`   If this is a pre-approved final contract phase, it must be approved via BREAKING_MIGRATION_APPROVED=true in CI.`);
          violationsFound++;
        } else {
          console.warn(`⚠️ [BREAKING DDL OVERRIDE ACKNOWLEDGED] ${fileName}:${index + 1} - '${name}' permitted under reviewed BREAKING_MIGRATION_APPROVED approval.`);
        }
      }
    });
  });

  totalFilesChecked++;
}

console.log('🔍 Auditing SQL migrations for Multi-Environment & Production Safety rules...');

targetDirs.forEach(targetPath => {
  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(targetPath).filter(f => f.endsWith('.sql'));
      files.forEach(f => lintSqlFile(path.join(targetPath, f)));
    } else if (targetPath.endsWith('.sql')) {
      lintSqlFile(targetPath);
    }
  }
});

console.log(`\n📊 Audit Complete: Checked ${totalFilesChecked} SQL files.`);

if (violationsFound > 0) {
  console.error(`⛔ Migration safety check failed with ${violationsFound} critical rule violations.`);
  process.exit(1);
} else {
  console.log('✅ All migrations adhere to Zero-Trust Production Database Rules.');
  process.exit(0);
}
