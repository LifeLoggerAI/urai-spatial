'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const KEY_BY_DIRECTION = {
  forward: 'KeyW',
  left: 'KeyA',
  backward: 'KeyS',
  right: 'KeyD',
} as const

type Direction = keyof typeof KEY_BY_DIRECTION

function emitMovementKey(direction: Direction, type: 'keydown' | 'keyup') {
  const code = KEY_BY_DIRECTION[direction]
  const key = code.slice(-1).toLowerCase()
  window.dispatchEvent(new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    code,
    key,
  }))
}

export default function HomeAccessibleMovementControls() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const homeRouteActive = normalizedPathname === '/' || normalizedPathname === '/home'
  const [fineDesktop, setFineDesktop] = useState(false)
  const [active, setActive] = useState<Direction | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px) and (pointer: fine)')
    const synchronize = () => setFineDesktop(query.matches)
    synchronize()
    query.addEventListener('change', synchronize)
    return () => query.removeEventListener('change', synchronize)
  }, [])

  useEffect(() => () => {
    if (active) emitMovementKey(active, 'keyup')
  }, [active])

  if (!homeRouteActive || !fineDesktop) return null

  const press = (direction: Direction) => {
    if (active === direction) return
    if (active) emitMovementKey(active, 'keyup')
    setActive(direction)
    emitMovementKey(direction, 'keydown')
  }

  const release = (direction: Direction) => {
    emitMovementKey(direction, 'keyup')
    setActive((current) => current === direction ? null : current)
  }

  const handleKeyDown = (direction: Direction, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (!event.repeat) press(direction)
  }

  const handleKeyUp = (direction: Direction, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    release(direction)
  }

  const movementButtonProps = (direction: Direction) => ({
    'data-active': active === direction,
    'aria-pressed': active === direction,
    onPointerDown: () => press(direction),
    onPointerUp: () => release(direction),
    onPointerCancel: () => release(direction),
    onPointerLeave: () => active === direction && release(direction),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleKeyDown(direction, event),
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => handleKeyUp(direction, event),
    onBlur: () => active === direction && release(direction),
  })

  return (
    <div className="home-accessible-movement" role="group" aria-label="Home movement controls" data-movement-ui="true">
      <button type="button" aria-label="Move forward" {...movementButtonProps('forward')}>↑</button>
      <button type="button" aria-label="Move left" {...movementButtonProps('left')}>←</button>
      <button type="button" aria-label="Move backward" {...movementButtonProps('backward')}>↓</button>
      <button type="button" aria-label="Move right" {...movementButtonProps('right')}>→</button>
      <style jsx>{`
        .home-accessible-movement{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:52;display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:4px;opacity:.08;transition:opacity .18s ease;pointer-events:auto}
        .home-accessible-movement:hover,.home-accessible-movement:focus-within{opacity:1}
        button{width:44px;height:44px;border:1px solid rgba(220,241,236,.24);border-radius:14px;background:rgba(7,18,19,.78);color:#eff9f5;font:800 18px/1 system-ui;backdrop-filter:blur(12px);cursor:pointer;touch-action:none}
        button:first-child{grid-column:2}.home-accessible-movement button:nth-child(2){grid-column:1;grid-row:2}.home-accessible-movement button:nth-child(3){grid-column:2;grid-row:2}.home-accessible-movement button:nth-child(4){grid-column:3;grid-row:2}
        button[data-active="true"],button:focus-visible{background:rgba(35,103,90,.94);outline:3px solid #fff;outline-offset:2px}
        @media(prefers-reduced-motion:reduce){.home-accessible-movement{transition:none}}
      `}</style>
    </div>
  )
}
