---
name: RBAC branch/role model
description: How multi-branch role-based access control is designed in this app (roles, scoping, isolation rules)
---

# Branch/Role access model

Three role tiers (stored in `kullaniciSubeRolleri.rol`, per-branch):
- **Full Admin** = "Kurucu" or "Sistem Yöneticisi" — sees/manages ALL branches.
- **Müdür** — branch-scoped; full CRUD on OWN-branch campaigns; may add/edit/remove ONLY "Satış Danışmanı" users in own branch.
- **Satış Danışmanı** — consultant; uses campaigns only, no management.

Rules enforced (backend is source of truth, frontend mirrors for UX):
- Campaigns are strictly branch-isolated: NO global campaigns. `subeId` is REQUIRED on create; müdür's subeId is forced to own branch; PUT preserves existing subeId.
- Non-admins' campaign reads are forced to their own subeIds regardless of query params.
- Şubeler & Eğitim Tipleri management = Full Admin ONLY (`isFullAdmin`). Reads = any authenticated user.
- Müdür user-management is gated by two helpers in `server/routes.ts`: `mudurRollerGecerliMi` (submitted roles must all be danışman in managed branches) and `kullaniciMudureAitMi` (target user's ALL roles must be danışman in managed branches — else untouchable).
- Müdür user LIST is filtered to fully-managed danışmanlar only (never leak mixed-role/other-branch users).

**Why:** A müdür must never escalate a user to Müdür/Kurucu, touch privileged accounts, or see cross-branch data. Sanitizing the list + target-user checks on every user/sube-rol mutation closes privilege-escalation and data-leak gaps.

**How to apply:** Any new user/campaign/branch endpoint must branch on `isFullAdminUser`; for müdür path, validate BOTH the submitted role/branch AND the target user's manageability.

Middleware: `canManageCampaigns` = fullAdmin OR müdür; `isFullAdmin` = fullAdmin only. Frontend `useAuth()` exposes `isFullAdmin`, `canManageCampaigns`, `isMudur`, `isDanisman`, `getManagedSubeIds`; `isAdmin` kept as alias for canManageCampaigns (backward compat).
