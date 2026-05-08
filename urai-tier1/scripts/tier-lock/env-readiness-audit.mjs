import fs from 'node:fs'
import { envKeys } from './tier-config.mjs'

function parseDotEnv(file) {
  if (!fs.existsSync(file)) return new Set()
  const text = fs.readFileSync(file, 'utf8')
  const keys = new Set()
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=/)
    if (match) keys.add(match[1])
  }
  return keys
}

function isPullRequestCi() {
  return process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'pull_request'
}

const envFiles = ['.env.local', '.env.production', '.env']
const configured = new Set(Object.keys(process.env))
for (const file of envFiles) {
  for (const key of parseDotEnv(file)) configured.add(key)
}

const missingRequired = []
const missingOptional = []
for (const item of envKeys) {
  if (!configured.has(item.name)) {
    if (item.optional) missingOptional.push(item)
    else missingRequired.push(item)
  }
}

if (missingRequired.length) {
  if (isPullRequestCi()) {
    console.warn('[tier-env-audit] required production env missing in pull request CI')
    for (const item of missingRequired) console.warn(` - ${item.name} for ${item.requiredFor}`)
  } else {
    console.error('[tier-env-audit] failed')
    for (const item of missingRequired) console.error(` - missing ${item.name} for ${item.requiredFor}`)
    if (missingOptional.length) {
      console.warn('[tier-env-audit] optional missing')
      for (const item of missingOptional) console.warn(` - ${item.name} for ${item.requiredFor}`)
    }
    process.exit(1)
  }
}

console.log('[tier-env-audit] passed required env check')
if (missingOptional.length) {
  console.warn('[tier-env-audit] optional missing')
  for (const item of missingOptional) console.warn(` - ${item.name} for ${item.requiredFor}; browser speech fallback should remain available`)
}
