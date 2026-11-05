// Legacy V1 consumers must share the canonical Tier1 Firebase client.
// An incomplete public web config is not enough to enable Firestore reads;
// keep the seeded/offline fallback instead of initializing a second app.
import { app, firebasePublicEnvReady, getFirebaseDb } from './firebase/client'

export const firebaseApp = firebasePublicEnvReady ? app : null
export const db = firebaseApp ? getFirebaseDb() : null
export const firebaseReady = Boolean(firebaseApp && db)
