'use client'

export function ReplayReturnControl({ onReturnToFocus }: { onReturnToFocus: () => void }) {
  return (
    <button type="button" className="urai-replay-return-control" data-testid="urai-replay-return-control" onClick={onReturnToFocus}>
      Return to Focus
    </button>
  )
}
