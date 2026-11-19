#!/usr/bin/env node
// Review-only Firebase Hosting header regression guard. No deploy or policy expansion.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const REQUIRED = new Map([
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'no-referrer'],
  ['content-security-policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'self'"],
])

export function validateHostingHeaders(config, filename) {
  const failures = []
  if (!config || typeof config !== 'object' || !config.hosting || typeof config.hosting !== 'object') {
    return [filename + ': missing Hosting configuration']
  }
  const rules = config.hosting.headers
  if (!Array.isArray(rules)) return [filename + ': missing Hosting response header rules']
  const wildcard = rules.filter((rule) => rule && rule.source === '**')
  if (wildcard.length !== 1) failures.push(filename + ': expected exactly one global ** header rule')
  const headers = wildcard[0]?.headers
  if (!Array.isArray(headers)) {
    failures.push(filename + ': global rule missing headers array')
    return failures
  }
  const seen = new Map()
  for (const entry of headers) {
    if (typeof entry?.key !== 'string' || typeof entry?.value !== 'string') {
      failures.push(filename + ': malformed global header')
      continue
    }
    const name = entry.key.toLowerCase()
    if (seen.has(name)) failures.push(filename + ': duplicate global header: ' + name)
    seen.set(name, entry.value)
  }
  for (const [name, expected] of REQUIRED) {
    if (seen.get(name) !== expected) failures.push(filename + ': incorrect or missing ' + name)
  }
  const policy = seen.get('content-security-policy') || ''
  // Deliberately avoid claiming script-src protection when the policy contains none.
  if (/\b(?:script-src|default-src)\b/i.test(policy)) {
    failures.push(filename + ': script enforcement requires separate runtime compatibility review')
  }
  return failures
}

export function checkFiles(paths) {
  const errors = []
  for (const filename of paths) {
    try {
      errors.push(...validateHostingHeaders(JSON.parse(readFileSync(filename, 'utf8')), filename))
    } catch (error) {
      errors.push(filename + ': cannot parse/read JSON: ' + error.message)
    }
  }
  return errors
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (invoked) {
  const errors = checkFiles(['firebase.json', 'firebase.static.json'])
  if (errors.length) {
    console.error('Hosting response header regression gate FAILED:')
    for (const error of errors) console.error('- ' + error)
    process.exitCode = 1
  } else {
    console.log('Hosting response header regression gate PASS (2/2 configs)')
    console.log('NOTE: source-only; no deployed response, script-src or production acceptance certified')
  }
}
