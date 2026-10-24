#!/usr/bin/env node
// Exact Git tree check of the 85 donor source blobs in R4's isolated candidate.
// Checks source identity, not correctness, media admission or launch readiness.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const shaPattern = /^[a-f0-9]{40}$/
const donorCounts = new Map([[1933, 74], [1934, 8], [1887, 3]])
const overridePaths = new Set(['cloudbuild.urai-verify.yaml','urai-tier1/src/components/lifemap/LifeMapSemanticNavigator.tsx','urai-tier1/src/components/lifemap/ComposedLifeMapScene.tsx','urai-tier1/src/components/lifemap/lifeMapPhysicalStarAction.mjs','tests/cloudbuild-shell-execution.test.mjs','scripts/lib/ground-glb-source-anchors.mjs','tests/ground-glb-source-anchors.test.mjs'])
const validPath = p => typeof p === 'string' && p.length > 0 && p.length <= 500 &&
  !p.startsWith('/') && !p.includes('\\') && !p.includes('\0') &&
  p.split('/').every(part => part !== '' && part !== '.' && part !== '..' && part !== '.git')
const fail = message => { throw new Error('R4_SOURCE_PROVENANCE_BLOCKED:' + message) }

export function inspectR4SourceComposition(manifest, entries, head, expectedHead) {
  if (!shaPattern.test(head)) fail('INVALID_SOURCE_HEAD')
  if (expectedHead !== undefined && expectedHead !== head) fail('EXPECTED_HEAD_MISMATCH')
  if (manifest?.schema !== 'urai-r4-source-composition-v1' ||
      manifest?.classification !== 'NONPRODUCTION_UNVERIFIED_DRAFT_NO_RELEASE' ||
      manifest?.releaseApproved !== false || manifest?.privateMediaAdmitted !== false ||
      manifest?.founderVisualApproved !== false) fail('INVALID_NONRELEASE_AUTHORITY')
  if (manifest?.baseline?.head !== '65be933692398c01d1f9218c5f917843e52ac3f5')
    fail('BASELINE_IDENTITY_CHANGED')
  if (!Array.isArray(manifest.sourceDonors) || manifest.sourceDonors.length !== 3 ||
      !Array.isArray(manifest.sourceClaims) || manifest.sourceClaims.length !== 85) fail('DONOR_SOURCE_COUNT_CHANGED')
  const donors = new Map()
  for (const donor of manifest.sourceDonors) {
    if (!donorCounts.has(donor.pr) || donors.has(donor.pr) ||
        donor.count !== donorCounts.get(donor.pr) || !shaPattern.test(donor.sourceHead)) fail('DONOR_PIN_INVALID')
    donors.set(donor.pr, donor.sourceHead)
  }
  if (donors.size !== 3) fail('DONOR_SET_INVALID')
  const overrides = new Map()
  for (const override of manifest.sourceOverrides ?? []) {
    if (!validPath(override.path) || !overridePaths.has(override.path) ||
        overrides.has(override.path) || !shaPattern.test(override.originBlob) ||
        !shaPattern.test(override.expectedBlob) || override.originBlob === override.expectedBlob ||
        typeof override.reason !== 'string' || override.reason.trim().length < 12)
      fail('SOURCE_OVERRIDE_INVALID')
    overrides.set(override.path, override)
  }
  const claimed = new Set(), usedOverrides = new Set(), counts = new Map()
  for (const claim of manifest.sourceClaims) {
    if (!validPath(claim.path) || claimed.has(claim.path) || !shaPattern.test(claim.blob) ||
        !donors.has(claim.sourcePR) ||
        (claim.sourceHead !== donors.get(claim.sourcePR) &&
         !(claim.sourcePR === 1933 &&
           claim.sourceHead === '2f941b70a0f23f07ed22fe6b1ba83368749fd56c' &&
           donors.get(1933) === '9e29e2d5bc0b72a11f51ab8a93d01846be870956')) ||
        !['added','modified'].includes(claim.change)) fail('SOURCE_CLAIM_INVALID')
    claimed.add(claim.path)
    counts.set(claim.sourcePR, (counts.get(claim.sourcePR) ?? 0) + 1)
    const actual = entries.get(claim.path)
    const override = overrides.get(claim.path)
    const expected = override?.expectedBlob ?? claim.blob
    if (override && override.originBlob !== claim.blob) fail('OVERRIDE_ORIGIN_MISMATCH:' + claim.path)
    if (!actual || actual.type !== 'blob' || !['100644','100755'].includes(actual.mode))
      fail('MISSING_REGULAR_BLOB:' + claim.path)
    if (actual.sha !== expected) fail('SOURCE_BLOB_MISMATCH:' + claim.path)
    if (override) usedOverrides.add(claim.path)
  }
  for (const [pr, count] of donorCounts) if (counts.get(pr) !== count) fail('DONOR_PATH_COUNT_MISMATCH:' + pr)
  for (const path of overrides.keys()) if (!usedOverrides.has(path)) fail('UNUSED_SOURCE_OVERRIDE:' + path)
  const extra = manifest.additionalAdmittedDonor
  if (extra === undefined) fail('FIRESTORE_DONOR_MISSING')
  if (extra !== undefined) {
    if (extra.pr !== 1932 || extra.head !== '4b9c519f4ddfba1889280738c9007d2a4d3a653e' ||
        extra.baseCandidate !== '79ca2499ba7315c0b3168426384adfb6052e8633' ||
        extra.releaseApproved !== false || !Array.isArray(extra.sourceClaims) ||
        extra.sourceClaims.length !== 5) fail('FIRESTORE_DONOR_AUTHORITY_INVALID')
    const expectedExtra = new Map([
      ['package.json','2fb031597bb75a8a4ce3bf0e3f8ee63fcebab68a'],
      ['scripts/lib/firestore-java-runtime.mjs','4857e72cbef520990bade224a026e708433e7f70'],
      ['scripts/run-firestore-rules-tests.mjs','8fdfccce7287dd9ff56a536082be4f348b06b961'],
      ['tests/firestore-java-runtime.test.mjs','0e63ffd35e64b1d7871a24b2b15a426d5632012e'],
      ['tests/firestore-rules-execution-authority.test.mjs','03ef2bb54b22fd91a760d05fd64b1493762b750f'],
    ])
    const uniqueExtra = new Set()
    for (const claim of extra.sourceClaims) {
      if (claimed.has(claim.path)) fail('FIRESTORE_DONOR_PATH_COLLIDES:' + claim.path)
      if (!expectedExtra.has(claim.path) || uniqueExtra.has(claim.path) ||
          claim.blob !== expectedExtra.get(claim.path)) fail('FIRESTORE_DONOR_CLAIM_INVALID')
      uniqueExtra.add(claim.path)
      const actual = entries.get(claim.path)
      if (!actual || actual.type !== 'blob' || !['100644','100755'].includes(actual.mode) ||
          actual.sha !== claim.blob) fail('FIRESTORE_DONOR_BLOB_MISMATCH:' + claim.path)
    }
  }
  // Candidate-owned privacy source is not one of the 85 donor paths. Pin it
  // independently; an unattached donor override must never authorize it.
  const candidateSources = manifest.candidateSourceClaims
  const requiredCandidate = new Map([
    ['urai-tier1/src/components/lifemap/useLifeMapEvents.ts',
      'f2619410f05f92d96a9824451089e2023a62c57e'],
    ['urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx', 'a6fefdd2e75448f9869202cf740726168c11caa3'],
    ['urai-tier1/src/components/lifemap/lifeMapSoftwareRouteIntent.mjs', '9947d8086bb4777bd0de2eaf151ed3a36dbb5fd1'],
    ['urai-tier1/src/components/lifemap/lifeMapEventPrivacy.mjs', '0943053fdf773df484be9ba2cddc32ec6023ac2c'],
    ['tests/r4-semantic-privacy-surface.test.mjs', '400741b2ffd435c0ce8488cdd2e6296d89762d92'],
  ])
  if (!Array.isArray(candidateSources) ||
      candidateSources.length !== requiredCandidate.size) fail('CANDIDATE_SOURCE_CLAIMS_INVALID')
  const seenCandidate = new Set()
  for (const claim of candidateSources) {
    if (!validPath(claim?.path) || seenCandidate.has(claim.path) ||
        claimed.has(claim.path) || !requiredCandidate.has(claim.path) ||
        claim.blob !== requiredCandidate.get(claim.path) ||
        typeof claim.reason !== 'string' || claim.reason.trim().length < 12) {
      fail('CANDIDATE_SOURCE_CLAIM_INVALID')
    }
    seenCandidate.add(claim.path)
    const actual = entries.get(claim.path)
    if (!actual || actual.type !== 'blob' ||
        !['100644','100755'].includes(actual.mode) || actual.sha !== claim.blob) {
      fail('CANDIDATE_SOURCE_BLOB_MISMATCH:' + claim.path)
    }
  }
  return {schema:'urai-r4-source-tree-check-v1',status:'PASS_SOURCE_IDENTITY_ONLY_NO_RELEASE',
    head,donorPathsVerified:claimed.size,additionalDonorPathsVerified:5,totalDonorPathsVerified:claimed.size+5,overridesVerified:usedOverrides.size,
    candidateSourcePathsVerified:seenCandidate.size,totalSourcePathsVerified:claimed.size+5+seenCandidate.size,
    releaseApproved:false,fullBuildVerified:false,browserVerified:false,privateDataAuthorized:false}
}

