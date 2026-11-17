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
      <style jsx global>{`
        .urai-life-map-3d{position:fixed;inset:0;overflow:hidden;background:#02050d;color:#eef7ff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .lm3d-space{position:absolute;inset:-12%;pointer-events:none;background:
          radial-gradient(circle at 50% 44%,rgba(91,136,255,.12),transparent 26%),
          radial-gradient(circle at 18% 24%,rgba(114,72,255,.12),transparent 24%),
          radial-gradient(circle at 78% 68%,rgba(40,208,190,.085),transparent 28%),
          radial-gradient(circle at 62% 14%,rgba(255,185,98,.055),transparent 18%),
          linear-gradient(180deg,#050816 0%,#02040b 55%,#000207 100%);
          filter:saturate(1.12)}
        .lm3d-space:before,.lm3d-space:after{content:"";position:absolute;inset:0;background-image:
          radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.5px),
          radial-gradient(circle,rgba(139,194,255,.68) 0 .8px,transparent 1.4px);
          background-size:83px 83px,137px 137px;background-position:7px 11px,41px 29px;opacity:.42;transform:rotate(.001deg)}
        .lm3d-space:after{background-size:211px 211px,317px 317px;filter:blur(.2px);opacity:.24;transform:scale(1.15)}
        .lm3d-top{position:absolute;z-index:30;left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .lm3d-top button,.lm3d-panel button{min-height:48px;border:1px solid rgba(206,231,255,.16);border-radius:999px;background:rgba(6,12,25,.58);color:#eff8ff;backdrop-filter:blur(18px) saturate(1.2);box-shadow:inset 0 1px rgba(255,255,255,.04);font:700 11px/1 system-ui;letter-spacing:.03em;padding:0 16px;cursor:pointer}
        .lm3d-top button:hover,.lm3d-top button:focus-visible,.lm3d-panel button:hover,.lm3d-panel button:focus-visible{border-color:rgba(173,218,255,.52);background:rgba(15,30,55,.78);outline:none;box-shadow:0 0 0 3px rgba(116,183,255,.13),inset 0 1px rgba(255,255,255,.07)}
        .lm3d-top>span{margin-left:auto;color:rgba(221,237,255,.64);font:700 10px/1 system-ui;letter-spacing:.15em;text-transform:uppercase}
        .lm3d-stage{position:absolute;inset:0;cursor:grab;touch-action:none;perspective:1200px;overflow:hidden}
        .lm3d-stage:active{cursor:grabbing}
        .lm3d-perspective{position:absolute;left:50%;top:50%;width:1px;height:1px;perspective:1280px;transform-style:preserve-3d}
        .lm3d-universe{position:absolute;left:0;top:0;width:1px;height:1px;transform-style:preserve-3d;transform:translate3d(var(--lm-tx),var(--lm-ty),var(--lm-tz)) rotateX(var(--lm-rx)) rotateY(var(--lm-ry)) scale(var(--lm-zoom));transition:transform 1.15s cubic-bezier(.2,.82,.18,1)}
        .lm3d-depth{position:absolute;left:-620px;top:-620px;width:1240px;height:1240px;border-radius:50%;transform-style:preserve-3d;pointer-events:none}
        .lm3d-depth-a{transform:translateZ(-520px) rotateX(68deg);background:radial-gradient(circle,transparent 35%,rgba(79,112,255,.045) 52%,transparent 72%);border:1px solid rgba(122,160,255,.045)}
        .lm3d-depth-b{transform:translateZ(-180px) rotateY(62deg);background:radial-gradient(circle,transparent 42%,rgba(86,236,211,.038) 60%,transparent 76%);border:1px solid rgba(97,226,218,.04)}
        .lm3d-depth-c{transform:translateZ(180px) rotateX(74deg) rotateZ(18deg);border:1px solid rgba(245,219,172,.05);box-shadow:inset 0 0 90px rgba(247,196,123,.025)}
        .lm3d-link{position:absolute;left:0;top:0;width:1px;height:1.5px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(160,205,255,.08),rgba(159,220,255,.42),rgba(117,255,221,.09));box-shadow:0 0 8px rgba(96,184,255,.18);pointer-events:none}
        .lm3d-star{--star-color:hsl(var(--star-hue) 92% 72%);position:absolute;left:-24px;top:-24px;width:48px;height:48px;border:0;background:transparent;padding:0;display:grid;place-items:center;transform-style:preserve-3d;cursor:pointer;color:white}
        .lm3d-orb{display:block;width:var(--star-size);height:var(--star-size);border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff 0 8%,var(--star-color) 25%,hsl(var(--star-hue) 82% 52%) 52%,rgba(16,24,52,.2) 74%);box-shadow:
          0 0 8px var(--star-color),0 0 22px color-mix(in srgb,var(--star-color) 62%,transparent),0 0 54px color-mix(in srgb,var(--star-color) 24%,transparent);transition:transform .35s ease,filter .35s ease,box-shadow .35s ease}
        .lm3d-star:after{content:"";position:absolute;width:34px;height:34px;border-radius:50%;border:1px solid color-mix(in srgb,var(--star-color) 24%,transparent);opacity:.5;transform:rotateX(72deg);box-shadow:0 0 18px color-mix(in srgb,var(--star-color) 18%,transparent)}
        .lm3d-star[data-active="true"] .lm3d-orb{transform:scale(1.45);filter:brightness(1.2);box-shadow:0 0 12px #fff,0 0 30px var(--star-color),0 0 78px color-mix(in srgb,var(--star-color) 46%,transparent)}
        .lm3d-star[data-active="true"]:after{width:56px;height:56px;opacity:.85}
        .lm3d-label{position:absolute;left:34px;top:50%;transform:translateY(-50%) translateZ(14px);display:grid;gap:3px;min-width:170px;padding:8px 10px;border-left:1px solid color-mix(in srgb,var(--star-color) 46%,transparent);opacity:.2;transition:opacity .25s ease,transform .25s ease;background:linear-gradient(90deg,rgba(3,8,18,.42),transparent);text-align:left;pointer-events:none}
        .lm3d-label strong{font:650 11px/1.15 system-ui;text-shadow:0 2px 12px #000}.lm3d-label small{font:750 8px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--star-color)}
        .lm3d-star:hover .lm3d-label,.lm3d-star:focus-visible .lm3d-label,.lm3d-star[data-active="true"] .lm3d-label{opacity:.92;transform:translateY(-50%) translateX(4px) translateZ(14px)}
        .lm3d-star:focus-visible{outline:2px solid rgba(255,255,255,.82);outline-offset:4px;border-radius:50%}
        .lm3d-here{position:absolute;left:-34px;top:-34px;transform:translate3d(0,0,0);width:68px;height:68px;border:1px solid rgba(126,211,255,.25);border-radius:50%;display:grid;place-items:center;color:rgba(196,229,255,.62);font:800 7px/1 system-ui;letter-spacing:.13em;box-shadow:0 0 40px rgba(94,174,255,.1),inset 0 0 22px rgba(94,174,255,.07)}
        .lm3d-help{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);margin:0;z-index:12;padding:8px 13px;border:1px solid rgba(207,231,255,.1);border-radius:999px;background:rgba(4,9,18,.38);backdrop-filter:blur(16px);color:rgba(219,235,255,.55);font:650 9px/1 system-ui;letter-spacing:.05em;white-space:nowrap;pointer-events:none}
        .lm3d-panel{position:absolute;z-index:24;right:max(18px,env(safe-area-inset-right));top:50%;transform:translateY(-45%);width:min(330px,calc(100vw - 36px));padding:22px;border:1px solid rgba(194,224,255,.13);border-radius:24px;background:linear-gradient(145deg,rgba(9,16,32,.72),rgba(4,9,19,.54));backdrop-filter:blur(24px) saturate(1.16);box-shadow:0 32px 90px rgba(0,0,0,.44),inset 0 1px rgba(255,255,255,.045)}
        .lm3d-panel:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at 85% 10%,rgba(112,174,255,.12),transparent 34%)}
        .lm3d-kicker{margin:0 0 8px;color:rgba(140,211,255,.78)!important;font:800 9px/1 system-ui!important;letter-spacing:.18em;text-transform:uppercase}
        .lm3d-panel h1{position:relative;margin:0;font:650 clamp(24px,3vw,38px)/.98 system-ui;letter-spacing:-.035em}.lm3d-panel>p{position:relative;color:rgba(225,237,249,.68);font:450 13px/1.55 system-ui}
        .lm3d-panel dl{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:16px 0}.lm3d-panel dl div{padding:9px 10px;border:1px solid rgba(203,229,255,.075);border-radius:12px;background:rgba(255,255,255,.025)}
        .lm3d-panel dt{font:700 8px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:rgba(192,216,239,.45)}.lm3d-panel dd{margin:5px 0 0;font:700 11px/1 system-ui;color:rgba(237,247,255,.86)}
        .lm3d-panel button{position:relative;width:100%;margin-top:8px;border-radius:14px}.lm3d-panel .lm3d-primary{background:linear-gradient(135deg,rgba(72,143,219,.72),rgba(48,93,166,.62));border-color:rgba(164,212,255,.38)}
        @media(max-width:820px){.lm3d-top{right:76px}.lm3d-top button:nth-of-type(2),.lm3d-top button:nth-of-type(3){display:none}.lm3d-top>span{display:none}.lm3d-panel{left:12px;right:12px;top:auto;bottom:max(78px,calc(env(safe-area-inset-bottom) + 68px));transform:none;width:auto;padding:14px 16px;border-radius:18px}.lm3d-panel h1{font-size:21px}.lm3d-panel>p{display:none}.lm3d-panel dl{display:none}.lm3d-panel button{display:inline-flex;width:auto;margin-right:6px;padding:0 12px}.lm3d-panel .lm3d-secondary:nth-of-type(3){display:none}.lm3d-help{display:none}.lm3d-label{min-width:118px}.lm3d-universe{transition-duration:.75s}}
        @media(prefers-reduced-motion:reduce){.lm3d-universe,.lm3d-orb,.lm3d-label{transition:none!important}}
      `}</style>
    </main>
  )
}
