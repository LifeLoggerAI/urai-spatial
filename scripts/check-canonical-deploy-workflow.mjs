#!/usr/bin/env node

import fs from 'node:fs';

const workflowPath = '.github/workflows/spatial-live-deploy.yml';
const accessibilityPath = 'scripts/verify-live-accessibility.mjs';
const failures = [];

const readRequiredFile = (filePath, description) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failures.push(`${description}: unable to read ${filePath}: ${detail}`);
    return '';
  }
};

const workflow = readRequiredFile(workflowPath, 'canonical deployment workflow');
const accessibility = readRequiredFile(accessibilityPath, 'live accessibility verifier');

const requireText = (source, text, description) => {
  if (!source.includes(text)) failures.push(`${description}: missing ${JSON.stringify(text)}`);
};
const rejectText = (source, text, description) => {
  if (source.includes(text)) failures.push(`${description}: found forbidden ${JSON.stringify(text)}`);
};

requireText(workflow, 'workflow_dispatch:', 'deployment must be manually dispatched');
rejectText(workflow, '\n  push:', 'deployment workflow must not auto-run from a main push');
rejectText(workflow, '\n  pull_request:', 'deployment workflow must not deploy from pull requests');
requireText(workflow, 'expected_sha:', 'exact target SHA is mandatory');
requireText(workflow, 'current_deployed_sha:', 'current deployed SHA is mandatory');
requireText(workflow, 'rollback_sha:', 'rollback SHA is mandatory');
requireText(workflow, 'current_deployment_receipt:', 'pre-deploy identity evidence is mandatory');
requireText(workflow, 'DEPLOY-EXACT-SHA', 'explicit deploy confirmation is mandatory');
requireText(workflow, 'EXERCISE-ROLLBACK', 'explicit rollback rehearsal is mandatory');
requireText(workflow, 'test "$CURRENT_DEPLOYED_SHA" = "$ROLLBACK_SHA"', 'rollback must equal recorded pre-deploy SHA');
requireText(workflow, 'test "$(git rev-parse origin/main)" = "$TARGET_SHA"', 'target must equal exact current main');
requireText(workflow, 'workload_identity_provider:', 'deployment must use workload identity');
rejectText(workflow, 'FIREBASE_SERVICE_ACCOUNT_JSON', 'long-lived service-account JSON must not be used');
requireText(workflow, 'pnpm install --frozen-lockfile', 'frozen installation is mandatory');
requireText(workflow, 'materialize-release-receipt.mjs', 'release receipt must be materialized');
requireText(workflow, 'URAI_RELEASE_RECEIPT_PHASE: prepared', 'prepared receipt stage is mandatory');
requireText(workflow, 'URAI_RELEASE_RECEIPT_PHASE: certified', 'certified receipt stage is mandatory');
requireText(workflow, 'verify-live-accessibility.mjs', 'live accessibility evidence is mandatory');
requireText(workflow, 'rollback-smoke.log', 'rollback smoke evidence is mandatory');
requireText(workflow, 'git checkout --force "$ROLLBACK_SHA"', 'rollback SHA must actually be deployed');
requireText(workflow, 'git checkout --force "$TARGET_SHA"', 'target must be restored after rollback');
requireText(workflow, 'grep -q "URAI Privacy Controls"', 'privacy-controls identity must be verified live');
requireText(workflow, 'retention-days: 365', 'production evidence must have long retention');

requireText(accessibility, "reducedMotion: 'reduce'", 'reduced-motion context must be exercised');
requireText(accessibility, "waitUntil: 'load'", 'live navigation must avoid network-idle flakiness');
requireText(accessibility, 'if (!response?.ok()) throw new Error', 'HTTP failures must stop semantic checks');
requireText(accessibility, 'unnamedInteractive', 'interactive accessible names must be checked');
requireText(accessibility, "element.tagName === 'INPUT'", 'input control values must be included in accessible names');
requireText(accessibility, "element.getAttribute('aria-hidden') !== 'true'", 'hidden controls must be excluded');
requireText(accessibility, 'element.offsetWidth > 0 || element.offsetHeight > 0', 'non-visible controls must be excluded');
requireText(accessibility, 'imagesWithoutAlt', 'image alternative text must be checked');
requireText(accessibility, 'horizontalOverflow', 'mobile horizontal overflow must be checked');
requireText(accessibility, "page.keyboard.press('Tab')", 'keyboard focus entry must be checked');

if (failures.length > 0) {
  console.error('[FAIL] canonical Spatial deployment workflow contract');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[PASS] canonical Spatial deployment workflow contract');
console.log('[PASS] automatic production deployment disabled');
console.log('[PASS] exact target/current/rollback identity required');
console.log('[PASS] rollback deployment, smoke, and target restoration required');
console.log('[PASS] accessibility, mobile, reduced-motion, and route identity evidence required');
console.log('[PASS] deployment executed: 0');
