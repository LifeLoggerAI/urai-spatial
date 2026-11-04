export interface FirebaseWebIdentityFields {
  apiKey?: string | null
  authDomain?: string | null
  projectId?: string | null
  storageBucket?: string | null
  messagingSenderId?: string | null
  appId?: string | null
}

export function hasCanonicalFirebaseWebIdentityShape(options?: FirebaseWebIdentityFields | null): boolean
export function matchesConfiguredFirebaseAppIdentity(activeOptions?: FirebaseWebIdentityFields | null, expectedOptions?: FirebaseWebIdentityFields | null): boolean
