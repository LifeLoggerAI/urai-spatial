// Chalk Spatial -> Jobs preview policy. No Firebase tokens or personal memory.
// Production and non-isolated projects are rejected before any network call.
const SHA = /^[a-f0-9]{40}$/;
const ID = /^[A-Za-z0-9_-]{12,64}$/;
const COMPONENTS = new Map([
  ['/', 'home'], ['/home', 'home'], ['/ascent', 'ascent'],
  ['/life-map', 'life-map'], ['/focus', 'focus'], ['/replay', 'replay'],
]);
const STATUSES = new Set(['PENDING','LEASED','RUNNING','SUCCESS','FAILED','DEAD','CANCELLED']);
const FIELDS = new Set(['kind','repository','sourceSha','component','route','selectedStar',
  'frameSamples','p95Ms','status','authority']);
const denied = code => { throw new Error('CHALK_JOBS_TRANSPORT_' + code); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function requireChalkJobsEmulator({environment,journeyEmulatorEnabled,spatialProjectId,jobsProjectId}) {
  if (environment !== 'development' || journeyEmulatorEnabled !== true ||
      spatialProjectId !== 'demo-urai-auth-journey' || jobsProjectId !== 'demo-urai-jobs')
    denied('EMULATOR_ONLY');
  return true;
}
export function chalkJobsDiagnosticRequest({problem,requestId,diagnostic,sourceSha}) {
  if (typeof problem !== 'string' || problem !== problem.trim() ||
      problem.length < 10 || problem.length > 500 || /[\x00-\x1f\x7f]/.test(problem) ||
      !ID.test(requestId) || !SHA.test(sourceSha)) denied('REQUEST');
  if (!record(diagnostic) || Object.keys(diagnostic).some(key => !FIELDS.has(key)) ||
      diagnostic.kind !== 'chalk-spatial-diagnostic-v1' ||
      diagnostic.repository !== 'LifeLoggerAI/urai-spatial' ||
      diagnostic.sourceSha !== sourceSha || !COMPONENTS.has(diagnostic.route) ||
      COMPONENTS.get(diagnostic.route) !== diagnostic.component ||
      diagnostic.selectedStar !== null ||
      diagnostic.status !== 'LOCAL_UNSUBMITTED' ||
      diagnostic.authority !== 'client-observation-not-server-verified' ||
      !Number.isSafeInteger(diagnostic.frameSamples) || diagnostic.frameSamples < 0 ||
      diagnostic.frameSamples > 90 ||
      (diagnostic.frameSamples === 0 ? diagnostic.p95Ms !== null :
        typeof diagnostic.p95Ms !== 'number' || !Number.isFinite(diagnostic.p95Ms) ||
        diagnostic.p95Ms <= 0 || diagnostic.p95Ms > 5000)) denied('DIAGNOSTIC');
  // Explicit field projection; never forward media, arbitrary model tools or query state.
  return Object.freeze({operation:'submit',requestId,problem,diagnostic:Object.freeze({
    kind:diagnostic.kind,repository:diagnostic.repository,sourceSha:diagnostic.sourceSha,
    component:diagnostic.component,route:diagnostic.route,selectedStar:null,
    frameSamples:diagnostic.frameSamples,p95Ms:diagnostic.p95Ms,
    status:diagnostic.status,authority:diagnostic.authority,
  })});
}
export function chalkJobsStatusProjection(reply) {
  if (!record(reply) || !Array.isArray(reply.jobs) || reply.jobs.length > 40 ||
      typeof reply.windowLimited !== 'boolean') denied('READBACK');
  return reply.jobs.map(raw => {
    if (!record(raw) || typeof raw.jobId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(raw.jobId) || !STATUSES.has(raw.status) ||
        !['HELD_UNQUEUED','UNVERIFIED'].includes(raw.admission) ||
        (raw.admission === 'HELD_UNQUEUED' && (raw.queued !== false || raw.status !== 'PENDING')) ||
        (raw.admission !== 'HELD_UNQUEUED' && raw.queued !== null) ||
        (raw.repository !== null && raw.repository !== 'LifeLoggerAI/urai-spatial') ||
        (raw.sourceSha !== null && !SHA.test(raw.sourceSha))) denied('READBACK');
    // Never display or retain arbitrary server-returned fields.
    return Object.freeze({jobId:raw.jobId,status:raw.status,admission:raw.admission,
      queued:raw.queued,repository:raw.repository,sourceSha:raw.sourceSha});
  });
}
export function chalkJobsIntakeReceipt(reply) {
  if (!record(reply) || !/^chalk_[a-f0-9]{32}$/.test(reply.jobId) ||
      reply.status !== 'PENDING' || reply.admission !== 'HELD_UNQUEUED' ||
      reply.queued !== false || typeof reply.deduplicated !== 'boolean') denied('RECEIPT');
  return Object.freeze({jobId:reply.jobId,status:'HELD_UNQUEUED',
    deduplicated:reply.deduplicated});
}
