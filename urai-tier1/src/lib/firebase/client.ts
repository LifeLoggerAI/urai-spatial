import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

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
const emulatorRequested = process.env.NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR === 'true'
// Fail closed even if someone accidentally provides the test flag to a live build.
export const uraiJourneyEmulatorEnabled = emulatorRequested &&
  process.env.NODE_ENV === 'development' &&
  projectId === 'demo-urai-auth-journey' && firebasePublicEnvReady
if (emulatorRequested && !uraiJourneyEmulatorEnabled)
  throw new Error('Refusing UrAi journey emulator outside isolated development project')
if (uraiJourneyEmulatorEnabled && app.options.projectId !== 'demo-urai-auth-journey')
  throw new Error('Refusing non-isolated Firebase app for journey emulator')
// Same isolated fictional project and local emulator guard as Auth/Firestore.
// A production build can never route callable consent changes to localhost.
if (uraiJourneyEmulatorEnabled) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
let authEmulatorConnected = false
let firestoreEmulatorConnected = false
export function getUraiAuth() {
  const auth = getAuth(app)
  if (uraiJourneyEmulatorEnabled && !authEmulatorConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    authEmulatorConnected = true
  }
  return auth
}
export const getFirebaseDb = () => {
  const db = getFirestore(app)
  if (uraiJourneyEmulatorEnabled && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    firestoreEmulatorConnected = true
  }
  return db
}

 // Direct private-route entry must reach the same isolated Auth and Firestore
 // emulators as Login. Several original world consumers use raw Firebase SDK
 // singletons, so waiting for Login to initialize emulators is insufficient.
 // This is browser-only and never initiates emulators in a production build.
if (uraiJourneyEmulatorEnabled && typeof window !== 'undefined') {
  getUraiAuth()
  getFirebaseDb()
}
