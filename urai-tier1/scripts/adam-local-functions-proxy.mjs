// The same-origin Adam proxy is available only for the already-isolated
// fictional Firebase Auth journey. It is never an alternate provider backend.
const DEMO_PROJECT = 'demo-urai-auth-journey'
const LOCAL_FUNCTIONS_BASE = `http://127.0.0.1:5001/${DEMO_PROJECT}/us-central1`

export function adamLocalEmulatorRewrites(env = process.env) {
  const requested = env.URAI_ADAM_LOCAL_EMULATOR_PROXY === 'true'
  if (!requested) return []

  if (
    env.NODE_ENV !== 'development'
    || env.URAI_FIREBASE_STATIC_EXPORT === 'true'
    || env.NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR !== 'true'
    || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== DEMO_PROJECT
    || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== `${DEMO_PROJECT}.firebaseapp.com`
    || !env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()
    || env.NEXT_PUBLIC_URAI_API_ORIGIN?.trim()
    || env.OPENAI_API_KEY?.trim()
    || env.ELEVENLABS_API_KEY?.trim()
    || env.SPATIAL_SPEND_WORKER_TOKENS_JSON?.trim()
    || env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  ) {
    throw new Error('Refusing Adam local emulator proxy outside the isolated fictional Firebase development project')
  }

  // The backend remains the original Functions handler, including its auth,
  // canonical consent, protected spend, and fail-closed Founder voice issuer.
  return [
    { source: '/api/urai/adam/conversation', destination: `${LOCAL_FUNCTIONS_BASE}/adamPresenceProvider` },
    { source: '/api/urai/adam/voice', destination: `${LOCAL_FUNCTIONS_BASE}/adamFounderVoiceProvider` },
  ]
}
