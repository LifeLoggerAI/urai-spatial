import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

if (!admin.apps.length) admin.initializeApp()

type PlanId = 'free' | 'pro' | 'therapist' | 'founder'
type PaidPlanId = Exclude<PlanId, 'free'>
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none'
type StripeRuntimeMode = 'test' | 'production'

type StoredEntitlement = {
  userId: string
  planId: PlanId
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: SubscriptionStatus
  stripeLastEventCreated: number
  stripeLastEventId: string | null
  updatedAt: number
}

type ResolvedEvent = {
  userId: string | null
  planId: PlanId | null
  customerId: string | null
  subscriptionId: string | null
  subscriptionStatus: SubscriptionStatus
}

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'
const ENTITLEMENT_COLLECTION = 'userEntitlements'
const WEBHOOK_DEAD_LETTER_COLLECTION = 'stripeWebhookDeadLetters'
const WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
])
const PRICE_ENV_BY_PLAN: Record<PaidPlanId, string> = {
  pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
  therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
  founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
}

function noStore(res: functions.Response) {
  res.set('Cache-Control', 'private, no-store, max-age=0')
}

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key
}

function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret
}

function runtimeMode(): StripeRuntimeMode | null {
  return process.env.URAI_STRIPE_MODE === 'test' || process.env.URAI_STRIPE_MODE === 'production'
    ? process.env.URAI_STRIPE_MODE
    : null
}

function secretMode(secret: string | undefined): StripeRuntimeMode | null {
  if (secret?.startsWith('sk_test_')) return 'test'
  if (secret?.startsWith('sk_live_')) return 'production'
  return null
}

function stripeClient(): Stripe | null {
  const secret = stripeSecretKey()
  const mode = runtimeMode()
  if (!secret || !mode || secretMode(secret) !== mode) return null
  return new Stripe(secret, { apiVersion: STRIPE_API_VERSION })
}

function commerceEnabled() {
  return process.env.URAI_STRIPE_COMMERCE_ENABLED === 'true'
}

function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'pro' || value === 'therapist' || value === 'founder'
}

function isPlan(value: unknown): value is PlanId {
  return value === 'free' || isPaidPlan(value)
}

function mapStatus(status?: string | null): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return status
    case 'unpaid':
      return 'past_due'
    default:
      return 'none'
  }
}

function defaultEntitlement(userId: string): StoredEntitlement {
  return {
    userId,
    planId: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: 'none',
    stripeLastEventCreated: 0,
    stripeLastEventId: null,
    updatedAt: Date.now(),
  }
}

function bearerToken(req: functions.https.Request) {
  const authorization = req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

async function authenticatedUid(req: functions.https.Request) {
  const token = bearerToken(req)
  if (!token) return null
  try {
    const decoded = await admin.auth().verifyIdToken(token, true)
    return decoded.uid
  } catch {
    return null
  }
}

function approvedReturnUrl(value: unknown): URL | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return null
  try {
    const approved = new URL(appUrl)
    const resolved = typeof value === 'string' && value.trim()
      ? new URL(value, approved)
      : new URL(approved)
    if (resolved.origin !== approved.origin || resolved.username || resolved.password) return null
    return resolved
  } catch {
    return null
  }
}

function withStripeResult(base: URL, result: 'success' | 'cancelled', planId: PaidPlanId) {
  const output = new URL(base)
  output.searchParams.set('stripe', result)
  output.searchParams.set('plan', planId)
  return output.toString()
}

async function readEntitlement(userId: string): Promise<StoredEntitlement> {
  const snapshot = await admin.firestore().collection(ENTITLEMENT_COLLECTION).doc(userId).get()
  if (!snapshot.exists) return defaultEntitlement(userId)
  return { ...defaultEntitlement(userId), ...(snapshot.data() as Partial<StoredEntitlement>), userId }
}

async function findByCustomer(customerId: string): Promise<StoredEntitlement | null> {
  const snapshot = await admin.firestore()
    .collection(ENTITLEMENT_COLLECTION)
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { ...defaultEntitlement(doc.id), ...(doc.data() as Partial<StoredEntitlement>), userId: doc.id }
}

async function applyOrderedEntitlement(record: StoredEntitlement, event: Stripe.Event) {
  const ref = admin.firestore().collection(ENTITLEMENT_COLLECTION).doc(record.userId)
  return admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const current = snapshot.exists
      ? { ...defaultEntitlement(record.userId), ...(snapshot.data() as Partial<StoredEntitlement>), userId: record.userId }
      : defaultEntitlement(record.userId)

    if (current.stripeLastEventId === event.id) return { applied: false, reason: 'duplicate-event' }
    if ((current.stripeLastEventCreated ?? 0) > event.created) return { applied: false, reason: 'stale-event' }
    if ((current.stripeLastEventCreated ?? 0) === event.created && current.stripeLastEventId && current.stripeLastEventId > event.id) {
      return { applied: false, reason: 'equal-time-precedence' }
    }

    transaction.set(ref, {
      ...record,
      stripeLastEventCreated: event.created,
      stripeLastEventId: event.id,
      updatedAt: Date.now(),
    }, { merge: true })
    return { applied: true, reason: 'applied' }
  })
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

