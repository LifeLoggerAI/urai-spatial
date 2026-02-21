'use client'

import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const router = useRouter()

  // For now, we'll just have a button to go back to home.
  // This will be replaced by the actual chat UI.
  return (
    <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
      <button onClick={() => router.push('/')}>Close Chat</button>
      <h1>Chat (Coming Soon)</h1>
    </div>
  )
}
