'use client'

import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Camera = {
  rx: number
  ry: number
  zoom: number
  tx: number
  ty: number
  tz: number
}

type Star = {
  id: string
  title: string
  kind: string
  era: string
  x: number
  y: number
  z: number
  hue: number
  intensity: number
  summary: string
}

const stars: Star[] = [
  { id: 'morning-focus-returned', title: 'Morning Focus Returned', kind: 'memory', era: 'present', x: -330, y: -80, z: 90, hue: 198, intensity: 82, summary: 'A stable return point. The morning your signal came back online.' },
  { id: 'quiet-evening-reflection', title: 'Quiet Evening Reflection', kind: 'mood', era: 'present', x: -220, y: -150, z: -150, hue: 262, intensity: 66, summary: 'A quiet node that does not shout, but still shapes the map.' },
  { id: 'old-pattern-softened', title: 'Old Pattern Softened', kind: 'recovery', era: 'healing', x: -90, y: -25, z: 155, hue: 166, intensity: 74, summary: 'The moment the old loop loosened. Not erased. Softer.' },
  { id: 'relationship-thread-brightened', title: 'Relationship Thread Brightened', kind: 'relationship', era: 'connection', x: 60, y: -105, z: 20, hue: 42, intensity: 91, summary: 'A connection line that survived distance, noise, and time.' },
  { id: 'recovery-arc-began', title: 'Recovery Arc Began', kind: 'ritual', era: 'origin', x: 275, y: 4, z: 170, hue: 148, intensity: 88, summary: 'The first visible arc. The point where survival became architecture.' },
  { id: 'dream-symbol-blue-door', title: 'Dream Symbol: Blue Door', kind: 'dream', era: 'dream', x: -390, y: 120, z: -205, hue: 209, intensity: 63, summary: 'A symbolic threshold. A door that keeps returning because it still means something.' },
  { id: 'forecast-lighter-tomorrow', title: 'Forecast: Lighter Tomorrow', kind: 'forecast', era: 'future', x: -40, y: 170, z: -170, hue: 74, intensity: 77, summary: 'A future-facing signal. Not a promise. A direction.' },
  { id: 'legacy-thread-becoming', title: 'Legacy Thread: Becoming', kind: 'legacy', era: 'legacy', x: 330, y: 130, z: -105, hue: 307, intensity: 96, summary: 'The long arc. The part of the map that turns a life into a world.' },
  { id: 'threshold-storm', title: 'Threshold Storm', kind: 'memory', era: 'past', x: -145, y: 75, z: -260, hue: 6, intensity: 89, summary: 'A difficult weather system in memory. Still navigable. Still yours.' },
  { id: 'mirror-focus', title: 'Mirror Focus', kind: 'mirror', era: 'self', x: 20, y: 70, z: 245, hue: 198, intensity: 81, summary: 'The self looking back without flinching.' },
  { id: 'calm-return', title: 'Calm Return', kind: 'grounding', era: 'body', x: 260, y: -135, z: 65, hue: 338, intensity: 68, summary: 'A grounded node. The nervous system finding a way back.' },
]

const defaultCamera: Camera = {
  rx: -22,
  ry: 28,
  zoom: 1.08,
  tx: 0,
  ty: 0,
  tz: 0,
}

function cameraFor(star: Star): Camera {
  return {
    rx: clamp(-20 + star.y * 0.018, -48, 28),
    ry: clamp(26 - star.x * 0.028, -42, 58),
    zoom: 1.34,
    tx: clamp(-star.x * 0.78, -320, 320),
    ty: clamp(-star.y * 0.7, -210, 210),
    tz: clamp(-star.z * 0.28, -110, 120),
  }
}

