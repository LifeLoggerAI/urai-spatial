# URAI Spatial Deploy Guide

## 1. Local setup

```bash
npm install
npm run dev
```

Test Stripe locally using Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook-v2
```

## 2. Production hosting

Recommended:
- Vercel
- Firebase Hosting

## 3. Environment setup (hosting dashboard)

Add all required env variables from `.env.example`.

## 4. Stripe production setup

- Switch to live mode
- Create live products/prices
- Update env values
- Recreate webhook endpoint for production URL

## 5. Firebase production setup

- Confirm Auth providers
- Confirm Firestore rules
- Confirm service account is valid

## 6. Post-deploy verification

- Login works
- Checkout works
- Webhook fires
- Firestore updates entitlement
- UI unlocks features

## 7. Monitoring

- Enable Stripe event logs
- Enable Firebase logs
- Add console/error monitoring (Sentry optional)

## 8. Rollback plan

- Keep previous deployment version
- Disable Stripe webhook if needed
- Revert env variables if misconfigured

## 9. Performance notes

- Firestore reads are lightweight
- Entitlement calls should be cached client-side briefly
- Avoid refetch loops

## 10. Security reminders

- Never expose Stripe secret key
- Never expose Firebase service account JSON
- Only backend writes to Firestore entitlements
