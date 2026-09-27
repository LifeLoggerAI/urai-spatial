export type StripeOrderingStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export type StripeOrderingDecision = {
  apply: boolean;
  reason: 'applied' | 'stale-event' | 'cancellation-precedence';
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
    && input.currentStatus === 'canceled'
    && input.incomingStatus !== 'canceled'
  ) {
    return { apply: false, reason: 'cancellation-precedence' };
  }

  return { apply: true, reason: 'applied' };
}
