import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('operations/intelligence/release-eval-manifest.json');
const fail = (message) => {
  console.error(`[intelligence-release-gate] FAIL: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(manifestPath)) {
  fail(`missing ${manifestPath}`);
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredFamilies = [
  'grounding',
  'memory-attribution',
  'confidence-calibration',
  'fact-inference-labeling',
  'emotional-restraint',
  'relationship-restraint',
  'sensitive-state-safety',
  'history-consistency',
  'personalization-drift',
  'council-traceability',
  'why-this-explanation',
  'adversarial-boundary',
  'provider-fallback',
  'frozen-regression'
];

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
if (manifest.releaseClassification !== 'NO_GO_UNTIL_ALL_P0_PASS') {
  fail('releaseClassification must fail closed');
}
if (manifest.providerFreeBaseline !== true) fail('providerFreeBaseline must be true');
if (manifest.containsPrivateUserData !== false) fail('baseline must contain no private user data');

for (const [key, value] of Object.entries({
  exactHeadRequired: true,
  historicalResultsCannotCertifyNewSha: true,
  providerResultsMustRecordModelVersion: true,
  providerResultsMustRecordDatasetIdentity: true,
  providerResultsMustRecordRunTimestamp: true
})) {
  if (manifest.evidencePolicy?.[key] !== value) fail(`evidencePolicy.${key} must be ${value}`);
}

const families = new Map((manifest.families || []).map((family) => [family.id, family]));
const cases = manifest.deterministicCases || [];
const seenCaseIds = new Set();

for (const familyId of requiredFamilies) {
  const family = families.get(familyId);
  if (!family) {
    fail(`missing required family ${familyId}`);
    continue;
  }
  if (family.priority !== 'P0') fail(`${familyId} must be P0`);
  if (family.minimumPassRate !== 1) fail(`${familyId} minimumPassRate must be 1`);
  if (family.requiresExplanation !== true) fail(`${familyId} must require explanation evidence`);
  if (!Number.isInteger(family.minimumCases) || family.minimumCases < 1) {
    fail(`${familyId} minimumCases must be a positive integer`);
  }

  const familyCases = cases.filter((testCase) => testCase.family === familyId);
  if (familyCases.length < family.minimumCases) {
    fail(`${familyId} has ${familyCases.length} deterministic cases; requires ${family.minimumCases}`);
  }
}

for (const testCase of cases) {
  if (!families.has(testCase.family)) fail(`case ${testCase.id} references unknown family ${testCase.family}`);
  if (typeof testCase.id !== 'string' || !testCase.id.trim()) fail('every case requires an id');
  if (seenCaseIds.has(testCase.id)) fail(`duplicate case id ${testCase.id}`);
  seenCaseIds.add(testCase.id);
  if (typeof testCase.expected !== 'string' || !testCase.expected.trim()) {
    fail(`case ${testCase.id} requires an expected contract`);
  }
}

if (cases.length < 90) fail(`baseline is too small: ${cases.length} cases; requires at least 90`);

if (process.exitCode) process.exit(process.exitCode);

console.log(`[intelligence-release-gate] PASS: ${requiredFamilies.length} P0 families, ${cases.length} deterministic contracts, fail-closed release policy.`);
