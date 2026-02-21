'use client'

import { useRouter } from 'next/navigation'

export default function GroundPage() {
  const router = useRouter()

  return (
    <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
      <button onClick={() => router.push('/')}>Back to Home</button>
      <h1>Ground View (Coming Soon)</h1>
    </div>
  )
}
