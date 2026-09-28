import fs from 'node:fs'

const rules = fs.readFileSync(new URL('../firebase/storage.rules', import.meta.url), 'utf8')
const firebase = JSON.parse(fs.readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'))

function requireText(value, label) {
  if (!rules.includes(value)) throw new Error(`Storage rules boundary missing ${label}: ${value}`)
}

requireText("match /private-captured-reality/{uid}/{allPaths=**}", 'private Captured Reality owner namespace')
requireText("allow read, write: if isOwner(uid);", 'owner-only read/write predicate')
requireText("match /{allPaths=**}", 'catch-all boundary')
requireText("allow read, write: if false;", 'catch-all deny')
requireText("request.auth.uid == uid", 'owner UID equality')
if (/match \/private-captured-reality\/\{uid\}\/\{allPaths=\*\*\}[\s\S]*?allow\s+read\s*:\s*if\s+true/.test(rules)) {
  throw new Error('Captured Reality namespace must never be publicly readable')
}
if (/match \/private-captured-reality\/\{uid\}\/\{allPaths=\*\*\}[\s\S]*?allow\s+write\s*:\s*if\s+true/.test(rules)) {
  throw new Error('Captured Reality namespace must never be publicly writable')
}
if (firebase?.storage?.rules !== 'firebase/storage.rules') {
  throw new Error('firebase.json must govern Firebase Storage rules from firebase/storage.rules')
}
console.log('Firebase Storage private Captured Reality boundary passed')
