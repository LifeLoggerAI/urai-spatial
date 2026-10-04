import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('operations/intelligence/release-eval-manifest.json');
const possibleFuturesPath = path.resolve('operations/intelligence/possible-futures-release-eval-manifest.json');
const fail = (message) => {
  console.error(`[intelligence-release-gate] FAIL: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(manifestPath)) {
  fail(`missing ${manifestPath}`);
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!fs.existsSync(possibleFuturesPath)) {
  fail(`missing ${possibleFuturesPath}`);
  process.exit(process.exitCode || 1);
}
const possibleFutures = JSON.parse(fs.readFileSync(possibleFuturesPath, 'utf8'));
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
const requiredPossibleFuturesFamilies = [
  'scenario-labeling',
  'scenario-isolation',
  'scenario-source-authority',
  'scenario-provider-receipt',
  'self-ledger',
  'council-scenario-traceability',
  'outcome-calibration'
];
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

if (possibleFutures.schemaVersion !== 1) fail('possible-futures.schemaVersion must be 1');
if (possibleFutures.releaseClassification !== 'NO_GO_UNTIL_ALL_P0_PASS') fail('possible-futures releaseClassification must fail closed');
if (possibleFutures.extends !== 'operations/intelligence/release-eval-manifest.json') fail('possible-futures eval must extend canonical release eval');
if (possibleFutures.providerFreeBaseline !== true) fail('possible-futures providerFreeBaseline must be true');
if (possibleFutures.containsPrivateUserData !== false) fail('possible-futures baseline must contain no private user data');
if (possibleFutures.scope !== 'possible-futures-ai-self-ledger') fail('possible-futures scope must remain bounded to the owned subsystem');

const futureFamilies = new Map((possibleFutures.families || []).map((family) => [family.id, family]));
const futureCases = possibleFutures.deterministicCases || [];
const futureCaseIds = new Set();

for (const familyId of requiredPossibleFuturesFamilies) {
  const family = futureFamilies.get(familyId);
  if (!family) {
    fail(`possible-futures missing required family ${familyId}`);
    continue;
  }
  if (family.priority !== 'P0') fail(`possible-futures.${familyId} must be P0`);
  if (family.minimumPassRate !== 1) fail(`possible-futures.${familyId} minimumPassRate must be 1`);
  if (family.requiresExplanation !== true) fail(`possible-futures.${familyId} must require explanation evidence`);
  if (!Number.isInteger(family.minimumCases) || family.minimumCases < 1) fail(`possible-futures.${familyId} minimumCases must be positive`);
  const familyCases = futureCases.filter((testCase) => testCase.family === familyId);
  if (familyCases.length < family.minimumCases) fail(`possible-futures.${familyId} has ${familyCases.length} cases; requires ${family.minimumCases}`);
}

for (const testCase of futureCases) {
  if (!futureFamilies.has(testCase.family)) fail(`possible-futures case ${testCase.id} references unknown family ${testCase.family}`);
  if (typeof testCase.id !== 'string' || !testCase.id.trim()) fail('possible-futures every case requires an id');
  if (futureCaseIds.has(testCase.id)) fail(`possible-futures duplicate case id ${testCase.id}`);
  futureCaseIds.add(testCase.id);
  if (typeof testCase.expected !== 'string' || !testCase.expected.trim()) fail(`possible-futures case ${testCase.id} requires expected contract`);
}
if (futureCases.length < 31) fail(`possible-futures baseline is too small: ${futureCases.length} cases; requires at least 31`);

if (process.exitCode) process.exit(process.exitCode);

console.log(`[intelligence-release-gate] PASS: ${requiredFamilies.length + requiredPossibleFuturesFamilies.length} P0 families, ${cases.length + futureCases.length} deterministic contracts across canonical + Possible Futures authority.`);
