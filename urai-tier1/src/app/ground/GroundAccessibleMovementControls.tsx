'use client'

import { useCallback } from 'react'

type Direction = 'forward' | 'left' | 'backward' | 'right'

const KEY_FOR_DIRECTION: Record<Direction, string> = {
  forward: 'KeyW',
  left: 'KeyA',
  backward: 'KeyS',
  right: 'KeyD',
}

const LABEL_FOR_DIRECTION: Record<Direction, string> = {
  forward: 'Move forward',
  left: 'Move left',
  backward: 'Move backward',
  right: 'Move right',
}

function dispatchMovementKey(direction: Direction, phase: 'down' | 'up') {
  const code = KEY_FOR_DIRECTION[direction]
  const key = code.slice(-1).toLowerCase()
  window.dispatchEvent(new KeyboardEvent(phase === 'down' ? 'keydown' : 'keyup', {
    code,
    key,
    bubbles: true,
    cancelable: true,
  }))
}

export default function GroundAccessibleMovementControls() {
  const press = useCallback((direction: Direction) => dispatchMovementKey(direction, 'down'), [])
  const release = useCallback((direction: Direction) => dispatchMovementKey(direction, 'up'), [])

  return (
    <div className="ground-semantic-movement" data-movement-ui="true" role="group" aria-label="Ground first-person movement controls">
      {(['forward', 'left', 'backward', 'right'] as const).map((direction) => (
        <button
          key={direction}
          type="button"
          aria-label={LABEL_FOR_DIRECTION[direction]}
          data-direction={direction}
          onPointerDown={(event) => { event.preventDefault(); press(direction) }}
          onPointerUp={() => release(direction)}
          onPointerCancel={() => release(direction)}
          onPointerLeave={() => release(direction)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            press(direction)
          }}
          onKeyUp={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            release(direction)
          }}
        >
          <span aria-hidden="true">{direction === 'forward' ? '↑' : direction === 'left' ? '←' : direction === 'backward' ? '↓' : '→'}</span>
        </button>
      ))}
      <style jsx>{`
        .ground-semantic-movement{position:fixed;z-index:24;left:max(14px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:5px;pointer-events:none;opacity:.015;transition:opacity .18s ease}
        .ground-semantic-movement:focus-within,.ground-semantic-movement:hover{opacity:1}
        button{width:48px;height:48px;min-width:48px;min-height:48px;border:1px solid rgba(225,245,240,.22);border-radius:16px;background:rgba(5,20,24,.54);color:#f4fbf8;backdrop-filter:blur(10px);pointer-events:auto;touch-action:none;font:800 18px/1 system-ui}
        button[data-direction='forward']{grid-column:2;grid-row:1}
        button[data-direction='left']{grid-column:1;grid-row:2}
        button[data-direction='backward']{grid-column:2;grid-row:2}
        button[data-direction='right']{grid-column:3;grid-row:2}
        button:focus-visible{outline:3px solid #fff;outline-offset:2px;opacity:1}
        @media(max-width:900px),(pointer:coarse){.ground-semantic-movement{opacity:.055}}
        @media(prefers-reduced-motion:reduce){.ground-semantic-movement{transition:none}}
      `}</style>
    </div>
  )
}
