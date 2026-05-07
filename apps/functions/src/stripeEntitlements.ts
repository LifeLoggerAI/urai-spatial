import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

if (!admin.apps.length) admin.initializeApp()

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'none'
type EntitlementTier = 'tier1' | 'tier2' | 'tier3'

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key
}

function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret
}

function tierFromPlanId(planId?: string | null): EntitlementTier {
  const normalized = String(planId ?? '').toLowerCase()
  if (normalized.includes('tier3') || normalized.includes('pro') || normalized.includes('premium')) return 'tier3'
  if (normalized.includes('tier2') || normalized.includes('plus') || normalized.includes('personal')) return 'tier2'
  return 'tier1'
}

function statusFromStripeStatus(status?: string | null): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
    case 'unpaid':
      return status
    default:
      return 'none'
  }
}

function activeTierForStatus(tier: EntitlementTier, status: SubscriptionStatus): EntitlementTier {
  if (status === 'active' || status === 'trialing') return tier
  return 'tier1'
}

function metadataFromEventObject(data: Stripe.Event.Data.Object) {
  const object = data as unknown as {
    id?: string
    customer?: string | { id?: string } | null
    subscription?: string | { id?: string } | null
    status?: string | null
    metadata?: Record<string, string | undefined>
  }

  const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id
  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id ?? object.id
  const planId = object.metadata?.planId ?? object.metadata?.tier ?? object.metadata?.priceId
  const userId = object.metadata?.userId ?? object.metadata?.uid

  return {
    userId,
    planId,
    customerId,
    subscriptionId,
    status: statusFromStripeStatus(object.status),
  }
}

async function writeEntitlement(input: {
  uid: string
  planId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  status: SubscriptionStatus
  eventType: string
}) {
  const purchasedTier = tierFromPlanId(input.planId)
  const entitlementTier = activeTierForStatus(purchasedTier, input.status)

  await admin.firestore().doc(`users/${input.uid}`).set(
    {
      entitlementTier,
      subscriptionStatus: input.status,
      stripe: {
        customerId: input.customerId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        planId: input.planId ?? null,
        purchasedTier,
        lastEventType: input.eventType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secretKey = stripeSecretKey()
  const webhookSecret = stripeWebhookSecret()
  const signature = req.header('stripe-signature')

  if (!secretKey || !webhookSecret || !signature) {
    res.status(400).json({ error: 'Missing Stripe webhook configuration' })
    return
  }

  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
  let event: Stripe.Event

  try {
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body ?? {}))
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    res.status(400).json({ error: 'Invalid Stripe signature' })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const metadata = metadataFromEventObject(event.data.object)

        if (!metadata.userId) {
          await admin.firestore().collection('stripeWebhookDeadLetters').add({
            eventId: event.id,
            eventType: event.type,
            reason: 'missing_userId_metadata',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          break
        }

        await writeEntitlement({
          uid: metadata.userId,
          planId: metadata.planId,
          customerId: metadata.customerId,
          subscriptionId: metadata.subscriptionId,
          status: metadata.status,
          eventType: event.type,
        })
        break
      }
      default:
        break
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('[URAI] Stripe entitlement webhook failed', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})
