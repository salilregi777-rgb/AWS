# Deploy Relay on AWS Amplify Hosting

The AWS release is a static React application built with Vite. It shares the
same page, components, styles and real Cedar WASM engine as the local preview.
It does not depend on the starter's Cloudflare worker or a server-side runtime.

## Build and verify

Use Node 24 and run these commands from the `relay` directory:

```sh
npm ci
npm run typecheck
npm test
npm run build:aws
npm run preview:aws
```

The production preview is at http://127.0.0.1:5174. Confirm the rehearsal shows
a real volunteer Deny and coordinator Allow, and check the city, 3D field,
navigation, reporting, sounds and motion controls.

On Windows, package the verified output:

```powershell
powershell -NoProfile -File scripts/package-aws.ps1
```

Upload `artifacts/relay-amplify.zip`. Only the contents of `dist-aws` belong in
the upload. Never upload the repository, node_modules, credentials or .env files.

## Publish

1. Sign in to the AWS Amplify console in your chosen AWS region.
2. Choose **Create new app → Deploy without Git**.
3. Use app name `relay-community-response`, branch `production`, and upload
   `artifacts/relay-amplify.zip` with **Drag and drop**.
4. Choose **Save and deploy**. Wait for a successful deployment.
5. Open the generated HTTPS `amplifyapp.com` URL and repeat the rehearsal.
   Confirm Cedar loads, the city image appears, and refresh works.
6. Record the verified URL in the submission and show AWS Amplify in the demo.

No custom domain, SSR compute or backend is required for this release. Navigation
uses application state at `/`, so no additional client-route rewrite is needed.

The root `amplify.yml` supports a later Git-connected build. When connecting a
repository whose app lives in `relay/`, configure that directory as the app root.
Use a Node 24 build image/runtime.

## What this deployment means

- AWS Amplify serves the public application over HTTPS.
- Cedar evaluates real policies in each visitor's browser.
- Incidents and audit history remain in that browser's localStorage. Local
  preview data is not uploaded or transferred to the deployed origin.
- Demo roles are switchable; there is no authenticated login or server-enforced
  authorization. Model-based AI, shared storage and cloud notifications are not
  part of this release.
- Check the AWS account's available credit balance, eligibility and expiration.
  Amplify usage follows the account's billing plan; credits are not an unlimited
  free hosting guarantee. Use AWS billing alerts to monitor usage.

## Updating and rollback

Rebuild and test, retain the previous ZIP, then upload the new ZIP to the same
Amplify branch. If a release regresses, redeploy the previous tested ZIP.

Official instructions: https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html
