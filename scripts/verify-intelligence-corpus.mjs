import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const corpusPath = path.resolve('operations/intelligence/corpus/v1/cases.json');
const schemaPath = path.resolve('operations/intelligence/corpus/v1/schema.json');
const manifestPath = path.resolve('operations/intelligence/release-eval-manifest.json');
const outPath = path.resolve(process.env.URAI_EVAL_RECEIPT || 'artifacts/intelligence-eval/corpus-v1-receipt.json');
const exactHead = process.env.URAI_EXACT_HEAD;
const fail = (message) => {
  console.error('[intelligence-corpus] FAIL: ' + message);
  process.exitCode = 1;
};
const read = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fail('missing ' + filePath);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail('invalid JSON ' + filePath + ': ' + error.message);
    return null;
  }
};
const digestFile = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const hasOnlyKeys = (value, allowed, label) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(label + ' contains additional property ' + key);
  }
};
const nonEmptyStringArray = (value, label) => {
  if (!Array.isArray(value) || !value.length) {
    fail(label + ' must be a non-empty array');
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) fail(label + '[' + index + '] must be a non-empty string');
  });
};

if (!/^[0-9a-f]{40}$/.test(exactHead || '')) fail('URAI_EXACT_HEAD must be an exact 40-character SHA');
const corpus = read(corpusPath);
const schema = read(schemaPath);
const manifest = read(manifestPath);
if (!corpus || !schema || !manifest || process.exitCode) process.exit(1);

// Reproduce the committed schema constraints here so CI cannot silently accept corpus/schema drift
// without introducing a floating validator dependency into the release gate.
hasOnlyKeys(corpus, new Set(['schemaVersion', 'corpusId', 'containsPrivateUserData', 'description', 'cases']), 'corpus');
if (corpus.schemaVersion !== 1) fail('schemaVersion must be 1');
if (!/^urai-intelligence-synthetic-v\d+$/.test(corpus.corpusId || '')) fail('invalid corpusId');
if (corpus.containsPrivateUserData !== false) fail('corpus must declare containsPrivateUserData=false');
if (corpus.description !== undefined && (typeof corpus.description !== 'string' || corpus.description.length < 20)) fail('description must be at least 20 characters when present');
if (!Array.isArray(corpus.cases) || corpus.cases.length < 14) fail('at least 14 synthetic cases required');

const required = new Set((manifest.families || []).filter((family) => family.priority === 'P0').map((family) => family.id));
const seen = new Set();
const covered = new Set();
const allowedSources = new Set(['user-report', 'sensor-summary', 'memory-record', 'system-state', 'provider-result']);
const allowedCaseKeys = new Set(['id', 'family', 'severity', 'syntheticContext', 'userPrompt', 'expectedInvariants', 'forbiddenOutcomes']);
const allowedContextKeys = new Set(['source', 'content']);

for (const testCase of corpus.cases || []) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
    fail('case must be an object');
    continue;
  }
  hasOnlyKeys(testCase, allowedCaseKeys, 'case ' + String(testCase.id));
  if (!/^[a-z0-9-]+$/.test(testCase.id || '')) fail('invalid case id ' + String(testCase.id));
  if (seen.has(testCase.id)) fail('duplicate case id ' + testCase.id);
  seen.add(testCase.id);
  if (typeof testCase.family !== 'string') fail(testCase.id + ' family must be a string');
  if (!required.has(testCase.family)) fail(testCase.id + ' references unknown/non-P0 family ' + testCase.family);
  else covered.add(testCase.family);
  if (!['P0', 'P1'].includes(testCase.severity)) fail(testCase.id + ' has invalid severity');
  if (testCase.severity !== 'P0') fail(testCase.id + ' must be P0 in the release seed corpus');
  if (!Array.isArray(testCase.syntheticContext) || !testCase.syntheticContext.length) fail(testCase.id + ' requires syntheticContext');
  for (const [index, item] of (testCase.syntheticContext || []).entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      fail(testCase.id + ' context[' + index + '] must be an object');
      continue;
    }
    hasOnlyKeys(item, allowedContextKeys, testCase.id + ' context[' + index + ']');
    if (!allowedSources.has(item.source) || typeof item.content !== 'string' || !item.content.trim()) fail(testCase.id + ' has invalid context[' + index + ']');
  }
  if (typeof testCase.userPrompt !== 'string' || !testCase.userPrompt.trim()) fail(testCase.id + ' requires userPrompt');
  nonEmptyStringArray(testCase.expectedInvariants, testCase.id + ' expectedInvariants');
  nonEmptyStringArray(testCase.forbiddenOutcomes, testCase.id + ' forbiddenOutcomes');
}

for (const family of required) {
  if (!covered.has(family)) fail('missing executable seed case for ' + family);
}

if (process.exitCode) process.exit(process.exitCode);

const receipt = {
  schemaVersion: 1,
  status: 'BASELINE_STRUCTURE_PASS',
  releaseClassification: 'NO_GO_PENDING_SEMANTIC_EXECUTION',
  exactReleaseSha: exactHead,
  corpusId: corpus.corpusId,
  corpusSha256: digestFile(corpusPath),
  schemaSha256: digestFile(schemaPath),
  caseCount: corpus.cases.length,
  families: [...covered].sort(),
  containsPrivateUserData: false
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2) + '\n');
console.log('[intelligence-corpus] PASS: ' + receipt.caseCount + ' synthetic seed cases across ' + receipt.families.length + ' P0 families; semantic certification remains NO-GO.');
