'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetCssStack, focusAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const DEFAULT_MEMORY_ID = 'quiet-reset'
const DEFAULT_MANIFEST_ID = 'replay-recovery-thread'

function safeToken(value: string | null, fallback: string) {
  if (!value) return fallback
  const trimmed = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback
}

function readableName(value: string) {
  return value
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function FocusChamberClient() {
  const [identity, setIdentity] = useState(() => ({
    memoryId: DEFAULT_MEMORY_ID,
    manifestId: DEFAULT_MANIFEST_ID,
    node: DEFAULT_MEMORY_ID,
  }))
  const { memoryId, manifestId, node } = identity
  const memoryName = readableName(node)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextMemoryId = safeToken(params.get('memoryId'), DEFAULT_MEMORY_ID)
    const nextManifestId = safeToken(params.get('manifestId'), DEFAULT_MANIFEST_ID)
    const nextNode = safeToken(params.get('node'), nextMemoryId)
    setIdentity({ memoryId: nextMemoryId, manifestId: nextManifestId, node: nextNode })
    window.sessionStorage.setItem('urai-focus-memory-id', nextMemoryId)
    window.sessionStorage.setItem('urai-focus-manifest-id', nextManifestId)
    window.sessionStorage.setItem('urai-focus-node', nextNode)
  }, [])

  const replayHref = useMemo(() => {
    const next = new URLSearchParams({ memoryId, manifestId, node, from: 'focus-camera' })
    return `/replay?${next.toString()}`
  }, [manifestId, memoryId, node])

  const enterReplay = useCallback(() => {
    requestUraiWorldTravel({
      destination: 'replay',
      href: replayHref,
      entryPortal: 'focus-memory-aperture',
      cameraCheckpoint: 'focus-core',
      context: {
        memoryId,
        replayManifestId: manifestId,
      },
    })
  }, [manifestId, memoryId, replayHref])

  const returnToLifeMap = useCallback(() => {
    requestUraiWorldReturn()
  }, [])

  return (
    <main
      className="focusMemorySurface"
      data-testid="urai-final-focus-chamber"
      data-route-polish="selected-memory-camera-chamber"
      data-canon="camera-from-life-map-entered-memory-world"
      data-memory-id={memoryId}
      data-manifest-id={manifestId}
      data-node={node}
      style={{ '--focus-route-art': assetCssStack(focusAssets.primary) } as React.CSSProperties}
    >
      <div className="focusAtmosphere" aria-hidden="true" />
      <div className="focusConstellationRemnant focusConstellationRemnantA" aria-hidden="true" />
      <div className="focusConstellationRemnant focusConstellationRemnantB" aria-hidden="true" />
      <div className="focusFloor" aria-hidden="true"><span /><span /><span /></div>

      <section className="focusChamber" aria-label={`${memoryName} selected memory chamber`}>
        <header className="focusIdentity">
          <p>Selected memory</p>
          <h1>{memoryName}</h1>
          <span>Private · identity preserved</span>
        </header>

        <div className="focusMemoryArchitecture">
          <div className="focusOrbit focusOrbitOuter" aria-hidden="true" />
          <div className="focusOrbit focusOrbitMiddle" aria-hidden="true" />
          <div className="focusOrbit focusOrbitInner" aria-hidden="true" />

          <button
            type="button"
            className="focusMemoryPortal"
            aria-label={`Enter Replay for ${memoryName}`}
            onClick={enterReplay}
          >
            <span className="focusMemoryShell" aria-hidden="true">
              <span className="focusMemoryImage" />
              <span className="focusMemoryCore" />
            </span>
            <span className="focusPortalLabel">Enter Replay</span>
          </button>

          <div className="focusFragment focusFragmentA" aria-hidden="true"><span>Before</span></div>
          <div className="focusFragment focusFragmentB" aria-hidden="true"><span>Place</span></div>
          <div className="focusFragment focusFragmentC" aria-hidden="true"><span>Person</span></div>
          <div className="focusFragment focusFragmentD" aria-hidden="true"><span>After</span></div>
        </div>

        <aside className="focusInsight" aria-label="Memory context">
          <p>The pressure became permission again.</p>
          <span>One quiet reset changed the thread that followed.</span>
        </aside>

        <button type="button" className="focusReturn" onClick={returnToLifeMap}>
          Return to Life Map
        </button>
      </section>

      <style>{`
        .focusMemorySurface{position:fixed;inset:0;min-height:100svh;overflow:hidden;color:#f8fdff;background:#010309;isolation:isolate}
        .focusMemorySurface:before{content:'';position:absolute;inset:-12%;z-index:0;background:radial-gradient(circle at 50% 42%,rgba(255,189,103,.22),transparent 12%),radial-gradient(circle at 38% 48%,rgba(80,228,255,.13),transparent 32%),radial-gradient(circle at 68% 40%,rgba(178,94,255,.14),transparent 34%),linear-gradient(180deg,#02050c 0%,#060b12 48%,#010207 100%)}
        .focusAtmosphere{position:absolute;inset:-10%;z-index:1;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.64) 0 1px,transparent 1.4px),radial-gradient(circle,rgba(255,197,119,.5) 0 1px,transparent 1.3px);background-size:113px 113px,173px 173px;background-position:0 0,47px 61px;opacity:.42;animation:focusAtmosphereDrift 24s linear infinite}
        .focusConstellationRemnant{position:absolute;z-index:2;width:44vw;height:1px;background:linear-gradient(90deg,transparent,rgba(166,232,255,.38),transparent);transform-origin:center;opacity:.42}.focusConstellationRemnant:before,.focusConstellationRemnant:after{content:'';position:absolute;top:-3px;width:7px;height:7px;border-radius:50%;background:#d9f8ff;box-shadow:0 0 16px rgba(166,232,255,.82)}.focusConstellationRemnant:before{left:18%}.focusConstellationRemnant:after{right:22%}.focusConstellationRemnantA{left:-8vw;top:31%;transform:rotate(13deg)}.focusConstellationRemnantB{right:-10vw;top:39%;transform:rotate(-16deg)}
        .focusFloor{position:absolute;left:50%;bottom:-20svh;z-index:2;width:min(1080px,100vw);height:55svh;transform:translateX(-50%) rotateX(68deg);border-radius:50%;background:radial-gradient(ellipse,rgba(255,177,86,.2),rgba(22,40,51,.16) 36%,rgba(0,0,0,.72) 70%);border:1px solid rgba(255,204,142,.18);box-shadow:0 -20px 90px rgba(255,153,59,.12),inset 0 0 100px rgba(0,0,0,.8)}.focusFloor span{position:absolute;inset:14%;border:1px solid rgba(255,210,153,.12);border-radius:50%}.focusFloor span:nth-child(2){inset:28%}.focusFloor span:nth-child(3){inset:42%}
        .focusChamber{position:relative;z-index:10;min-height:100svh;display:grid;place-items:center;padding:max(22px,env(safe-area-inset-top)) 24px max(94px,calc(env(safe-area-inset-bottom) + 82px))}
        .focusIdentity{position:absolute;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(320px,calc(100vw - 36px));padding:12px 14px;border-left:1px solid rgba(255,211,154,.48);background:linear-gradient(90deg,rgba(0,0,0,.42),transparent)}.focusIdentity p{margin:0;color:rgba(255,211,154,.88);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.focusIdentity h1{margin:4px 0 2px;font-size:clamp(1.1rem,3vw,1.7rem);letter-spacing:-.03em}.focusIdentity span{color:rgba(230,245,248,.62);font-size:11px}
        .focusMemoryArchitecture{position:relative;width:min(72vw,760px);aspect-ratio:1;display:grid;place-items:center;perspective:1200px}
        .focusOrbit{position:absolute;border:1px solid rgba(180,228,238,.16);border-radius:50%;animation:focusOrbitTurn 18s linear infinite}.focusOrbitOuter{inset:2%;transform:rotateX(64deg) rotateZ(12deg)}.focusOrbitMiddle{inset:14%;transform:rotateY(68deg) rotateZ(-18deg);animation-direction:reverse;animation-duration:22s}.focusOrbitInner{inset:25%;border-color:rgba(255,196,121,.22);transform:rotateX(72deg) rotateZ(32deg);animation-duration:14s}
        .focusMemoryPortal{position:relative;width:min(42vw,390px);aspect-ratio:1;border:0;padding:0;border-radius:50%;background:transparent;color:white;cursor:pointer;display:grid;place-items:center;filter:drop-shadow(0 28px 70px rgba(0,0,0,.58));transition:transform .35s ease,filter .35s ease}.focusMemoryPortal:hover,.focusMemoryPortal:focus-visible{transform:scale(1.035);filter:drop-shadow(0 30px 86px rgba(255,170,75,.22))}.focusMemoryPortal:focus-visible{outline:3px solid rgba(222,252,255,.94);outline-offset:10px}
        .focusMemoryShell{position:absolute;inset:0;border-radius:34% 66% 48% 52% / 54% 42% 58% 46%;overflow:hidden;border:1px solid rgba(255,223,183,.36);background:radial-gradient(circle at 50% 46%,rgba(0,0,0,.18),rgba(0,0,0,.78) 61%),linear-gradient(135deg,rgba(255,190,111,.36),rgba(78,186,204,.16) 42%,rgba(176,104,255,.18) 72%,rgba(0,0,0,.8));box-shadow:inset 0 0 80px rgba(255,190,111,.16),0 0 90px rgba(255,161,68,.16);animation:focusShellBreathe 5.6s ease-in-out infinite alternate}.focusMemoryImage{position:absolute;inset:13%;border-radius:50%;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.5)),var(--focus-route-art),radial-gradient(circle at 50% 38%,rgba(255,205,133,.45),transparent 24%),linear-gradient(145deg,#122531,#3a2a32 58%,#090b10);background-size:cover;background-position:center;box-shadow:inset 0 0 60px rgba(0,0,0,.64);filter:saturate(.92) contrast(1.04)}.focusMemoryCore{position:absolute;left:50%;top:50%;width:18%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff 0 5%,#ffd092 16%,rgba(255,165,69,.7) 34%,rgba(255,165,69,.12) 58%,transparent 72%);box-shadow:0 0 30px rgba(255,226,181,.9),0 0 90px rgba(255,155,54,.55),0 0 180px rgba(255,126,39,.25)}
        .focusPortalLabel{position:absolute;left:50%;bottom:-48px;transform:translateX(-50%);min-width:132px;padding:10px 14px;border:1px solid rgba(255,214,158,.34);border-radius:999px;background:rgba(5,8,12,.72);backdrop-filter:blur(12px);font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
        .focusFragment{position:absolute;width:94px;aspect-ratio:1;border:1px solid rgba(188,230,239,.18);border-radius:26px;background:linear-gradient(145deg,rgba(10,20,29,.74),rgba(30,20,33,.48));box-shadow:0 18px 54px rgba(0,0,0,.42);display:grid;place-items:center;color:rgba(227,250,255,.68);font-size:9px;font-weight:850;letter-spacing:.15em;text-transform:uppercase;backdrop-filter:blur(12px)}.focusFragmentA{left:1%;top:19%;transform:rotate(-9deg)}.focusFragmentB{right:2%;top:24%;transform:rotate(8deg)}.focusFragmentC{left:10%;bottom:10%;transform:rotate(7deg)}.focusFragmentD{right:8%;bottom:12%;transform:rotate(-7deg)}
        .focusInsight{position:absolute;right:max(18px,env(safe-area-inset-right));top:50%;width:min(260px,calc(100vw - 36px));transform:translateY(-50%);padding:15px 16px;border-right:1px solid rgba(255,211,154,.42);background:linear-gradient(270deg,rgba(0,0,0,.42),transparent);text-align:right}.focusInsight p{margin:0;color:#fff7ed;font-size:clamp(1rem,2vw,1.35rem);font-weight:800;line-height:1.08}.focusInsight span{display:block;margin-top:7px;color:rgba(230,245,248,.58);font-size:11px;line-height:1.45}
        .focusReturn{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));min-height:44px;border:1px solid rgba(188,230,239,.22);border-radius:999px;padding:10px 15px;background:rgba(3,8,15,.66);color:rgba(235,252,255,.82);font-size:11px;font-weight:850;cursor:pointer;backdrop-filter:blur(12px)}.focusReturn:focus-visible{outline:2px solid white;outline-offset:3px}
        @keyframes focusAtmosphereDrift{to{transform:translate3d(2%,3%,0)}}
        @keyframes focusOrbitTurn{to{rotate:1 1 0 360deg}}
        @keyframes focusShellBreathe{from{transform:scale(.97) rotate(-1deg)}to{transform:scale(1.025) rotate(1deg)}}
        @media(max-width:900px){.focusMemoryArchitecture{width:min(92vw,620px);transform:translateY(3svh)}.focusMemoryPortal{width:min(58vw,350px)}.focusInsight{top:auto;right:18px;bottom:max(88px,calc(env(safe-area-inset-bottom) + 76px));transform:none;width:min(240px,60vw)}.focusFragment{width:72px;border-radius:20px}.focusIdentity{max-width:220px}.focusPortalLabel{bottom:-42px}.focusFloor{bottom:-25svh}}
        @media(max-width:520px){.focusChamber{padding-left:10px;padding-right:10px}.focusMemoryArchitecture{width:100vw;transform:translateY(1svh)}.focusMemoryPortal{width:min(64vw,290px)}.focusFragment{width:60px;font-size:8px}.focusFragmentA{left:3%;top:21%}.focusFragmentB{right:3%;top:26%}.focusFragmentC{left:8%;bottom:17%}.focusFragmentD{right:7%;bottom:17%}.focusInsight{right:12px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 70px));width:min(210px,57vw);padding:10px}.focusInsight p{font-size:.9rem}.focusIdentity{left:12px;top:max(12px,env(safe-area-inset-top));max-width:190px;padding:9px 10px}.focusReturn{left:12px;bottom:max(12px,env(safe-area-inset-bottom));font-size:10px}.focusPortalLabel{min-width:120px;font-size:10px}}
        @media(prefers-reduced-motion:reduce){.focusAtmosphere,.focusOrbit,.focusMemoryShell{animation:none!important}.focusMemoryPortal{transition:none}}
      `}</style>
    </main>
  )
}