function readGitTree(cwd) {
  const raw = execFileSync('git',['ls-tree','-r','-z','--full-tree','HEAD'],
    {cwd,timeout:20000,maxBuffer:64*1024*1024})
  const entries = new Map()
  for (const part of raw.toString('utf8').split('\0')) {
    if (!part) continue
    const item = /^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(part)
    if (!item) fail('GIT_TREE_PARSE_FAILURE')
    if (entries.has(item[4])) fail('DUPLICATE_GIT_TREE_ENTRY')
    entries.set(item[4],{mode:item[1],type:item[2],sha:item[3]})
  }
  return entries
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) fail('NO_ARGUMENTS_ACCEPTED')
    const root = resolve(fileURLToPath(new URL('..',import.meta.url)))
    const cwd = execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'}).trim()
    if (resolve(cwd) !== root) fail('EXACT_GIT_ROOT_REQUIRED')
    const head = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
    const manifest = JSON.parse(readFileSync(join(root,'docs/operation-one/R4_THREE_LANE_SOURCE_COMPOSITION_20261023.json'),'utf8'))
    const result = inspectR4SourceComposition(manifest,readGitTree(root),head,process.env.URAI_SOURCE_SHA)
    process.stdout.write('URAI_SOURCE_COMPOSITION_JSON='+JSON.stringify(result)+'\n')
  } catch (error) {
    process.stderr.write(String(error?.message ?? error)+'\n')
    process.exitCode=1
  }
}
