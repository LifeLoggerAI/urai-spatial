// Source-only verification lane. No deployment, credential access or release authority.
// A combined candidate must prove exact donor blobs and privacy gates before any install.
export const COMBINED_REQUIRED_PREFLIGHT = Object.freeze([
  Object.freeze({ id: 'combined_source_tree_contracts', command: ['node', '--test', 'tests/verify-r4-source-composition.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'combined_source_tree_admission', command: ['node', 'scripts/verify-r4-source-composition.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'combined_semantic_privacy', command: ['node', '--test', 'tests/r4-semantic-privacy-surface.test.mjs', 'tests/r4-lifemap-event-privacy-wiring.test.mjs', 'urai-tier1/tests/lifemap-event-privacy.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'combined_firestore_java', command: ['node', '--test', 'tests/firestore-java-runtime.test.mjs', 'tests/firestore-rules-execution-authority.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'combined_ground_contracts', command: ['node', '--test', 'tests/ground-glb-source-anchors.test.mjs', 'tests/ground-active-workforce-verify.test.mjs', 'tests/ground-provider-active-owner-contract.test.mjs'], requiresInstall: false }),
  Object.freeze({ id: 'combined_runner_contracts', command: ['node', '--test', 'tests/native-evidence-target.test.mjs', 'tests/native-evidence-combined-candidate-contract.test.mjs'], requiresInstall: false }),
])
const required = new Set(COMBINED_REQUIRED_PREFLIGHT.map(stage => stage.id))
export function planNativeEvidenceStages(baseStages, combined = false) {
  if (!Array.isArray(baseStages) || baseStages.length === 0 ||
      baseStages.some(stage => !stage || typeof stage.id !== 'string')) {
    throw new Error('INVALID_BASE_NATIVE_STAGES')
  }
  if (baseStages.some(stage => required.has(stage.id))) {
    throw new Error('COMBINED_PREFLIGHT_DUPLICATE_STAGE')
  }
  return combined ? [...COMBINED_REQUIRED_PREFLIGHT, ...baseStages] : [...baseStages]
}
export function assertCombinedPreflightOutcome({ combined = false, stageId, outcome }) {
  if (combined && required.has(stageId) && outcome !== 'PASS') {
    throw new Error('COMBINED_PREFLIGHT_BLOCKED:' + stageId)
  }
  return true
}
export function nativeCombinedPreflightEnvironment({ combined = false, stageId, pinnedSha = null }) {
  if (!combined || stageId !== 'combined_source_tree_admission') return {}
  if (typeof pinnedSha !== 'string' || !/^[a-f0-9]{40}$/.test(pinnedSha)) {
    throw new Error('COMBINED_SOURCE_SHA_REQUIRED')
  }
  return { URAI_SOURCE_SHA: pinnedSha }
}
