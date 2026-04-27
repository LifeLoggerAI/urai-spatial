import { getApp, getApps } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

export type LifeMapStarWriteInput = {
  userId: string
  starId: string
  patch: Record<string, unknown>
}

export type LifeMapStarWriteResult = {
  ok: true
  id?: string
}

function getFunctionsInstance() {
  const app = getApps().length ? getApp() : getApp()
  return getFunctions(app)
}

export async function writeLifeMapStar(input: LifeMapStarWriteInput): Promise<LifeMapStarWriteResult> {
  if (!input || typeof input !== 'object') {
    throw new Error('writeLifeMapStar: input is required')
  }
  if (!input.userId || typeof input.userId !== 'string') {
    throw new Error('writeLifeMapStar: userId is required')
  }
  if (!input.starId || typeof input.starId !== 'string') {
    throw new Error('writeLifeMapStar: starId is required')
  }
  if (!input.patch || typeof input.patch !== 'object' || Array.isArray(input.patch)) {
    throw new Error('writeLifeMapStar: patch must be an object')
  }

  const fn = httpsCallable<LifeMapStarWriteInput, LifeMapStarWriteResult>(
    getFunctionsInstance(),
    'writeLifeMapStar'
  )

  const res = await fn(input)
  return res.data
}
