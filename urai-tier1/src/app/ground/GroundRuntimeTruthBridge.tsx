'use client'

import { useEffect } from 'react'

const GRAPH_SESSION_KEY = 'urai:lived-world:graph:v1'
const BRIDGE_POLICY_PREFIX = 'geographic-vault:'

function hasAuthorizedGeographicGraph() {
  try {
    const raw = window.sessionStorage.getItem(GRAPH_SESSION_KEY)
    if (!raw) return false
    const graph = JSON.parse(raw) as { sourcePolicyVersion?: string; entities?: Record<string, { kind?: string }> }
    if (!graph.sourcePolicyVersion?.startsWith(BRIDGE_POLICY_PREFIX)) return false
    return Object.values(graph.entities ?? {}).some((entity) => entity?.kind === 'place')
  } catch {
    return false
  }
}

/** Keeps active Ground DOM truth aligned with the fail-closed lived-world bridge. */
export default function GroundRuntimeTruthBridge() {
  useEffect(() => {
    const sync = () => {
      const root = document.querySelector<HTMLElement>('[data-testid="urai-ground-lived-world"]')
      if (!root) return
      const privatePlacesMounted = hasAuthorizedGeographicGraph()
      root.setAttribute('data-ground-private-location-mounted', privatePlacesMounted ? 'partial-place-anchors' : 'false')
      root.setAttribute('data-ground-orb-presence', 'semantic-only-no-follower-model')

      const status = root.querySelector<HTMLElement>('[role="status"][aria-live]')
      if (!status || root.getAttribute('data-ground-ready') !== 'true') return
      const profile = root.getAttribute('data-ground-environment-profile') ?? 'physical'
      status.textContent = privatePlacesMounted
        ? `${profile} Ground is ready for first-person exploration with authorized partial place anchors. UrAi remains semantically available; no follower Orb model is mounted.`
        : `${profile} Ground is ready for first-person exploration. No private place reconstruction is mounted. UrAi remains semantically available; no follower Orb model is mounted.`
    }

    sync()
    const root = document.querySelector<HTMLElement>('[data-testid="urai-ground-lived-world"]')
    const observer = root ? new MutationObserver(sync) : null
    observer?.observe(root!, { attributes: true, attributeFilter: ['data-ground-ready', 'data-ground-environment-profile'] })
    window.addEventListener('urai:lived-world-graph-changed', sync)
    return () => {
      observer?.disconnect()
      window.removeEventListener('urai:lived-world-graph-changed', sync)
    }
  }, [])

  return null
}
