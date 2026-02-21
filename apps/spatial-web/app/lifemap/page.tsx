'use client'

import { useRouter } from 'next/navigation'

export default function LifeMapPage() {
  const router = useRouter()

  // This will be replaced by the actual Life Map UI, which will list the stars.
  return (
    <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
      <button onClick={() => router.push('/')}>Back to Home</button>
      <h1>Life Map (Coming Soon)</h1>
      {/* This is a placeholder for a star. Clicking it will take you to the replay page. */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => router.push('/lifemap/1')}>View Star 1 (Replay)</button>
      </div>
    </div>
  )
}
