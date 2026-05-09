import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const REQUIRED_PUBLIC_FIREBASE_ENV = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
] as const

function isBrowserRuntime() {
  return typeof window !== 'undefined'
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production'
}

function requireFirebaseEnv(name: (typeof REQUIRED_PUBLIC_FIREBASE_ENV)[number]) {
  const envMap = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  } as const

  const value = envMap[name]

  // Next.js replaces only literal NEXT_PUBLIC env references in browser bundles.
  // Keep the lookup static above, and fail closed only in real browser/runtime
  // production so static page collection can still complete before env injection.
  if (!value && isProductionRuntime() && isBrowserRuntime()) {
    throw new Error(`Missing required Firebase public env: ${name}`)
  }

  return value
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requireFirebaseEnv('NEXT_PUBLIC_FIREBASE_API_KEY') ?? 'dev',
  authDomain: requireFirebaseEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') ?? 'dev.localhost',
  projectId: requireFirebaseEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ?? 'urai-local',
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const functions = getFunctions(app)
export const getFirebaseDb = () => getFirestore(app)
