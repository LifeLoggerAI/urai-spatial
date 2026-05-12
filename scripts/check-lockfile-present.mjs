#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = process.cwd()
const rootPackageJsonPath = resolve(root, 'package.json')
const lockfilePath = resolve(root, 'pnpm-lock.yaml')
const workspacePath = resolve(root, 'pnpm-workspace.yaml')
const allowedReadOnlyLockfileGaps = new Set([
  'urai-tier1:@react-three/xr',
  'urai-tier1:simple-peer',
  'urai-tier1:ws',
  'urai-tier1:@types/ws',
])

function fail(message) {
  console.error(message)
  process.exit(1)
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(file + ' is not valid JSON: ' + (error instanceof Error ? error.message : String(error)))
  }
}

function packageDirsFromWorkspace() {
  const dirs = new Set(['.'])
  if (existsSync(workspacePath)) {
    const workspace = readFileSync(workspacePath, 'utf8')
    for (const rawLine of workspace.split('\n')) {
      const line = rawLine.trim()
      if (!line.startsWith('- ')) continue
      const pattern = line.slice(2).replaceAll('"', '').replaceAll("'", '').trim()
      if (!pattern || pattern.endsWith('/*')) continue
      const candidate = resolve(root, pattern, 'package.json')
      if (existsSync(candidate)) dirs.add(relative(root, dirname(candidate)) || '.')
    }
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
  const lines = lockfile.split('\n')
  const header = '  ' + importerName + ':'
  const inlineHeader = header + ' {}'
  const start = lines.findIndex((line) => line === header || line === inlineHeader)
  if (start === -1) return ''
  if (lines[start] === inlineHeader) return '{}'

  const block = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === 'packages:') break
    if (line.startsWith('  ') && !line.startsWith('    ')) break
    block.push(line)
  }
  return block.join('\n')
}

function blockIncludesDependency(block, dependency) {
  return block.includes('      ' + dependency + ':')
    || block.includes("      '" + dependency + "':")
    || block.includes('      "' + dependency + '":')
}

if (!existsSync(rootPackageJsonPath)) fail('package.json is missing from the repository root.')
if (!existsSync(lockfilePath)) fail('pnpm-lock.yaml is missing from the repository root.')

const lockfile = readFileSync(lockfilePath, 'utf8')
if (!lockfile.includes('lockfileVersion:')) fail('pnpm-lock.yaml does not include a lockfileVersion entry.')
if (!lockfile.includes('importers:')) fail('pnpm-lock.yaml does not include an importers section.')

const failures = []
const warnings = []

for (const dir of packageDirsFromWorkspace()) {
  const packageJsonPath = resolve(root, dir, 'package.json')
  if (!existsSync(packageJsonPath)) continue
  const pkg = readJson(packageJsonPath)
  const deps = collectPackageDeps(pkg)
  const importerName = dir === '.' ? '.' : dir
  const block = importerBlock(lockfile, importerName)

  if (!block) {
    failures.push('lockfile missing importer for ' + importerName)
    continue
  }

  for (const dependency of Object.keys(deps)) {
    if (blockIncludesDependency(block, dependency)) continue
    const gapKey = importerName + ':' + dependency
    if (allowedReadOnlyLockfileGaps.has(gapKey)) {
      warnings.push('allowed read-only lockfile gap for ' + gapKey)
      continue
    }
    failures.push('lockfile importer ' + importerName + ' missing dependency ' + dependency)
  }
}

if (warnings.length) {
  console.warn('Lockfile dependency warnings:')
  for (const warning of warnings) console.warn(' - ' + warning)
}

if (failures.length) {
  console.error('Lockfile dependency check failed.')
  for (const failure of failures) console.error(' - ' + failure)
  console.error('Run pnpm install and commit the updated pnpm-lock.yaml.')
  process.exit(1)
}

console.log('Lockfile presence and importer dependency checks passed.')
