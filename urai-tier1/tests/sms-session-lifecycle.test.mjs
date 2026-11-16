import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/settings/communications/CommunicationSettingsClient.tsx', import.meta.url), 'utf8')
const effect = source.match(/  useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[\]\)/)[1]
const eraseTypes = (text) => text
  .replace(' as { messagingPreferences?: { sms?: SavedSmsPreference } } | undefined', '')
  .replace('event: FormEvent<HTMLFormElement>', 'event')
  .replaceAll(': SavedSmsPreference', '')
const execute = (text, env) => new Function(...Object.keys(env), eraseTypes(text))(...Object.values(env))
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

function fixture() {
  const state = { User: null, Phone: '', Saved: null, Affirmed: false, Loading: false, Busy: false, Message: '' }
  const auth = { currentUser: null }
  const reads = []
  const writes = []
  let authCallback
  let unsubscribed = false
  const env = {
    firebasePublicEnvReady: true, app: {}, preferenceReadEpochRef: { current: 0 },
    getAuth: () => auth, getFirebaseDb: () => ({}), doc: (_db, _collection, uid) => uid,
    getDoc: uid => new Promise((resolve, reject) => reads.push({ uid, resolve, reject })),
    setDoc: (uid, payload) => new Promise((resolve, reject) => writes.push({ uid, payload, resolve, reject })),
    onAuthStateChanged: (_auth, callback) => { authCallback = callback; return () => { unsubscribed = true } },
    CONSENT_VERSION: 'test-consent', validE164: value => /^\+[1-9]\d{7,14}$/.test(value),
  }
  for (const key of Object.keys(state)) env[`set${key}`] = value => { state[key] = value }
  const cleanup = execute(effect, env)
  const switchUser = uid => { auth.currentUser = uid ? { uid } : null; authCallback(auth.currentUser) }
  const mutate = name => {
    const start = source.indexOf(`  async function ${name}(`)
    const end = source.indexOf(name === 'enableSms' ? '\n  async function disableSms' : '\n  const enabled', start)
    const body = source.slice(start, end)
    return execute(`${body}; return ${name}`, { ...env, user: auth.currentUser, loading: state.Loading,
      busy: state.Busy, phone: state.Phone, affirmed: state.Affirmed, saved: state.Saved })({ preventDefault() {} })
  }
  return { state, env, reads, writes, switchUser, cleanup, mutate, unsubscribed: () => unsubscribed }
}

test('SMS clears previous account data immediately and rejects late reads after switching or unmount', async () => {
  const f = fixture()
  f.switchUser('owner-a')
  f.reads[0].resolve({ data: () => ({ messagingPreferences: { sms: { phoneE164: '+19035550001', consented: true } } }) })
  await flush()
  assert.equal(f.state.Phone, '+19035550001')
  f.switchUser('owner-b')
  assert.equal(f.state.Phone, '')
  assert.equal(f.state.Saved, null)
  assert.equal(f.state.Loading, true)
  f.switchUser(null)
  const signedOut = structuredClone(f.state)
  f.reads[1].resolve({ data: () => ({ messagingPreferences: { sms: { phoneE164: '+19035550002', consented: true } } }) })
  await flush()
  assert.deepEqual(f.state, signedOut)
  f.switchUser('owner-c')
  f.cleanup()
  const unmounted = structuredClone(f.state)
  f.reads[2].reject(new Error('late read failure'))
  await flush()
  assert.deepEqual(f.state, unmounted)
  assert.equal(f.unsubscribed(), true)
})

for (const operation of ['enableSms', 'disableSms']) {
  for (const result of ['resolve', 'reject']) {
    test(`SMS ${operation} ${result} cannot install prior-owner state in the next account`, async () => {
      const f = fixture()
      f.switchUser('owner-a')
      f.reads[0].resolve({ data: () => ({ messagingPreferences: { sms: { phoneE164: '+19035550001', consented: true } } }) })
      await flush()
      f.state.Affirmed = true
      const pending = f.mutate(operation)
      assert.equal(f.writes[0].uid, 'owner-a')
      f.switchUser('owner-b')
      const nextOwner = structuredClone(f.state)
      f.writes[0][result](result === 'reject' ? new Error('late write failure') : undefined)
      await pending
      assert.deepEqual(f.state, nextOwner)
      assert.equal(f.state.Saved, null)
      assert.equal(f.state.Phone, '')
    })
  }
}

test('SMS mutation is unavailable while the new account preference is loading', async () => {
  const f = fixture()
  f.switchUser('owner-a')
  f.state.Phone = '+19035550001'
  f.state.Affirmed = true
  await f.mutate('enableSms')
  assert.equal(f.writes.length, 0)
})
