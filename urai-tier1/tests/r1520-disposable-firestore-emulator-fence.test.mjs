import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/lib/firebase/client.ts', import.meta.url), 'utf8')

test('disposable canonical lab routes Firestore to localhost emulator', () => {
  assert.match(source, /connectFirestoreEmulator\(db, '127\.0\.0\.1', 8080\)/)
  assert.match(source, /NEXT_PUBLIC_URAI_CANONICAL_PRIVACY_LAB\s*===\s*'true'/)
  assert.match(source, /NEXT_PUBLIC_FIREBASE_PROJECT_ID\s*===\s*'urai-privacy-r1512-disposable'/)
  assert.match(source, /app\.options\.projectId\s*===\s*'urai-privacy-r1512-disposable'/)
})

test('only localhost and 127.0.0.1 can enter local emulator branch', () => {
  assert.match(source, /window\.location\.hostname\s*===\s*'localhost'/)
  assert.match(source, /window\.location\.hostname\s*===\s*'127\.0\.0\.1'/)
  assert.match(source, /typeof window !== 'undefined'/)
})

test('emulator connection is configured once, otherwise regular provider unchanged', () => {
  assert.match(source, /!disposableEmulatorConnected/)
  assert.match(source, /disposableEmulatorConnected = true/)
  assert.match(source, /return db/)
})
