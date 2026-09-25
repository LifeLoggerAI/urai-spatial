'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  validateLivedWorldGraph,
  type ConsentDecisionSnapshot,
  type LivedWorldGraph,
} from '@/spatial/lived-world/livedWorldGraph'
import { revokeDependentPersonalization, type ConsentDecisionMap } from '@/spatial/lived-world/reconstructionPolicy'

const GRAPH_SESSION_KEY = 'urai:lived-world:graph:v1'
const CONSENT_SESSION_KEY = 'urai:lived-world:consent:v1'

type BoundaryState = 'unavailable' | 'generic-fallback' | 'partial' | 'personalized' | 'invalid'

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function readConsent(raw: string | null): ConsentDecisionMap {
  const value = parseJson<Record<string, ConsentDecisionSnapshot>>(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

/**
 * Current fail-closed personalized Ground mount boundary.
 *
 * This layer never substitutes demo/private fixture data. When a trusted lived-
 * world producer is not present, Ground remains navigable through the generic
 * environmental grammar and explicitly reports that it is non-personal.
 */
export default function GroundPersonalizationBoundary() {
  const [state, setState] = useState<BoundaryState>('unavailable')
  const [confirmed, setConfirmed] = useState(0)
  const [partial, setPartial] = useState(0)
  const [suppressed, setSuppressed] = useState(0)
  const [revision, setRevision] = useState('none')

  useEffect(() => {
    const evaluate = () => {
      const graph = parseJson<LivedWorldGraph>(window.sessionStorage.getItem(GRAPH_SESSION_KEY))
      const consent = readConsent(window.sessionStorage.getItem(CONSENT_SESSION_KEY))
      if (!graph) {
        setState('generic-fallback')
        setConfirmed(0); setPartial(0); setSuppressed(0); setRevision('none')
        return
      }
      const errors = validateLivedWorldGraph(graph)
      if (errors.length) {
        setState('invalid')
        setConfirmed(0); setPartial(0); setSuppressed(Object.keys(graph.entities).length); setRevision(graph.sourcePolicyVersion || 'unknown')
        return
      }
      const decisions = revokeDependentPersonalization({ graph, consent })
      const values = Object.values(decisions)
      const confirmedCount = values.filter((decision) => decision.mount === 'personalized').length
      const partialCount = values.filter((decision) => decision.mount === 'partial').length
      const suppressedCount = values.filter((decision) => decision.mount === 'suppressed' || decision.mount === 'generic-fallback').length
      setConfirmed(confirmedCount)
      setPartial(partialCount)
      setSuppressed(suppressedCount)
      setRevision(graph.sourcePolicyVersion || 'unknown')
      setState(confirmedCount > 0 ? 'personalized' : partialCount > 0 ? 'partial' : 'generic-fallback')
    }

    evaluate()
    const onStorage = (event: StorageEvent) => {
      if (event.key === GRAPH_SESSION_KEY || event.key === CONSENT_SESSION_KEY) evaluate()
    }
    const onConsentChanged = () => evaluate()
    window.addEventListener('storage', onStorage)
    window.addEventListener('urai:lived-world-consent-changed', onConsentChanged)
    window.addEventListener('urai:lived-world-graph-changed', onConsentChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('urai:lived-world-consent-changed', onConsentChanged)
      window.removeEventListener('urai:lived-world-graph-changed', onConsentChanged)
    }
  }, [])

  const status = useMemo(() => {
    if (state === 'personalized') return `Personalized Ground authority available: ${confirmed} source-backed, ${partial} partial, ${suppressed} degraded or suppressed.`
    if (state === 'partial') return `Ground contains partial authorized reconstruction. Unknown areas remain non-assertive.`
    if (state === 'invalid') return 'Personalized reconstruction was rejected because its provenance graph was invalid. Generic Ground remains available.'
    return 'No authorized personal reconstruction is mounted. Ground is using a non-personal environmental fallback.'
  }, [confirmed, partial, state, suppressed])

  return (
    <aside
      data-testid="ground-personalization-boundary"
      data-ground-personalization-state={state}
      data-ground-confirmed-entities={confirmed}
      data-ground-partial-entities={partial}
      data-ground-suppressed-entities={suppressed}
      data-ground-source-policy-version={revision}
      data-ground-demo-substitution="forbidden"
      data-ground-unknown-is-first-class="true"
      className="sr-only"
      aria-live="polite"
    >
      {status}
    </aside>
  )
}
