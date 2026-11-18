import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const PUBLIC_FIREBASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const

export const firebasePublicEnvReady = Boolean(
  PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY &&
    PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
)

const fallbackProjectId = 'urai-local'
const projectId = PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackProjectId

// Public Firebase keys are optional for the public demo shell. Downstream
// providers already fall back to seeded/demo data, so this module must never
// throw in the browser and blank the whole spatial field.
const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const functions = getFunctions(app)
let disposableEmulatorConnected = false
export function getFirebaseDb() {
  const db = getFirestore(app)
  // Review-only local lab: never allow global Spatial listeners to reach hosted Firestore.
  if (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      process.env.NEXT_PUBLIC_URAI_CANONICAL_PRIVACY_LAB === 'true' &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'urai-privacy-r1512-disposable' &&
      app.options.projectId === 'urai-privacy-r1512-disposable' &&
      !disposableEmulatorConnected) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    disposableEmulatorConnected = true
  }
  return db
}
