
import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { calculateDailyAverage, determineSeasonalArchetype, calculateWeightedSeasonalVector, detectStateChange, determineSelfArchetype } from "./archetype";

/**
 * A scheduled function that runs once a day to calculate and update user archetypes.
 */
export const dailyArchetypeCalculation = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Fetch all emotion vectors from the last 24 hours
    const recentMemoryNodes = await db.collection(`users/${uid}/memoryNodes`)
                                      .where('timestamp', '>=', twentyFourHoursAgo)
                                      .get();
    const recentEmotionVectors = recentMemoryNodes.docs.map(doc => doc.data().emotionVector);

    // 2. Calculate and save the daily average emotion vector
    const dailyAverage = calculateDailyAverage(recentEmotionVectors);
    await db.collection(`users/${uid}/dailyAverages`).add({
      timestamp: now,
      vector: dailyAverage,
    });

    // 3. Fetch the last 90 days of daily averages
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const historicalAveragesSnapshot = await db.collection(`users/${uid}/dailyAverages`)
                                              .where('timestamp', '>=', ninetyDaysAgo)
                                              .orderBy('timestamp', 'desc')
                                              .get();
    const historicalAverages = historicalAveragesSnapshot.docs.map(doc => doc.data().vector);

    // 4. Calculate the seasonal archetype
    const seasonalVector = calculateWeightedSeasonalVector(historicalAverages);
    const newSeasonalArchetype = determineSeasonalArchetype(seasonalVector);

    // 5. Get previous state and detect narrative transition
    const userStateRef = db.doc(`users/${uid}/state/current`);
    const userStateDoc = await userStateRef.get();
    const previousArchetype = userStateDoc.exists ? userStateDoc.data()?.seasonalArchetype : 'Dormant';

    // 6. Update the user's current state with the new archetype
    await userStateRef.set({
        seasonalArchetype: newSeasonalArchetype,
        lastUpdated: now,
    }, { merge: true });

    // 7. If a transition occurred, store the new narrative arc
    const narrativeArc = detectStateChange(previousArchetype, newSeasonalArchetype, now);
    if (narrativeArc) {
        await db.collection(`users/${uid}/narrativeArcs`).add(narrativeArc);
    }
  }
});


/**
 * A scheduled function that runs on the first day of every month to calculate the Self-Archetype.
 */
export const monthlySelfArchetypeCalculation = functions.pubsub.schedule('1 of month 00:00').onRun(async (context) => {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;

    // 1. Fetch all historical narrative arcs, which serve as the archetype logs
    const narrativeArcsSnapshot = await db.collection(`users/${uid}/narrativeArcs`).orderBy('startDate').get();
    const archetypeHistory = narrativeArcsSnapshot.docs.map(doc => doc.data());

    // 2. Calculate the Self-Archetype
    const selfArchetype = determineSelfArchetype(archetypeHistory as any);

    // 3. Update the user's state with their Self-Archetype
    await db.doc(`users/${uid}/state/current`).set({
      selfArchetype: selfArchetype,
    }, { merge: true });
  }
});
