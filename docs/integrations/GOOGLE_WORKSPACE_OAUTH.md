# Google Workspace OAuth for URAI

Canonical runtime: `LifeLoggerAI/urai-spatial/urai-tier1`

## Google Cloud project

Project: `urai-4dc1d`

Required enabled APIs:

- Gmail API
- Google Calendar API
- People API
- Google Drive API

## OAuth consent scopes

Configure Google Auth Platform > Data Access with the narrow production scope set used by the runtime:

- `openid`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/contacts.readonly`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/gmail.readonly`

`gmail.readonly` is a restricted Gmail scope and requires the appropriate Google verification path before broad public use.

## OAuth web client

Create a dedicated Web application client named `URAI Production OAuth`.

Authorized redirect URI:

- `https://urai.app/api/google/oauth/callback`

The Workspace authorization-code flow is server-side, so an Authorized JavaScript Origin is not required for this OAuth client unless a future browser-side Google API flow is introduced. Redirect URIs must match exactly.

## Firebase Functions architecture

URAI's Next runtime is also built as a static export for preview and exact-head acceptance. Server OAuth routes therefore live in `apps/functions/src/googleWorkspaceOAuth.ts` and are exposed through Firebase Hosting rewrites:

- `/api/google/oauth/start` → `googleOAuthStart`
- `/api/google/oauth/callback` → `googleOAuthCallback`
- `/api/google/oauth/status` → `googleOAuthStatus`
- `/api/google/oauth/disconnect` → `googleOAuthDisconnect`

The browser sends the signed-in Firebase user's ID token to the start/status/disconnect endpoints. The callback is invoked directly by Google's OAuth server.

## Server secrets

Store these only in Google Secret Manager / Firebase Functions secrets. Never expose them through `NEXT_PUBLIC_*` variables or commit values to Git.

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`

Generate `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` as 32 cryptographically random bytes encoded as base64.

Non-secret runtime values default to:

- callback: `https://urai.app/api/google/oauth/callback`
- app origin: `https://urai.app`

They can be overridden with `GOOGLE_OAUTH_REDIRECT_URI` and `URAI_APP_ORIGIN` in a controlled non-secret Functions environment if required.

## Runtime flow

1. User signs into URAI with Firebase Auth.
2. Settings POSTs the Firebase ID token to `/api/google/oauth/start`.
3. `googleOAuthStart` verifies Firebase identity, creates PKCE values and a random OAuth state, and stores the one-time state server-side with a ten-minute expiry.
4. Browser redirects to Google's permission screen.
5. Google redirects to `/api/google/oauth/callback`.
6. `googleOAuthCallback` atomically consumes the one-time state, exchanges the authorization code, encrypts OAuth tokens with AES-256-GCM, and stores them in the server-only `providerOAuthTokens` Firestore collection.
7. Non-secret connection metadata is written under `/users/{uid}/providerConnections/google-workspace`.
8. `/api/google/oauth/status` reports connection state to the signed-in user.
9. `/api/google/oauth/disconnect` attempts Google token revocation, deletes local encrypted provider tokens, and marks the connection disconnected.

Existing Firestore rules deny client access to unspecified top-level collections; Firebase Admin writes from Functions bypass client rules. OAuth token documents are therefore server-only at the Firestore Rules layer in addition to application-layer encryption.

## Google console boundary

Google's current OAuth best-practices documentation states that normal OAuth clients cannot be created or modified programmatically. The Cloud Console must be used to create/configure the client and acknowledge OAuth terms. Do not attempt to automate that step through an unrelated IAP or IAM OAuth-client API.

## Verification notes

Keep URAI External / In production. Do not request broader Gmail, Drive, Calendar, or Contacts scopes unless a concrete feature requires them. Google recommends requesting the minimum scopes necessary and using incremental authorization where practical.
