export type FunnelCounts = {
  landing_viewed: number;
  demo_cta_clicked: number;
  early_access_signup_started: number;
  early_access_signup_completed: number;
  invite_opened: number;
  invite_accepted: number;
  life_map_entered: number;
};

export type FunnelRates = {
  demoCtr: number;
  signupRate: number;
  signupCompletionRate: number;
  inviteAcceptanceRate: number;
  activationRate: number;
};

export function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function calculateFunnelRates(counts: FunnelCounts): FunnelRates {
  return {
    demoCtr: rate(counts.demo_cta_clicked, counts.landing_viewed),
    signupRate: rate(counts.early_access_signup_completed, counts.landing_viewed),
    signupCompletionRate: rate(counts.early_access_signup_completed, counts.early_access_signup_started),
    inviteAcceptanceRate: rate(counts.invite_accepted, counts.invite_opened),
    activationRate: rate(counts.life_map_entered, counts.invite_accepted),
  };
}

export function funnelRecommendations(rates: FunnelRates) {
  const recs: string[] = [];

  if (rates.demoCtr < 30) {
    recs.push("Demo CTR is low. Rename CTA to 'See how it works' and move it closer to the headline.");
  }

  if (rates.signupRate < 20) {
    recs.push("Signup conversion is under 20%. Add the emotional hook: 'The recovery was quieter than the wound.'");
  }

  if (rates.signupCompletionRate < 70) {
    recs.push("Users start signup but do not finish. Reduce copy near the form and reassure: 'No login. No commitment.'");
  }

  if (rates.inviteAcceptanceRate < 60) {
    recs.push("Invite acceptance is weak. Make invite email more personal and include the demo link above the invite link.");
  }

  if (rates.activationRate < 70) {
    recs.push("Invited users are not entering the map. Route invite acceptance through First Light before Life Map.");
  }

  if (!recs.length) {
    recs.push("Funnel is healthy. Increase traffic slowly and keep the experience restrained.");
  }

  return recs;
}
