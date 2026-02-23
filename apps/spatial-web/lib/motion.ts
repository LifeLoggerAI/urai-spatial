import gsap from 'gsap';

/**
 * Defines the core easing curves for URAI's motion language.
 * Follows a "premium, subtle" feel.
 */
export const EASE_STANDARD = 'power3.inOut';
export const EASE_ACCEL = 'power2.in';
export const EASE_DECEL = 'power2.out';

/**
 * Defines the core durations for animations.
 */
export const DURATION_SLOW = 2.5;   // Major scene and camera transitions
export const DURATION_MEDIUM = 1.2; // Panel reveals, object fades
export const DURATION_FAST = 0.6;   // Micro-interactions and hover effects

/**
 * A utility to generate a standard GSAP transition object.
 * @param duration - The duration of the transition.
 * @param ease - The easing curve to use.
 * @returns A GSAP-compatible transition object.
 */
export const transition = (duration: number = DURATION_MEDIUM, ease: string = EASE_STANDARD) => ({
  duration,
  ease,
});

/**
 * A standard function for a fade-in animation.
 * @param target - The GSAP target(s).
 * @param duration - The duration of the fade.
 * @param stagger - The stagger amount for multiple targets.
 */
export const fadeIn = (target: any, duration: number = DURATION_MEDIUM, stagger: number = 0) => {
  return gsap.fromTo(
    target,
    { opacity: 0 },
    {
      opacity: 1,
      duration,
      ease: EASE_DECEL,
      stagger,
    }
  );
};

/**
 * A standard function for a fade-out animation.
 * @param target - The GSAP target(s).
 * @param duration - The duration of the fade.
 */
export const fadeOut = (target: any, duration: number = DURATION_FAST) => {
  return gsap.to(target, {
    opacity: 0,
    duration,
    ease: EASE_ACCEL,
  });
};
