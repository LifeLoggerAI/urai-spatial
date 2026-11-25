'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lifeMapTypeLabels, type LifeMapNode, type LifeMapNodeType } from './lifeMapData'
import { requestLifeMapSelection } from './lifeMapSelection'
import { retryPrivateLifeMap, useLifeMapEvents } from './useLifeMapEvents'

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

export default function LifeMapSemanticNavigator({
  authenticatedUserId = null,
  semanticOnly = false,
  sampleFallback = false,
}: { authenticatedUserId?: string | null; semanticOnly?: boolean; sampleFallback?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const explicitDemo = params.get('demo') === '1'
  const overviewRequested = params.get('overview') === '1'
  const { nodes, eras, loading, sourceMode } = useLifeMapEvents(explicitDemo ? 'demo-user' : authenticatedUserId ?? undefined)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<LifeMapNodeType | 'all'>('all')
  const [eraFilter, setEraFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const selectedId = overviewRequested ? null : params.get('node') || params.get('memoryId')
  const selected = nodes.find((node) => node.id === selectedId) || null
  const searchRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null)
  const focusAfterSelection = useRef<string | null>(null)
  const retrying = useRef(false)
  const showSampleSelection = sampleFallback && sourceMode === 'explicit-demo'
  const SelectedHeading = showSampleSelection ? 'h1' : 'h2'
  const privateView = Boolean(authenticatedUserId) && !explicitDemo
  const readFailed = privateView && (sourceMode === 'error' || sourceMode === 'unavailable')
  let readNotice = ''
  if (readFailed) readNotice = 'Your private Life Map could not be loaded.'
  else if (privateView && loading) readNotice = 'Loading your private Life Map…'
  else if (privateView && sourceMode === 'empty') readNotice = 'No Memory Stars are visible in your Life Map.'
  else if (semanticOnly) readNotice = 'The 3D view is unavailable. Use search to explore your Life Map.'

  function retry() {
    noticeRef.current?.focus()
    retrying.current = true
    retryPrivateLifeMap()
  }

  useEffect(() => {
    if (retrying.current && !loading && !readFailed) {
      retrying.current = false
      if (!readNotice && document.activeElement === document.body) triggerRef.current?.focus()
    }
  }, [loading, readFailed, readNotice])

  const closeNavigator = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const visibleNodes = useMemo(
    () => nodes.filter((node) => matchesSearch(node, search) && (typeFilter === 'all' || node.type === typeFilter) && (eraFilter === 'all' || node.eraId === eraFilter)),
    [eraFilter, nodes, search, typeFilter],
  )

  let resultSummary = `${visibleNodes.length} life objects match these filters.`
  if (loading) resultSummary = 'Opening constellation…'
  if (readFailed || (privateView && (loading || sourceMode === 'empty'))) resultSummary = readNotice

  const withIdentity = useCallback((next: URLSearchParams) => {
    if (explicitDemo) next.set('demo', '1')
    const manifestId = params.get('manifestId') || (explicitDemo ? 'replay-recovery-thread' : null)
    if (manifestId) next.set('manifestId', manifestId)
    return next
  }, [explicitDemo, params])

  const commitBrowserIdentity = useCallback((next: URLSearchParams) => {
    const destination = `/life-map?${next.toString()}`
    window.history.replaceState(window.history.state, '', destination)
    return destination
  }, [])

  const selectNode = useCallback((node: LifeMapNode, source: 'semantic' | 'keyboard' | 'pointer' = 'semantic') => {
    if (showSampleSelection && (open || source === 'semantic')) focusAfterSelection.current = node.id
    // Semantic result activation returns focus to the navigator trigger. Global keyboard
    // stepping must not steal focus into that button, otherwise the next Arrow key is
    // correctly ignored by the button-target guard and the selected identity gets stuck.
    if (source === 'semantic') closeNavigator()
    else setOpen(false)
    const next = withIdentity(new URLSearchParams())
    next.set('memoryId', node.id)
    next.set('node', node.id)
    if (node.eraId) next.set('era', node.eraId)

    // Same-route selection identity must become observable before the spatial world begins
    // its potentially expensive camera/render transition.
    const destination = commitBrowserIdentity(next)
    requestLifeMapSelection(node.id, source)

    // Keep the event as the immediate world-animation owner, but always synchronize
    // the same canonical URL through Next as a durable fallback. If the R3F listener
    // is still mounting, the route-param owner restores the selected node at arrival.
    // If the listener already handled the event, localSelectionId preserves the
    // departure/travel/approach sequence and this replace is idempotent.
    router.replace(destination, { scroll: false })
  }, [closeNavigator, commitBrowserIdentity, open, router, showSampleSelection, withIdentity])

  const destinationHref = useCallback((route: 'focus' | 'replay', node: LifeMapNode) => {
    const next = withIdentity(new URLSearchParams())
    next.set('memoryId', node.id)
    next.set('node', node.id)
    next.set('returnNode', node.id)
    next.set('from', 'life-map-semantic')
    return `/${route}?${next.toString()}`
  }, [withIdentity])

  const overview = useCallback(() => {
    setOpen(false)
    const next = withIdentity(new URLSearchParams())
    const current = new URLSearchParams(window.location.search)
    const memoryId = current.get('memoryId')
    const node = current.get('node')
    if (memoryId) next.set('memoryId', memoryId)
    if (node) next.set('node', node)
    next.set('overview', '1')
    commitBrowserIdentity(next)
    router.replace(`/life-map?${next.toString()}`, { scroll: false })
  }, [commitBrowserIdentity, router, withIdentity])

  const step = useCallback((direction: number) => {
    const candidates = visibleNodes.length ? visibleNodes : nodes
    if (!candidates.length) return

    // Browser identity is committed synchronously before the spatial selection transition.
    // Read that live identity at activation time so rapid ArrowRight/ArrowLeft input cannot
    // compute from a stale useSearchParams render and jump to the wrong neighboring memory.
    const currentParams = new URLSearchParams(window.location.search)
    const liveSelectedId = currentParams.get('overview') === '1'
      ? null
      : currentParams.get('node') || currentParams.get('memoryId')
    const fallbackSelectedId = selected?.id || null
    const currentId = liveSelectedId || fallbackSelectedId
    const current = currentId ? candidates.findIndex((node) => node.id === currentId) : -1
    const nextIndex = current >= 0
      ? (current + direction + candidates.length) % candidates.length
      : direction >= 0 ? 0 : candidates.length - 1
    selectNode(candidates[nextIndex], 'keyboard')
  }, [nodes, selectNode, selected, visibleNodes])

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open && showSampleSelection && selectedId && focusAfterSelection.current === selectedId && selectedHeadingRef.current) {
      selectedHeadingRef.current.focus({ preventScroll: true })
      focusAfterSelection.current = null
    }
  }, [open, selectedId, showSampleSelection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape' && open) { event.preventDefault(); closeNavigator(); return }
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return
      // Search controls own their keys while open. World shortcuts must not change
      // the selected memory while someone is navigating filters or reading results.
      if (open) return
      if (event.target instanceof Element && event.target.closest('button,a[href],summary,[role="button"]')) return
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
      if (event.key === 'Home' || event.key.toLowerCase() === 'o') { event.preventDefault(); overview() }
      if (event.key === '/') {
        event.preventDefault()
        setOpen(true)
      }
    }
    const onStepRequest = (event: Event) => {
      const direction = (event as CustomEvent<{ direction?: number }>).detail?.direction
      if (direction === 1 || direction === -1) step(direction)
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('urai:life-map-step', onStepRequest as EventListener)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('urai:life-map-step', onStepRequest as EventListener)
    }
  }, [closeNavigator, open, overview, step])

  const related = selected ? nodes.filter((node) => selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)) : []

  if (!portalReady) return null

  return createPortal(<>
    {readNotice && !open ? <div className="life-map-read-notice" role={semanticOnly ? 'main' : 'region'} aria-label="Private Life Map">
      {semanticOnly ? <h1>Life Map</h1> : <h2>Life Map</h2>}
      <p ref={noticeRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">{readNotice}</p>
      <div className="life-map-read-actions">
        {readFailed ? <button type="button" onClick={retry}>Retry Life Map</button> : null}
        <Link href="/home" prefetch={false}>Return Home</Link>
      </div>
    </div> : null}
    <button
      ref={triggerRef}
      type="button"
      className="life-map-search-trigger"
      data-testid="life-map-semantic-trigger"
      data-life-map-source={sourceMode}
      data-sample-fallback={showSampleSelection || undefined}
      data-life-map-fallback={semanticOnly ? 'authored-semantic' : undefined}
      aria-label="Search and navigate Life Map"
      aria-expanded={open}
      aria-controls={open ? 'life-map-navigator' : undefined}
      onClick={() => { setOpen((value) => !value) }}
    >
      {showSampleSelection ? <span>Search</span> : <><span aria-hidden="true">⌕</span><span className="sr-only">Search life</span></>}
    </button>

    {open ? <section className="life-map-navigator" aria-label="Search and filter Life Map" id="life-map-navigator">
      <header><strong>Search life</strong><button type="button" onClick={closeNavigator} aria-label="Close Life Map search">×</button></header>
      <label htmlFor="life-map-search" className="sr-only">Search memories, people, dates, places, themes, and eras</label>
      <input ref={searchRef} id="life-map-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories, people, places…" />
      <div className="filter-row" role="group" aria-label="Filter by life object type">{TYPE_FILTERS.map((type) => <button key={type} type="button" data-active={typeFilter === type ? 'true' : 'false'} aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)}>{type === 'all' ? 'All' : lifeMapTypeLabels[type]}</button>)}</div>
      <div className="filter-row" role="group" aria-label="Filter by era"><button type="button" data-active={eraFilter === 'all' ? 'true' : 'false'} aria-pressed={eraFilter === 'all'} onClick={() => setEraFilter('all')}>All eras</button>{eras.map((era) => <button key={era.id} type="button" data-active={eraFilter === era.id ? 'true' : 'false'} aria-pressed={eraFilter === era.id} onClick={() => setEraFilter(era.id)}>{era.title}</button>)}</div>
      <p ref={noticeRef} tabIndex={-1} className={readFailed ? 'life-map-read-message' : 'sr-only'} role="status" aria-live="polite">{resultSummary}</p>
      {readFailed ? <button type="button" className="life-map-read-retry" onClick={retry}>Retry Life Map</button> : null}
      <ul className="semantic-results" role="list" aria-label="Visible Life Map objects" data-visible-count={readFailed ? 0 : visibleNodes.length}>
        {readFailed ? null : loading ? <li>Opening constellation…</li> : visibleNodes.length ? visibleNodes.map((node) => <li key={node.id}><button className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id={node.id} aria-label={node.title} aria-current={selected?.id === node.id ? 'true' : undefined} aria-describedby={`life-map-result-${node.id}-details`} type="button" data-selected={selected?.id === node.id ? 'true' : 'false'} onClick={(event) => selectNode(node, event.detail === 0 ? 'keyboard' : 'pointer')}><strong dir="auto">{node.title}</strong><span id={`life-map-result-${node.id}-details`}><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span><small dir="auto">{node.summary}</small></span></button></li>) : <li>{sourceMode === 'empty' ? 'No Memory Stars are visible in your Life Map.' : 'No life objects match these filters.'}</li>}
      </ul>
      <p className="privacy-truth">{sourceMode === 'explicit-demo' ? 'Disclosed sample universe · not your memories' : sourceMode === 'private' ? 'Private universe' : sourceMode}</p>
    </section> : null}

    {selected && (open || showSampleSelection) && !readFailed ? <aside className="life-map-semantic-inspector" data-life-map-source={sourceMode} data-sample-fallback={showSampleSelection || undefined} data-search-open={open} aria-label="Selected life object details">
      <span>{showSampleSelection ? 'Public sample · ' : ''}{lifeMapTypeLabels[selected.type]} · {selected.dateLabel}</span>
      <SelectedHeading ref={selectedHeadingRef} tabIndex={showSampleSelection ? -1 : undefined}>{selected.title}</SelectedHeading>
      <p>{selected.summary}</p>
      <nav className="semantic-thresholds" aria-label="Selected memory destinations">
        <button type="button" disabled={Boolean(selected.locked)} onClick={() => router.push(destinationHref('focus', selected))}>Enter Focus</button>
        <button type="button" disabled={!selected.replayAvailable || selected.locked} onClick={() => router.push(destinationHref('replay', selected))}>Replay</button>
        <button type="button" onClick={overview}>Overview</button>
        {showSampleSelection ? <Link href="/home" prefetch={false}>Return Home</Link> : null}
      </nav>
      {related.length ? <div className="related-paths"><strong>Connected</strong>{related.slice(0, 4).map((node) => <button key={node.id} type="button" onClick={() => selectNode(node)}>{node.title}</button>)}</div> : null}
    </aside> : null}

    <style jsx global>{`
      .life-map-search-trigger{position:fixed;z-index:2147483600;left:auto;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:48px;height:48px;box-sizing:border-box;border:1px solid rgba(205,240,255,.22);border-radius:50%;background:rgba(3,10,20,.58);color:rgba(238,251,255,.82);font:700 21px/1 system-ui;backdrop-filter:blur(16px);box-shadow:0 12px 38px rgba(0,0,0,.28);cursor:pointer;opacity:.48;transition:opacity .2s ease,background .2s ease}.life-map-search-trigger:hover,.life-map-search-trigger:focus-visible,.life-map-search-trigger[aria-expanded='true']{opacity:1;background:rgba(4,16,29,.92);outline:none}.life-map-navigator{box-sizing:border-box;position:fixed;z-index:2147483601;right:max(18px,env(safe-area-inset-right));bottom:max(78px,calc(env(safe-area-inset-bottom) + 66px));width:min(420px,calc(100vw - 36px));display:grid;gap:12px;max-height:min(70vh,720px);padding:16px;border:1px solid rgba(195,240,255,.2);border-radius:22px;background:rgba(2,7,18,.92);backdrop-filter:blur(24px);color:#f8fbff;box-shadow:0 24px 80px rgba(0,0,0,.46)}.life-map-navigator header{display:flex;align-items:center;justify-content:space-between}.life-map-navigator header strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase}.life-map-navigator header button{width:48px;height:48px;border:0;border-radius:50%;background:rgba(255,255,255,.05);color:#fff;font-size:22px;cursor:pointer}.life-map-navigator input{min-height:48px;border:1px solid rgba(205,244,255,.2);border-radius:16px;background:rgba(6,17,29,.95);color:#fff;padding:0 14px;font:inherit}.filter-row{display:flex;gap:7px;overflow:auto;padding-bottom:2px}.filter-row button,.life-map-navigator .semantic-results button,.life-map-semantic-inspector button{border:1px solid rgba(220,248,255,.18);background:rgba(10,25,40,.86);color:#f8fbff;font:inherit;cursor:pointer}.filter-row button{min-height:48px;min-width:48px;border-radius:999px;white-space:nowrap;padding:0 12px;font-size:11px}.filter-row button[data-active='true']{border-color:rgba(221,250,255,.72);background:rgba(24,67,88,.9)}.semantic-results{display:grid;gap:8px;overflow:auto}.semantic-results>li>button{min-height:62px;display:grid;gap:3px;text-align:left;padding:10px 13px;border-radius:14px}.semantic-results>li>button[data-selected='true']{border-color:rgba(221,250,255,.72);background:rgba(18,58,78,.9)}.semantic-results span,.semantic-results small{color:rgba(225,243,255,.66)}.semantic-results small{line-height:1.3}.privacy-truth{margin:0;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(194,244,255,.62)}.life-map-semantic-inspector{box-sizing:border-box;position:fixed;z-index:2147483601;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 36px));display:grid;gap:10px;padding:16px;border:1px solid rgba(195,240,255,.16);border-radius:20px;background:rgba(4,12,23,.84);backdrop-filter:blur(18px);color:#f8fbff}.life-map-semantic-inspector span{font-size:10px;color:rgba(214,242,255,.66);text-transform:uppercase;letter-spacing:.12em}.life-map-semantic-inspector h2{margin:0;font-size:clamp(22px,3vw,34px);line-height:.95}.life-map-semantic-inspector p{margin:0;color:rgba(235,246,255,.74);line-height:1.42}.semantic-thresholds,.related-paths{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.semantic-thresholds button,.related-paths button{min-height:48px;min-width:48px;border-radius:999px;padding:0 11px;font-size:11px}.semantic-thresholds button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:760px){.life-map-search-trigger{left:auto;right:12px;top:max(12px,env(safe-area-inset-top));bottom:auto;transform:none;margin:0;opacity:.58}.life-map-navigator{right:12px;top:max(68px,calc(env(safe-area-inset-top) + 58px));bottom:auto;width:calc(100vw - 24px);max-height:min(64vh,calc(100svh - 84px))}.life-map-semantic-inspector{display:none}}@media(prefers-reduced-motion:reduce){.life-map-search-trigger{transition:none}}
    `}</style>
  </>, document.body)
}
