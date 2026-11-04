import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { hasCanonicalFirebaseWebIdentityShape, matchesConfiguredFirebaseAppIdentity } from './firebaseWebIdentity.mjs'

const PUBLIC_FIREBASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const

const configuredShapeIsCanonical = hasCanonicalFirebaseWebIdentityShape({
  apiKey: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_APP_ID,
})

// Preserve the controller's isolated fictional emulator without ever permitting
// that identity as a production/staging Firebase project.
const emulatorRequested = process.env.NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR === 'true'
const isolatedEmulatorShape = emulatorRequested &&
  process.env.NODE_ENV === 'development' &&
  PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'demo-urai-auth-journey' &&
  PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN === 'demo-urai-auth-journey.firebaseapp.com' &&
  typeof PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY === 'string' &&
  Boolean(PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY.trim()) &&
  PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY === PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY.trim()
if (emulatorRequested && !isolatedEmulatorShape)
  throw new Error('Refusing UrAi journey emulator outside isolated development project')

const fallbackProjectId = 'urai-local'
const approvedPublicConfig = configuredShapeIsCanonical || isolatedEmulatorShape
const projectId = approvedPublicConfig ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID! : fallbackProjectId

// Public Firebase keys are optional for the public demo shell. Downstream
// providers already fall back to seeded/demo data, so this module must never
// throw in the browser and blank the whole spatial field.
const firebaseConfig: FirebaseOptions = {
  apiKey: approvedPublicConfig ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY : 'demo-api-key',
  authDomain: approvedPublicConfig ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : 'urai-local.firebaseapp.com',
  projectId,
  // The isolated Auth journey does not route Storage to a real bucket.
  storageBucket: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
  messagingSenderId: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
  appId: approvedPublicConfig ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
  measurementId: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID : undefined,
}

const existingDefaultApp = getApps().find((candidate) => candidate.name === '[DEFAULT]')
export const app = existingDefaultApp ?? initializeApp(firebaseConfig)
export const firebasePublicEnvReady = Boolean(
  (configuredShapeIsCanonical && matchesConfiguredFirebaseAppIdentity(app.options, firebaseConfig)) ||
  (isolatedEmulatorShape &&
    app.options.projectId === 'demo-urai-auth-journey' &&
    app.options.authDomain === PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    app.options.apiKey === PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY),
)
export const functions = getFunctions(app)
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
  if (!firebasePublicEnvReady) throw new Error('UrAi Firebase Auth identity is not ready')
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
