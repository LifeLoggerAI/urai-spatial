// Compatibility imports share the same canonical Firebase app and Firestore.
// Do not initialize a second app or invent another project in this module.
import { app, firebasePublicEnvReady, getFirebaseDb } from './client'

export const getFirebaseApp = () => app
export { getFirebaseDb }
export const isFirebaseConfigured = firebasePublicEnvReady
