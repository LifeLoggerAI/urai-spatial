'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'

type Phase = 'home' | 'lifemap' | 'focus' | 'replay'

export default function SpatialScene() {
const [phase, setPhase] = useState<Phase>('home')

useEffect(() => {
const onKey = (e: KeyboardEvent) => {
if (e.key === 'Escape') {
if (phase === 'replay') setPhase('focus')
else if (phase === 'focus') setPhase('lifemap')
else if (phase === 'lifemap') setPhase('home')
}
}
window.addEventListener('keydown', onKey)
return () => window.removeEventListener('keydown', onKey)
}, [phase])

return (
<div style={{ width: '100vw', height: '100vh', background: 'black' }}>
<Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
{phase === 'home' && <Home onEnter={() => setPhase('lifemap')} />}
{phase === 'lifemap' && <LifeMap onSelect={() => setPhase('focus')} />}
{phase === 'focus' && <Focus onEnter={() => setPhase('replay')} />}
{phase === 'replay' && <Replay />} </Canvas> </div>
)
}

function Home({ onEnter }: { onEnter: () => void }) {
return ( <mesh onClick={onEnter}>
<sphereGeometry args={[1, 32, 32]} /> <meshBasicMaterial color="white" /> </mesh>
)
}

function LifeMap({ onSelect }: { onSelect: () => void }) {
return ( <mesh onClick={onSelect}>
<boxGeometry args={[1, 1, 1]} /> <meshBasicMaterial color="blue" /> </mesh>
)
}

function Focus({ onEnter }: { onEnter: () => void }) {
return ( <mesh onClick={onEnter}>
<coneGeometry args={[1, 2, 32]} /> <meshBasicMaterial color="red" /> </mesh>
)
}

function Replay() {
return ( <mesh>
<torusGeometry args={[1, 0.4, 16, 100]} /> <meshBasicMaterial color="green" /> </mesh>
)
}
