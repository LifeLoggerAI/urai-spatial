import type { User } from 'firebase/auth'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import type { LifeMovieRuntimeManifest } from './lifeMovieRuntimeContract'

/** Data fetched for one owner, movie selection, and exact governed manifest. */
export type BoundLifeMovieMemories = {
  actor: User
  movieId: string | null
  selectedMemoryId: string | null
  manifest: LifeMovieRuntimeManifest | null
  memories: SelectedMemory[]
}

/** A previous movie or Firebase actor can never own the current render.
 * Returning null (rather than []) distinguishes stale authority from an
 * authenticated empty sequence and prevents old scenes from being exposed
 * during the render preceding React effect cleanup. */
export function currentLifeMovieMemories(
  bound: BoundLifeMovieMemories | null,
  actor: User | null | undefined,
  liveActor: User | null,
  movieId: string | null,
  selectedMemoryId: string | null,
  manifest: LifeMovieRuntimeManifest | null,
): SelectedMemory[] | null {
  if (!bound || !actor || liveActor !== actor || bound.actor !== actor
    || actor.uid !== bound.actor.uid || bound.movieId !== movieId
    || bound.selectedMemoryId !== selectedMemoryId
    || (movieId !== null && (!manifest || bound.manifest !== manifest))) return null
  return bound.memories
}