const links: Array<[string, string]> = [
  ['dream-symbol-blue-door', 'quiet-evening-reflection'],
  ['quiet-evening-reflection', 'old-pattern-softened'],
  ['old-pattern-softened', 'relationship-thread-brightened'],
  ['relationship-thread-brightened', 'recovery-arc-began'],
  ['relationship-thread-brightened', 'legacy-thread-becoming'],
  ['forecast-lighter-tomorrow', 'legacy-thread-becoming'],
  ['threshold-storm', 'old-pattern-softened'],
  ['threshold-storm', 'mirror-focus'],
  ['mirror-focus', 'relationship-thread-brightened'],
  ['calm-return', 'legacy-thread-becoming'],
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function linkStyle(a: Star, b: Star): CSSProperties {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI

  return {
    transform: `translate3d(${a.x}px, ${a.y}px, ${(a.z + b.z) / 2}px) rotateZ(${angle}deg) scaleX(${Math.max(1, length)})`,
  }
}

export function ProductionLifeMap({ surface = 'canonical' }: { surface?: 'canonical' | 'spatial' }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('legacy-thread-becoming')
  const [camera, setCamera] = useState<Camera>(cameraFor(stars.find((star) => star.id === 'legacy-thread-becoming') ?? stars[0]))
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null)

  const byId = useMemo(() => new Map(stars.map((star) => [star.id, star])), [])
  const selected = byId.get(selectedId) ?? stars[0]

  function focusStar(star: Star) {
    setSelectedId(star.id)
    setCamera(cameraFor(star))
  }

  function openFocus(star = selected) {
    router.push(`/focus?memory=${encodeURIComponent(star.id)}`)
  }

  function down(event: ReactPointerEvent<HTMLElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: camera.rx, ry: camera.ry }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return
    setCamera((current) => ({
      ...current,
      rx: clamp(drag.current!.rx - (event.clientY - drag.current!.y) * 0.12, -62, 38),
      ry: drag.current!.ry + (event.clientX - drag.current!.x) * 0.16,
    }))
  }

  function up(event: ReactPointerEvent<HTMLElement>) {
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {}
  }

  function wheel(event: ReactWheelEvent<HTMLElement>) {
    event.preventDefault()
    setCamera((current) => ({
      ...current,
      zoom: clamp(current.zoom - event.deltaY * 0.001, 0.62, 1.55),
    }))
  }

  return (
    <main className="urai-life-map-3d" data-surface={surface}>
      <div className="lm3d-space" aria-hidden="true" />

      <header className="lm3d-top">
        <button type="button" onClick={() => router.push('/home')}>Return home</button>
        <button type="button" onClick={() => router.push('/mirror')}>Mirror</button>
        <button type="button" onClick={() => setCamera(defaultCamera)}>Reset camera</button>
        <button type="button" onClick={() => setCamera(cameraFor(selected))}>Focus camera</button>
        <span>Present → Becoming</span>
      </header>

      <section
        className="lm3d-stage"
        aria-label="Three dimensional explorable memory constellation"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <div className="lm3d-perspective">
          <div
            className="lm3d-universe"
            style={{
              '--lm-rx': `${camera.rx}deg`,
              '--lm-ry': `${camera.ry}deg`,
              '--lm-zoom': String(camera.zoom),
              '--lm-tx': `${camera.tx}px`,
              '--lm-ty': `${camera.ty}px`,
              '--lm-tz': `${camera.tz}px`,
            } as CSSProperties}
          >
            <div className="lm3d-depth lm3d-depth-a" />
            <div className="lm3d-depth lm3d-depth-b" />
            <div className="lm3d-depth lm3d-depth-c" />

            {links.map(([from, to]) => {
              const a = byId.get(from)
              const b = byId.get(to)
              if (!a || !b) return null
              return <span key={`${from}-${to}`} className="lm3d-link" style={linkStyle(a, b)} />
            })}

            {stars.map((star) => {
              const active = star.id === selected.id
              return (
                <button
                  key={star.id}
                  type="button"
                  className="lm3d-star"
                  data-active={active ? 'true' : 'false'}
                  style={{
                    '--star-hue': star.hue,
                    '--star-size': `${Math.round(12 + star.intensity / 8)}px`,
                    transform: `translate3d(${star.x}px, ${star.y}px, ${star.z}px)`,
                  } as CSSProperties}
                  onClick={(event) => {
                    event.stopPropagation()
                    focusStar(star)
                  }}
                >
                  <span className="lm3d-orb" />
                  <span className="lm3d-label">
                    <strong>{star.title}</strong>
                    <small>{star.kind}</small>
                  </span>
                </button>
              )
            })}

            <div className="lm3d-here">YOU ARE HERE</div>
          </div>
        </div>

        <p className="lm3d-help">Drag empty space to orbit · Wheel to zoom · Click a star to focus · Double-click to open Focus</p>
      </section>

      <aside className="lm3d-panel">
        <p className="lm3d-kicker">Selected memory</p>
        <h1>{selected.title}</h1>
        <p>{selected.summary}</p>

        <dl>
          <div><dt>Type</dt><dd>{selected.kind}</dd></div>
          <div><dt>Era</dt><dd>{selected.era}</dd></div>
          <div><dt>Intensity</dt><dd>{selected.intensity}%</dd></div>
          <div><dt>Depth</dt><dd>{selected.z > 0 ? 'near field' : 'deep field'}</dd></div>
        </dl>

        <button type="button" className="lm3d-primary" onClick={() => router.push(`/focus?memory=${encodeURIComponent(selected.id)}`)}>
          Open selected memory in Focus
        </button>
        <button type="button" className="lm3d-secondary" onClick={() => setCamera(cameraFor(selected))}>
          Move camera to selected star
        </button>
        <button type="button" className="lm3d-secondary" onClick={() => router.push('/replay')}>
          Replay this thread
        </button>
      </aside>
    </main>
  )
}
