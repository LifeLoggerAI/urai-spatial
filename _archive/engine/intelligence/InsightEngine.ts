import { Chapter } from "../state/useChapterStore"
import { Insight } from "../state/useInsightStore"
import { Star } from "../types"

function average(values: number[]): number {
  if (values.length === 0) return 0

  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
  }

  return sum / values.length
}

function variance(values: number[]): number {
  if (values.length === 0) return 0

  const avg = average(values)

  let total = 0
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - avg
    total += diff * diff
  }

  return total / values.length
}

export function generateChapterInsight(
  chapter: Chapter,
  stars: Star[]
): Insight | null {

  if (!chapter?.starIds?.length) return null

  const starSet = new Set(chapter.starIds)

  const chapterStars = stars.filter(s => starSet.has(s.id))

  if (chapterStars.length === 0) return null

  const intensities = chapterStars
    .map(s => typeof s.intensity === "number" ? s.intensity : 0)
    .filter(v => !Number.isNaN(v))

  if (intensities.length === 0) return null

  const avgIntensity = average(intensities)
  const varIntensity = variance(intensities)

  let message: string

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

  const intensity =
    typeof star.intensity === "number"
      ? star.intensity
      : 0

  let message: string

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
    timestamp: star.timestamp ?? Date.now()
  }
}