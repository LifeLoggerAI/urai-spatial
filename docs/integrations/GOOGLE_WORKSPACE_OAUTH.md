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

Create a dedicated Web application client named `URAI Production OAuth` rather than reusing an automatically generated Firebase/Google client.

Authorized JavaScript origins:

- `https://urai.app`
- `http://localhost:3000` for local development

Authorized redirect URIs:

- `https://urai.app/api/google/oauth/callback`
- `http://localhost:3000/api/google/oauth/callback` for local development

Redirect URIs must match exactly.

## Server secrets

Configure these only in the protected server runtime / secret store. Never expose them through `NEXT_PUBLIC_*` variables or commit values to Git.

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_STATE_SECRET`
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`

Production redirect value:

`GOOGLE_OAUTH_REDIRECT_URI=https://urai.app/api/google/oauth/callback`

Generate `GOOGLE_OAUTH_STATE_SECRET` with at least 32 random characters.

Generate `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` as 32 random bytes encoded as base64.

## Runtime flow

1. User signs into URAI with Firebase Auth.
2. Client POSTs the Firebase ID token as `Authorization: Bearer <token>` to `/api/google/oauth/start`.
3. Server verifies the Firebase identity, creates CSRF state and PKCE values, stores them in a signed HttpOnly cookie, and returns the Google authorization URL.
4. Browser redirects to Google for consent.
5. Google redirects to `/api/google/oauth/callback`.
6. Server validates state, exchanges the authorization code, encrypts OAuth tokens with AES-256-GCM, and stores them in the server-only `providerOAuthTokens` Firestore collection.
7. Non-secret connection metadata is written under `/users/{uid}/providerConnections/google-workspace`.
8. `/api/google/oauth/status` reports connection state to the signed-in user.
9. `/api/google/oauth/disconnect` deletes stored provider tokens and marks the provider disconnected.

The existing Firestore catch-all denies client access to top-level collections that are not explicitly allowed; Firebase Admin server writes bypass client rules. Provider OAuth tokens therefore remain server-only at the Firestore Rules layer, in addition to application-layer encryption.

## Verification notes

Keep URAI External / In production. Do not request broader Gmail, Drive, Calendar, or Contacts scopes unless a concrete feature requires them. Google recommends requesting the minimum scopes necessary and using incremental authorization where practical.
