'use client'

import { useEffect, useRef } from 'react'
import { useChapterStore } from '../state/useChapterStore'
import { useInsightStore } from '../state/useInsightStore'
import { useReplayStore } from '../state/useReplayStore'
import { generateChapterInsight, generateReplayInsight } from '../intelligence/InsightEngine'
import { useStarStore } from '../state/star-store'

export default function InsightController() {
  const chapters = useChapterStore((s) => s.chapters)
  const activeChapterId = useChapterStore((s) => s.activeChapterId)
  const activeStarId = useReplayStore((s) => s.activeStarId)
  const stars = useStarStore((s) => s.stars)

  const {
    enabled,
    setInsights,
    clearInsights,
    setVisible
  } = useInsightStore()

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    clearInsights()

    let insight = null

    if (activeStarId) {
      const activeStar = stars.find(s => s.id === activeStarId)
      if (activeStar) {
        insight = generateReplayInsight(activeStar)
      }
    } else if (activeChapterId) {
      const activeChapter = chapters.find(
        (c) => c.chapterId === activeChapterId
      )
      if (activeChapter) {
        insight = generateChapterInsight(activeChapter)
      }
    }

    if (!insight) return

    // Delay before reveal
    timerRef.current = setTimeout(() => {
      setInsights([insight])
      setVisible(true)

      // Auto-hide after duration
      timerRef.current = setTimeout(() => {
        setVisible(false)

        // Clear after fade out
        setTimeout(() => {
          clearInsights()
        }, 1200)

      }, 7000)

    }, 1800)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }

  }, [enabled, activeChapterId, activeStarId, chapters, stars])

  return null
}
