export const ONBOARDING_COMPLETION_KEY = 'urai:onboarding:v2:complete'
export const ONBOARDING_SETUP_COMPLETE_KEY = 'urai:onboarding:v3:setup-complete'
export const ONBOARDING_SETUP_STEP_KEY = 'urai:onboarding:v3:setup-step'

export const ONBOARDING_SETUP_STEPS = ['welcome', 'privacy', 'comfort', 'orb'] as const
export type OnboardingSetupStep = (typeof ONBOARDING_SETUP_STEPS)[number]

export function isOnboardingSetupStep(value: unknown): value is OnboardingSetupStep {
  return typeof value === 'string' && (ONBOARDING_SETUP_STEPS as readonly string[]).includes(value)
}

export function onboardingSetupStepIndex(step: OnboardingSetupStep) {
  return ONBOARDING_SETUP_STEPS.indexOf(step)
}

export function nextOnboardingSetupStep(step: OnboardingSetupStep): OnboardingSetupStep | null {
  const index = onboardingSetupStepIndex(step)
  return ONBOARDING_SETUP_STEPS[index + 1] ?? null
}