function subscriptionId(value: string | Stripe.Subscription | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

async function resolveIdentity(metadata: Stripe.Metadata | undefined, customer: string | null) {
  let userId = typeof metadata?.userId === 'string' && metadata.userId ? metadata.userId : null
  const rawPlan = typeof metadata?.planId === 'string' ? metadata.planId : null
  let planId: PlanId | null = isPlan(rawPlan) ? rawPlan : null
  if (customer && (!userId || !planId)) {
    const existing = await findByCustomer(customer)
    userId = userId ?? existing?.userId ?? null
    planId = planId ?? existing?.planId ?? null
  }
  return { userId, planId }
}

async function resolveSubscriptionEvent(stripe: Stripe, event: Stripe.Event): Promise<ResolvedEvent> {
  const type = event.type
  let metadata: Stripe.Metadata | undefined
  let resolvedCustomer: string | null = null
  let resolvedSubscription: string | null = null
  let status: SubscriptionStatus = 'none'

  if (
    type === 'checkout.session.completed' ||
    type === 'checkout.session.async_payment_succeeded' ||
    type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    metadata = session.metadata ?? undefined
    resolvedCustomer = customerId(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null)
    resolvedSubscription = subscriptionId(session.subscription as string | Stripe.Subscription | null)
    if (type === 'checkout.session.async_payment_succeeded') status = 'active'
    else if (type === 'checkout.session.async_payment_failed') status = 'none'
    else status = session.payment_status === 'paid' ? 'active' : 'none'

    if (resolvedSubscription) {
      const subscription = await stripe.subscriptions.retrieve(resolvedSubscription)
      metadata = { ...(subscription.metadata ?? {}), ...(metadata ?? {}) }
      resolvedCustomer = resolvedCustomer ?? customerId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer)
      status = mapStatus(subscription.status)
    }
  } else {
    const subscription = event.data.object as Stripe.Subscription
    metadata = subscription.metadata ?? undefined
    resolvedCustomer = customerId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer)
    resolvedSubscription = subscription.id
    status = type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(subscription.status)
  }

  return {
    ...(await resolveIdentity(metadata, resolvedCustomer)),
    customerId: resolvedCustomer,
    subscriptionId: resolvedSubscription,
    subscriptionStatus: status,
  }
}

async function resolveChargeEvent(stripe: Stripe, event: Stripe.Event): Promise<ResolvedEvent | null> {
  let charge: Stripe.Charge
  let status: SubscriptionStatus

  if (event.type === 'charge.refunded') {
    charge = event.data.object as Stripe.Charge
    if (charge.refunded !== true) return null
    status = 'canceled'
  } else {
    const dispute = event.data.object as Stripe.Dispute
    status = event.type === 'charge.dispute.closed' && dispute.status === 'won' ? 'active' : 'canceled'
    charge = typeof dispute.charge === 'string'
      ? await stripe.charges.retrieve(dispute.charge)
      : dispute.charge
  }

  const paymentIntentRef = charge.payment_intent
  const paymentIntentId = typeof paymentIntentRef === 'string' ? paymentIntentRef : paymentIntentRef?.id ?? null
  if (!paymentIntentId) throw new Error('payment_intent_missing')
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  const resolvedCustomer = customerId(
    paymentIntent.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ) ?? customerId(charge.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null)
  const identity = await resolveIdentity(paymentIntent.metadata ?? undefined, resolvedCustomer)
  if (identity.planId !== 'founder') return null

  return {
    ...identity,
    customerId: resolvedCustomer,
    subscriptionId: null,
    subscriptionStatus: status,
  }
}

