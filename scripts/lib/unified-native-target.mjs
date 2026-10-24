export const UNIFIED_CANDIDATE_BRANCH = 'repair/operation-one-r148-original-urai-convergence-20261023'
const ORIGINAL_BRANCH = 'repair/rfinal-convergence-candidate-20261020'
const SHA = /^[0-9a-f]{40}$/
export function selectNativeTarget({ unified = false, pinnedSha = null, defaultBranch } = {}) {
  if (defaultBranch !== ORIGINAL_BRANCH) throw new Error('NATIVE_DEFAULT_BRANCH_AUTHORITY_CHANGED')
  if (unified && !SHA.test(pinnedSha ?? '')) throw new Error('UNIFIED_EXACT_SHA_REQUIRED')
  if (pinnedSha !== null && !SHA.test(pinnedSha)) throw new Error('NATIVE_PIN_INVALID')
  return Object.freeze({ branch: unified ? UNIFIED_CANDIDATE_BRANCH : defaultBranch,
    sourceMode: unified ? 'UNIFIED_DRAFT_PINNED_NONRELEASE' : 'RFINAL_NATIVE', releaseAuthorized: false })
}
export function assertUnifiedHeadCurrent({ unified = false, pinnedSha = null, remoteHead = null, stage = 'remote' } = {}) {
  if (!unified) return true
  if (!SHA.test(pinnedSha ?? '') || !SHA.test(remoteHead ?? '')) throw new Error('UNIFIED_SOURCE_HEAD_INVALID:' + stage)
  if (remoteHead !== pinnedSha) throw new Error('UNIFIED_SOURCE_HEAD_MOVED_OR_STALE:' + stage)
  return true
}
export const UNIFIED_REQUIRED_PREFLIGHT = Object.freeze([
  Object.freeze({ id: 'unified_source_authority', command: ['node','--test','tests/unified-native-target.test.mjs','tests/rfinal-source-authority.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'unified_lifemap_privacy', command: ['node','--test','urai-tier1/tests/lifemap-data-boundary.test.mjs','urai-tier1/tests/lifemap-physical-star-action.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'unified_ground_geometry', command: ['node','--test','tests/ground-glb-source-anchors.test.mjs','tests/ground-active-workforce-verify.test.mjs','tests/ground-provider-active-owner-contract.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'unified_firestore_java', command: ['node','--test','tests/firestore-java-runtime.test.mjs','tests/firestore-rules-execution-authority.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'unified_http_routes', command: ['node','--test','tests/native-http-behavior.test.mjs','tests/rfinal-native-evidence-runner.test.mjs'], requiresInstall: false })
])
// This maintained semantic/owner contract imports real TypeScript runtime files.
// Run it with the project's pinned tsx loader *after* a frozen install, rather
// than misreporting an ESM import failure as broken Life Map privacy source.
export const UNIFIED_REQUIRED_POSTINSTALL = Object.freeze([
  Object.freeze({ id: 'unified_lifemap_semantic_owner', command: ['corepack','pnpm','--dir','urai-tier1','exec','node','--import','tsx','--test','tests/lifemap-semantic-owner-contract.test.mjs'], requiresInstall: true }),
])
const names = new Set([...UNIFIED_REQUIRED_PREFLIGHT, ...UNIFIED_REQUIRED_POSTINSTALL].map(stage => stage.id))
export function planUnifiedStages(baseStages, unified = false) {
  if (!Array.isArray(baseStages) || !baseStages.length || baseStages.some(stage=>!stage || typeof stage.id !== 'string' || !stage.id)) throw new Error('INVALID_BASE_NATIVE_STAGES')
  if (baseStages.some(stage=>names.has(stage.id))) throw new Error('UNIFIED_PREFLIGHT_DUPLICATE_STAGE')
  if (!unified) return [...baseStages]
  const install = baseStages.findIndex(stage=>stage.id === 'frozen_install')
  if (install < 0 || baseStages[install].requiresInstall !== false || baseStages.slice(0, install).some(stage=>stage.requiresInstall)) {
    throw new Error('UNIFIED_FROZEN_INSTALL_STAGE_REQUIRED')
  }
  return [...UNIFIED_REQUIRED_PREFLIGHT, ...baseStages.slice(0, install + 1),
    ...UNIFIED_REQUIRED_POSTINSTALL, ...baseStages.slice(install + 1)]
}
export function assertUnifiedPreflightOutcome({ unified = false, stageId, outcome } = {}) {
  if (unified && names.has(stageId) && outcome !== 'PASS') throw new Error('UNIFIED_PREFLIGHT_BLOCKED:' + stageId)
  return true
}
