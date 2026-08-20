---
name: WhatsApp attribution migrations
description: Safety rule for migrating historical WhatsApp records into mandatory branch and adviser ownership.
---

# WhatsApp attribution migrations

Do not infer a historical WhatsApp record's branch or adviser from display names unless the match is unique and branch-scoped; reject ambiguous rows for manual reconciliation.

**Why:** Branch and adviser names are not stable unique identifiers. Choosing an arbitrary duplicate can permanently expose a candidate's data to the wrong branch once foreign keys and non-null ownership are applied.

**How to apply:** For future ownership/schema migrations, validate every legacy row before backfilling, use canonical IDs and branch-role membership where available, and fail explicitly rather than silently assigning an uncertain owner. Full system administrators retain their all-branch operational scope.