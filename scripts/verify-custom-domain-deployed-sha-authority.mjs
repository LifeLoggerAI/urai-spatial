import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const EXACT_SHA = /^[0-9a-f]{40}$/i

function runGit(args, cwd = process.cwd()) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function assertCanonicalProtectedRevision(expectedSha, authority) {
  if (!EXACT_SHA.test(expectedSha || '')) {
    throw new Error('expected deployed SHA must be exactly 40 hexadecimal characters')
  }
  if (!authority.resolves(expectedSha)) {
    throw new Error(`expected deployed SHA does not resolve to a repository commit: ${expectedSha}`)
  }
  if (!authority.isAncestorOfMain(expectedSha)) {
    throw new Error(`expected deployed SHA is not contained in canonical origin/main history: ${expectedSha}`)
  }
  return expectedSha.toLowerCase()
}

export function gitAuthority(cwd = process.cwd()) {
  return {
    resolves(sha) {
      return runGit(['cat-file', '-e', `${sha}^{commit}`], cwd).status === 0
    },
    isAncestorOfMain(sha) {
      return runGit(['merge-base', '--is-ancestor', sha, 'origin/main'], cwd).status === 0
    },
  }
}

export function verifyFromEnvironment(env = process.env, cwd = process.cwd()) {
  return assertCanonicalProtectedRevision(env.URAI_EXPECTED_DEPLOYED_SHA || '', gitAuthority(cwd))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const sha = verifyFromEnvironment()
    console.log(`Canonical protected deployed SHA authority verified: ${sha}`)
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
