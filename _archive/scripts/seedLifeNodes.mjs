import admin from 'firebase-admin'

function initAdmin() {
  if (admin.apps.length > 0) return admin.app()

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId:
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

initAdmin()

const db = admin.firestore()

function deterministicRandom(seed) {
  const x = Math.sin(seed * 9999.91) * 10000
  return x - Math.floor(x)
}

function createNode(i) {
  const emotionalWeight = deterministicRandom(i * 99 + 17)
  const chapterIndex = Math.floor(deterministicRandom(i + 7) * 5)
  const auraPalette = ['#7dd3fc', '#a78bfa', '#f472b6', '#34d399']
  const now = Date.now()

  return {
    nodeIndex: i,
    x: Number(((deterministicRandom(i + 1) - 0.5) * 200).toFixed(6)),
    y: Number(((deterministicRandom(i + 2) - 0.5) * 50).toFixed(6)),
    z: Number(((deterministicRandom(i + 3) - 0.5) * 200).toFixed(6)),
    auraColor: auraPalette[i % auraPalette.length],
    emotionalWeight: Number(emotionalWeight.toFixed(6)),
    mass: Number((1 + emotionalWeight * 5).toFixed(6)),
    chapterId: `chapter-${chapterIndex}`,
    title: `Memory Node ${i}`,
    description: `This is a sample description for memory node ${i} in chapter-${chapterIndex}.`,
    timestamp: now - i * 100000000,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    seedVersion: '1.0.0-LOCK',
    source: 'seedLifeNodes',
  }
}

async function seedDatabase() {
  console.log('Starting Firestore seed: lifeNodes')

  const lifeNodesRef = db.collection('lifeNodes')
  const existing = await lifeNodesRef.limit(1).get()

  if (!existing.empty) {
    console.log('lifeNodes already contains data. Skipping seed.')
    return
  }

  const total = 250
  let batch = db.batch()
  let ops = 0

  for (let i = 0; i < total; i++) {
    const docRef = lifeNodesRef.doc(`node-${String(i).padStart(4, '0')}`)
    batch.set(docRef, createNode(i), { merge: false })
    ops++

    if (ops === 500 || i === total - 1) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }

  console.log(`Successfully seeded ${total} lifeNodes into Firestore.`)
}

seedDatabase().catch((error) => {
  console.error('Seed failed:')
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})