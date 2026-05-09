#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const defaultTerms = [
  'Preparing your memory map',
  'ASCENT ACTIVE',
  'Passing from sky into constellation',
  'Ascending into your Life Map',
  'RECENTER',
]

const terms = process.argv.slice(2).length ? process.argv.slice(2) : defaultTerms
const ignoredPathFragments = [
  '/.git/',
  '/.next/',
  '/node_modules/',
  '/coverage/',
  '/dist/',
  '/build/',
  '/out/',
]
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])

function normalize(relativePath) {
  return `/${relativePath.replace(/\\/g, '/')}`
}

function isScannable(relativePath) {
  const normalized = normalize(relativePath)
  if (ignoredPathFragments.some((fragment) => normalized.includes(fragment))) return false
  return textExtensions.has(path.extname(relativePath))
}

function walk(directory) {
  const relativeDirectory = path.relative(root, directory)
  if (relativeDirectory && ignoredPathFragments.some((fragment) => normalize(relativeDirectory).includes(fragment))) return []

  return fs.readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry)
    const relativePath = path.relative(root, absolutePath)
    if (!relativePath || ignoredPathFragments.some((fragment) => normalize(relativePath).includes(fragment))) return []

    const stat = fs.statSync(absolutePath)
    if (stat.isDirectory()) return walk(absolutePath)
    if (!stat.isFile() || !isScannable(relativePath)) return []
    return [absolutePath]
  })
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .filter(isScannable)
  } catch {
    return walk(root).map((absolutePath) => path.relative(root, absolutePath)).filter(isScannable)
  }
}

const matches = []
for (const relativePath of trackedFiles()) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) continue

  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const term of terms) {
      if (!line.includes(term)) continue
      matches.push({ relativePath, lineNumber: index + 1, term, line: line.trim() })
    }
  })
}

if (!matches.length) {
  console.log(`source-grep: no matches in tracked source for ${terms.map((term) => JSON.stringify(term)).join(', ')}`)
  process.exit(0)
}

console.error(`source-grep: found ${matches.length} tracked source match${matches.length === 1 ? '' : 'es'}`)
for (const match of matches) {
  console.error(`${match.relativePath}:${match.lineNumber}: ${match.term}`)
  console.error(`  ${match.line}`)
}
process.exit(1)
