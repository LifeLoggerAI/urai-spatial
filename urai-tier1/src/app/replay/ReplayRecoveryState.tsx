'use client'

import { useCallback } from 'react'
import type { SelectedMemoryStatus } from '@/spatial/memory/selectedMemoryContract'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type Props = {
  status: SelectedMemoryStatus
  message: string
}

const COPY: Partial<Record<SelectedMemoryStatus, { eyebrow: string; title: string; detail: string }>> = {
  loading: {
    eyebrow: 'Preparing Replay',
    title: 'Opening the selected memory',
    detail: 'URAI is verifying ownership, sources, and the replay manifest before constructing the space.',
  },
  unauthorized: {
    eyebrow: 'Private Memory',
    title: 'This Replay is not available here',
    detail: 'Sign in with the memory owner account or choose one of your own memories. URAI does not reveal private-memory details.',
  },
  deleted: {
    eyebrow: 'Memory Removed',
    title: 'This Replay is no longer available',
    detail: 'The source memory has been deleted. You can safely return to your Life Map and choose another moment.',
  },
  corrupt: {
    eyebrow: 'Replay Needs Attention',
    title: 'This memory cannot be reconstructed safely',
    detail: 'The selected record or manifest is incomplete. URAI will not invent missing information to make it appear complete.',
  },
  unavailable: {
    eyebrow: 'Choose a Memory',
    title: 'Replay begins from a moment in your life',
    detail: 'Open Life Map to choose a memory, return to Focus, or enter the clearly labeled sample experience.',
  },
}

export default function ReplayRecoveryState({ status, message }: Props) {
  const copy = COPY[status] ?? COPY.unavailable!
  const chooseMemory = useCallback(() => requestUraiWorldTravel({
    destination: 'life-map',
    href: '/life-map?from=replay-recovery',
    entryPortal: 'replay-recovery',
    cameraCheckpoint: 'life-map-overview',
  }), [])
  const returnToFocus = useCallback(() => requestUraiWorldTravel({
    destination: 'focus',
    href: '/focus?from=replay-recovery',
    entryPortal: 'replay-recovery',
    cameraCheckpoint: 'focus-settled',
  }), [])
  const openDemo = useCallback(() => requestUraiWorldTravel({
    destination: 'replay',
    href: '/replay?memoryId=demo:sample-replay&node=sample-replay&demo=1&from=replay-recovery',
    entryPortal: 'replay-explicit-demo',
    cameraCheckpoint: 'replay-arrival',
    context: { memoryId: 'demo:sample-replay', privacyMode: 'private' },
  }), [])

  return (
    <main className="replayRecovery" data-testid="replay-recovery-state" data-memory-status={status}>
      <div className="recoveryAtmosphere" aria-hidden="true">
        <span className="horizon" />
        <span className="doorway" />
        <span className="orb" />
      </div>
      <section role={status === 'loading' ? 'status' : 'region'} aria-labelledby="replay-recovery-title">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="replay-recovery-title">{copy.title}</h1>
        <p className="detail">{copy.detail}</p>
        <p className="technical" aria-live="polite">{message}</p>
        {status === 'loading' ? <div className="loadingTrack" aria-hidden="true"><span /></div> : (
          <div className="actions">
            <button className="primary" type="button" onClick={chooseMemory}>Choose a memory</button>
            <button type="button" onClick={returnToFocus}>Return to Focus</button>
            <button type="button" onClick={openDemo}>Open sample Replay</button>
            <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : returnToFocus()}>Go back</button>
          </div>
        )}
        <small>Sample Replay uses demonstration data only. It is never presented as your memory.</small>
      </section>
      <style jsx>{`
        .replayRecovery{position:fixed;inset:0;display:grid;place-items:center;overflow:hidden;padding:clamp(20px,5vw,64px);box-sizing:border-box;background:radial-gradient(circle at 50% 36%,#102b3a 0,#06111f 28%,#02050c 68%,#010208);color:#f4fbff;isolation:isolate}.recoveryAtmosphere{position:absolute;inset:0;pointer-events:none}.horizon{position:absolute;left:-10%;right:-10%;bottom:28%;height:1px;background:linear-gradient(90deg,transparent,#8eeaff88,transparent);box-shadow:0 0 90px 28px #2d91ac26}.doorway{position:absolute;left:50%;top:48%;width:min(34vw,360px);aspect-ratio:.78;transform:translate(-50%,-50%);border:1px solid #b9f6ff24;border-radius:50% 50% 18% 18%;box-shadow:inset 0 0 100px #001018,0 0 90px #66d9ef18}.orb{position:absolute;left:50%;top:51%;width:34px;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff 0 8%,#b9f7ff 22%,#50cbe4 48%,transparent 72%);box-shadow:0 0 44px #7de8ff88}.replayRecovery section{position:relative;z-index:2;width:min(720px,100%);padding:clamp(24px,5vw,52px);box-sizing:border-box;border:1px solid #d9fbff22;border-radius:30px;background:linear-gradient(145deg,#071522df,#020710e8);box-shadow:0 40px 140px #000c;backdrop-filter:blur(22px);text-align:center}.eyebrow{margin:0;color:#aeeeff;font:850 11px/1.2 Inter,system-ui;letter-spacing:.18em;text-transform:uppercase}.replayRecovery h1{margin:12px auto 0;max-width:620px;font:500 clamp(2rem,6vw,4.5rem)/.96 Georgia,serif;letter-spacing:-.035em}.detail{max-width:580px;margin:20px auto 0;color:#c8d9e5;font:500 clamp(.95rem,2vw,1.15rem)/1.6 Inter,system-ui}.technical{max-width:560px;margin:12px auto 0;color:#8fa8b8;font:600 12px/1.5 Inter,system-ui}.actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:28px auto 0;max-width:560px}.actions button{min-height:52px;padding:0 18px;border:1px solid #c9f7ff26;border-radius:999px;background:#081827d9;color:#f7fdff;font:800 13px/1 Inter,system-ui}.actions .primary{background:linear-gradient(135deg,#dbfbff,#77ddeb);color:#041019}.actions button:focus-visible{outline:3px solid #fff;outline-offset:4px}.replayRecovery small{display:block;margin:18px auto 0;color:#7f97a8;font:600 11px/1.5 Inter,system-ui}.loadingTrack{width:min(360px,80%);height:4px;margin:28px auto 0;overflow:hidden;border-radius:999px;background:#d8f7ff16}.loadingTrack span{display:block;width:42%;height:100%;border-radius:inherit;background:#9cecff;animation:load 1.4s ease-in-out infinite alternate}@keyframes load{to{transform:translateX(138%)}}@media(max-width:620px){.actions{grid-template-columns:1fr}.replayRecovery section{border-radius:24px}.doorway{width:68vw}}@media(prefers-reduced-motion:reduce){.loadingTrack span{animation:none;width:100%}}@media(forced-colors:active){.replayRecovery section,.actions button{border:2px solid CanvasText}}
      `}</style>
    </main>
  )
}
