import { getApp, getApps } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type { LifeMapStarInput } from '@/lib/uraiCanon/lifemapStar'

export async function writeLifeMapStar(payload: LifeMapStarInput) {
  const app = getApps().length ? getApp() : undefined
  if (!app) {
    throw new Error('Firebase app is not initialized')
  }

  const functions = getFunctions(app)
  const fn = httpsCallable(functions, 'writeLifeMapStar')
  const result = await fn(payload)

  return result.data as {
    ok: boolean
    id: string
    mode: 'created' | 'updated'
  }
}
