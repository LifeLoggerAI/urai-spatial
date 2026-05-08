#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = process.cwd()
const rootPackageJsonPath = resolve(root, 'package.json')
const lockfilePath = resolve(root, 'pnpm-lock.yaml')
const workspacePath = resolve(root, 'pnpm-workspace.yaml')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function packageDirsFromWorkspace() {
  const dirs = new Set(['.'])
  if (!existsSync(workspacePath)) return [...dirs]

  const workspace = readFileSync(workspacePath, 'utf8')
  for (const line of workspace.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+['"]?([^'"#]+)['"]?\s*$/)
    if (!match) continue
    const pattern = match[1].trim()
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2)
      // Avoid directory glob expansion here. This check only needs known packages with package.json.
      continue
    }
    const candidate = resolve(root, pattern, 'package.json')
    if (existsSync(candidate)) dirs.add(relative(root, dirname(candidate)) || '.')
  }

  for (const known of ['apps/functions', 'packages/tier-locks', 'urai-tier1']) {
    if (existsSync(resolve(root, known, 'package.json'))) dirs.add(known)
  }

  return [...dirs]
}

function collectPackageDeps(pkg) {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  }
}

function importerBlock(lockfile, importerName) {
  const escaped = importerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\n  ${escaped}:\\n([\\s\\S]*?)(?=\\n  [^\\s][^\\n]*:\\n|\\npackages:\\n|$)`)
  return lockfile.match(pattern)?.[1] ?? ''
}

if (!existsSync(rootPackageJsonPath)) fail('package.json is missing from the repository root.')
if (!existsSync(lockfilePath)) fail('pnpm-lock.yaml is missing from the repository root.')

const lockfile = readFileSync(lockfilePath, 'utf8')
if (!lockfile.includes('lockfileVersion:')) fail('pnpm-lock.yaml does not include a lockfileVersion entry.')
if (!lockfile.includes('importers:')) fail('pnpm-lock.yaml does not include an importers section.')

const failures = []

for (const dir of packageDirsFromWorkspace()) {
  const packageJsonPath = resolve(root, dir, 'package.json')
  if (!existsSync(packageJsonPath)) continue
  const pkg = readJson(packageJsonPath)
  const deps = collectPackageDeps(pkg)
  const importerName = dir === '.' ? '.' : dir
  const block = importerBlock(lockfile, importerName)

  if (!block) {
    failures.push(`lockfile missing importer for ${importerName}`)
    continue
  }

  for (const dependency of Object.keys(deps)) {
    if (!block.includes(`      ${dependency}:`)) failures.push(`lockfile importer ${importerName} missing dependency ${dependency}`)
  }
}

if (failures.length) {
  console.error('Lockfile dependency check failed.')
  for (const failure of failures) console.error(` - ${failure}`)
  console.error('Run pnpm install and commit the updated pnpm-lock.yaml.')
  process.exit(1)
}

console.log('Lockfile presence and importer dependency checks passed.')
