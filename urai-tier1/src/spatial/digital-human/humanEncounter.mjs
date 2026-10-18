/**
 * UrAi digital-human admission and realtime animation-state core.
 * Pure, dependency-free code. No identities, providers, routes, keys, or assets are embedded.
 * Not a production likeness or lip-sync certification.
 */

const SHA256 = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const DEFAULT_PROXIMITY = Object.freeze({ enterMeters: 2.35, leaveMeters: 3.10 });
const safeNumber = (value) => typeof value === 'number' && Number.isFinite(value);
export const clamp01 = (x) => safeNumber(x) ? Math.min(1, Math.max(0, x)) : 0;

/** Validate a separately approved, account-bound private representation. */
export function validateHumanAdmission(manifest, { accountId, subjectId, consentActive } = {}) {
  const problems = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, problems: ['manifest-missing'] };
  }
  if (manifest.schema !== 'urai.digital-human.admission.v1') problems.push('schema');
  if (!ID.test(String(subjectId ?? '')) || manifest.subjectId !== subjectId) problems.push('subject-binding');
  if (!ID.test(String(accountId ?? '')) || manifest.accountId !== accountId) problems.push('account-binding');
  if (consentActive !== true || manifest.consent?.state !== 'active' || !SHA256.test(String(manifest.consent?.receiptSha256 ?? '')))
    problems.push('consent');
  if (manifest.consent?.revokedAt != null) problems.push('revocation');
  if (manifest.identity?.approved !== true || manifest.identity?.approvalType !== 'literal-human-review'
    || !SHA256.test(String(manifest.identity?.receiptSha256 ?? ''))) problems.push('identity-approval');
  if (manifest.rights?.likeness !== true || manifest.rights?.voice !== true || manifest.rights?.commercialUse !== true)
    problems.push('rights');
  if (manifest.model?.delivery !== 'authenticated-private' || !SHA256.test(String(manifest.model?.sha256 ?? ''))
    || manifest.model?.approved !== true || !SHA256.test(String(manifest.model?.qcReceiptSha256 ?? '')))
    problems.push('model-certification');
  if (manifest.provenance?.sourceApproved !== true || !SHA256.test(String(manifest.provenance?.receiptSha256 ?? '')))
    problems.push('provenance');
  if (manifest.provider?.enabled !== true || manifest.provider?.revoked === true) problems.push('provider-kill-switch');
  return { ok: problems.length === 0, problems };
}

/** Do not treat a stock or reference file as a certified human, even when skinned. */
export function classifyGltf(glTF) {
  const nodes = glTF?.nodes ?? [];
  const skins = glTF?.skins ?? [];
  const meshes = glTF?.meshes ?? [];
  const animations = glTF?.animations ?? [];
  if (!Array.isArray(nodes) || !Array.isArray(skins) || !Array.isArray(meshes) || !Array.isArray(animations)) {
    throw new TypeError('invalid-gltf-arrays');
  }
  const bones = skins.flatMap(s => (s.joints ?? []).map(i => nodes[i]?.name).filter(Boolean));
  const morphCount = meshes.reduce((acc, mesh) => acc + (mesh.primitives ?? []).reduce((n, p) => n + (p.targets?.length ?? 0), 0), 0);
  return { bones, morphCount, animationNames: animations.map(a => a.name ?? ''),
    hasSkinnedMesh: skins.length > 0 && bones.length > 0, hasFacialTargets: morphCount > 0 };
}

/** Stateful proximity with hysteresis; bad tracking data is never treated as near. */
export function proximityState(near, distanceMeters, config = DEFAULT_PROXIMITY) {
  const { enterMeters, leaveMeters } = config;
  if (!safeNumber(enterMeters) || !safeNumber(leaveMeters) || enterMeters <= 0 || leaveMeters <= enterMeters)
    throw new RangeError('invalid-proximity-thresholds');
  if (!safeNumber(distanceMeters) || distanceMeters < 0) return false;
  return near ? distanceMeters <= leaveMeters : distanceMeters <= enterMeters;
}

