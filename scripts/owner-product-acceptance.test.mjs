import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateOwnerProductAcceptance } from './owner-product-acceptance.mjs';
const bytes = Buffer.from('Synthetic test attestation; not a real approval.');
const context = { pullRequest: 1, candidateSha: 'a'.repeat(40), policyRevision: 'b'.repeat(40) };
const fixture = () => ({
 schemaVersion: 'urai-owner-product-acceptance-v1', owner: 'Adam Clamp',
 repository: 'LifeLoggerAI/urai-spatial', ...context, decision: 'APPROVED',
 reviewedAt: '2026-11-25T12:00:00-06:00', scope: ['usability'],
 attestationSha256: createHash('sha256').update(bytes).digest('hex'),
 limitations: ['Synthetic fixture only'], productionAuthorized: false
});
test('valid structure never authenticates identity or authorizes release', () => {
 const result = validateOwnerProductAcceptance(fixture(), context, bytes);
 assert.equal(result.valid, true);
 assert.equal(result.identityAuthenticated, false);
 assert.equal(result.independentApproval, false);
 assert.equal(result.productionAuthorized, false);
});
test('negative decision is retained, not converted to approval', () => {
 const result = validateOwnerProductAcceptance({...fixture(), decision:'NOT APPROVED'}, context, bytes);
 assert.equal(result.valid, true); assert.equal(result.decision, 'NOT APPROVED');
});
for (const [name, patch] of [
 ['wrong owner',{owner:'LimberNutz0'}], ['wrong repository',{repository:'Other/repo'}],
 ['wrong PR',{pullRequest:2}], ['changed source',{candidateSha:'c'.repeat(40)}],
 ['wrong policy',{policyRevision:'d'.repeat(40)}], ['production claim',{productionAuthorized:true}],
 ['privacy scope',{scope:['privacy']}], ['duplicate scope',{scope:['usability','usability']}],
 ['missing scope',{scope:[]}], ['invalid decision',{decision:'good to go'}],
 ['missing timezone',{reviewedAt:'2026-11-25T12:00:00'}], ['invalid date',{reviewedAt:'garbage'}],
 ['independent claim',{INDEPENDENT_DECISION:'APPROVED'}], ['hash mismatch',{attestationSha256:'0'.repeat(64)}],
 ['unknown field',{releaseApproved:true}], ['blank limitation',{limitations:['']}]
]) test('rejects '+name, () => assert.equal(validateOwnerProductAcceptance({...fixture(),...patch},context,bytes).valid,false));
test('rejects missing binding context', () => assert.equal(validateOwnerProductAcceptance(fixture(),{},bytes).valid,false));
test('rejects changed attestation bytes', () => assert.equal(validateOwnerProductAcceptance(fixture(),context,Buffer.from('changed')).valid,false));
test('rejects absent required fields', () => { const r=fixture(); delete r.limitations; assert.equal(validateOwnerProductAcceptance(r,context,bytes).valid,false); });
test('rejects non-object input', () => assert.equal(validateOwnerProductAcceptance(null,context,bytes).valid,false));
