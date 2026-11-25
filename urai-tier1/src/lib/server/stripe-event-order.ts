export type StripeOrderingStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export type StripeOrderingDecision = {
  apply: boolean;
  reason: 'applied' | 'stale-event' | 'equal-time-precedence';
};

// Stripe events can share a second and arrive out of order. In that tie,
// denial wins; a later event is required to restore paid access.
const STATUS_PRECEDENCE: Record<StripeOrderingStatus, number> = {
  trialing: 20,
  active: 30,
  none: 40,
  incomplete: 50,
  past_due: 60,
  canceled: 70,
};

export function decideStripeEventApplication(input: {
  currentEventCreated: number;
  currentStatus: StripeOrderingStatus;
  incomingEventCreated: number;
  incomingStatus: StripeOrderingStatus;
}): StripeOrderingDecision {
  if (input.incomingEventCreated < input.currentEventCreated) {
    return { apply: false, reason: 'stale-event' };
  }

  if (
    input.incomingEventCreated === input.currentEventCreated
    && STATUS_PRECEDENCE[input.incomingStatus] < STATUS_PRECEDENCE[input.currentStatus]
  ) {
    return { apply: false, reason: 'equal-time-precedence' };
  }

  return { apply: true, reason: 'applied' };
}
