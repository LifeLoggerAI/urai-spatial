import { Chapter } from "../state/useChapterStore"
import { Insight } from "../state/useInsightStore"
import { Star } from "../types"

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function variance(values: number[]): number {
  if (!values.length) return 0
  const avg = average(values)
  const diffs = values.map(v => (v - avg) ** 2)
  return average(diffs)
}

export function generateChapterInsight(
  chapter: Chapter,
  stars: Star[]
): Insight | null {

  if (!chapter.starIds.length) return null

  const chapterStars = stars.filter(s =>
    chapter.starIds.includes(s.id)
  )

  if (!chapterStars.length) return null

  const intensities = chapterStars.map(s => s.intensity || 0)

  const avgIntensity = average(intensities)
  const varIntensity = variance(intensities)

  let message = ""

  if (avgIntensity > 0.75 && varIntensity > 0.25) {
    message =
      "This interval reflects sustained intensity with elevated internal variance."
  }
  else if (varIntensity > 0.35) {
    message =
      "Signal fluctuation increases during this period, indicating structural instability."
  }
  else if (avgIntensity < 0.4) {
    message =
      "Emotional amplitude narrows here, suggesting reduced signal density."
  }
  else {
    message =
      "This chapter maintains relative equilibrium with moderate variation."
  }

  return {
    id: `chapter-${chapter.chapterId}`,
    type: "chapter",
    message,
    timestamp: Date.now()
  }
}

export function generateReplayInsight(
  star: Star
): Insight | null {

  if (!star) return null

  const intensity = star.intensity ?? 0

  let message = ""

  if (intensity > 0.8) {
    message =
      "This moment registers high signal intensity with concentrated emotional amplitude."
  }
  else if (intensity < 0.3) {
    message =
      "This event reflects low amplitude signaling with minimal volatility."
  }
  else {
    message =
      "This moment maintains moderate intensity with contained variance."
  }

  return {
    id: `replay-${star.id}`,
    type: "replay",
    message,
    timestamp: Date.now()
  }
}