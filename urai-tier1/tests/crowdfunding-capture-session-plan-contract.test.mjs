import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const planPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-session-plan.md');
const ledgerPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-shot-ledger.csv');

function parseCsvLine(line) {
  return line.split(',');
}

test('capture session plan retains exact release and route-matrix authority', () => {
  const plan = fs.readFileSync(planPath, 'utf8');

  for (const required of [
    '1bbf34d48bcb4d0814346bb69091d3f71c58d54f',
    '29710284063',
    '8448878245',
    'a42ded37d1486a95e72062d04f69016a57660af3',
    '29802269787',
    '8484189712',
    'APPROVED FOR EDIT',
    'REJECTED',
  ]) {
    assert.ok(plan.includes(required), `capture plan missing required authority or state: ${required}`);
  }

  for (let shot = 1; shot <= 12; shot += 1) {
    const id = `C${String(shot).padStart(2, '0')}`;
    assert.ok(plan.includes(id), `capture plan missing shot ${id}`);
  }

  for (const sampleRoute of [
    'https://urai.app/life-map/?demo=1',
    'https://urai.app/focus/?demo=1',
    'https://urai.app/replay/?demo=1',
  ]) {
    assert.ok(plan.includes(sampleRoute));
  }

  assert.ok(plan.match(/SAMPLE DATA/g)?.length >= 3, 'sample routes must require disclosure');
});

test('capture ledger is fail-closed and complete', () => {
  const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  for (const requiredHeader of [
    'shot_id',
    'route',
    'raw_filename',
    'sha256',
    'release_receipt_verified',
    'private_data_visible',
    'secrets_visible',
    'product_truth',
    'privacy_review',
    'security_review',
    'accessibility_review',
    'media_rights_review',
    'status',
  ]) {
    assert.ok(headers.includes(requiredHeader), `ledger missing header ${requiredHeader}`);
  }

  assert.ok(rows.length >= 17, 'ledger must include desktop, mobile and evidence rows');
  const statusIndex = headers.indexOf('status');
  const disclosureIndex = headers.indexOf('required_disclosure');
  const routeIndex = headers.indexOf('route');

  for (const row of rows) {
    assert.equal(row.length, headers.length, 'every ledger row must align with the header schema');
    assert.equal(row[statusIndex], 'HOLD', 'every unreviewed shot must default to HOLD');
    if (/life-map|focus|replay/.test(row[routeIndex])) {
      assert.equal(row[disclosureIndex], 'SAMPLE DATA');
    }
  }
});
