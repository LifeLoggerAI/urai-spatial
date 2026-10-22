export const CHALK_FUNCTIONS_REGION: 'us-central1';
export const CHALK_FUNCTIONS_EMULATOR: Readonly<{host:'127.0.0.1';port:5001}>;
export type ChalkReviewEmulatorContext = {
 journeyEmulatorEnabled: boolean;
 projectId: string | undefined;
 reviewRequested: boolean;
 jobsEmulatorRequested: boolean;
};
export function chalkReviewEmulatorAllowed(context: ChalkReviewEmulatorContext): boolean;
export function requireChalkReviewEmulator(context: ChalkReviewEmulatorContext): Readonly<{host:'127.0.0.1';port:5001}>;
