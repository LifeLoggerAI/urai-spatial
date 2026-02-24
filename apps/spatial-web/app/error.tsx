'use client'

import { useEffect } from 'react'

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error)
    const crashCount = Number(localStorage.getItem('crashCount') || 0)
    localStorage.setItem('crashCount', String(crashCount + 1))
  }, [error])

  return (
    <div style={{ color: 'white', padding: '2rem' }}>
      <h2>Something went wrong!</h2>
      <p>An error occurred, and we are logging it. Please refresh the page.</p>
    </div>
  )
}
