'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useLifeMapEvents } from '@/components/lifemap/useLifeMapEvents'
import type { LifeMapNode } from '@/components/lifemap/lifeMapData'

const DEMO_REPLAY_MANIFEST_ID = 'replay-recovery-thread'
const DEMO_REPLAY_UNAVAILABLE_ID = 'replay-unavailable'

function safeToken(value: string | null, fallback = '') {
  if (!value) return fallback
  const normalized = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : fallback
}

function rawNodeId(value: string) {
  return value.startsWith('demo:') ? value.slice('demo:'.length) : value
}

function memoryTitle(memoryId: string) {
  return rawNodeId(memoryId)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function disclosedDemoManifestId(node: LifeMapNode) {
  return node.replayAvailable && !node.locked
    ? DEMO_REPLAY_MANIFEST_ID
    : DEMO_REPLAY_UNAVAILABLE_ID
}

type SelectedMemoryActionsProps = {
  memoryId: string
  nodeId: string
  manifestId: string
  demo: boolean
  replayAvailable: boolean
}

function SelectedMemoryActions({ memoryId, nodeId, manifestId, demo, replayAvailable }: SelectedMemoryActionsProps) {
  const router = useRouter()
  if (!memoryId) return null

  const destination = (route: 'focus' | 'replay') => {
    const query = new URLSearchParams()
    query.set('memoryId', memoryId)
    if (manifestId) query.set('manifestId', manifestId)
    query.set('node', nodeId)
    query.set('from', 'life-map-selected-memory')
    if (demo) query.set('demo', '1')
    return `/${route}?${query.toString()}`
  }

  return (
    <div className="urai-lifemap-deep-link-controls__actions">
      <button
        type="button"
        data-urai-audit-action="life-map-focus"
        onClick={() => router.push(destination('focus'))}
        style={{ minHeight: 48 }}
      >
        Enter Focus
      </button>
      <button
        type="button"
        data-urai-audit-action="life-map-replay"
        onClick={() => router.push(destination('replay'))}
        disabled={!replayAvailable}
        aria-label={replayAvailable ? 'Replay' : 'Replay unavailable for this memory'}
        style={{ minHeight: 48 }}
      >
        {replayAvailable ? 'Replay' : 'Replay unavailable'}
      </button>
    </div>
  )
}

export default function LifeMapDeepLinkControls() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedMemoryId = safeToken(searchParams.get('memoryId') ?? searchParams.get('node'))
  const requestedNodeId = safeToken(searchParams.get('node')) || rawNodeId(requestedMemoryId)
  const requestedManifestId = safeToken(searchParams.get('manifestId'))
  const requestedDemo = searchParams.get('demo') === '1'
  const { nodes, loading, error, usingSeedData } = useLifeMapEvents(requestedDemo ? 'demo-user' : undefined)
  const selectedNode = nodes.find((node) => node.id === requestedNodeId) ?? null
  const disclosedDemo = requestedDemo || usingSeedData
  const memoryId = selectedNode
    ? (disclosedDemo ? `demo:${selectedNode.id}` : selectedNode.id)
    : requestedMemoryId
  const nodeId = selectedNode?.id ?? requestedNodeId
  const manifestId = selectedNode && disclosedDemo
    ? disclosedDemoManifestId(selectedNode)
    : requestedManifestId
  const title = selectedNode?.title ?? (memoryId ? memoryTitle(memoryId) : 'Choose a memory')

  const selectNode = (node: LifeMapNode) => {
    const query = new URLSearchParams()
    const demoSelection = requestedDemo || usingSeedData
    query.set('memoryId', demoSelection ? `demo:${node.id}` : node.id)
    const selectedManifestId = demoSelection ? disclosedDemoManifestId(node) : ''
    if (selectedManifestId) query.set('manifestId', selectedManifestId)
    query.set('node', node.id)
    query.set('from', 'semantic-life-map')
    if (demoSelection) query.set('demo', '1')
    router.replace(`/life-map?${query.toString()}`, { scroll: false })
  }

  return (
    <aside
      className="urai-lifemap-deep-link-controls"
      data-testid="urai-lifemap-selected-memory-controls"
      data-memory-id={memoryId}
      data-manifest-id={manifestId || undefined}
      data-life-map-owner="independent"
      aria-label="Semantic Life Map"
      aria-live="polite"
      style={{ maxHeight: 'min(62svh, 560px)', overflow: 'auto' }}
    >
      <p className="urai-lifemap-deep-link-controls__eyebrow">Memory constellation</p>
      <strong className="urai-lifemap-deep-link-controls__title">{title}</strong>
      <span className="urai-lifemap-deep-link-controls__detail">
        {loading
          ? 'Opening the memory field…'
          : error
            ? 'The visual field is recovering. The semantic map remains available.'
            : selectedNode?.summary ?? 'Choose a memory with touch, pointer, or keyboard. Life Map owns this navigation; the Home Orb does not enter this realm.'}
      </span>

      <ul
        aria-label="Available memories"
        style={{
          display: 'flex',
          gap: 8,
          margin: 0,
          padding: '4px 0',
          overflowX: 'auto',
          listStyle: 'none',
          scrollbarWidth: 'thin',
        }}
      >
        {nodes.map((node) => {
          const selected = node.id === nodeId
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selectNode(node)}
                style={{
                  minHeight: 48,
                  minWidth: 112,
                  padding: '10px 14px',
                  border: selected ? '1px solid rgba(207,250,254,.9)' : '1px solid rgba(207,250,254,.22)',
                  borderRadius: 999,
                  color: selected ? '#06111f' : '#effdff',
                  background: selected ? '#cffafe' : 'rgba(255,255,255,.07)',
                  font: 'inherit',
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {node.title}
              </button>
            </li>
          )
        })}
      </ul>

      {selectedNode ? (
        <SelectedMemoryActions
          memoryId={memoryId}
          nodeId={selectedNode.id}
          manifestId={manifestId}
          demo={disclosedDemo || memoryId.startsWith('demo:')}
          replayAvailable={selectedNode.replayAvailable && !selectedNode.locked}
        />
      ) : null}
    </aside>
  )
}
