import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('operations/intelligence/release-eval-manifest.json');
const extensionPath = path.resolve('operations/intelligence/possible-futures-release-eval-manifest.json');
const fail = (message) => { console.error(`[intelligence-release-gate] FAIL: ${message}`); process.exitCode = 1; };
const load = (file) => { if (!fs.existsSync(file)) { fail(`missing ${file}`); return null; } return JSON.parse(fs.readFileSync(file, 'utf8')); };
const manifest = load(manifestPath);
const extension = load(extensionPath);
if (!manifest || !extension) process.exit(process.exitCode || 1);

const requiredFamilies = [
  'grounding','memory-attribution','confidence-calibration','fact-inference-labeling','emotional-restraint','relationship-restraint','sensitive-state-safety','history-consistency','personalization-drift','council-traceability','why-this-explanation','adversarial-boundary','provider-fallback','frozen-regression'
];
const requiredPossibleFuturesFamilies = [
  'scenario-labeling','scenario-isolation','scenario-source-authority','scenario-provider-receipt','self-ledger','council-scenario-traceability','outcome-calibration','global-field-suppression','global-field-publication','viewer-contributor-separation'
];

function validateManifest(current, required, label, minimumTotalCases) {
  if (current.schemaVersion !== 1) fail(`${label}.schemaVersion must be 1`);
  if (current.releaseClassification !== 'NO_GO_UNTIL_ALL_P0_PASS') fail(`${label}.releaseClassification must fail closed`);
  if (current.providerFreeBaseline !== true) fail(`${label}.providerFreeBaseline must be true`);
  if (current.containsPrivateUserData !== false) fail(`${label}.baseline must contain no private user data`);
  const families = new Map((current.families || []).map((family) => [family.id, family]));
  const cases = current.deterministicCases || [];
  const seenCaseIds = new Set();
  for (const familyId of required) {
    const family = families.get(familyId);
    if (!family) { fail(`${label} missing required family ${familyId}`); continue; }
    if (family.priority !== 'P0') fail(`${label}.${familyId} must be P0`);
    if (family.minimumPassRate !== 1) fail(`${label}.${familyId} minimumPassRate must be 1`);
    if (family.requiresExplanation !== true) fail(`${label}.${familyId} must require explanation evidence`);
    if (!Number.isInteger(family.minimumCases) || family.minimumCases < 1) fail(`${label}.${familyId} minimumCases must be a positive integer`);
    const familyCases = cases.filter((testCase) => testCase.family === familyId);
    if (familyCases.length < family.minimumCases) fail(`${label}.${familyId} has ${familyCases.length} deterministic cases; requires ${family.minimumCases}`);
  }
  for (const testCase of cases) {
    if (!families.has(testCase.family)) fail(`${label} case ${testCase.id} references unknown family ${testCase.family}`);
    if (typeof testCase.id !== 'string' || !testCase.id.trim()) fail(`${label} every case requires an id`);
    if (seenCaseIds.has(testCase.id)) fail(`${label} duplicate case id ${testCase.id}`);
    seenCaseIds.add(testCase.id);
    if (typeof testCase.expected !== 'string' || !testCase.expected.trim()) fail(`${label} case ${testCase.id} requires an expected contract`);
  }
  if (cases.length < minimumTotalCases) fail(`${label} baseline is too small: ${cases.length} cases; requires at least ${minimumTotalCases}`);
  return cases.length;
}

for (const [key, value] of Object.entries({ exactHeadRequired:true, historicalResultsCannotCertifyNewSha:true, providerResultsMustRecordModelVersion:true, providerResultsMustRecordDatasetIdentity:true, providerResultsMustRecordRunTimestamp:true })) {
  if (manifest.evidencePolicy?.[key] !== value) fail(`evidencePolicy.${key} must be ${value}`);
}
if (extension.extends !== 'operations/intelligence/release-eval-manifest.json') fail('Possible Futures eval must extend canonical release-eval-manifest.json');

const baseCount = validateManifest(manifest, requiredFamilies, 'base', 90);
const extensionCount = validateManifest(extension, requiredPossibleFuturesFamilies, 'possible-futures', 48);
if (process.exitCode) process.exit(process.exitCode);
console.log(`[intelligence-release-gate] PASS: ${requiredFamilies.length + requiredPossibleFuturesFamilies.length} P0 families, ${baseCount + extensionCount} deterministic contracts across canonical + Possible Futures extension, fail-closed release policy.`);
