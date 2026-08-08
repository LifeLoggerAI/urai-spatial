import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)
const generatedUrl = new URL('./.run-continuous-spatial-proof-v19-portal-stable.generated.mjs', import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

const lifecycleGuardTarget = "if (!routeEvidence?.routeSettled || !String(request.failure || '').includes('ERR_ABORTED')) return false"
const lifecycleGuardReplacement = "if (!routeEvidence?.routeSettled || !routeEvidence?.lifecycleObserved || !String(request.failure || '').includes('ERR_ABORTED')) return false"
const lifecycleGuardCount = original.split(lifecycleGuardTarget).length - 1
if (lifecycleGuardCount !== 1) {
  throw new Error(`Portal-stable lifecycle abort guard expected one audited occurrence; found ${lifecycleGuardCount}`)
}

const manifestTarget = String.raw`&& /^\/assets\/urai\/final\/manifests\/v[234]-asset-factory-spatial-handoff\.json$/.test(requestUrl.pathname)`
const manifestReplacement = `&& (
          [
            '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
            '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
          ].includes(requestUrl.pathname)
          || (requestUrl.pathname.startsWith('/_next/static/chunks/') && requestUrl.pathname.endsWith('.js'))
          || (requestUrl.pathname.startsWith('/_next/static/css/') && requestUrl.pathname.endsWith('.css'))
          || (requestUrl.pathname === expectedRoute.pathname + 'index.txt' && requestUrl.searchParams.has('_rsc'))
          || (request.method === 'GET'
            && request.resourceType === 'document'
            && request.isNavigationRequest === true
            && requestUrl.href === routeEvidence.href
            && requestUrl.pathname === expectedRoute.pathname
            && requestUrl.searchParams.get('entryPortal') === expectedRoute.entryPortal
            && requestUrl.searchParams.get('cameraCheckpoint') === expectedRoute.cameraCheckpoint)
        )`
const manifestCount = original.split(manifestTarget).length - 1
if (manifestCount !== 1) {
  throw new Error(`Portal-stable navigation-abort predicate expected one audited occurrence; found ${manifestCount}`)
}

const constructionTarget = 'const patched = original.slice(0, portalStart) + repairedPortal + original.slice(portalEnd)'
const constructionReplacement = [
  'const portalPatched = original.slice(0, portalStart) + repairedPortal + original.slice(portalEnd)',
  'const diagnosticsTarget = "page.on(\'requestfailed\', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || \'unknown\' }))"',
  'const diagnosticsReplacement = "page.on(\'requestfailed\', (request) => failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), isNavigationRequest: request.isNavigationRequest(), failure: request.failure()?.errorText || \'unknown\' }))"',
  'const diagnosticsCount = portalPatched.split(diagnosticsTarget).length - 1',
  'if (diagnosticsCount !== 1) {',
  '  throw new Error(`Home failed-request diagnostics expected one audited occurrence; found ${diagnosticsCount}`)',
  '}',
  'const patched = portalPatched.replace(diagnosticsTarget, diagnosticsReplacement)',
  'if (!patched.includes("resourceType: request.resourceType()")) {',
  "  throw new Error('Home failed-request resource metadata was not materialized')",
  '}',
].join('\n')
const constructionCount = original.split(constructionTarget).length - 1
if (constructionCount !== 1) {
  throw new Error(`Portal-stable capture construction expected one audited occurrence; found ${constructionCount}`)
}

const patched = original
  .replace(lifecycleGuardTarget, lifecycleGuardReplacement)
  .replace(manifestTarget, manifestReplacement)
  .replace(constructionTarget, constructionReplacement)

for (const marker of [
  'routeEvidence?.lifecycleObserved',
  "request.method === 'GET'",
  "request.resourceType === 'document'",
  'request.isNavigationRequest === true',
  'requestUrl.href === routeEvidence.href',
  "requestUrl.searchParams.get('entryPortal') === expectedRoute.entryPortal",
  "requestUrl.searchParams.get('cameraCheckpoint') === expectedRoute.cameraCheckpoint",
  "requestUrl.pathname === expectedRoute.pathname + 'index.txt'",
  "requestUrl.pathname.startsWith('/_next/static/chunks/')",
  "requestUrl.pathname.startsWith('/_next/static/css/')",
  'Home failed-request resource metadata was not materialized',
]) {
  if (!patched.includes(marker)) throw new Error(`Generated portal wrapper lost required guard: ${marker}`)
}
if (patched.includes('.home-discreet-controls')) {
  throw new Error('Generated portal wrapper retained the retired discreet-controls contract')
}

await writeFile(generatedUrl, patched, 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
