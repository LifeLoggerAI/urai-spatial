'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type LifeMapNavigationState = {
  zoom: number
  panX: number
  panY: number
  activeDepth: 'overview' | 'chapter' | 'memory'
}

type Props = {
  enabled: boolean
  sceneMode: string
  selected: boolean
  onChange: (state: LifeMapNavigationState) => void
  onReset: () => void
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function depthForZoom(zoom: number): LifeMapNavigationState['activeDepth'] {
  if (zoom >= 1.72) return 'memory'
  if (zoom >= 1.28) return 'chapter'
  return 'overview'
}

export default function LifeMapNavigationOverlay({ enabled, sceneMode, selected, onChange, onReset }: Props) {
  const [state, setState] = useState<LifeMapNavigationState>({ zoom: selected ? 1.7 : 1, panX: 0, panY: 0, activeDepth: selected ? 'memory' : 'overview' })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)

  const live = enabled && (sceneMode === 'life-map' || sceneMode === 'demo')

  useEffect(() => {
    if (!live) return
    const nextZoom = selected ? Math.max(state.zoom, 1.58) : state.zoom
    const next = { ...state, zoom: nextZoom, activeDepth: depthForZoom(nextZoom) }
    setState(next)
    onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, live])

  useEffect(() => {
    onChange(state)
  }, [onChange, state])

  const hint = useMemo(() => {
    if (!live) return ''
    if (state.activeDepth === 'memory') return 'Memory bloom: the nearest star is ready for focus, replay, and reflection.'
    if (state.activeDepth === 'chapter') return 'Chapter field: constellation arcs show recovery, ritual, threshold, relationship, and Council guide lights.'
    return 'Life horizon: your current region glows first, with softer stars held in the surrounding memory atmosphere.'
  }, [live, state.activeDepth])

  if (!live) return null

  function commit(next: Partial<LifeMapNavigationState>) {
    setState((current) => {
      const zoom = clamp(next.zoom ?? current.zoom, 0.82, 2.25)
      const panLimit = 1.9 * zoom
      const panX = clamp(next.panX ?? current.panX, -panLimit, panLimit)
      const panY = clamp(next.panY ?? current.panY, -panLimit * 0.65, panLimit * 0.65)
      return { zoom, panX, panY, activeDepth: depthForZoom(zoom) }
    })
  }

  function reset() {
    const next: LifeMapNavigationState = { zoom: 1, panX: 0, panY: 0, activeDepth: 'overview' }
    setState(next)
    onChange(next)
    onReset()
  }

  return (
    <div className="urai-lifemap-navigation" data-testid="urai-lifemap-navigation" data-depth={state.activeDepth} aria-label="Life Map time lens and memory explanation">
      <div
        className="urai-lifemap-navigation__gesture"
        role="application"
        aria-label="Life Map zoom and pan surface. Use arrow keys to move, plus and minus to zoom, R to reset, and Escape to unwind."
        tabIndex={0}
        onWheel={(event) => {
          event.preventDefault()
          commit({ zoom: state.zoom + (event.deltaY < 0 ? 0.12 : -0.12) })
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === 'touch') {
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY }
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          commit({ panX: drag.panX + (event.clientX - drag.x) / 220, panY: drag.panY - (event.clientY - drag.y) / 220 })
        }}
        onPointerUp={() => {
          dragRef.current = null
          pinchRef.current = null
        }}
        onPointerCancel={() => {
          dragRef.current = null
          pinchRef.current = null
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 2) return
          const [a, b] = Array.from(event.touches)
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
          if (!pinchRef.current) pinchRef.current = { distance, zoom: state.zoom }
          const factor = distance / Math.max(1, pinchRef.current.distance)
          commit({ zoom: pinchRef.current.zoom * factor })
        }}
        onDoubleClick={() => commit({ zoom: state.zoom < 1.45 ? 1.72 : 1 })}
        onKeyDown={(event) => {
          if (event.key === '+') commit({ zoom: state.zoom + 0.15 })
          if (event.key === '-') commit({ zoom: state.zoom - 0.15 })
          if (event.key === 'ArrowLeft') commit({ panX: state.panX + 0.16 })
          if (event.key === 'ArrowRight') commit({ panX: state.panX - 0.16 })
          if (event.key === 'ArrowUp') commit({ panY: state.panY - 0.16 })
          if (event.key === 'ArrowDown') commit({ panY: state.panY + 0.16 })
          if (event.key.toLowerCase() === 'r') reset()
        }}
      />

      <div className="urai-lifemap-navigation__hud" aria-live="polite">
        <strong>{state.activeDepth === 'overview' ? 'Life Horizon' : state.activeDepth === 'chapter' ? 'Chapter Constellation' : 'Memory Bloom'}</strong>
        <span>{hint}</span>
        <p className="urai-lifemap-navigation__why">
          <span>Why am I seeing this?</span>
          URAI is showing a public-safe local memory galaxy: emotional nebulae, recovery paths, ritual and threshold markers, relationship clusters, and Council guide lights are weighted around the current region first.
        </p>
        <div className="urai-lifemap-navigation__controls" aria-label="Minimal Life Map time lens">
          <button type="button" onClick={() => commit({ zoom: state.zoom - 0.16 })} aria-label="Pull back in the Life Map">−</button>
          <output aria-label="Life Map zoom level">{Math.round(state.zoom * 100)}%</output>
          <button type="button" onClick={() => commit({ zoom: state.zoom + 0.16 })} aria-label="Move closer in the Life Map">+</button>
          <button type="button" onClick={reset}>Return horizon</button>
        </div>
      </div>
    </div>
  )
}
