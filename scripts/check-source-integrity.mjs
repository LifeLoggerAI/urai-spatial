#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const ignoredDirectories = new Set([
  '.ai-backups',
  '.git',
  '.next',
  '.turbo',
  '_quarantine',
  'coverage',
  'dist',
  'node_modules',
  'out',
])

const ignoredPathFragments = [
  `${path.sep}_audit${path.sep}`,
  `${path.sep}*audit${path.sep}`,
  `${path.sep}.ai-backups${path.sep}`,
  `${path.sep}_quarantine${path.sep}`,
]

const checkedExtensions = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.md',
  '.mts',
  '.scss',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
])

const mergeMarkerPatterns = [
  /^<<<<<<<(?: |$)/m,
  /^=======(?: |$)/m,
  /^>>>>>>>(?: |$)/m,
]

const suspiciousFileNamePattern = /(?:\.corrupt\.|\.bak\.|\.orig\.|\.rej$|~$)/i

function isIgnoredPath(relativePath) {
  if (relativePath.startsWith('_audit')) return true
  if (relativePath.startsWith('*audit')) return true
  if (relativePath.startsWith('_quarantine')) return true
  return ignoredPathFragments.some((fragment) => relativePath.includes(fragment))
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    const relativePath = path.relative(root, absolutePath)

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue
      if (isIgnoredPath(relativePath)) continue
      files.push(...walk(absolutePath))
      continue
    }

    if (!entry.isFile()) continue
    if (isIgnoredPath(relativePath)) continue
    files.push(absolutePath)
  }

  return files
}

function hasForbiddenControlCharacter(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    const allowed = code === 9 || code === 10 || code === 13
    if (code < 32 && !allowed) return true
  }
  return false
}

const failures = []

for (const file of walk(root)) {
  const relativePath = path.relative(root, file)
  const extension = path.extname(file)

  if (suspiciousFileNamePattern.test(relativePath)) {
    failures.push(`${relativePath}: suspicious backup/corrupt filename in active repository surface`)
  }

  if (!checkedExtensions.has(extension)) continue

  const text = fs.readFileSync(file, 'utf8')

  for (const pattern of mergeMarkerPatterns) {
    if (pattern.test(text)) {
      failures.push(`${relativePath}: unresolved merge marker ${pattern}`)
    }
  }

  if (hasForbiddenControlCharacter(text)) {
    failures.push(`${relativePath}: non-printable control character found`)
  }
}

if (failures.length > 0) {
  console.error('Source integrity gate failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Source integrity gate passed')
