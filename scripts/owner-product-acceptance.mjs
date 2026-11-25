import { createHash } from 'node:crypto';

const fields = ['schemaVersion','owner','repository','pullRequest','candidateSha','policyRevision','decision','reviewedAt','scope','attestationSha256','limitations','productionAuthorized'];
const scopes = ['usability','appearance'];
export function validateOwnerProductAcceptance(record, context, attestation) {
  const errors = [];
  const reject = message => errors.push(message);
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { valid: false, errors: ['record must be an object'], productionAuthorized: false };
  for (const key of Object.keys(record)) if (!fields.includes(key)) reject('unexpected field: ' + key);
  for (const key of fields) if (!Object.hasOwn(record, key)) reject('missing field: ' + key);
  if (record.schemaVersion !== 'urai-owner-product-acceptance-v1') reject('unsupported schema');
  if (record.owner !== 'Adam Clamp') reject('owner mismatch');
  if (record.repository !== 'LifeLoggerAI/urai-spatial') reject('repository mismatch');
  if (!Number.isSafeInteger(record.pullRequest) || record.pullRequest < 1 || record.pullRequest !== context?.pullRequest) reject('PR mismatch');
  for (const key of ['candidateSha','policyRevision']) {
    if (!/^[0-9a-f]{40}$/.test(record[key] ?? '') || record[key] !== context?.[key]) reject(key + ' mismatch');
  }
  if (!['APPROVED','NOT APPROVED'].includes(record.decision)) reject('invalid decision');
  if (typeof record.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(record.reviewedAt) || !Number.isFinite(Date.parse(record.reviewedAt))) reject('invalid review timestamp');
  if (!Array.isArray(record.scope) || record.scope.length < 1 || record.scope.length > 2 || new Set(record.scope).size !== record.scope.length || record.scope.some(s => !scopes.includes(s))) reject('scope must be usability and/or appearance');
  if (!Array.isArray(record.limitations) || record.limitations.some(s => typeof s !== 'string' || !s.trim())) reject('limitations must be strings');
  if (record.productionAuthorized !== false) reject('owner product acceptance cannot authorize production');
  if (!Buffer.isBuffer(attestation) || !/^[0-9a-f]{64}$/.test(record.attestationSha256 ?? '') || (Buffer.isBuffer(attestation) && createHash('sha256').update(attestation).digest('hex') !== record.attestationSha256)) reject('attestation hash mismatch');
  return {
    valid: errors.length === 0,
    errors,
    decision: errors.length === 0 ? record.decision : null,
    identityAuthenticated: false,
    independentApproval: false,
    productionAuthorized: false,
  };
}
