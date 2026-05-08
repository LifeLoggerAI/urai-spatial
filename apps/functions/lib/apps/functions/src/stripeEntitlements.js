"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const STRIPE_API_VERSION = '2025-10-29.clover';
function stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
}
function stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;
}
function tierFromPlanId(planId) {
    const normalized = String(planId ?? '').toLowerCase();
    if (normalized.includes('tier3') || normalized.includes('pro') || normalized.includes('premium'))
        return 'tier3';
    if (normalized.includes('tier2') || normalized.includes('plus') || normalized.includes('personal'))
        return 'tier2';
    return 'tier1';
}
function statusFromStripeStatus(status) {
    switch (status) {
        case 'active':
        case 'trialing':
        case 'past_due':
        case 'canceled':
        case 'incomplete':
        case 'unpaid':
            return status;
        default:
            return 'none';
    }
}
function activeTierForStatus(tier, status) {
    if (status === 'active' || status === 'trialing')
        return tier;
    return 'tier1';
}
function metadataFromEventObject(data) {
    const object = data;
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id ?? object.id;
    const planId = object.metadata?.planId ?? object.metadata?.tier ?? object.metadata?.priceId;
    const userId = object.metadata?.userId ?? object.metadata?.uid;
    return {
        userId,
        planId,
        customerId,
        subscriptionId,
        status: statusFromStripeStatus(object.status),
    };
}
async function writeEntitlement(input) {
    const purchasedTier = tierFromPlanId(input.planId);
    const entitlementTier = activeTierForStatus(purchasedTier, input.status);
    await admin.firestore().doc(`users/${input.uid}`).set({
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
    }, { merge: true });
}
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const secretKey = stripeSecretKey();
    const webhookSecret = stripeWebhookSecret();
    const signature = req.header('stripe-signature');
    if (!secretKey || !webhookSecret || !signature) {
        res.status(400).json({ error: 'Missing Stripe webhook configuration' });
        return;
    }
    const stripe = new stripe_1.default(secretKey, { apiVersion: STRIPE_API_VERSION });
    let event;
    try {
        const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body ?? {}));
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    }
    catch (error) {
        res.status(400).json({ error: 'Invalid Stripe signature' });
        return;
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const metadata = metadataFromEventObject(event.data.object);
                if (!metadata.userId) {
                    await admin.firestore().collection('stripeWebhookDeadLetters').add({
                        eventId: event.id,
                        eventType: event.type,
                        reason: 'missing_userId_metadata',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    break;
                }
                await writeEntitlement({
                    uid: metadata.userId,
                    planId: metadata.planId,
                    customerId: metadata.customerId,
                    subscriptionId: metadata.subscriptionId,
                    status: metadata.status,
                    eventType: event.type,
                });
                break;
            }
            default:
                break;
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('[URAI] Stripe entitlement webhook failed', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
