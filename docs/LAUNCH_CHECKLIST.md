# URAI Spatial Launch Checklist

## Required packages

```bash
npm install firebase firebase-admin stripe
```

## Required environment variables

```env
NEXT_PUBLIC_APP_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_PRO=
NEXT_PUBLIC_STRIPE_PRICE_THERAPIST=
NEXT_PUBLIC_STRIPE_PRICE_FOUNDER=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

## Firebase checklist

1. Create Firebase project.
2. Enable Authentication.
3. Enable Email/Password provider.
4. Enable Firestore.
5. Create service account.
6. Store service account JSON as `FIREBASE_SERVICE_ACCOUNT_JSON`.
7. Deploy Firestore rules so users can read only their own entitlement and backend-only writes remain protected.

## Stripe checklist

1. Create Pro, Therapist, and Founder products/prices.
2. Copy price IDs into env variables.
3. Add webhook endpoint: `/api/stripe/webhook-v2`.
4. Subscribe webhook to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Smoke test

1. Sign up or sign in.
2. Start Pro checkout.
3. Complete Stripe test payment.
4. Confirm Firestore document exists at `userEntitlements/{uid}`.
5. Confirm `/api/entitlement?userId={uid}` returns the paid plan.
6. Confirm gated report features unlock.
7. Cancel subscription in Stripe test mode and confirm entitlement status updates.

## Launch blockers

- Verify `firebase`, `firebase-admin`, and `stripe` are installed.
- Verify all environment variables are present in hosting provider.
- Verify Stripe webhook signing secret is from the deployed endpoint, not local CLI unless testing locally.
- Verify Firebase service account JSON is stringified correctly.
