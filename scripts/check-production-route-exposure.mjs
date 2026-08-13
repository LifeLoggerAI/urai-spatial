#!/usr/bin/env node

// Keep the established production exposure checks authoritative, then enforce
// the machine-readable route contract against the current Next.js app tree.
await import('./check-production-route-exposure-v2.mjs')

const fs = await import('node:fs')
const path = await import('node:path')

const root = process.cwd()
const appRoot = path.join(root, 'urai-tier1', 'src', 'app')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release', 'route-manifest.json'), 'utf8'))
const classification = manifest.classification ?? {}
const publicExact = new Set(classification.publicExact ?? [])
const prefixGroups = [
  classification.servicePrefixes ?? [],
  classification.internalPrefixes ?? [],
  classification.privatePrefixes ?? [],
  classification.publicPrefixes ?? [],
]

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(directory, entry.name)
  return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : []
})

const routeFor = (file) => {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  const directory = relative.replace(/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/, '')
  const segments = directory
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.startsWith('@'))
  return segments.length ? `/${segments.join('/')}` : '/'
}

const manifestClassified = (route) => publicExact.has(route) || prefixGroups.some((prefixes) =>
  prefixes.some((prefix) => route === prefix.replace(/\/$/, '') || route.startsWith(prefix)),
)

const sourceClassified = ({ route, source }) => {
  const finiteStaticRoute = route.includes('[')
    && /export\s+const\s+dynamicParams\s*=\s*false/.test(source)
    && /export\s+function\s+generateStaticParams\s*\(/.test(source)
  const operatorOwnedRoute = /LiveControlPanel(?:Stream)?/.test(source)
  return finiteStaticRoute || operatorOwnedRoute
}

const routeRecords = walk(appRoot)
  .filter((file) => /(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(file.replaceAll(path.sep, '/')))
  .map((file) => ({ file, route: routeFor(file), source: fs.readFileSync(file, 'utf8') }))
const routes = [...new Set(routeRecords.map(({ route }) => route))].sort()
const failures = routeRecords
  .filter((record) => !manifestClassified(record.route) && !sourceClassified(record))
  .map(({ route }) => `unclassified route: ${route}`)

for (const route of manifest.criticalRoutes ?? []) {
  if (!routes.includes(route)) failures.push(`critical route missing from source tree: ${route}`)
}
if (manifest.unknownRoutePolicy !== 'fail-release') failures.push('unknownRoutePolicy must be fail-release')
if (manifest.sourceTree !== 'urai-tier1/src/app') failures.push('sourceTree must remain urai-tier1/src/app')

if (failures.length) {
  console.error('Route authority failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Route authority passed: ${routes.length} routes classified; ${(manifest.criticalRoutes ?? []).length} critical routes present`)
