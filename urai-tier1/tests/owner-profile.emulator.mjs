// From repository root: node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only auth,firestore --project demo-urai-owner-enrollment --config firebase.owner-profile-review.json "node urai-tier1/tests/owner-profile.emulator.mjs"
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, terminate } from 'firebase/firestore'

const projectId = 'demo-urai-owner-enrollment'
assert.equal(process.env.GCLOUD_PROJECT, projectId)
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:18080')
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:19099')
const app = initializeApp({ projectId, apiKey: 'demo-only' }, 'owner-enrollment')
const auth = getAuth(app), db = getFirestore(app)
connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 18080)
const source = fs.readFileSync(new URL('../src/lib/firebase/ownerProfile.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
vm.compileFunction(code, ['require', 'exports'])(function require(name) {
  if (name === './client') return { getUrAiAuth: () => auth, getFirebaseDb: () => db }
  if (name === 'firebase/firestore') return { doc, setDoc }
  throw new Error(name)
}, exports)
const adminWrite = async (path, fields) => {
  const response = await fetch(`http://127.0.0.1:18080/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
  })
  assert.equal(response.status, 200, await response.text())
}
try {
  const { user } = await createUserWithEmailAndPassword(auth, `owner-${Date.now()}@example.test`, 'Synthetic-only-123!')
  await exports.ensureOwnerProfile(user)
  assert.deepEqual((await getDoc(doc(db, 'users', user.uid))).data(), { uid: user.uid })
  await adminWrite(`users/${user.uid}`, { uid: { stringValue: user.uid }, displayName: { stringValue: 'Preserve me' } })
  await exports.ensureOwnerProfile(user)
  assert.equal((await getDoc(doc(db, 'users', user.uid))).data().displayName, 'Preserve me')
  await assert.rejects(exports.ensureOwnerProfile({ uid: 'another-owner' }), /ACCOUNT_CHANGED/)
  await adminWrite(`privacyDeletionTombstones/${user.uid}`, { active: { booleanValue: true } })
  await assert.rejects(exports.ensureOwnerProfile(user), error => error.code === 'permission-denied')
  await signOut(auth)
  await assert.rejects(exports.ensureOwnerProfile(user), /ACCOUNT_CHANGED/)
  console.log('OWNER_PROFILE_NATIVE_EMULATOR_PASS: first enrollment, preservation, owner binding, deletion fence, sign-out')
} finally {
  await terminate(db)
  await deleteApp(app)
}
