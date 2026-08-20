---
name: Chrome extension grants
description: Security boundary for the bulk-offer Chrome extension pairing flow.
---

Pairing-code creation and grant revocation must require a same-origin SalesTime request. Grant exchange and queue calls are only cross-origin for the explicitly configured `CHROME_EXTENSION_ORIGIN`; they must never receive credentialed CORS access.

**Why:** The application uses cross-site session cookies for the Replit preview iframe. Reflecting arbitrary request origins with credentialed CORS would let a malicious site create and read pairing codes using a logged-in user's cookie.

**How to apply:** When deploying or changing the extension, set its exact `chrome-extension://…` origin before enabling pairing. Keep extension grants opaque, hash them at rest, and do not broaden origin matching or add cookie authentication to extension routes.