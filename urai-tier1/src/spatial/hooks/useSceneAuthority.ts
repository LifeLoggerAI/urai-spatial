'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  INITIAL_TIER1_STATE,
  tier1Reducer,
  resolveEscTarget,
  type Tier1Mode,
} from '@/lib/uraiCanon/state'
import { STAR_DATA } from '@/lib/uraiCanon/starData'
import { resolveTransitionDuration } from '@/spatial/canon/transitionTimingCanon'

type StarLike = {
  id: string
  position?: [number, number, number]
  x?: number
  y?: number
  z?: number
  size?: number
  tone?: string
  color?: string
  intensity?: number
  [key: string]: unknown
}

function isStarLike(value: unknown): value is StarLike {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>).id === 'string'
  )
}

function normalizeStarId(input: unknown): string | null {
  if (typeof input === 'string' && input.trim()) return input.trim()
  if (isStarLike(input)) return input.id
  return null
}

function toPosition(star: StarLike, idx: number): [number, number, number] {
  if (Array.isArray(star.position) && star.position.length === 3) {
    return [
      Number(star.position[0]) || 0,
      Number(star.position[1]) || 0,
      Number(star.position[2]) || (-12 - idx * 4),
    ]
  }

  return [
    Number(star.x) || 0,
    Number(star.y) || 0,
    Number(star.z) || (-12 - idx * 4),
  ]
}

function normalizeStar(star: StarLike, idx: number): StarLike {
  let replayEnterTime: number | null = null;
  return {
    ...star,
    id: typeof star.id === 'string' && star.id.trim() ? star.id.trim() : `star-${idx + 1}`,
    position: toPosition(star, idx),
    size: typeof star.size === 'number' ? star.size : 0.08,
    tone:
      typeof star.tone === 'string'
        ? star.tone
        : typeof star.color === 'string'
          ? star.color
          : '#dfe8ff',
    intensity: typeof star.intensity === 'number' ? star.intensity : 1,
  }
}

function extractStars(input?: unknown): StarLike[] {
  const raw: unknown[] = Array.isArray(input)
    ? input
    : input && typeof input === 'object' && Array.isArray((input as { stars?: unknown[] }).stars)
      ? ((input as { stars?: unknown[] }).stars ?? [])
      : (STAR_DATA as unknown[])

  return raw.filter(isStarLike).map((star, idx) => normalizeStar(star, idx))
}

export function useSceneAuthority(input?: unknown) {
  const stars = useMemo(() => extractStars(input), [input])
  const [state, dispatch] = useReducer(tier1Reducer, INITIAL_TIER1_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!state.transitionPhase) return

    const durationMs = resolveTransitionDuration(state.transitionPhase)

    if (state.transitionPhase === 'ascent') {
      timerRef.current = setTimeout(() => dispatch({ type: 'ARRIVE_LIFEMAP' }), durationMs)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    timerRef.current = setTimeout(() => dispatch({ type: 'END_TRANSITION' }), durationMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state.transitionPhase])

  const hoveredStar = useMemo(
    () => stars.find((s) => s.id === state.hoveredStarId) ?? null,
    [stars, state.hoveredStarId]
  )

  const selectedStar = useMemo(
    () => stars.find((s) => s.id === state.selectedStarId) ?? null,
    [stars, state.selectedStarId]
  )

  const replayStar = useMemo(
    () => stars.find((s) => s.id === state.replayStarId) ?? null,
    [stars, state.replayStarId]
  )

  const beginAscent = useCallback(() => dispatch({ type: 'BEGIN_ASCENT' }), [])
  const setHoveredStar = useCallback((value: unknown) => {
    dispatch({ type: 'SET_HOVERED_STAR', starId: normalizeStarId(value) })
  }, [])
  const openFocus = useCallback((value: unknown) => {
    const starId = normalizeStarId(value)
    if (!starId) return
    dispatch({ type: 'OPEN_FOCUS', starId })
  }, [])
  const openReplay = useCallback((value?: unknown) => {
    dispatch({ type: 'OPEN_REPLAY', starId: normalizeStarId(value) })
  }, [])
  const closeReplay = useCallback(() => dispatch({ type: 'CLOSE_REPLAY' }), [])
  const closeFocus = useCallback(() => dispatch({ type: 'CLOSE_FOCUS' }), [])
  const goHome = useCallback(() => dispatch({ type: 'GO_HOME' }), [])
  const esc = useCallback(() => dispatch({ type: 'ESCAPE' }), [])

  const canInteract = !state.transitionLock && state.mode !== 'ascent'

  const authorityActions = {
    beginAscent,
    startAscent: beginAscent,
    openLifeMap: beginAscent,
    setHoveredStar,
    hoverStar: setHoveredStar,
    openFocus,
    setSelectedStar: openFocus,
    selectStar: openFocus,
    openReplay,
    enterReplay: openReplay,
    closeReplay,
    closeFocus,
    goHome,
    returnHome: goHome,
    esc,
    escape: esc,
  }

  const result = {
    ...state,
    stars,
    phase: state.mode as Tier1Mode,
    sceneMode: state.mode as Tier1Mode,
    viewMode: state.mode as Tier1Mode,
    hoveredStar,
    normalizedHoveredStar: hoveredStar,
    selectedStar,
    normalizedSelectedStar: selectedStar,
    replayStar,
    selectedStarNode: selectedStar,
    replayStarNode: replayStar,
    isHome: state.mode === 'home',
    isAscent: state.mode === 'ascent',
    isLifeMap: state.mode === 'lifemap',
    isFocus: state.mode === 'focus',
    isReplay: state.mode === 'replay',
    focusOpen: state.mode === 'focus',
    replayOpen: state.mode === 'replay',
    isTransitioning: state.transitionLock || state.transitioning,
    inputLocked: !canInteract,
    canInteract,
    unwindTarget: resolveEscTarget(state.mode),
    dispatch,
    actions: authorityActions,
    authorityActions,
    beginAscent,
    startAscent: beginAscent,
    openLifeMap: beginAscent,
    setHoveredStar,
    hoverStar: setHoveredStar,
    openFocus,
    setSelectedStar: openFocus,
    selectStar: openFocus,
    openReplay,
    enterReplay: openReplay,
    closeReplay,
    closeFocus,
    goHome,
    returnHome: goHome,
    esc,
    escape: esc,
  }

  let replayEnterTime: number | null = null;
  return {
    ...result,
    authority: result,
  }
}

export default useSceneAuthority
