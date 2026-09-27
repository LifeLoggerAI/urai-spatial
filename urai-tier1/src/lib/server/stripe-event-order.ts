export type StripeOrderingStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export type StripeOrderingDecision = {
  apply: boolean;
  reason: 'applied' | 'stale-event' | 'equal-time-precedence';
};

const STATUS_PRECEDENCE: Record<StripeOrderingStatus, number> = {
  none: 0,
  incomplete: 10,
  past_due: 20,
  trialing: 30,
  active: 40,
  canceled: 50,
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
