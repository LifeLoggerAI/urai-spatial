import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const corpusPath = path.resolve('operations/intelligence/corpus/v1/cases.json');
const manifestPath = path.resolve('operations/intelligence/release-eval-manifest.json');
const outPath = path.resolve(process.env.URAI_EVAL_RECEIPT || 'artifacts/intelligence-eval/corpus-v1-receipt.json');
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

const corpus = read(corpusPath);
const manifest = read(manifestPath);
if (!corpus || !manifest) process.exit(1);

if (corpus.schemaVersion !== 1) fail('schemaVersion must be 1');
if (!/^urai-intelligence-synthetic-v\d+$/.test(corpus.corpusId || '')) fail('invalid corpusId');
if (corpus.containsPrivateUserData !== false) fail('corpus must declare containsPrivateUserData=false');
if (!Array.isArray(corpus.cases) || corpus.cases.length < 14) fail('at least 14 synthetic cases required');

const required = new Set((manifest.families || []).filter((family) => family.priority === 'P0').map((family) => family.id));
const seen = new Set();
const covered = new Set();

for (const testCase of corpus.cases || []) {
  if (!testCase || typeof testCase !== 'object') {
    fail('case must be an object');
    continue;
  }
  if (!/^[a-z0-9-]+$/.test(testCase.id || '')) fail('invalid case id ' + String(testCase.id));
  if (seen.has(testCase.id)) fail('duplicate case id ' + testCase.id);
  seen.add(testCase.id);
  if (!required.has(testCase.family)) fail(testCase.id + ' references unknown/non-P0 family ' + testCase.family);
  else covered.add(testCase.family);
  if (testCase.severity !== 'P0') fail(testCase.id + ' must be P0 in the release seed corpus');
  if (!Array.isArray(testCase.syntheticContext) || !testCase.syntheticContext.length) fail(testCase.id + ' requires syntheticContext');
  for (const item of testCase.syntheticContext || []) {
    if (
      !['user-report', 'sensor-summary', 'memory-record', 'system-state', 'provider-result'].includes(item.source) ||
      typeof item.content !== 'string' ||
      !item.content.trim()
    ) fail(testCase.id + ' has invalid context');
  }
  if (typeof testCase.userPrompt !== 'string' || !testCase.userPrompt.trim()) fail(testCase.id + ' requires userPrompt');
  if (!Array.isArray(testCase.expectedInvariants) || !testCase.expectedInvariants.length) fail(testCase.id + ' requires expectedInvariants');
  if (!Array.isArray(testCase.forbiddenOutcomes) || !testCase.forbiddenOutcomes.length) fail(testCase.id + ' requires forbiddenOutcomes');
}

for (const family of required) {
  if (!covered.has(family)) fail('missing executable seed case for ' + family);
}

const raw = fs.readFileSync(corpusPath);
const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
if (process.exitCode) process.exit(process.exitCode);

const receipt = {
  schemaVersion: 1,
  status: 'BASELINE_STRUCTURE_PASS',
  releaseClassification: 'NO_GO_PENDING_SEMANTIC_EXECUTION',
  corpusId: corpus.corpusId,
  corpusSha256: sha256,
  caseCount: corpus.cases.length,
  families: [...covered].sort(),
  containsPrivateUserData: false
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2) + '\n');
console.log('[intelligence-corpus] PASS: ' + receipt.caseCount + ' synthetic seed cases across ' + receipt.families.length + ' P0 families; semantic certification remains NO-GO.');