/**
 * Drive facial morph weights from a real, aligned audio clock when timing receipts exist.
 * An RMS-only fallback is truthful amplitude animation, NOT phoneme-level lip sync.
 * A timeline requires verified audio SHA identity and explicit time-coded visemes.
 */
export function speechPose({ playing = false, muted = false, interrupted = false,
  audioSeconds, audioSha256, rms, timeline, availableMorphs = [], reducedMotion = false } = {}) {
  const neutral = { mode: 'neutral', weights: {}, jawOpen: 0 };
  if (!playing || muted || interrupted || !safeNumber(audioSeconds) || audioSeconds < 0) return neutral;
  const morphSet = new Set(availableMorphs.filter(x => typeof x === 'string'));
  const validTimeline = timeline && SHA256.test(String(audioSha256 ?? ''))
    && timeline.audioSha256 === audioSha256 && timeline.approved === true
    && Array.isArray(timeline.cues) && timeline.cues.length > 0
    && timeline.cues.every(c => typeof c.morph === 'string' && morphSet.has(c.morph)
      && safeNumber(c.startSec) && c.startSec >= 0 && safeNumber(c.endSec)
      && c.endSec > c.startSec && c.endSec - c.startSec <= 1.5
      && safeNumber(c.weight) && c.weight >= 0 && c.weight <= 1);
  if (validTimeline) {
    const weights = {};
    for (const cue of timeline.cues) {
      if (audioSeconds < cue.startSec || audioSeconds >= cue.endSec) continue;
      const fade = reducedMotion ? 0 : Math.min(0.045, (cue.endSec - cue.startSec) / 4);
      const inW = fade ? Math.min(1, (audioSeconds - cue.startSec) / fade) : 1;
      const outW = fade ? Math.min(1, (cue.endSec - audioSeconds) / fade) : 1;
      weights[cue.morph] = Math.max(weights[cue.morph] ?? 0, clamp01(cue.weight * Math.max(0, Math.min(inW, outW))));
    }
    return { mode: 'audio-clock-visemes', weights, jawOpen: 0 };
  }
  // Silence if no measured audio level; do not invent a phoneme or animate silent text.
  const jawOpen = morphSet.has('jawOpen') || morphSet.has('mouthOpen')
    ? clamp01((clamp01(rms) - 0.02) * (reducedMotion ? 2.5 : 3.6)) : 0;
  return { mode: 'amplitude-only-not-lipsync', weights: {}, jawOpen };
}

/** Pure session controller: returned turn ids fence off stale async audio/replies. */
export function createHumanEncounter({ enterMeters, leaveMeters } = DEFAULT_PROXIMITY) {
  let near = false;
  let generation = 0;
  let phase = 'idle';
  let audioPlaying = false;
  let disposed = false;
  const thresholds = { enterMeters, leaveMeters };
  const snapshot = () => Object.freeze({ near, phase, generation, audioPlaying, disposed });
  return Object.freeze({
    snapshot,
    track(distanceMeters) {
      if (disposed) return snapshot();
      near = proximityState(near, distanceMeters, thresholds);
      if (!near && phase !== 'idle') {
        generation += 1; phase = 'idle'; audioPlaying = false;
      }
      return snapshot();
    },
    beginTurn({ consentActive, permitted } = {}) {
      if (disposed || !near || consentActive !== true || permitted !== true) return null;
      generation += 1; phase = 'thinking'; audioPlaying = false;
      return generation;
    },
    markSpeaking(turn) {
      if (disposed || turn !== generation || phase !== 'thinking' || !near) return false;
      phase = 'speaking'; audioPlaying = true; return true;
    },
    finish(turn) {
      if (disposed || turn !== generation || (phase !== 'speaking' && phase !== 'thinking')) return false;
      phase = 'listening'; audioPlaying = false; return true;
    },
    interrupt() {
      if (disposed) return snapshot();
      generation += 1; phase = near ? 'listening' : 'idle'; audioPlaying = false;
      return snapshot();
    },
    dispose() {
      generation += 1; phase = 'idle'; audioPlaying = false; near = false; disposed = true;
      return snapshot();
    },
  });
}
