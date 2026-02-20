const admin = require("firebase-admin");

// IMPORTANT: Make sure you have the service account key file and have set the GOOGLE_APPLICATION_CREDENTIALS environment variable.

admin.initializeApp();

const db = admin.firestore();

async function seedSystemFlags() {
  const systemFlagsRef = db.collection("config").doc("systemFlags");

  const flags = {
    // --- Psychological Safety --- 
    narrationEnabled: false, // Disables all AI-based narration features.
    futureInterpretationEnabled: false, // Master kill switch for any future interpretive layers.

    // --- Operational Control ---
    maintenanceMode: false, // If true, clients should show a maintenance message and disable functionality.
    overlayEnabled: true, // Controls the visibility of additional UI overlays.

    // --- Version Control ---
    schemaVersion: "1.0.0-LOCK", // The canonical schema version the system is currently operating on.
    minClientVersion: "1.0.0", // The minimum client version required to connect.
  };

  try {
    await systemFlagsRef.set(flags);
    console.log("Successfully seeded systemFlags document with secure defaults.");
  } catch (error) {
    console.error("Error seeding systemFlags document:", error);
  }
}

seedSystemFlags();
