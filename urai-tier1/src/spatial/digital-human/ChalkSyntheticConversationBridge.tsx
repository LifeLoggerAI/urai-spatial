'use client'

import { useEffect, useRef, useState } from 'react'
import { OrbVoicePlayback, type OrbVoiceNotice, type OrbVoicePhase } from '@/spatial/orb/orbVoicePlayback'
import { makeToneWav } from './anonymousCalibration.mjs'

// Development-only adapter: exercises the production-shaped playback owner with
// locally generated PCM. It cannot contact a provider or represent a person.
export default function ChalkSyntheticConversationBridge({ onMedia, reducedMotion }: {
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
        const wav = makeToneWav('conversation')
        return new Blob([wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer], { type: 'audio/wav' })
      },
      onExternalMediaChange: (media) => {
        if (media) media.dataset.uraiFixtureProfile = 'conversation'
        onMedia(media)
      },
      onPhase: setPhase,
      onNotice: setNotice,
    })
    playback.current = bridge
    return () => { bridge.stop(); onMedia(null) }
  }, [onMedia])

  const stop = () => playback.current?.stop()
  return <aside className="pointer-events-auto absolute right-4 top-16 z-30 max-w-72 rounded-lg border border-cyan-300/50 bg-black/85 p-3 text-white" aria-label="CHALK synthetic conversation fixture" data-testid="chalk-synthetic-conversation">
    <strong className="text-sm">CHALK synthetic conversation fixture</strong>
    <p className="text-xs">Local PCM only. No provider, microphone, account data, likeness, or conversation is used.</p>
    <p className="text-xs" aria-live="polite">Caption: This is a local synthetic response. Playback {phase}; {notice}.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" data-testid="chalk-synthetic-play" disabled={phase !== 'idle'} onClick={() => void playback.current?.play('This is a local synthetic response.', true)}>Play fixture</button>
      <button type="button" data-testid="chalk-synthetic-stop" disabled={phase === 'idle'} onClick={stop}>Interrupt</button>
    </div>
    <small>{reducedMotion ? 'Reduced motion: face amplitude is reduced.' : 'Facial animation follows the audio element clock.'}</small>
  </aside>
}