/** Ephemeral prosody normalization. This module does not identify speakers. */
export const MIN_SESSION_BASELINE_SAMPLES = 5

export function baselineEligibility({ ownerId, speaker, descriptor, authority }) {
  if (speaker?.status === 'unknown') return { allowed:false, flags:['speaker-unknown','baseline-unavailable'] }
  if (speaker?.status !== 'session-local' || !speaker.session_key) {
    return { allowed:false, flags:['speaker-uncertain',...(descriptor ? ['baseline-rejected'] : [])] }
  }
  if (!descriptor) return { allowed:false, flags:[] }
  if (authority.session_baseline !== true) return { allowed:false, flags:['baseline-consent-required'] }
  if (descriptor.owner_id !== ownerId) return { allowed:false, flags:['baseline-owner-mismatch'] }
  if (descriptor.speaker_key !== speaker.session_key) return { allowed:false, flags:['baseline-rejected'] }
  return { allowed:true, flags:[] }
}

export function normalizeSessionPitch({ ownerId, speakerKey, descriptor, distribution, meanF0Hz }) {
  if (!distribution || distribution.owner_id !== ownerId || distribution.speaker_key !== speakerKey
      || descriptor.owner_id !== ownerId || descriptor.speaker_key !== speakerKey
      || !Number.isInteger(distribution.samples) || distribution.samples < MIN_SESSION_BASELINE_SAMPLES
      || !Number.isFinite(distribution.median_f0_hz) || distribution.median_f0_hz <= 0
      || !Number.isFinite(distribution.scale_f0_hz) || distribution.scale_f0_hz <= 0
      || !Number.isFinite(meanF0Hz) || meanF0Hz <= 0) return null
  const z = (meanF0Hz - distribution.median_f0_hz) / distribution.scale_f0_hz
  return Number.isFinite(z) ? { scope:'session-only', speaker_key:speakerKey, z_f0:z } : null
}
