'use strict'
// Test-only adapter: always execute the repository's actual stored policy validator.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/consentPolicyAuthority.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const actual = { exports: {} }
vm.runInNewContext(js, { module: actual, exports: actual.exports })
const { isCanonicalStoredPolicy, CONSENT_DOMAINS } = actual.exports
if (typeof isCanonicalStoredPolicy !== 'function' || !Array.isArray(CONSENT_DOMAINS)
    || CONSENT_DOMAINS.length !== 6) throw Error('CANONICAL_POLICY_VALIDATOR_UNAVAILABLE')

function canonicalPolicy(ownerId, memoryOverrides = {}) {
  const domain = {
    mode: 'granted', retentionDays: 365, precise: false, replayVisible: true,
    lifeMapVisible: true, modelContext: false, sharingEnabled: false,
    automationEnabled: false, likenessEnabled: false,
  }
  return {
    version: 2, revision: 4, ownerId,
    domains: Object.fromEntries(CONSENT_DOMAINS.map(name => [name, {
      ...domain, ...(name === 'memory' ? memoryOverrides : {}),
    }])),
    enforcement: {
      state: 'fully-enforced', jobId: null, affectedTargets: [],
      providerState: 'not-applicable',
    },
  }
}
module.exports = { canonicalPolicy, isCanonicalStoredPolicy }
