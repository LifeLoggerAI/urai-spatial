import { httpsCallable } from 'firebase/functions'
import { functions, firebasePublicEnvReady } from '../firebase/client'

export type LifeMapStarWriteInput = {
  userId: string
  starId: string
  patch: Record<string, unknown>
}

export type LifeMapStarWriteResult = {
  ok: true
  id?: string
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

  // A public configuration or an unrelated default SDK app is not authority
  // to write private Memory Stars to Firebase.
  if (!firebasePublicEnvReady) {
    throw new Error('writeLifeMapStar: Firebase identity is not ready')
  }

  const fn = httpsCallable<LifeMapStarWriteInput, LifeMapStarWriteResult>(
    functions,
    'writeLifeMapStar'
  )

  const res = await fn(input)
  return res.data
}
