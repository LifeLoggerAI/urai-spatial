import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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
export const getFirebaseDb = () => getFirestore(app)
