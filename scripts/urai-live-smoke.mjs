#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const normalizedBase = baseUrl.replace(/\/$/, '')
const routes = [
  '/',
  '/spatial',
  '/spatial-fallback',
  '/focus?manifestId=seed-memory-bloom',
  '/location-map',
  '/place/place-seed-memory-bloom',
  '/place/place-seed-memory-bloom/replay',
  '/passport',
  '/council',
  '/legacy',
  '/dream',
  '/ground',
]

const failures = []

for (const route of routes) {
  const url = `${normalizedBase}${route}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'urai-live-smoke/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const body = await response.text()
    const hasHtml = /<html|<body|__next|URAI|Urai/i.test(body)

    if (!response.ok || !hasHtml) {
      failures.push(`${url} returned ${response.status} html=${hasHtml}`)
    } else {
      console.log(`OK ${response.status} ${url}`)
    }
  } catch (error) {
    failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('URAI live smoke failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('URAI live smoke passed.')
