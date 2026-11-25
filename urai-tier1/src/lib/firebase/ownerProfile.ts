import type { User } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { getFirebaseDb, getUrAiAuth } from './client'

const pending = new WeakMap<User, Promise<void>>()

/** Establish identity only; never write consent, memory or privileged fields. */
export function ensureOwnerProfile(owner: User): Promise<void> {
  const auth = getUrAiAuth()
  if (!owner.uid || auth.currentUser !== owner) return Promise.reject(new Error('ACCOUNT_CHANGED'))
  const existing = pending.get(owner)
  if (existing) return existing
  // Missing profiles cannot be read under Spatial rules. Merge only the UID;
  // rules enforce ownership and deletion fences without replacing existing data.
  const operation = setDoc(doc(getFirebaseDb(), 'users', owner.uid), { uid: owner.uid }, { merge: true })
    .then(() => {
      if (auth.currentUser !== owner) throw new Error('ACCOUNT_CHANGED')
    })
    .finally(() => pending.delete(owner))
  pending.set(owner, operation)
  return operation
}
