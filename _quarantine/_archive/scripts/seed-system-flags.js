'use strict';

const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  return admin.initializeApp();
}

initAdmin();

const db = admin.firestore();

async function seedSystemFlags() {
  const ref = db.collection('config').doc('systemFlags');

  const now = admin.firestore.FieldValue.serverTimestamp();

  const flags = {
    narrationEnabled: false,
    futureInterpretationEnabled: false,

    maintenanceMode: false,
    overlayEnabled: true,

    schemaVersion: '1.0.0-LOCK',
    minClientVersion: '1.0.0',

    lockState: 'LOCKED',
    environment: process.env.NODE_ENV || 'development',
    updatedAt: now,
    createdAt: now,
  };

  try {
    const snap = await ref.get();

    if (snap.exists) {
      await ref.set(
        {
          ...flags,
          createdAt: snap.get('createdAt') || now,
        },
        { merge: true }
      );
      console.log('Updated existing config/systemFlags with locked defaults.');
    } else {
      await ref.set(flags, { merge: false });
      console.log('Created config/systemFlags with locked defaults.');
    }

    process.exitCode = 0;
  } catch (error) {
    console.error('Failed to seed config/systemFlags');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

seedSystemFlags();