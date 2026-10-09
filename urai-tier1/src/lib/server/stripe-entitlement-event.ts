/** Provider-read settlement and identity checks shared by the signed webhook. */
export type StripeInvoiceReadback = {
  id: string;
  status?: string | null;
  customer?: unknown;
  subscription?: unknown;
  parent?: unknown;
};
export type StripeSubscriptionReadback = {
  id: string;
  status: string;
  customer?: unknown;
  latest_invoice?: unknown;
  metadata?: Record<string, string> | null;
};
export type StripeCheckoutReadback = {
  customer?: unknown;
  subscription?: unknown;
  metadata?: Record<string, string> | null;
};
export type StripeSettledStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export function stripeReferenceId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const id = (value as {id?: unknown}).id;
    if (typeof id === 'string' && id.trim()) return id;
  }
  return null;
}

/** A signed session cannot override another customer's subscription identity. */
export function assertCheckoutSubscriptionMatch(
  session: StripeCheckoutReadback,
  subscription: StripeSubscriptionReadback,
): void {
  if (stripeReferenceId(session.subscription) !== subscription.id) {
    throw new Error('Stripe Checkout subscription mismatch');
  }
  const customer = stripeReferenceId(subscription.customer);
  if (!customer || stripeReferenceId(session.customer) !== customer) {
    throw new Error('Stripe Checkout customer mismatch');
  }
  for (const key of ['userId', 'planId']) {
    const sessionValue = session.metadata?.[key];
    const subscriptionValue = subscription.metadata?.[key];
    if (sessionValue && subscriptionValue && sessionValue !== subscriptionValue) {
      throw new Error('Stripe Checkout metadata mismatch');
    }
  }
  const sessionIncarnation = session.metadata?.uraiAccountIncarnation;
  if (sessionIncarnation && subscription.metadata?.uraiAccountIncarnation !== sessionIncarnation) {
    throw new Error('Stripe Checkout incarnation mismatch');
  }
}

/** Stripe's current parent field and legacy event versions must agree if both occur. */
export function invoiceSubscriptionId(invoice: StripeInvoiceReadback): string | null {
  const parent = invoice.parent && typeof invoice.parent === 'object' && !Array.isArray(invoice.parent)
    ? invoice.parent as {type?: unknown; subscription_details?: {subscription?: unknown}}
    : null;
  const modern = parent?.type === 'subscription_details'
    ? stripeReferenceId(parent.subscription_details?.subscription) : null;
  const legacy = stripeReferenceId(invoice.subscription);
  if (modern && legacy && modern !== legacy) throw new Error('Stripe invoice subscription mismatch');
  return modern ?? legacy;
}

export function invoiceBelongsToSubscription(
  invoice: StripeInvoiceReadback,
  subscription: StripeSubscriptionReadback,
): boolean {
  if (invoiceSubscriptionId(invoice) !== subscription.id) {
    throw new Error('Stripe invoice subscription mismatch');
  }
  const customer = stripeReferenceId(subscription.customer);
  if (!customer || stripeReferenceId(invoice.customer) !== customer) {
    throw new Error('Stripe invoice customer mismatch');
  }
  const latest = stripeReferenceId(subscription.latest_invoice);
  return Boolean(latest && latest === invoice.id);
}

/**
 * Preserve existing trial, grace and terminal statuses. Active paid access needs
 * a verified settled latest invoice; an active subscription can precede settlement.
 * Callback failures propagate so Stripe retries instead of losing the transition.
 */
export async function settledStripeSubscriptionStatus(
  subscription: StripeSubscriptionReadback,
  retrieveInvoice: (id: string) => Promise<StripeInvoiceReadback>,
  paymentFailed = false,
): Promise<StripeSettledStatus> {
  const status = subscription.status;
  if (status !== 'active') {
    return status === 'trialing' || status === 'past_due' || status === 'canceled' || status === 'incomplete'
      ? status : 'none';
  }
  const latest = stripeReferenceId(subscription.latest_invoice);
  if (!latest) return 'incomplete';
  const invoice = await retrieveInvoice(latest);
  if (!invoiceBelongsToSubscription(invoice, subscription)) {
    throw new Error('Stripe latest invoice mismatch');
  }
  if (invoice.status === 'paid') return 'active';
  return paymentFailed ? 'past_due' : 'incomplete';
}

