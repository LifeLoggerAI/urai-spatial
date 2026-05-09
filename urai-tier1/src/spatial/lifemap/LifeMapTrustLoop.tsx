'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { CONFIDENCE_LABEL, LIFE_MAP_TRUST_NODES, type LifeMapNode } from './lifeMapTrustData'

const kindLabels: Record<LifeMapNode['kind'], string> = {
  now: 'Now',
  memory: 'Memory',
  ritual: 'Ritual',
  pattern: 'Pattern',
  void: 'Quiet gap',
}

const trustActionLabels = {
  rename: 'Rename queued. You can edit this label once account-backed memory tools are enabled.',
  hide: 'Hide request noted for this demo session.',
  correct: 'Correction path opened. This will become a lightweight feedback flow.',
  unlink: 'Unlink request noted. Related-memory edges stay editable before launch.',
} as const

type TrustAction = keyof typeof trustActionLabels

function relationKey(a: string, b: string) {
  return [a, b].sort().join('__')
}

function ConstellationLines({ nodes, selected }: { nodes: LifeMapNode[]; selected: LifeMapNode | null }) {
  const selectedIds = useMemo(() => new Set([selected?.id, ...(selected?.relatedNodeIds ?? [])].filter(Boolean) as string[]), [selected])
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const seen = new Set<string>()

  return (
    <svg className="lm-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {nodes.flatMap((node) =>
        node.relatedNodeIds.map((targetId) => {
          const target = nodeById.get(targetId)
          if (!target) return null
          const key = relationKey(node.id, target.id)
          if (seen.has(key)) return null
          seen.add(key)

          const active = Boolean(selected) && selectedIds.has(node.id) && selectedIds.has(target.id)
          const dimmed = Boolean(selected) && !active
          const semantic = node.kind === 'pattern' || target.kind === 'pattern' ? 'pattern' : node.kind === 'void' || target.kind === 'void' ? 'void' : 'memory'

          return (
            <line
              key={key}
              x1={node.position[0]}
              y1={node.position[1]}
              x2={target.position[0]}
              y2={target.position[1]}
              className={`lm-line lm-line--${semantic} ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}`}
            />
          )
        }),
      )}
    </svg>
  )
}

