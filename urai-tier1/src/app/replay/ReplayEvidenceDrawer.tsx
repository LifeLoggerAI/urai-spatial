'use client'

import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { ReplayProductControls } from './ReplayProductControls'

function evidenceLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase())
}

export function ReplayEvidenceDrawer({ memory, onClose }: { memory: SelectedMemory; onClose: () => void }) {
  return (
    <aside className="replayEvidenceDrawer" role="dialog" aria-modal="false" aria-label="Replay evidence and memory controls" data-replay-evidence-count={memory.replayManifest.evidence.length}>
      <header>
        <div><small>Evidence</small><h2>{memory.title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close Replay evidence">Close</button>
      </header>

      <section aria-labelledby="replay-truth-heading">
        <h3 id="replay-truth-heading">Truth relationship</h3>
        <ul className="truthList">
          {memory.replayManifest.evidence.map((evidence) => (
            <li key={evidence.id} data-evidence-class={evidence.class}>
              <strong>{evidenceLabel(evidence.class)}</strong>
              <span>{evidenceLabel(evidence.sourceKind)}</span>
              {evidence.sourceId ? <small>Source retained</small> : null}
              {evidence.userConfirmed ? <small>User confirmed</small> : null}
              {!evidence.presentationAllowed ? <small>Not permitted for presentation</small> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="replay-source-heading">
        <h3 id="replay-source-heading">Sources</h3>
        {memory.sourceMedia.length ? (
          <ul className="sourceList">{memory.sourceMedia.map((source, index) => (
            <li key={`${source.kind}-${index}`}><strong>{evidenceLabel(source.kind)}</strong><span>{source.caption ?? 'Authorized source media'}</span></li>
          ))}</ul>
        ) : <p>No captured media is attached to this memory. Replay must preserve that absence.</p>}
      </section>

      {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}

      <section aria-label="Replay privacy"><h3>Privacy</h3><p>{memory.privacy === 'private' ? 'Private to the owner.' : memory.privacy === 'hidden' ? 'Hidden by the owner.' : 'Marked shareable by the owner.'}</p></section>

      <ReplayProductControls memory={memory} />

      <style>{css}</style>
    </aside>
  )
}

const css = `.replayEvidenceDrawer{position:absolute;z-index:20;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));bottom:max(12px,env(safe-area-inset-bottom));box-sizing:border-box;width:400px;max-width:calc(100vw - 24px);overflow:auto;padding:18px;border:1px solid rgba(255,255,255,.2);border-radius:24px;background:rgba(2,7,12,.94);backdrop-filter:blur(22px);box-shadow:0 28px 100px rgba(0,0,0,.52);color:#fff}.replayEvidenceDrawer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}.replayEvidenceDrawer small{color:rgba(235,246,241,.62);font-size:10px;letter-spacing:.08em}.replayEvidenceDrawer h2{margin:3px 0 0;font-size:1.25rem}.replayEvidenceDrawer h3{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(239,249,245,.72)}.replayEvidenceDrawer header button{min-width:64px;min-height:44px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font-weight:800}.truthList,.sourceList{display:grid;gap:8px;margin:0;padding:0;list-style:none}.truthList li,.sourceList li{display:grid;gap:2px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035)}.truthList strong,.sourceList strong{font-size:12px}.truthList span,.sourceList span,.replayEvidenceDrawer p{margin:0;color:rgba(240,248,245,.72);font-size:12px;line-height:1.45}.truthList li[data-evidence-class='CAPTURED']{border-color:rgba(211,236,221,.28)}.truthList li[data-evidence-class='SUPPORTED_RECONSTRUCTION']{border-style:dashed}.truthList li[data-evidence-class='SYMBOLIC']{border-color:rgba(205,190,232,.28)}.truthList li[data-evidence-class='UNKNOWN']{opacity:.72}.transcript{margin-top:16px;border-top:1px solid rgba(255,255,255,.1);padding-top:12px}.transcript summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:800}.transcript p{padding-bottom:8px}.replayEvidenceDrawer .replayProduct{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:none!important;margin-top:18px!important;opacity:1!important;background:rgba(255,255,255,.035)!important}.replayEvidenceDrawer .replayOperationStatus{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;width:auto!important;margin:8px 0 0!important;text-align:left!important}.replayEvidenceDrawer :is(button,summary):focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.replayEvidenceDrawer{left:0;right:0;top:auto;bottom:0;width:100%;max-width:none;max-height:70svh;border-radius:24px 24px 0 0;padding-bottom:max(18px,env(safe-area-inset-bottom))}}@media(prefers-reduced-motion:reduce){.replayEvidenceDrawer{backdrop-filter:none}}@media(forced-colors:active){.replayEvidenceDrawer,.truthList li,.sourceList li{border:2px solid CanvasText}}`

export default ReplayEvidenceDrawer
