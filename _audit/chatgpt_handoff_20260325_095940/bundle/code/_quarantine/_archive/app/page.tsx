'use client'

import { useState } from 'react'
import SpatialScene from '@/spatial/scene/SpatialScene'

export default function Page() {

  const [entered, setEntered] = useState(false)

  return (
    <div className="w-screen h-screen bg-black">
      {!entered ? (
        <button
          onClick={() => setEntered(true)}
          className="absolute top-4 left-4 z-10 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Enter LifeMap
        </button>
      ) : (
        <SpatialScene />
      )}
    </div>
  )
}