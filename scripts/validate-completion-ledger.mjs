#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const ledgerPath = path.join(
  root,
  'operations',
  'completion',
  '2026-07-06',
  'urai-ecosystem-completion-ledger.json',
)

const allowedStatuses = new Set([
  'VERIFIED LIVE',
  'VERIFIED IN REPOSITORY',
  'IMPLEMENTED BUT NOT DEPLOYED',
  'PARTIALLY IMPLEMENTED',
  'BLOCKED',
  'ROADMAP',
  'REJECTED OR OBSOLETE',
])

const allowedSeverities = new Set(['critical', 'high', 'medium', 'low'])
const requiredStringFields = [
  'id',
  'system',
  'requirement',
  'currentEvidence',
  'severity',
  'implementationLocation',
  'validationMethod',
  'targetRelease',
  'status',
  'finalReceiptLocation',
]

function fail(message) {
  console.error(`Completion ledger validation failed: ${message}`)
  process.exitCode = 1
}

if (!fs.existsSync(ledgerPath)) {
  fail(`missing ledger: ${path.relative(root, ledgerPath)}`)
  process.exit()
}

let ledger
try {
  ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
} catch (error) {
  fail(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  process.exit()
}

if (!Array.isArray(ledger.items) || ledger.items.length === 0) {
  fail('items must be a non-empty array')
  process.exit()
}

if (!Array.isArray(ledger.statusValues)) {
  fail('statusValues must be an array')
} else {
  const declared = new Set(ledger.statusValues)
  for (const status of allowedStatuses) {
    if (!declared.has(status)) fail(`statusValues is missing ${status}`)
  }
  for (const status of declared) {
    if (!allowedStatuses.has(status)) fail(`statusValues contains unsupported value ${status}`)
  }
}

const byId = new Map()
for (const [index, item] of ledger.items.entries()) {
  const label = item?.id || `item[${index}]`

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    fail(`item[${index}] must be an object`)
    continue
  }

  for (const field of requiredStringFields) {
    if (typeof item[field] !== 'string' || item[field].trim() === '') {
      fail(`${label} has an empty or non-string ${field}`)
    }
  }

  if (typeof item.id === 'string') {
    if (!/^[A-Z][A-Z0-9]*-[0-9]{3}$/.test(item.id)) {
      fail(`${label} does not match the required ID format PREFIX-000`)
    }
    if (byId.has(item.id)) fail(`duplicate item ID ${item.id}`)
    byId.set(item.id, item)
  }

  if (!allowedStatuses.has(item.status)) fail(`${label} has invalid status ${item.status}`)
  if (!allowedSeverities.has(item.severity)) fail(`${label} has invalid severity ${item.severity}`)
  if (!Array.isArray(item.dependencies)) fail(`${label} dependencies must be an array`)
  if (item.blockingAuthority !== null && typeof item.blockingAuthority !== 'string') {
    fail(`${label} blockingAuthority must be a string or null`)
  }
  if (typeof item.finalReceiptLocation === 'string' && item.finalReceiptLocation.includes(' ')) {
    fail(`${label} finalReceiptLocation must not contain spaces`)
  }

  if (item.status === 'VERIFIED LIVE') {
    if (item.blockingAuthority) fail(`${label} is VERIFIED LIVE but still has a blockingAuthority`)
    if (/pending|missing|unknown|not verified|absent/i.test(item.currentEvidence || '')) {
      fail(`${label} is VERIFIED LIVE but its evidence text still describes an unresolved state`)
    }
  }
}

const internalGraph = new Map()
for (const item of ledger.items) {
  if (!item?.id || !Array.isArray(item.dependencies)) continue
  const internalDependencies = []

  for (const dependency of item.dependencies) {
    if (typeof dependency !== 'string' || dependency.trim() === '') {
      fail(`${item.id} has an empty or non-string dependency`)
      continue
    }
    if (dependency === item.id) fail(`${item.id} depends on itself`)
    if (byId.has(dependency)) internalDependencies.push(dependency)
    else if (/^[A-Z][A-Z0-9]*-[0-9]{3}$/.test(dependency)) {
      fail(`${item.id} references unknown internal dependency ${dependency}`)
    }
  }

  internalGraph.set(item.id, internalDependencies)
}

const state = new Map()
const stack = []
function visit(id) {
  const current = state.get(id)
  if (current === 'done') return
  if (current === 'visiting') {
    const start = stack.indexOf(id)
    const cycle = [...stack.slice(start), id].join(' -> ')
    fail(`dependency cycle detected: ${cycle}`)
    return
  }

  state.set(id, 'visiting')
  stack.push(id)
  for (const dependency of internalGraph.get(id) || []) visit(dependency)
  stack.pop()
  state.set(id, 'done')
}

for (const id of byId.keys()) visit(id)

if (process.exitCode) process.exit(process.exitCode)

const counts = {}
for (const item of ledger.items) counts[item.status] = (counts[item.status] || 0) + 1
console.log(
  `Completion ledger validation passed: ${ledger.items.length} items, ${byId.size} unique IDs, status counts ${JSON.stringify(counts)}`,
)
