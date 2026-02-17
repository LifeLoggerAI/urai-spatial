import admin from 'firebase-admin';

// Initialize Firebase Admin. It will automatically use the credentials
// set up by the Firebase CLI (gcloud application-default).
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} catch (e) {
  if (!/already exists/u.test(e.message)) {
    console.error('Firebase admin initialization error', e.stack);
  }
}

const db = admin.firestore();

function deterministicRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function seedDatabase() {
  console.log('🌱 Starting to seed database...');
  const lifeNodesRef = db.collection('lifeNodes');
  const batch = db.batch();

  // Check if nodes already exist to prevent re-seeding
  const snapshot = await lifeNodesRef.limit(1).get();
  if (!snapshot.empty) {
    console.log('✅ Database already seeded. Skipping.');
    return;
  }

  for (let i = 0; i < 250; i++) {
    const docRef = lifeNodesRef.doc(); // Auto-generate ID
    const emotionalWeight = deterministicRandom(i * 99);
    const chapterId = `chapter-${Math.floor(deterministicRandom(i) * 5)}`;
    
    batch.set(docRef, {
      x: (deterministicRandom(i + 1) - 0.5) * 200,
      y: (deterministicRandom(i + 2) - 0.5) * 50,
      z: (deterministicRandom(i + 3) - 0.5) * 200,
      auraColor: ["#7dd3fc", "#a78bfa", "#f472b6", "#34d399"][i % 4],
      emotionalWeight: emotionalWeight,
      mass: 1.0 + emotionalWeight * 5.0, // Mass is influenced by emotion
      chapterId: chapterId,
      timestamp: admin.firestore.Timestamp.now().toMillis() - (i * 100000000),
      title: `Memory Node ${i}`,
      description: `This is a sample description for memory node ${i} in ${chapterId}.`,
    });
  }

  await batch.commit();
  console.log('✅ Successfully seeded 250 lifeNodes into Firestore.');
}

seedDatabase().catch(console.error);
