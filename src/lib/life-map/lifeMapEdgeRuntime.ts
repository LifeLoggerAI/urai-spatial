import { LifeMapEdge, LifeMapNode } from '@/lib/life-map/lifeMapTypes'

const EMOTION_PROGRESSION_ORDER: Record<LifeMapNode['emotionalTone'], number> = {
  pain: 0,
  shadow: 1,
  dreamy: 2,
  calm: 3,
  clarity: 4,
  purpose: 5,
  healing: 6,
  rebirth: 7,
}

const chapterRank = (chapterId?: string): number => {
  if (!chapterId) return Number.MAX_SAFE_INTEGER
  const match = chapterId.match(/(\d+)/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

export interface LifeMapEdgeRuntimeState {
  isDirectionForward: boolean
  canAnimateFlow: boolean
  flowOpacity: number
  strokeOpacity: number
}

export function resolveEdgeDirection(source: LifeMapNode, target: LifeMapNode): boolean {
  const sourceChapter = chapterRank(source.chapterId)
  const targetChapter = chapterRank(target.chapterId)
  if (sourceChapter !== targetChapter) return sourceChapter <= targetChapter

  const sourceEmotion = EMOTION_PROGRESSION_ORDER[source.emotionalTone]
  const targetEmotion = EMOTION_PROGRESSION_ORDER[target.emotionalTone]
  if (sourceEmotion !== targetEmotion) return sourceEmotion <= targetEmotion

  return source.timestamp <= target.timestamp
}

export function resolveEdgeRuntimeState({
  edge,
  source,
  target,
  reducedMotion,
}: {
  edge: LifeMapEdge
  source: LifeMapNode
  target: LifeMapNode
  reducedMotion: boolean
}): LifeMapEdgeRuntimeState {
  const sourceIsActive = source.visualState === 'active'
  const targetIsActive = target.visualState === 'active'
  const sourceIsGlowing = source.visualState === 'highlighted' || source.importanceScore >= 0.75
  const targetIsGlowing = target.visualState === 'highlighted' || target.importanceScore >= 0.75
  const isConnected = sourceIsActive || targetIsActive || sourceIsGlowing || targetIsGlowing
  const isDirectionForward = resolveEdgeDirection(source, target)
  const canAnimateFlow = !reducedMotion && isConnected

  return {
    isDirectionForward,
    canAnimateFlow,
    flowOpacity: reducedMotion ? 0 : 0.45,
    strokeOpacity: reducedMotion ? 0.65 : 0.45,
  }
}
