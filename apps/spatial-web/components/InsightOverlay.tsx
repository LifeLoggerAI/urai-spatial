'use client'

import { useInsightStore } from '@/engine/state/useInsightStore'

export default function InsightOverlay() {
  const { enabled, insights, visible } = useInsightStore()

  if (!enabled || !insights.length) return null

  return (
    <div
      className={`absolute left-8 bottom-8 max-w-sm text-white text-sm transition-opacity duration-1200 ${
        visible ? 'opacity-70' : 'opacity-0'
      }`}
    >
      <div className="mb-2 text-xs tracking-wide opacity-50">
        Insight
      </div>
      <div>{insights[0].message}</div>
    </div>
  )
}
