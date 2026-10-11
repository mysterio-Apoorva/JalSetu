# JAL-SETU frontend

React, TypeScript, Vite, Tailwind and Leaflet. Run `npm ci`, then `npm run dev`. Root `.env` controls demo/AWS mode through Vite’s `envDir`; do not create a frontend environment file. Run `npm run build`, `npm run lint`, and `npx playwright test`. See [project README](../README.md) and [AWS setup](../docs/AWS_SETUP.md).

## Native Cognito sign-in

AWS mode uses the public app client `16ploao82gc7qg4djtua5sdbuh` in pool `us-east-1_ko5ROUcaz`. Email/password sign-in and refresh use direct Cognito HTTPS requests; no AWS browser SDK is installed. The client must allow `USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH`, have no client secret, and have refresh token rotation disabled for this refresh flow. See the [AWS InitiateAuth reference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html).

For local live use, open **http://localhost:5174** after `npm run dev`. The deployed API's `ALLOWED_ORIGIN` is currently exactly this origin; using `127.0.0.1` or another port fails browser CORS checks. A hosted or physical Android deployment needs its actual HTTPS origin configured in the API's `AllowedOrigin` parameter. Run the live suite separately from the mock suite because both use port 5174.

The ID token supplies API authorization; group claims select the permitted workspaces. Citizen, Driver, Dispatcher and Auditor map to the citizen portal, driver workspace, command center and transparency board. API Gateway and backend policies remain responsible for token signature validation and access control. Accounts with no recognized role cannot open a workspace. Additional Cognito challenges (including MFA and mandatory password changes) currently show an actionable account-setup error; they are not completed in this UI.

Sessions are stored only in `sessionStorage`, restored on reload, and refreshed two minutes before the earlier ID/access token expiry. Requests also check token freshness, and focus/visibility/online events recover sleeping tabs. Concurrent refreshes share a single request. Temporary network failures retain the session and retry; rejected refresh tokens return to sign-in. Sign-out immediately clears the tab and calls `RevokeToken` for that session, leaving other independent sessions signed in. Network failure during revocation is reported on the login screen.

Set `VITE_ENABLE_DEMO_LOGIN=true` in the root `.env` to enable the four one-tap public demo accounts already provisioned by `scripts/setup_cognito.py`. This is enabled for the local hackathon workspace. Set it to `false` for municipal production builds: demo credentials are intentionally public browser assets when this option is enabled. Ordinary email/password sign-in remains available. Open four fresh tabs and select a different persona in each. Browser “Duplicate tab” can initially copy session storage; sign out in the duplicate before selecting another account.

Validation commands (from `frontend`):

```sh
npm run build
npm run lint
npx playwright test
# Explicit live AWS read-only UI smoke test with existing demo accounts:
npx playwright test --config playwright.live.config.ts
```

The live test signs in all four personas, reads their AWS workspaces, checks 360px and 4K overflow, restores a session and revokes each test session. It does not dispatch tankers or create municipal records. Screenshots are written under `.runtime/`. From the repository root, `python scripts/verify_cognito_auth.py` independently verifies live sign-in, groups, refresh and API access using the existing `scratch_cognito.json` accounts, without printing tokens or passwords.
