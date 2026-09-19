export type MirrorSonicIdentity = {
  setLevel: (level: number, fadeSeconds?: number) => void
  stop: (fadeSeconds?: number) => void
}

const MIRROR_MAX_LEVEL = 0.18
const MIRROR_NOISE_SECONDS = 4
const MIRROR_NOISE_SEED = 0x4d495252

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function deterministicReflectiveNoise(context: AudioContext) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * MIRROR_NOISE_SECONDS))
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let state = MIRROR_NOISE_SEED >>> 0
  let previous = 0
  for (let index = 0; index < samples.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const white = (state / 0xffffffff) * 2 - 1
    previous = previous * 0.965 + white * 0.035
    samples[index] = clamp(previous * 0.72, -1, 1)
  }
  return buffer
}

/**
 * Mirror uses a deterministic, intentionally quiet Web Audio identity rather
 * than borrowing another realm's production bed. It has no rhythmic pulse,
 * random runtime modulation, or attention-seeking transient. The fixed seeded
 * room tone and two restrained sine partials are stable between sessions and
 * remain subordinate to narration and user-controlled mute/consent.
 */
export function createMirrorSonicIdentity(context: AudioContext): MirrorSonicIdentity {
  const master = context.createGain()
  const airGain = context.createGain()
  const lowGain = context.createGain()
  const upperGain = context.createGain()
  const airFilter = context.createBiquadFilter()
  const air = context.createBufferSource()
  const low = context.createOscillator()
  const upper = context.createOscillator()

  master.gain.value = 0
  airGain.gain.value = 0.055
  lowGain.gain.value = 0.016
  upperGain.gain.value = 0.009
  airFilter.type = 'lowpass'
  airFilter.frequency.value = 760
  airFilter.Q.value = 0.32
  air.buffer = deterministicReflectiveNoise(context)
  air.loop = true
  low.type = 'sine'
  low.frequency.value = 73.42
  upper.type = 'sine'
  upper.frequency.value = 116.54

  air.connect(airFilter)
  airFilter.connect(airGain)
  airGain.connect(master)
  low.connect(lowGain)
  lowGain.connect(master)
  upper.connect(upperGain)
  upperGain.connect(master)
  master.connect(context.destination)

  air.start()
  low.start()
  upper.start()

  let stopped = false
  const setLevel = (level: number, fadeSeconds = 1.6) => {
    if (stopped) return
    const now = context.currentTime
    const target = clamp(level, 0, MIRROR_MAX_LEVEL)
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(target, now + Math.max(0.05, fadeSeconds))
  }
  const stop = (fadeSeconds = 0.6) => {
    if (stopped) return
    stopped = true
    const now = context.currentTime
    const duration = Math.max(0.05, fadeSeconds)
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + duration)
    window.setTimeout(() => {
      try { air.stop() } catch {}
      try { low.stop() } catch {}
      try { upper.stop() } catch {}
      try { master.disconnect() } catch {}
      void context.close().catch(() => undefined)
    }, Math.ceil(duration * 1000) + 40)
  }

  return { setLevel, stop }
}
