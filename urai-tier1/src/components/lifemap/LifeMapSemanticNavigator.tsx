'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lifeMapTypeLabels, type LifeMapNode, type LifeMapNodeType } from './lifeMapData'
import { requestLifeMapSelection } from './lifeMapSelection'
import { useLifeMapEvents } from './useLifeMapEvents'

const TYPE_FILTERS: readonly (LifeMapNodeType | 'all')[] = ['all', 'memory', 'relationship', 'season', 'recovery', 'threshold', 'ritual', 'forecast', 'legacy']

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches('input,textarea,select,[role="textbox"]'))
}

function matchesSearch(node: LifeMapNode, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return [node.title, node.subtitle, node.summary, node.dateLabel, node.type, node.eraId, node.clusterId, ...(node.tags || [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query))
}

export default function LifeMapSemanticNavigator() {
  const router = useRouter()
  const params = useSearchParams()
  const explicitDemo = params.get('demo') === '1'
  const overviewRequested = params.get('overview') === '1'
  const { nodes, eras, loading, sourceMode } = useLifeMapEvents(explicitDemo ? 'demo-user' : undefined)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<LifeMapNodeType | 'all'>('all')
  const [eraFilter, setEraFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const selectedId = overviewRequested ? null : params.get('node') || params.get('memoryId')
  const selected = nodes.find((node) => node.id === selectedId) || null
  const searchRef = useRef<HTMLInputElement>(null)

  const visibleNodes = useMemo(
    () => nodes.filter((node) => matchesSearch(node, search) && (typeFilter === 'all' || node.type === typeFilter) && (eraFilter === 'all' || node.eraId === eraFilter)),
    [eraFilter, nodes, search, typeFilter],
  )

  const withIdentity = useCallback((next: URLSearchParams) => {
    if (explicitDemo) next.set('demo', '1')
    const manifestId = params.get('manifestId')
    if (manifestId) next.set('manifestId', manifestId)
    return next
  }, [explicitDemo, params])

  const commitBrowserIdentity = useCallback((next: URLSearchParams) => {
    const destination = `/life-map?${next.toString()}`
    window.history.replaceState(window.history.state, '', destination)
    return destination
  }, [])

  const selectNode = useCallback((node: LifeMapNode, source: 'semantic' | 'keyboard' | 'pointer' = 'semantic') => {
    setOpen(false)
    const next = withIdentity(new URLSearchParams())
    next.set('memoryId', node.id)
    next.set('node', node.id)
    if (node.eraId) next.set('era', node.eraId)

    // Same-route selection identity must become observable before the spatial world begins
    // its potentially expensive camera/render transition. The world selection event remains
    // the single authoritative state transaction and owns the normal Next router replacement.
    commitBrowserIdentity(next)
    requestLifeMapSelection(node.id, source)

    // Defensive fallback for any future reuse outside the canonical /life-map owner.
    if (window.location.pathname.replace(/\/+$/, '') !== '/life-map') {
      router.replace(`/life-map?${next.toString()}`, { scroll: false })
    }
  }, [commitBrowserIdentity, router, withIdentity])

  const overview = useCallback(() => {
    setOpen(false)
    const next = withIdentity(new URLSearchParams())
    const memoryId = params.get('memoryId')
    const node = params.get('node')
    if (memoryId) next.set('memoryId', memoryId)
    if (node) next.set('node', node)
    next.set('overview', '1')
    commitBrowserIdentity(next)
    router.replace(`/life-map?${next.toString()}`, { scroll: false })
  }, [commitBrowserIdentity, params, router, withIdentity])

  const step = useCallback((direction: number) => {
    const candidates = visibleNodes.length ? visibleNodes : nodes
    if (!candidates.length) return
    const current = selected ? candidates.findIndex((node) => node.id === selected.id) : -1
    selectNode(candidates[(current + direction + candidates.length) % candidates.length], 'keyboard')
  }, [nodes, selectNode, selected, visibleNodes])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); return }
      if (isEditableTarget(event.target)) return
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
      if (event.key === 'Home' || event.key.toLowerCase() === 'o') { event.preventDefault(); overview() }
      if (event.key === '/') {
        event.preventDefault()
        setOpen(true)
        window.setTimeout(() => searchRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, overview, step])

  const related = selected ? nodes.filter((node) => selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)) : []

  return <>
    <button
      type="button"
      className="life-map-search-trigger"
      aria-label="Search and navigate Life Map"
      aria-expanded={open}
      onClick={() => { setOpen((value) => !value); window.setTimeout(() => searchRef.current?.focus(), 0) }}
    >
      <span aria-hidden="true">⌕</span><span className="sr-only">Search life</span>
    </button>

    {open ? <section className="life-map-navigator" aria-label="Search and filter Life Map">
      <header><strong>Search life</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close Life Map search">×</button></header>
      <label htmlFor="life-map-search" className="sr-only">Search memories, people, dates, places, themes, and eras</label>
      <input ref={searchRef} id="life-map-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories, people, places…" />
      <div className="filter-row" aria-label="Filter by life object type">{TYPE_FILTERS.map((type) => <button key={type} type="button" data-active={typeFilter === type ? 'true' : 'false'} onClick={() => setTypeFilter(type)}>{type === 'all' ? 'All' : lifeMapTypeLabels[type]}</button>)}</div>
      <div className="filter-row" aria-label="Filter by era"><button type="button" data-active={eraFilter === 'all' ? 'true' : 'false'} onClick={() => setEraFilter('all')}>All eras</button>{eras.map((era) => <button key={era.id} type="button" data-active={eraFilter === era.id ? 'true' : 'false'} onClick={() => setEraFilter(era.id)}>{era.title}</button>)}</div>
      <div className="semantic-results" role="list" aria-label="Visible Life Map objects" data-visible-count={visibleNodes.length}>
        {loading ? <p>Opening constellation…</p> : visibleNodes.length ? visibleNodes.map((node) => <button className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id={node.id} role="listitem" aria-label={node.title} key={node.id} type="button" data-selected={selected?.id === node.id ? 'true' : 'false'} onClick={(event) => selectNode(node, event.detail === 0 ? 'keyboard' : 'pointer')}><strong>{node.title}</strong><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span><small>{node.summary}</small></button>) : <p>No life objects match these filters.</p>}
      </div>
      <p className="privacy-truth">{sourceMode === 'explicit-demo' ? 'Disclosed sample universe · not your memories' : sourceMode === 'private' ? 'Private universe' : sourceMode}</p>
    </section> : null}

    {selected && open ? <aside className="life-map-semantic-inspector" aria-label="Selected life object details">
      <span>{lifeMapTypeLabels[selected.type]} · {selected.dateLabel}</span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
      {related.length ? <div className="related-paths"><strong>Connected</strong>{related.slice(0, 4).map((node) => <button key={node.id} type="button" onClick={() => selectNode(node)}>{node.title}</button>)}</div> : null}
    </aside> : null}

    <style jsx global>{`
      .life-map-search-trigger{position:fixed;z-index:2147483600;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:48px;height:48px;border:1px solid rgba(205,240,255,.22);border-radius:50%;background:rgba(3,10,20,.58);color:rgba(238,251,255,.82);font:700 21px/1 system-ui;backdrop-filter:blur(16px);box-shadow:0 12px 38px rgba(0,0,0,.28);cursor:pointer;opacity:.48;transition:opacity .2s ease,background .2s ease}.life-map-search-trigger:hover,.life-map-search-trigger:focus-visible,.life-map-search-trigger[aria-expanded='true']{opacity:1;background:rgba(4,16,29,.92);outline:none}.life-map-navigator{position:fixed;z-index:2147483601;right:max(18px,env(safe-area-inset-right));bottom:max(78px,calc(env(safe-area-inset-bottom) + 66px));width:min(420px,calc(100vw - 36px));display:grid;gap:12px;max-height:min(70vh,720px);padding:16px;border:1px solid rgba(195,240,255,.2);border-radius:22px;background:rgba(2,7,18,.92);backdrop-filter:blur(24px);color:#f8fbff;box-shadow:0 24px 80px rgba(0,0,0,.46)}.life-map-navigator header{display:flex;align-items:center;justify-content:space-between}.life-map-navigator header strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase}.life-map-navigator header button{width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.05);color:#fff;font-size:22px;cursor:pointer}.life-map-navigator input{min-height:48px;border:1px solid rgba(205,244,255,.2);border-radius:16px;background:rgba(6,17,29,.95);color:#fff;padding:0 14px;font:inherit}.filter-row{display:flex;gap:7px;overflow:auto;padding-bottom:2px}.filter-row button,.life-map-navigator .semantic-results button,.life-map-semantic-inspector button{border:1px solid rgba(220,248,255,.18);background:rgba(10,25,40,.86);color:#f8fbff;font:inherit;cursor:pointer}.filter-row button{min-height:36px;border-radius:999px;white-space:nowrap;padding:0 12px;font-size:11px}.filter-row button[data-active='true']{border-color:rgba(221,250,255,.72);background:rgba(24,67,88,.9)}.semantic-results{display:grid;gap:8px;overflow:auto}.semantic-results>button{min-height:62px;display:grid;gap:3px;text-align:left;padding:10px 13px;border-radius:14px}.semantic-results>button[data-selected='true']{border-color:rgba(221,250,255,.72);background:rgba(18,58,78,.9)}.semantic-results span,.semantic-results small{color:rgba(225,243,255,.66)}.semantic-results small{line-height:1.3}.privacy-truth{margin:0;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(194,244,255,.62)}.life-map-semantic-inspector{position:fixed;z-index:2147483601;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 36px));display:grid;gap:10px;padding:16px;border:1px solid rgba(195,240,255,.16);border-radius:20px;background:rgba(4,12,23,.84);backdrop-filter:blur(18px);color:#f8fbff}.life-map-semantic-inspector span{font-size:10px;color:rgba(214,242,255,.66);text-transform:uppercase;letter-spacing:.12em}.life-map-semantic-inspector h2{margin:0;font-size:clamp(22px,3vw,34px);line-height:.95}.life-map-semantic-inspector p{margin:0;color:rgba(235,246,255,.74);line-height:1.42}.related-paths{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.related-paths button{min-height:38px;border-radius:999px;padding:0 11px;font-size:11px}@media(max-width:760px){.life-map-search-trigger{right:12px;bottom:max(12px,env(safe-area-inset-bottom));opacity:.58}.life-map-navigator{right:12px;bottom:max(68px,calc(env(safe-area-inset-bottom) + 58px));width:calc(100vw - 24px);max-height:64vh}.life-map-semantic-inspector{display:none}}@media(prefers-reduced-motion:reduce){.life-map-search-trigger{transition:none}}
    `}</style>
  </>
}
