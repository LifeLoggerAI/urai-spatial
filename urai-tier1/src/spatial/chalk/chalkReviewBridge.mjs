// Client-side contract only. Never grants authority or queues an engineering job.
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const REVIEW_ID = /^cr_[a-f0-9]{64}$/;
const COMPONENT = Object.freeze({'/':'home','/home':'home','/ascent':'ascent','/life-map':'life-map','/focus':'focus','/replay':'replay'});
const FIELDS = ['kind','repository','sourceSha','component','route','selectedStar','frameSamples','p95Ms','status','authority'];
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const sameKeys = (x, keys) => record(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const deny = name => { throw Error('CHALK_REVIEW_'+name); };

export function chalkReviewRequest(diagnostic, requestId) {
  if (typeof requestId !== 'string' || !UUID.test(requestId)) deny('REQUEST_ID');
  if (!sameKeys(diagnostic,FIELDS)) deny('FIELDS');
  if (diagnostic.kind !== 'chalk-spatial-diagnostic-v1' ||
      diagnostic.repository !== 'LifeLoggerAI/urai-spatial' ||
      diagnostic.status !== 'LOCAL_UNSUBMITTED' ||
      diagnostic.authority !== 'client-observation-not-server-verified' ||
      diagnostic.selectedStar !== null) deny('AUTHORITY');
  if (!SHA.test(diagnostic.sourceSha)) deny('SOURCE');
  if (!Object.hasOwn(COMPONENT,diagnostic.route) || COMPONENT[diagnostic.route] !== diagnostic.component) deny('ROUTE');
  if (!Number.isSafeInteger(diagnostic.frameSamples) || diagnostic.frameSamples < 0 || diagnostic.frameSamples > 90 ||
      (diagnostic.frameSamples === 0 ? diagnostic.p95Ms !== null :
       typeof diagnostic.p95Ms !== 'number' || !Number.isFinite(diagnostic.p95Ms) || diagnostic.p95Ms <= 0 || diagnostic.p95Ms > 5000)) deny('METRICS');
  // Explicit reconstruction prevents carrying prompt, photo, star, media or arbitrary private fields.
  const safe = Object.freeze({kind:'chalk-spatial-diagnostic-v1',repository:'LifeLoggerAI/urai-spatial',
    sourceSha:diagnostic.sourceSha,component:diagnostic.component,route:diagnostic.route,
    selectedStar:null,frameSamples:diagnostic.frameSamples,p95Ms:diagnostic.p95Ms,
    status:'LOCAL_UNSUBMITTED',authority:'client-observation-not-server-verified'});
  return Object.freeze({requestId,diagnostic:safe});
}

export async function chalkReviewReceipt(request, response, readback) {
  if (!record(request) || !record(request.diagnostic) || !record(response) || !record(readback)) deny('RECEIPT');
  const id=response.reviewId;
  if (typeof id !== 'string' || !REVIEW_ID.test(id) ||
      response.requestId !== request.requestId || response.sourceSha !== request.diagnostic.sourceSha ||
      response.state !== 'REVIEW_ONLY_NOT_QUEUED' || !['RECORDED','EXISTING'].includes(response.result) ||
      readback.reviewId !== id || readback.requestId !== request.requestId ||
      readback.state !== 'REVIEW_ONLY_NOT_QUEUED' ||
      readback.sourceSha !== request.diagnostic.sourceSha ||
      readback.component !== request.diagnostic.component ||
      readback.route !== request.diagnostic.route ||
      typeof readback.digest !== 'string' || !DIGEST.test(readback.digest)) deny('RECEIPT');
  // The Jobs server stores SHA-256 of JSON.stringify(canonical diagnostic).
  // A digest matching the regex is NOT evidence of the submitted diagnostic.
  const subtle=globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') deny('CRYPTO_UNAVAILABLE');
  let hash;
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(request.diagnostic));
    hash = await subtle.digest('SHA-256',bytes);
  } catch { deny('CRYPTO_UNAVAILABLE'); }
  const expected=Array.from(new Uint8Array(hash), b=>b.toString(16).padStart(2,'0')).join('');
  if (readback.digest!==expected) deny('DIGEST_MISMATCH');
  return Object.freeze({reviewId:id,state:'REVIEW_ONLY_NOT_QUEUED',sourceSha:response.sourceSha});
}
