import { explainMemoryPlace } from '@/spatial/explanations/spatialExplanationSchema'
import { filterSpatialExport } from '@/spatial/exports/exportPrivacyFilter'
import { MemoryPlace } from './memoryPlaceSchema'
import { PlaceObject } from './placeObjectSchema'

export function MemoryPlaceInsightPanel({ place, selectedObject }: { place: MemoryPlace; selectedObject?: PlaceObject }) {
  const explanation = selectedObject
    ? explainMemoryPlace({ objectId: selectedObject.id, objectType: selectedObject.objectType, privacyLevel: selectedObject.privacyLevel, source: 'fallback' })
    : undefined

  const exportDecision = filterSpatialExport({
    id: place.id,
    title: place.title,
    privacyLevel: place.privacyLevel,
    locationPrivacy: place.locationPrivacy,
    includeExactCoordinates: false,
    includeLocationLabel: false,
    includePeopleNames: false,
  })

  return (
    <div className="mt-3 grid gap-2 text-xs text-slate-300">
      {explanation ? (
        <div className="rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3">
          <p className="font-semibold text-cyan-100">Why visible</p>
          <p className="mt-1">{explanation.reason}</p>
          <p className="mt-1">Confidence: {explanation.confidence} · Privacy: {explanation.privacyLevel}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="font-semibold text-slate-100">Export status</p>
        <p className="mt-1">{exportDecision.allowed ? 'Safe redacted export available.' : 'Export requires review or confirmation.'}</p>
        <p className="mt-1">Mode: {exportDecision.privacyMode}</p>
      </div>
    </div>
  )
}
