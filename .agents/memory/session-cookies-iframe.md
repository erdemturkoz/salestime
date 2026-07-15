---
name: Session cookies in Replit preview iframe
description: Why session cookies must be SameSite=None; Secure for login to work in the Agent/preview iframe
---

# Session cookies must be SameSite=None; Secure

Express session cookie config MUST be `sameSite: 'none'` + `secure: true` (with `app.set('trust proxy', 1)`).

**Why:** The Replit Agent/workspace preview renders the app inside a cross-site iframe. `SameSite=Lax` cookies are NOT sent in cross-site iframe contexts, so login "works" in a new browser tab (top-level, same-site) but silently fails inside the preview iframe — the session cookie is never stored/sent, `current-user` returns 401, and the app bounces back to the login screen. Replit serves everything over HTTPS behind a proxy, so `secure: true` is satisfied (curl over plain http://localhost will NOT receive Set-Cookie — that is expected, not a bug).

**How to apply:** Any Express/session-based auth here. If a user reports "login works in a new tab but not in the preview / bounces back to login", check the cookie's sameSite/secure first. Do NOT set `sameSite: 'lax'` thinking it is safer for iframes — it breaks them.

Related: the frontend AuthContext must trust the SERVER's current-user response once loaded (not fall back to a stale localStorage user), otherwise a dead session shows a "ghost login" (sidebar visible, every API call 401).

## SameSite=None is necessary but often INSUFFICIENT — use token auth

**Why:** Modern browsers (and the Replit preview iframe in particular) block *third-party cookies* entirely, so even a correct `SameSite=None; Secure` cookie is never stored/returned inside the iframe. Symptom in logs: `POST /api/auth/login` returns 200 (session saved) but the immediately-following `GET /api/auth/current-user` arrives with a DIFFERENT session id and returns 401 every time — the browser is not sending the session cookie back at all.

**How to apply:** Keep cookie sessions for normal tabs, but ALSO issue a signed token on login and authenticate via `Authorization: Bearer` so auth works without cookies. Implementation here: `jose` HS256 token (secret = required `SESSION_SECRET`, no insecure fallback — fail fast if unset), created in `login`; a global `attachUser` middleware (registered right after `setupSession`) sets `req.authUser` from the session cookie OR a verified Bearer token (loading kullanici+roller from storage); `getSessionUser(req)` reads `req.authUser` first, so every existing RBAC guard keeps working unchanged. Frontend stores the token in localStorage (`authStorage` saveToken/getToken/clearToken) and sends it on the default queryFn, `apiRequest`, and every direct auth fetch (both `AuthContext` and the legacy `useAuth` hook — do not leave one behind). Logout clears the token.
