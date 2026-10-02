'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'

type LifeMovieChapterRequest = {
  id: string
  memoryId: string
  order: number
}

type UpsertResult = {
  movieId: string
  status: 'draft' | 'ready'
  chapterCount: number
}

type RevokeResult = {
  movieId: string
  revoked: true
}

export async function saveLifeMovieManifest(input: {
  movieId: string
  status: 'draft' | 'ready'
  chapters: LifeMovieChapterRequest[]
}) {
  const callable = httpsCallable<typeof input, UpsertResult>(functions, 'upsertLifeMovieManifest')
  const result = await callable(input)
  return result.data
}

export async function revokeLifeMovieManifest(movieId: string) {
  const callable = httpsCallable<{ movieId: string }, RevokeResult>(functions, 'revokeLifeMovieManifest')
  const result = await callable({ movieId })
  return result.data
}