export const createStripeCheckout = functions.https.onRequest(async (req, res) => {
  noStore(res)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const uid = await authenticatedUid(req)
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!commerceEnabled()) {
    res.status(503).json({ error: 'Stripe commerce is not enabled.' })
    return
  }

  const planId = req.body?.planId as unknown
  if (!isPaidPlan(planId)) {
    res.status(400).json({ error: 'Paid planId required.' })
    return
  }

  const stripe = stripeClient()
  const priceId = process.env[PRICE_ENV_BY_PLAN[planId]]
  const redirectBase = approvedReturnUrl(req.body?.returnUrl)
  if (!stripe || !priceId || !redirectBase) {
    res.status(503).json({ error: 'Stripe environment is not configured for this request.' })
    return
  }

  const existing = await readEntitlement(uid)
  const session = await stripe.checkout.sessions.create({
    mode: planId === 'founder' ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: withStripeResult(redirectBase, 'success', planId),
    cancel_url: withStripeResult(redirectBase, 'cancelled', planId),
    customer: existing.stripeCustomerId || undefined,
    client_reference_id: uid,
    metadata: { planId, userId: uid },
    payment_intent_data: planId === 'founder' ? { metadata: { planId, userId: uid } } : undefined,
    subscription_data: planId === 'founder' ? undefined : { metadata: { planId, userId: uid } },
  })

  res.status(200).json({ url: session.url })
})

export const createStripeCustomerPortal = functions.https.onRequest(async (req, res) => {
  noStore(res)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const uid = await authenticatedUid(req)
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!commerceEnabled()) {
    res.status(503).json({ error: 'Stripe commerce is not enabled.' })
    return
  }

  const stripe = stripeClient()
  const entitlement = await readEntitlement(uid)
  const returnUrl = approvedReturnUrl(req.body?.returnUrl)
  const mode = runtimeMode()
  if (!stripe || !returnUrl || !mode) {
    res.status(503).json({ error: 'Stripe environment is not configured for this request.' })
    return
  }
  if (!entitlement.stripeCustomerId) {
    res.status(409).json({ error: 'No Stripe customer exists for this account.' })
    return
  }

  let customer: Stripe.Customer | Stripe.DeletedCustomer
  try {
    customer = await stripe.customers.retrieve(entitlement.stripeCustomerId)
  } catch (error) {
    console.error('[URAI] Stripe portal customer verification failed', { uid, error })
    res.status(502).json({ error: 'Stripe customer could not be verified.' })
    return
  }
  if (customer.deleted) {
    res.status(409).json({ error: 'Stripe customer is no longer active.' })
    return
  }
  if (customer.livemode !== (mode === 'production')) {
    res.status(500).json({ error: 'Stripe customer mode mismatch.' })
    return
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl.toString(),
    configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION || undefined,
  })
  res.status(200).json({ url: session.url })
})

export const getStripeEntitlement = functions.https.onRequest(async (req, res) => {
  noStore(res)
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const uid = await authenticatedUid(req)
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.status(200).json({ entitlement: await readEntitlement(uid) })
})

export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  noStore(res)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const stripe = stripeClient()
  const webhookSecret = stripeWebhookSecret()
  const signature = req.header('stripe-signature')
  const mode = runtimeMode()
  if (!stripe || !webhookSecret || !signature || !mode) {
    res.status(400).json({ error: 'Missing or invalid Stripe webhook configuration' })
    return
  }

  let event: Stripe.Event
  try {
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body ?? {}))
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    res.status(400).json({ error: 'Invalid Stripe signature' })
    return
  }

  if (event.livemode !== (mode === 'production')) {
    res.status(400).json({ error: 'Stripe event mode mismatch' })
    return
  }
  if (!WEBHOOK_EVENTS.has(event.type)) {
    res.status(200).json({ received: true, ignored: true })
    return
  }

  let resolved: ResolvedEvent | null
  try {
    resolved = event.type.startsWith('charge.')
      ? await resolveChargeEvent(stripe, event)
      : await resolveSubscriptionEvent(stripe, event)
  } catch (error) {
    console.error('[URAI] Stripe provider state could not be resolved', { type: event.type, error })
    res.status(500).json({ error: 'Stripe provider state could not be resolved' })
    return
  }

  if (!resolved) {
    res.status(200).json({ received: true, ignored: true, reason: 'no-entitlement-transition' })
    return
  }

  if (!resolved.userId || !resolved.planId) {
    await admin.firestore().collection(WEBHOOK_DEAD_LETTER_COLLECTION).add({
      eventId: event.id,
      eventType: event.type,
      reason: !resolved.userId ? 'missing_userId' : 'missing_planId',
      customerId: resolved.customerId,
      subscriptionId: resolved.subscriptionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    res.status(200).json({ received: true, skipped: !resolved.userId ? 'missing-user' : 'missing-plan' })
    return
  }

  const application = await applyOrderedEntitlement({
    userId: resolved.userId,
    planId: resolved.planId,
    stripeCustomerId: resolved.customerId,
    stripeSubscriptionId: resolved.subscriptionId,
    subscriptionStatus: resolved.subscriptionStatus,
    stripeLastEventCreated: event.created,
    stripeLastEventId: event.id,
    updatedAt: Date.now(),
  }, event)

  res.status(200).json({ received: true, ...application })
})
