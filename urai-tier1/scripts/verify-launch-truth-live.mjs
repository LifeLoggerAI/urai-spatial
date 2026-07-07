import crypto from 'node:crypto'

const baseUrl = process.env.URAI_LIVE_BASE_URL || 'https://urai.app'

const routes = [
  {
    path: '/',
    required: ['URAI'],
    forbidden: ['V1-V100 are complete'],
  },
  {
    path: '/home',
    required: ['URAI'],
    forbidden: ['V1-V100 are complete'],
  },
  {
    path: '/ground',
    required: ['Ground'],
    forbidden: ['autonomous real-world actions are certified'],
  },
  {
    path: '/life-map',
    required: ['Life'],
    forbidden: ['production-certified persistent private memory backend'],
  },
  {
    path: '/focus?memoryId=quiet-reset',
    required: ['Focus'],
    forbidden: ['diagnostic'],
  },
  {
    path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
    required: ['Replay'],
    forbidden: ['backend persistence certified'],
  },
  {
    path: '/mirror',
    required: ['Mirror'],
    forbidden: ['clinical'],
  },
  {
    path: '/passport',
    required: ['Passport'],
    forbidden: ['production identity backend certified'],
  },
  {
    path: '/privacy-controls',
    required: ['URAI Privacy Controls', 'Choose what the world can hold'],
    forbidden: ['Home threshold entry', 'Launch locked. Proof before expansion.'],
  },
  {
    path: '/status',
    required: ['Launch locked. Proof before expansion.', 'Safe claim:', 'Blocked claim:'],
    forbidden: ['V1-V100 are complete, production-certified'],
  },
  {
    path: '/location-map',
    required: ['Location'],
    forbidden: ['precise live location provider certified'],
  },
  {
    path: '/spatial/ar-vr',
    required: ['XR'],
    forbidden: ['Quest certified', 'device-certified'],
  },
]

function urlFor(path) {
  return new URL(path, baseUrl).toString()
}

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function checkRoute(route) {
  const url = urlFor(route.path)
  const started = Date.now()
  const response = await fetch(url, { redirect: 'follow' })
  const body = await response.text()
  const durationMs = Date.now() - started
  const requiredMissing = route.required.filter((marker) => !body.includes(marker))
  const forbiddenFound = route.forbidden.filter((marker) => body.includes(marker))

  return {
    path: route.path,
    url,
    finalUrl: response.url,
    status: response.status,
    ok: response.ok && requiredMissing.length === 0 && forbiddenFound.length === 0,
    durationMs,
    bytes: Buffer.byteLength(body),
    sha256: hash(body),
    requiredMissing,
    forbiddenFound,
  }
}

const results = []
let failed = false

for (const route of routes) {
  try {
    const result = await checkRoute(route)
    results.push(result)
    if (!result.ok) failed = true
  } catch (error) {
    failed = true
    results.push({
      path: route.path,
      url: urlFor(route.path),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

const report = {
  generated: new Date().toISOString(),
  baseUrl,
  routesChecked: results.length,
  routesOk: results.filter((result) => result.ok).length,
  routesFailed: results.filter((result) => !result.ok).length,
  results,
}

console.log(JSON.stringify(report, null, 2))

if (failed) {
  process.exitCode = 1
}