function StarNode({ node, selected, related, dimmed, onSelect }: { node: LifeMapNode; selected: boolean; related: boolean; dimmed: boolean; onSelect: (node: LifeMapNode) => void }) {
  const style = {
    '--x': `${node.position[0]}%`,
    '--y': `${node.position[1]}%`,
    '--z': node.position[2],
  } as CSSProperties

  return (
    <button
      type="button"
      className={`lm-node lm-node--${node.kind} lm-confidence--${node.confidence} ${node.replayReady ? 'is-replay-ready' : ''} ${selected ? 'is-selected' : ''} ${related ? 'is-related' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      style={style}
      aria-pressed={selected}
      aria-label={`${node.title}. ${kindLabels[node.kind]}. ${CONFIDENCE_LABEL[node.confidence]}. Select to review why this appeared.`}
      onClick={() => onSelect(node)}
    >
      <span className="lm-node__core" aria-hidden="true" />
      <span className="lm-node__label">
        <strong>{node.title}</strong>
        <small>{kindLabels[node.kind]}</small>
      </span>
    </button>
  )
}

function SelectedMemoryPanel({
  node,
  relatedNodes,
  trustActionFeedback,
  onClose,
  onOpenReplay,
  onTrustAction,
}: {
  node: LifeMapNode
  relatedNodes: LifeMapNode[]
  trustActionFeedback: string | null
  onClose: () => void
  onOpenReplay: (node: LifeMapNode) => void
  onTrustAction: (action: TrustAction, node: LifeMapNode) => void
}) {
  return (
    <aside className="lm-panel" aria-label={`${node.title} detail panel`} aria-live="polite">
      <div className="lm-panel__kicker">
        <span>{kindLabels[node.kind]}</span>
        <span>{node.privateToUser ? 'Private to you' : 'Shared'}</span>
      </div>

      <div className="lm-panel__heading">
        <div>
          <h2>{node.title}</h2>
          <p>{node.dateLabel}{node.seasonLabel ? ` - ${node.seasonLabel}` : ''}</p>
        </div>
        <button type="button" onClick={onClose}>Back to Map</button>
      </div>

      <p className="lm-panel__subtitle">{node.subtitle}</p>

      <section>
        <h3>This may connect to...</h3>
        {relatedNodes.length ? <ul>{relatedNodes.map((related) => <li key={related.id}>{related.title}</li>)}</ul> : <p className="lm-muted">No related memories are attached yet.</p>}
      </section>

      <section>
        <h3>Why this appeared</h3>
        <ul>{node.whyThisAppeared.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </section>

      <div className="lm-trust-row">
        <div><span>Confidence</span><strong>{CONFIDENCE_LABEL[node.confidence]}</strong></div>
        <div><span>Privacy</span><strong>{node.privateToUser ? 'Private to you' : 'Shared'}</strong></div>
      </div>

      <p className="lm-safe-copy">Based on your saved reflections. You can rename, hide, or correct this.</p>

      <div className="lm-actions" aria-label="Correction actions">
        {node.actions.canRename ? <button type="button" onClick={() => onTrustAction('rename', node)}>Rename</button> : null}
        {node.actions.canHide ? <button type="button" onClick={() => onTrustAction('hide', node)}>Hide</button> : null}
        {node.actions.canCorrect ? <button type="button" onClick={() => onTrustAction('correct', node)}>Correct</button> : null}
        {node.actions.canUnlink ? <button type="button" onClick={() => onTrustAction('unlink', node)}>Unlink</button> : null}
      </div>

      {trustActionFeedback ? <p className="lm-action-feedback" aria-live="polite">{trustActionFeedback}</p> : null}

      <button type="button" className="lm-open-replay" disabled={!node.replayReady} onClick={() => onOpenReplay(node)}>
        {node.replayReady ? 'Open Replay' : 'Replay not ready yet'}
      </button>
    </aside>
  )
}

export default function LifeMapTrustLoop() {
  const router = useRouter()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [trustActionFeedback, setTrustActionFeedback] = useState<string | null>(null)
  const trustNodeById = useMemo(() => new Map(LIFE_MAP_TRUST_NODES.map((node) => [node.id, node])), [])
  const selected = useMemo(() => selectedNodeId ? trustNodeById.get(selectedNodeId) ?? null : null, [selectedNodeId, trustNodeById])
  const relatedNodes = useMemo(() => selected ? selected.relatedNodeIds.map((id) => trustNodeById.get(id)).filter(Boolean) as LifeMapNode[] : [], [selected, trustNodeById])
  const relatedIds = useMemo(() => new Set(relatedNodes.map((node) => node.id)), [relatedNodes])

  function openReplay(node: LifeMapNode) {
    if (!node.replayReady) return
    router.push(`/replay?manifestId=${encodeURIComponent(node.id)}&from=life-map`)
  }

  function selectNode(nextNode: LifeMapNode) {
    setSelectedNodeId(nextNode.id)
    setTrustActionFeedback(null)
  }

  function onTrustAction(action: TrustAction, node: LifeMapNode) {
    setTrustActionFeedback(`${trustActionLabels[action]} Memory: ${node.title}.`)
  }

  return (
    <main className="lm-root" data-testid="lifemap-starfield" data-urai-spatial-stage="life-map">
      <section className="lm-intro" aria-label="Life Map introduction">
        <p>Life Map</p>
        <h1>{selected ? selected.title : 'Your Life Map'}</h1>
        <span>{selected ? selected.subtitle : 'Tap a star to revisit the moment, see what it may connect to, and adjust anything that feels wrong.'}</span>
      </section>

      <nav className="lm-controls" aria-label="Life Map controls">
        <button type="button" onClick={() => selectNode(trustNodeById.get('now-anchor') ?? LIFE_MAP_TRUST_NODES[0])}>Return to Now</button>
        {selected ? <button type="button" onClick={() => { setSelectedNodeId(null); setTrustActionFeedback(null) }}>Back to Map</button> : null}
      </nav>

      <section className="lm-space" data-selected-node-id={selected?.id ?? ''} aria-label="Selectable memory constellation">
        <ConstellationLines nodes={LIFE_MAP_TRUST_NODES} selected={selected} />
        <div className="lm-reentry-flare" aria-hidden="true" />
        {LIFE_MAP_TRUST_NODES.map((node) => {
          const isSelected = node.id === selected?.id
          const isRelated = relatedIds.has(node.id)
          const isDimmed = Boolean(selected) && !isSelected && !isRelated
          return <StarNode key={node.id} node={node} selected={isSelected} related={isRelated} dimmed={isDimmed} onSelect={selectNode} />
        })}
      </section>

      <div className="lm-legend" aria-label="Life Map visual grammar">
        <span><i className="now" />Now</span>
        <span><i className="memory" />Memory</span>
        <span><i className="ritual" />Ritual</span>
        <span><i className="pattern" />Pattern</span>
        <span><i className="void" />Quiet gap</span>
      </div>

      {selected ? <SelectedMemoryPanel node={selected} relatedNodes={relatedNodes} trustActionFeedback={trustActionFeedback} onClose={() => { setSelectedNodeId(null); setTrustActionFeedback(null) }} onOpenReplay={openReplay} onTrustAction={onTrustAction} /> : null}

      <style jsx>{`
        .lm-root{position:fixed;inset:0;overflow:hidden;background:radial-gradient(circle at 52% 46%,rgba(82,211,255,.28),transparent 18%),radial-gradient(circle at 76% 58%,rgba(236,72,153,.24),transparent 24%),radial-gradient(circle at 30% 42%,rgba(124,58,237,.34),transparent 26%),linear-gradient(135deg,#020617,#091225 52%,#020617);color:#f8fbff;isolation:isolate}.lm-root:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,transparent 0 45%,rgba(0,0,0,.28) 78%,rgba(0,0,0,.62) 100%)}.lm-intro{position:absolute;z-index:20;left:22px;top:22px;width:min(390px,calc(100% - 44px));padding:22px;border-radius:26px;border:1px solid rgba(190,220,255,.2);background:rgba(8,18,40,.66);box-shadow:0 24px 90px rgba(0,0,0,.32);backdrop-filter:blur(18px)}.lm-intro p{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#9edfff}.lm-intro h1{margin:0;font-size:clamp(32px,5vw,54px);line-height:.96;letter-spacing:-.05em}.lm-intro span{display:block;margin-top:12px;color:rgba(235,244,255,.8);line-height:1.45}.lm-controls{position:absolute;z-index:24;right:22px;top:22px;display:flex;gap:8px}.lm-controls button,.lm-panel button{min-height:36px;border-radius:999px;border:1px solid rgba(190,220,255,.24);background:rgba(16,24,52,.74);color:#f8fbff;font-weight:800;font-size:12px;padding:0 13px;cursor:pointer}.lm-controls button:hover,.lm-panel button:hover,.lm-controls button:focus-visible,.lm-panel button:focus-visible{outline:none;border-color:rgba(103,232,249,.7);box-shadow:0 0 30px rgba(103,232,249,.16)}.lm-space{position:absolute;inset:0;z-index:4}.lm-space:before,.lm-space:after{content:"";position:absolute;inset:16% 10% 15%;border-radius:999px;border:1px solid rgba(180,210,255,.08);transform:rotate(-9deg)}.lm-space:after{inset:24% 16% 18%;transform:rotate(14deg);border-color:rgba(230,180,255,.07)}.lm-lines{position:absolute;inset:0;width:100%;height:100%;z-index:5}.lm-line{stroke:rgba(190,220,255,.24);stroke-width:.24;stroke-linecap:round;stroke-dasharray:.8 1.6;transition:opacity .22s ease,stroke .22s ease,stroke-width .22s ease}.lm-line--pattern{stroke:rgba(196,181,253,.42);stroke-dasharray:1.6 .7}.lm-line--void{stroke:rgba(100,116,139,.32);stroke-dasharray:.45 1.5}.lm-line.is-active{stroke:rgba(214,247,255,.92);stroke-width:.5;filter:drop-shadow(0 0 8px rgba(103,232,249,.9))}.lm-line.is-dimmed{opacity:.14}.lm-node{position:absolute;z-index:calc(10 + var(--z));left:var(--x);top:var(--y);width:50px;height:50px;transform:translate(-50%,-50%);border:0;border-radius:999px;background:transparent;color:#f8fbff;cursor:pointer;transition:transform .22s ease,opacity .22s ease,filter .22s ease}.lm-node__core{position:absolute;inset:12px;border-radius:999px;background:radial-gradient(circle,#f8fbff,#caefff 48%,#73b9ff);box-shadow:0 0 16px rgba(210,245,255,.92),0 0 38px rgba(94,180,255,.52)}.lm-node:before,.lm-node:after{content:"";position:absolute;border-radius:999px;inset:5px;border:1px solid rgba(199,226,255,.36)}.lm-node:after{inset:-6px;opacity:0;border-color:rgba(255,255,255,.44);box-shadow:0 0 28px rgba(160,220,255,.42)}.lm-node--now .lm-node__core{background:radial-gradient(circle,#ecfeff,#67e8f9 52%,#0ea5e9)}.lm-node--ritual:before{border-color:rgba(251,191,36,.9);box-shadow:0 0 24px rgba(251,191,36,.32)}.lm-node--pattern:before{border-width:2px;border-color:rgba(196,181,253,.9);box-shadow:0 0 22px rgba(167,139,250,.35)}.lm-node--void .lm-node__core{background:radial-gradient(circle,rgba(120,132,170,.8),rgba(21,28,48,.96));box-shadow:inset 0 0 16px rgba(0,0,0,.8),0 0 28px rgba(50,64,92,.8)}.lm-confidence--light{opacity:.78}.lm-confidence--strong:before{inset:1px;border-width:2px}.lm-node.is-replay-ready:after{opacity:.52;animation:loopRing 3.4s ease-in-out infinite}.lm-node.is-selected{transform:translate(-50%,-50%) scale(1.22);filter:saturate(1.25)}.lm-node.is-selected:after{opacity:1}.lm-node.is-related:not(.is-selected){transform:translate(-50%,-50%) scale(1.08)}.lm-node.is-dimmed{opacity:.25}.lm-node:focus-visible{outline:3px solid #d9f7ff;outline-offset:6px}.lm-node__label{position:absolute;left:50%;top:calc(100% + 8px);width:max-content;max-width:190px;transform:translateX(-50%);padding:8px 10px;border-radius:999px;border:1px solid rgba(204,223,255,.22);background:rgba(7,13,30,.84);opacity:0;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.3)}.lm-node__label strong,.lm-node__label small{display:block;line-height:1.1}.lm-node__label small{margin-top:2px;color:rgba(218,231,255,.68);font-size:11px}.lm-node:hover .lm-node__label,.lm-node:focus-visible .lm-node__label,.lm-node.is-selected .lm-node__label,.lm-node.is-related .lm-node__label{opacity:1}.lm-reentry-flare{position:absolute;z-index:6;left:61%;top:66%;width:210px;height:2px;transform:rotate(-24deg);background:linear-gradient(90deg,transparent,rgba(255,236,180,.88),transparent);filter:drop-shadow(0 0 12px rgba(255,205,120,.7));opacity:.55}.lm-panel{position:absolute;z-index:30;right:22px;top:92px;width:min(410px,calc(100% - 44px));max-height:calc(100% - 128px);overflow:auto;padding:20px;border-radius:26px;border:1px solid rgba(206,224,255,.22);background:rgba(7,13,30,.84);backdrop-filter:blur(22px);box-shadow:0 24px 70px rgba(0,0,0,.44)}.lm-panel__kicker,.lm-panel__heading,.lm-trust-row,.lm-actions,.lm-legend{display:flex;gap:10px;align-items:center}.lm-panel__kicker{justify-content:space-between;text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#9db7ff}.lm-panel__heading{justify-content:space-between;align-items:flex-start;margin-top:10px}.lm-panel h2{margin:0;font-size:28px;line-height:1}.lm-panel__heading p,.lm-panel__subtitle,.lm-muted,.lm-safe-copy,.lm-action-feedback{color:rgba(231,239,255,.72)}.lm-action-feedback{margin:12px 0 0;padding:10px 12px;border-radius:16px;border:1px solid rgba(103,232,249,.2);background:rgba(103,232,249,.08)}.lm-panel h3{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#c7d7ff}.lm-panel ul{margin:0;padding-left:18px;color:rgba(246,250,255,.9)}.lm-panel li{margin:6px 0}.lm-trust-row{justify-content:space-between;margin:18px 0;padding:12px;border-radius:18px;background:rgba(255,255,255,.07)}.lm-trust-row span{display:block;margin-bottom:4px;color:rgba(210,225,255,.62);font-size:11px;text-transform:uppercase;letter-spacing:.09em}.lm-actions{flex-wrap:wrap}.lm-open-replay{width:100%;margin-top:16px;padding:13px 16px!important;background:linear-gradient(135deg,rgba(112,211,255,.26),rgba(167,139,250,.28))!important}.lm-open-replay:disabled{cursor:not-allowed;opacity:.55}.lm-legend{position:absolute;z-index:22;left:22px;bottom:22px;flex-wrap:wrap;padding:10px 12px;border-radius:999px;border:1px solid rgba(205,225,255,.16);background:rgba(8,14,30,.7);color:rgba(237,245,255,.78);backdrop-filter:blur(14px);font-size:13px}.lm-legend i{display:inline-block;width:9px;height:9px;margin-right:6px;border-radius:999px;background:#dff8ff}.lm-legend .now{background:#67e8f9}.lm-legend .memory{background:#c4d7ff}.lm-legend .ritual{background:#fbbf24}.lm-legend .pattern{background:#c4b5fd}.lm-legend .void{background:#334155}@keyframes loopRing{0%,100%{transform:scale(.9);opacity:.3}50%{transform:scale(1.18);opacity:.85}}@media(max-width:760px){.lm-intro{top:14px;left:14px;right:14px;width:auto;padding:16px}.lm-controls{top:154px;right:14px;left:14px;justify-content:flex-end}.lm-node{width:52px;height:52px}.lm-node__label{display:none}.lm-panel{inset:auto 0 0 0;width:auto;max-height:58%;border-radius:28px 28px 0 0}.lm-legend{left:14px;right:14px;bottom:14px;border-radius:18px}}@media(prefers-reduced-motion:reduce){.lm-node,.lm-line,.lm-node.is-replay-ready:after{animation:none!important;transition-duration:.01ms!important}}
      `}</style>
    </main>
  )
}
