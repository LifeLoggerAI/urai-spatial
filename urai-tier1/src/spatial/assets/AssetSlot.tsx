import type { ReactNode } from 'react'

type AssetSlotProps = {
  slotId: string
  finalModel?: string
  fallback: ReactNode
  className?: string
}

export default function AssetSlot({ slotId, finalModel, fallback, className }: AssetSlotProps) {
  return (
    <div
      className={className}
      data-asset-slot={slotId}
      data-asset-final-model={finalModel ?? ''}
      data-asset-status="placeholder"
    >
      {fallback}
    </div>
  )
}
