'use client'

import { useEffect, useRef, useState } from 'react'
import { OrbVoicePlayback, type OrbVoiceNotice, type OrbVoicePhase } from '@/spatial/orb/orbVoicePlayback'

function fixtureWav() {
  const rate = 16_000
  const frames = Math.floor(rate * 2.4)
  const bytes = new Uint8Array(44 + frames * 2)
  const view = new DataView(bytes.buffer)
  const write = (offset: number, text: string) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
  write(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); write(8, 'WAVE')
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, frames * 2, true)
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate
    const syllable = Math.max(0, Math.sin(t * Math.PI * 3.1))
    const carrier = Math.sin(t * Math.PI * 2 * (145 + 24 * Math.sin(t * 7)))
    view.setInt16(44 + frame * 2, Math.round(carrier * syllable * 0.22 * 32767), true)
  }
  return bytes
}

// Development-only, double-gated fixture. It is deliberately separate from
// Council input and providers; it exercises only local PCM playback and the
// selected model's existing speak_calm animation clock.
export default function CouncilSyntheticSpeechFixture({ onMedia, reducedMotion }: {
  onMedia: (media: HTMLAudioElement | null) => void
  reducedMotion: boolean
}) {
  const [phase, setPhase] = useState<OrbVoicePhase>('idle')
  const [notice, setNotice] = useState<OrbVoiceNotice>('finished')
  const playback = useRef<OrbVoicePlayback | null>(null)

  useEffect(() => {
    const bridge = new OrbVoicePlayback({
      requestExternalAudio: async (_text, signal) => {
        if (signal.aborted) return null
        const wav = fixtureWav()
        return new Blob([wav.buffer], { type: 'audio/wav' })
      },
      onExternalMediaChange: onMedia,
      onPhase: setPhase,
      onNotice: setNotice,
    })
    playback.current = bridge
    return () => { bridge.stop(); onMedia(null) }
  }, [onMedia])

  return <aside className="pointer-events-auto mt-3 rounded-xl border border-cyan-200/35 bg-cyan-950/35 p-3 text-xs" data-testid="council-synthetic-speech-fixture" aria-label="Council synthetic speech fixture">
    <strong>CHALK local speech-motion fixture</strong>
    <p className="mt-1 text-white/75">Local PCM only. It drives the selected Council model&apos;s existing speaking motion from the playing audio clock; this asset has no mouth rig or facial morphs.</p>
    <p className="mt-2 text-white/80" aria-live="polite">Caption: Local synthetic response. Playback {phase}; {notice}.</p>
    <div className="mt-2 flex gap-2">
      <button type="button" disabled={phase !== 'idle'} onClick={() => void playback.current?.play('Local synthetic Council response.', true)}>Play fixture</button>
      <button type="button" disabled={phase === 'idle'} onClick={() => playback.current?.stop()}>Interrupt</button>
    </div>
    <small className="mt-2 block text-white/55">{reducedMotion ? 'Reduced motion limits the speaking-motion intensity.' : 'Motion follows the actual audio element clock.'}</small>
  </aside>
}
