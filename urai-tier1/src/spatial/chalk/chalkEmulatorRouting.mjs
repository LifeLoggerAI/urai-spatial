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

// The canonical Firebase client already initializes and emulator-binds the
// default (us-central1) Functions instance. Do not call connectFunctionsEmulator
// again on it: reuse exactly that object, including for protected readback.
// A partly enabled review configuration fails closed before any callable.
export function selectChalkCallableFunctions(existingFunctions, context) {
 if (existingFunctions === null || typeof existingFunctions !== 'object')
  throw Error('CHALK_FUNCTIONS_UNAVAILABLE');
 if (!context || typeof context !== 'object' ||
     typeof context.reviewRequested !== 'boolean' ||
     typeof context.jobsEmulatorRequested !== 'boolean')
  throw Error('CHALK_FUNCTIONS_CONFIG');
 if (context.reviewRequested || context.jobsEmulatorRequested)
  requireChalkReviewEmulator(context);
 return existingFunctions;
}
