import { execFileSync } from 'node:child_process'

export const officialAdvisoryRepository = 'https://github.com/github/advisory-database.git'
const officialRef = 'refs/heads/main'
const nativeGit = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 60_000 })

export function readOfficialAdvisoryHead(git = nativeGit) {
  const record = git(['ls-remote', officialAdvisoryRepository, officialRef]).trim()
  const match = /^([0-9a-f]{40})\s+refs\/heads\/main$/.exec(record)
  if (!match) throw new Error('Missing or malformed official advisory main identity')
  return match[1]
}

export function bindCurrentAdvisoryCheckout(checkout, git = nativeGit) {
  if (git(['-C', checkout, 'remote', 'get-url', 'origin']).trim() !== officialAdvisoryRepository) {
    throw new Error('Advisory checkout origin must be the official repository')
  }
  const current = readOfficialAdvisoryHead(git)
  const checkedOut = git(['-C', checkout, 'rev-parse', 'HEAD']).trim()
  if (checkedOut !== current) throw new Error('Incorrect complete current advisory source')
  if (git(['-C', checkout, 'status', '--porcelain', '--untracked-files=all']).trim()) {
    throw new Error('Official advisory checkout must be clean')
  }
  return current
}

export function requireUnchangedAdvisoryHead(expected, git = nativeGit) {
  if (!/^[0-9a-f]{40}$/.test(expected) || readOfficialAdvisoryHead(git) !== expected) {
    throw new Error('Official advisory HEAD advanced during proof')
  }
}

// Acquisition may follow official main while its sparse clone is downloading.
// Proof still binds independently to current main and must finish at that head.
export function prepareCurrentAdvisoryCheckout(checkout, git = nativeGit) {
  const inspectCheckout = () => {
    if (git(['-C', checkout, 'remote', 'get-url', 'origin']).trim() !== officialAdvisoryRepository) {
      throw new Error('Advisory checkout origin must be the official repository')
    }
    if (git(['-C', checkout, 'status', '--porcelain', '--untracked-files=all']).trim()) {
      throw new Error('Official advisory checkout must be clean')
    }
    const head = git(['-C', checkout, 'rev-parse', 'HEAD']).trim()
    if (!/^[0-9a-f]{40}$/.test(head)) throw new Error('Missing or malformed advisory checkout identity')
    return head
  }

  const initialCommit = inspectCheckout()
  const observations = []
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const before = inspectCheckout()
    const requested = readOfficialAdvisoryHead(git)
    if (before !== requested) {
      git(['-C', checkout, 'fetch', '--depth=1', '--no-tags', '--filter=blob:none', officialAdvisoryRepository, requested])
      inspectCheckout()
      // No force, reset or clean: local modifications may never be discarded.
      git(['-C', checkout, 'checkout', '--detach', requested])
    }
    const checkedOut = inspectCheckout()
    if (checkedOut !== requested) throw new Error('Incorrect complete current advisory source after acquisition')
    const current = readOfficialAdvisoryHead(git)
    observations.push({ attempt, before, requested, checkedOut, current })
    if (checkedOut === current) {
      return {
        schemaVersion: 'urai-current-advisory-acquisition-v1',
        officialRepository: officialAdvisoryRepository,
        officialRef,
        initialCommit,
        currentCommit: current,
        observations,
        completeCorpusAcceptance: false,
        securityWaiver: false,
      }
    }
  }
  throw new Error(`Official advisory HEAD did not stabilize during acquisition: ${JSON.stringify(observations)}`)
}
