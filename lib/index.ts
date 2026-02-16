import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all the cloud functions

// From enrichment.ts
export { enrichMemoryNode } from "./lifemap/enrichment";

// From cron.ts
export { dailyArchetypeCalculation, monthlySelfArchetypeCalculation } from "./lifemap/cron";
