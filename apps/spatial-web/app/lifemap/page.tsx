'use client'

import dynamic from 'next/dynamic'

// Dynamically import the main canvas component to ensure it's client-side only.
const LifeMapCanvas = dynamic(
  () => import('../../components/lifemap/LifeMapCanvas'),
  { ssr: false },
)

/**
 * The page component for the /lifemap route.
 * This is the entry point for the main URAI spatial experience.
 */
export default function LifeMapPage() {
  return <LifeMapCanvas />
}
