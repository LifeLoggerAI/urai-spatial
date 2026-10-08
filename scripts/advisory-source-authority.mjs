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
