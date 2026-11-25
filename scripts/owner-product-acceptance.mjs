import { createHash } from 'node:crypto';

const fields = ['schemaVersion','owner','repository','pullRequest','candidateSha','policyRevision','decision','reviewedAt','scope','attestationSha256','limitations','productionAuthorized'];
const scopes = ['usability','appearance'];
function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, y, m, d, h, minute, second, zone] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(h) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return false;
  return Number.isFinite(Date.parse(value));
}
export function validateOwnerProductAcceptance(record, context, attestation) {
  const errors = [];
  const reject = message => errors.push(message);
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { valid: false, errors: ['record must be an object'], decision: null, identityAuthenticated: false, independentApproval: false, productionAuthorized: false };
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
  if (!validTimestamp(record.reviewedAt)) reject('invalid review timestamp');
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


