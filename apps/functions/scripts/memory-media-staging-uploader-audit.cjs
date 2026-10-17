'use strict'
// Nonproduction, read-only verifier for authenticated Cloud Storage DATA_WRITE
// audit entries. Never grants project/bucket/uploader approval or release status.
// The production uploader-origin module alone supplies provider-fetched entries
// after source-controlled staging approvals and authenticated GCS readback.
const MAX_AUDIT_PAGES = 4
const PAGE_SIZE = 50
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000
const deny = code => { throw Error('STAGING_UPLOAD_AUDIT_UNVERIFIED:' + code) }
const record = x => !!x && typeof x === 'object' && !Array.isArray(x)
const decimal = x => typeof x === 'string' && /^[1-9][0-9]{0,19}$/.test(x)
const simpleProject = x => typeof x === 'string' && /^urai-[a-z0-9-]+-(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/.test(x)
const simpleBucket = x => typeof x === 'string' && /^[a-z0-9][a-z0-9._-]{2,220}$/.test(x)
const simpleObject = x => typeof x === 'string' && x.length > 0 && x.length <= 1024 &&
  /^[-a-zA-Z0-9_./]+$/.test(x) && !x.startsWith('/') &&
  !x.split('/').some(p => !p || p === '.' || p === '..')
const serviceAccount = x => typeof x === 'string' &&
  /^[a-z][a-z0-9._-]{2,120}@[a-z][a-z0-9-]{4,61}[a-z0-9]\.iam\.gserviceaccount\.com$/.test(x)
function expectedObject(x) {
  if (!record(x) || !simpleProject(x.project) || !simpleBucket(x.bucket) ||
      !simpleObject(x.object) || !decimal(x.generation) || !serviceAccount(x.approvedServiceAccount))
    deny('SOURCE_SCOPE_INVALID')
  const time = Date.parse(x.createdAt)
  if (typeof x.createdAt !== 'string' || !Number.isFinite(time) || time <= 0 ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(x.createdAt))
    deny('OBJECT_CREATE_TIME_INVALID')
  return time
}
function uploaderAuditQuery(x) {
  const time = expectedObject(x)
  const from = new Date(time - MAX_CLOCK_SKEW_MS).toISOString()
  const to = new Date(time + MAX_CLOCK_SKEW_MS).toISOString()
  return {
    resourceNames: [`projects/${x.project}`],
    filter: [
      `logName="projects/${x.project}/logs/cloudaudit.googleapis.com%2Fdata_access"`,
      'resource.type="gcs_bucket"',
      `resource.labels.project_id="${x.project}"`,
      `resource.labels.bucket_name="${x.bucket}"`,
      'protoPayload.serviceName="storage.googleapis.com"',
      'protoPayload.methodName="storage.objects.create"',
      `timestamp>="${from}"`,
      `timestamp<="${to}"`,
    ].join(' AND '),
    orderBy: 'timestamp desc', pageSize: PAGE_SIZE,
  }
}
async function readBoundedUploaderAudit(postPage, x) {
  if (typeof postPage !== 'function') deny('AUDIT_READER_MISSING')
  const base = uploaderAuditQuery(x)
  const entries = [], seen = new Set()
  let token
  for (let i = 0; i < MAX_AUDIT_PAGES; i++) {
    const page = await postPage(token ? { ...base, pageToken: token } : base)
    if (!record(page) || (page.entries !== undefined && !Array.isArray(page.entries)) ||
        (page.entries || []).length > PAGE_SIZE) deny('AUDIT_PAGE_INVALID')
    entries.push(...(page.entries || []))
    if (page.nextPageToken === undefined || page.nextPageToken === null || page.nextPageToken === '') return entries
    if (typeof page.nextPageToken !== 'string') deny('AUDIT_PAGE_TOKEN_INVALID')
    if (typeof page.nextPageToken !== 'string' ||
        !/^[a-zA-Z0-9_~+\/=.-]{1,2048}$/.test(page.nextPageToken) ||
        seen.has(page.nextPageToken)) deny('AUDIT_PAGE_TOKEN_INVALID')
    token = page.nextPageToken
    seen.add(token)
  }
  deny('AUDIT_PAGINATION_INCOMPLETE')
}
// Pure negative/contract-test surface. Entries supplied by arbitrary callers
// are *not* an attestation. Production must call this only with authenticated
// Google Logging Data Access rows fetched in readAuthenticatedUploadOrigin.
function verifyUploaderAudit(entries, x) {
  const created = expectedObject(x)
  if (!Array.isArray(entries) || entries.length > MAX_AUDIT_PAGES * PAGE_SIZE)
    deny('AUDIT_ENTRIES_INVALID')
  const resourceName = `projects/_/buckets/${x.bucket}/objects/${x.object}`
  const resourceEncoded = `projects/_/buckets/${x.bucket}/objects/${encodeURIComponent(x.object)}`
  const logName = `projects/${x.project}/logs/cloudaudit.googleapis.com%2Fdata_access`
  const match = entries.filter(e => record(e) && record(e.protoPayload) &&
    e.logName === logName && e.resource?.type === 'gcs_bucket' &&
    e.resource?.labels?.project_id === x.project &&
    e.resource?.labels?.bucket_name === x.bucket &&
    e.protoPayload['@type'] === 'type.googleapis.com/google.cloud.audit.AuditLog' &&
    e.protoPayload.serviceName === 'storage.googleapis.com' &&
    e.protoPayload.methodName === 'storage.objects.create' &&
    (e.protoPayload.resourceName === resourceName || e.protoPayload.resourceName === resourceEncoded))
  if (match.length === 0) deny('CREATE_AUDIT_NOT_FOUND')
  // Detailed DATA_WRITE audit response data MUST bind the *specific immutable
  // generation*. A generic create event or a custom object metadata label is
  // insufficient proof that the approved principal uploaded these ZIP bytes.
  const generationMatch = match.filter(e => typeof e.protoPayload.response?.generation === 'string' &&
    decimal(e.protoPayload.response.generation) && e.protoPayload.response.generation === x.generation)
  if (generationMatch.length !== 1) deny(generationMatch.length ? 'CREATE_AUDIT_AMBIGUOUS' : 'OBJECT_GENERATION_NOT_ATTESTED')
  const event = generationMatch[0], payload = event.protoPayload
  const timestamp = Date.parse(event.timestamp)
  if (!Number.isFinite(timestamp) || Math.abs(created - timestamp) > MAX_CLOCK_SKEW_MS)
    deny('AUDIT_TIME_NOT_BOUND')
  if (typeof event.insertId !== 'string' || !/^[a-zA-Z0-9_-]{4,256}$/.test(event.insertId))
    deny('AUDIT_ENTRY_ID_MISSING')
  if (payload.authenticationInfo?.principalEmail !== x.approvedServiceAccount)
    deny('UPLOADER_PRINCIPAL_NOT_APPROVED')
  if (payload.status && (!record(payload.status) ||
      (payload.status.code !== undefined && Number(payload.status.code) !== 0)))
    deny('CREATE_NOT_SUCCESSFUL')
  if (!Array.isArray(payload.authorizationInfo) || !payload.authorizationInfo.some(v =>
    record(v) && v.permission === 'storage.objects.create' && v.granted === true))
    deny('CREATE_PERMISSION_NOT_ATTESTED')
  return Object.freeze({ audited: true, insertId: event.insertId,
    logName, sourceGeneration: x.generation, timestamp: event.timestamp })
}
module.exports = { uploaderAuditQuery, readBoundedUploaderAudit, verifyUploaderAudit }
