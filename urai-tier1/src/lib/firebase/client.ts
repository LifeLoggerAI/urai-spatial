import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import {
  hasCanonicalFirebaseWebIdentityShape,
  matchesConfiguredFirebaseAppIdentity,
} from './firebaseWebIdentity.mjs'

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

// Invalid/unapproved public values must not select another real Firebase
// project at runtime. Preserve the existing harmless local/demo fallback.
const fallbackProjectId = 'urai-local'
const projectId = configuredShapeIsCanonical
  ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID!
  : fallbackProjectId
const firebaseConfig: FirebaseOptions = {
  apiKey: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_API_KEY : 'demo-api-key',
  authDomain: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : 'urai-local.firebaseapp.com',
  projectId,
  storageBucket: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
  messagingSenderId: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
  appId: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
  measurementId: configuredShapeIsCanonical ? PUBLIC_FIREBASE_ENV.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID : undefined,
}

// Reuse only the DEFAULT app. An unrelated named app must not make getApp()
// throw, and a previously initialized default app must pass exact identity
// comparison before private flows may be considered ready.
const existingDefaultApp = getApps().find((candidate) => candidate.name === '[DEFAULT]')
export const app = existingDefaultApp ?? initializeApp(firebaseConfig)
export const firebasePublicEnvReady = Boolean(
  configuredShapeIsCanonical && matchesConfiguredFirebaseAppIdentity(app.options, firebaseConfig),
)

// As before, providers using this exported Firebase client must separately
// check readiness and Auth/consent. This static guard is not Rules/IAM proof.
export const functions = getFunctions(app)
export const getFirebaseDb = () => getFirestore(app)
