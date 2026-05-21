#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!fs.existsSync(absolute)) {
    failures.push(`missing required file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function requireIncludes(file, needle, label = needle) {
  const content = read(file)
  if (content && !content.includes(needle)) failures.push(`${file} missing ${label}`)
}

function requireJson(file) {
  const content = read(file)
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`)
    return null
  }
}

function listFiles(dir) {
  const absolute = path.join(root, dir)
  if (!fs.existsSync(absolute)) return []
  const out = []
  const stack = [absolute]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      const relative = path.relative(root, full).replaceAll(path.sep, '/')
      if (relative.includes('/node_modules/') || relative.includes('/.next/') || relative.includes('/_audit/')) continue
      if (entry.isDirectory()) stack.push(full)
      else out.push(relative)
    }
  }
  return out
}

function isRuntimeFile(file) {
  return /(?:^|\/)(page|layout|route)\.(tsx|ts|jsx|js)$/.test(file) || /vite\.config\.(ts|js)$/.test(file) || /next\.config\.(mjs|js|ts)$/.test(file)
}

// Required authority files.
for (const required of [
  'CANONICAL_RUNTIME.md',
  'SYSTEM_MAP.md',
  'package.json',
  'pnpm-workspace.yaml',
  'firebase.json',
  'urai-tier1/package.json',
  'urai-tier1/src/app',
  'apps/functions',
  '.github/workflows',
]) {
  if (!exists(required)) failures.push(`missing runtime boundary requirement: ${required}`)
}

requireIncludes('CANONICAL_RUNTIME.md', 'canonical production runtime root is `urai-tier1`', 'canonical runtime declaration')
requireIncludes('SYSTEM_MAP.md', 'Runtime app root: `urai-tier1`', 'system map runtime root')
requireIncludes('pnpm-workspace.yaml', '"urai-tier1"', 'workspace urai-tier1 package')
requireIncludes('pnpm-workspace.yaml', '"apps/functions"', 'workspace functions package')
requireIncludes('pnpm-workspace.yaml', '"packages/tier-locks"', 'workspace tier-locks package')

const rootPackage = requireJson('package.json')
if (rootPackage) {
  if (rootPackage.packageManager !== 'pnpm@10.0.0') failures.push('package.json packageManager must be pnpm@10.0.0')
  const scripts = rootPackage.scripts ?? {}
  for (const scriptName of ['typecheck', 'build', 'launch:check', 'runtime:authority', 'check:source-integrity']) {
    if (!scripts[scriptName]) failures.push(`package.json missing script: ${scriptName}`)
  }
  if (!scripts['check:runtime-boundary']) failures.push('package.json missing script: check:runtime-boundary')
  if (!scripts.typecheck?.includes('urai-tier1')) failures.push('package.json typecheck must target urai-tier1')
  if (!scripts.build?.includes('urai-tier1')) failures.push('package.json build must target urai-tier1')
}

const firebase = requireJson('firebase.json')
if (firebase) {
  if (firebase.hosting?.source !== 'urai-tier1') failures.push('firebase.json hosting.source must be urai-tier1')
  if (firebase.firestore?.rules !== 'firebase/firestore.rules') failures.push('firebase.json firestore.rules must be firebase/firestore.rules')
  if (firebase.firestore?.indexes !== 'firebase/firestore.indexes.json') failures.push('firebase.json firestore.indexes must be firebase/firestore.indexes.json')
  const functionsConfig = Array.isArray(firebase.functions) ? firebase.functions[0] : firebase.functions
  if (functionsConfig?.source !== 'apps/functions') failures.push('firebase.json functions source must be apps/functions')
}

// Root-level runtime trees are forbidden unless explicitly documented as runtime.
for (const staleRoot of ['src', 'app']) {
  if (!exists(staleRoot)) continue
  const runtimeLikeFiles = listFiles(staleRoot).filter(isRuntimeFile)
  if (runtimeLikeFiles.length) {
    failures.push(`root ${staleRoot}/ contains runtime-like files but is not canonical: ${runtimeLikeFiles.slice(0, 10).join(', ')}`)
  }
}

// Workflow guardrails: no npm install/ci for this pnpm workspace, no wrong app roots.
for (const workflow of listFiles('.github/workflows').filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))) {
  const content = read(workflow)
  if (/\bnpm\s+(ci|install|run)\b/.test(content)) failures.push(`${workflow} uses npm in a pnpm workspace`)
  if (/UrAiProd\/apps\/web|apps\/web/.test(content)) failures.push(`${workflow} references a non-canonical app root`) 
  if (/firebase deploy/.test(content) && !/urai-tier1|firebase\.json|live:deploy|deploy:/.test(content)) {
    failures.push(`${workflow} deploys without an obvious canonical runtime/deploy script reference`)
  }
}

if (failures.length) {
  console.error('URAI Spatial runtime boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('URAI Spatial runtime boundary check passed.')
