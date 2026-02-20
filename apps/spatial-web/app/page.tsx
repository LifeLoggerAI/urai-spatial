'use client'

import { Suspense } from 'react'

// Placeholder for a proper AppShell and layout components
const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '2rem', background: '#0a0a0a', color: 'white', minHeight: '100vh' }}>
    <nav style={{ marginBottom: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>URAI</h1>
      {/* Navigation would go here */}
    </nav>
    <main>{children}</main>
  </div>
)

// Placeholder for data fetching hook. This will be replaced with a real Firestore hook.
const useUserData = () => {
  // Simulate a loading state and no data for now to test fallbacks
  return {
    loading: false,
    error: null,
    // data: null, // Start with null data to test the empty state
    data: {
      auraState: 'Calm',
      moodSummary: 'Centered',
      latestInsight: 'The journey begins with a single step.',
    },
  }
}

function HomeContent() {
  const { loading, error, data } = useUserData()

  if (loading) {
    return <div>Loading user state...</div>
  }

  if (error || !data) {
    return (
      <div>
        <h2>Welcome</h2>
        <p>Your journey awaits. We are preparing your space.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Home</h2>
      <div>
        <p><strong>Aura:</strong> {data.auraState}</p>
        <p><strong>Rhythm:</strong> {data.moodSummary}</p>
        <p><strong>Latest Whisper:</strong> {data.latestInsight}</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AppShell>
      <Suspense fallback={<div>Loading...</div>}>
        <HomeContent />
      </Suspense>
    </AppShell>
  )
}
