import Link from 'next/link'
import { canEnterMemoryPlace, resolveDemoMemoryStar } from '@/spatial/memory/memoryStarSchema'

type FocusPlaceDoorProps = {
  manifestId?: string | null
}

export function FocusPlaceDoor({ manifestId }: FocusPlaceDoorProps) {
  const resolution = resolveDemoMemoryStar(manifestId)
  if (!resolution.ok) return null

  const star = resolution.star
  const enterPlaceHref = canEnterMemoryPlace(star) ? star.enterPlaceHref : undefined
  if (!enterPlaceHref) return null

  return (
    <aside className="urai-focus-place-door" data-testid="urai-focus-place-door" aria-label="Enter selected memory place">
      <div className="urai-focus-place-door__eyebrow">Memory Place</div>
      <h2>{star.title} has a place.</h2>
      <p>Step through this star into its symbolic memory location. Exact location is not shown by default.</p>
      <div className="urai-focus-place-door__actions">
        <Link className="urai-focus-place-door__primary" href={enterPlaceHref}>
          Enter Place
        </Link>
        <Link href={star.replayHref}>Replay First</Link>
      </div>
      <style jsx>{`
        .urai-focus-place-door {
          position: fixed;
          z-index: 32;
          left: 22px;
          bottom: 82px;
          width: min(390px, calc(100vw - 44px));
          padding: 18px;
          border: 1px solid rgba(103, 232, 249, 0.28);
          border-radius: 22px;
          background: rgba(2, 6, 20, 0.78);
          color: #eaf4ff;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(18px);
        }
        .urai-focus-place-door__eyebrow {
          font-size: 0.67rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #67e8f9;
          font-weight: 800;
        }
        .urai-focus-place-door h2 {
          margin: 8px 0;
          font-size: 1.15rem;
        }
        .urai-focus-place-door p {
          margin: 0 0 14px;
          color: rgba(234, 244, 255, 0.74);
          line-height: 1.45;
        }
        .urai-focus-place-door__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .urai-focus-place-door a {
          border: 1px solid rgba(147, 197, 253, 0.28);
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.62);
          color: #eaf4ff;
          padding: 9px 13px;
          font-weight: 800;
          text-decoration: none;
        }
        .urai-focus-place-door__primary {
          background: rgba(103, 232, 249, 0.18) !important;
          border-color: rgba(103, 232, 249, 0.45) !important;
        }
        @media (max-width: 760px) {
          .urai-focus-place-door {
            left: 12px;
            right: 12px;
            bottom: 158px;
            width: auto;
          }
        }
      `}</style>
    </aside>
  )
}
