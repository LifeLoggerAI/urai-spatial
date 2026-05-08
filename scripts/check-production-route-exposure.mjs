#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.join(process.cwd(), 'urai-tier1', 'src', 'app')
const guardedRoutePatterns = [
  /^admin(?:\/|$)/,
  /^brand-system(?:\/|$)/,
  /^demo(?:\/|$)/,
  /^internal(?:\/|$)/,
]

const allowedRuntimeGuardTokens = [
  'notFound()',
  'redirect(',
  'NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES',
  'NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES',
  'NEXT_PUBLIC_ALLOW_ADMIN_ROUTES',
  'URAI_ALLOW_PUBLIC_DEMO_ROUTES',
  'URAI_ALLOW_INTERNAL_ROUTES',
  'URAI_ALLOW_ADMIN_ROUTES',
]

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath))
      continue
    }
    if (entry.isFile()) files.push(absolutePath)
  }

  return files
}

function routePathForFile(file) {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  if (!/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(relative)) return null
  return relative.replace(/\/page\.(?:ts|tsx|js|jsx)$/, '')
}

const failures = []

for (const file of walk(appRoot)) {
  const routePath = routePathForFile(file)
  if (!routePath) continue
  if (!guardedRoutePatterns.some((pattern) => pattern.test(routePath))) continue

  const source = fs.readFileSync(file, 'utf8')
  const guarded = allowedRuntimeGuardTokens.some((token) => source.includes(token))
  if (!guarded) {
    failures.push(`${path.relative(process.cwd(), file)} exposes /${routePath} without an explicit production guard`)
  }
}

if (failures.length > 0) {
  console.error('Production route exposure gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production route exposure gate passed')
