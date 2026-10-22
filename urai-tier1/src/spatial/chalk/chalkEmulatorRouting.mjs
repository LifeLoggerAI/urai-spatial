// Isolated Chalk engineering review routing. This module never connects on its own.
// Only the existing UrAi journey Auth/Firestore/Functions emulator project is eligible.
const PROJECT = 'demo-urai-auth-journey';
export const CHALK_FUNCTIONS_REGION = 'us-central1';
export const CHALK_FUNCTIONS_EMULATOR = Object.freeze({host:'127.0.0.1',port:5001});
export function chalkReviewEmulatorAllowed({journeyEmulatorEnabled,projectId,reviewRequested,jobsEmulatorRequested}) {
 return journeyEmulatorEnabled === true && projectId === PROJECT &&
  reviewRequested === true && jobsEmulatorRequested === true;
}
export function requireChalkReviewEmulator(context) {
 if (!chalkReviewEmulatorAllowed(context)) throw Error('CHALK_REVIEW_EMULATOR_DENIED');
 return CHALK_FUNCTIONS_EMULATOR;
}
