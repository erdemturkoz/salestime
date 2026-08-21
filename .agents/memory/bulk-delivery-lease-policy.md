---
name: Bulk delivery lease policy
description: Required pause and hard-stop semantics for bulk WhatsApp delivery leases and all delivery channels.
---

# Bulk delivery lease policy

Pausing a batch prevents new claims but allows an already valid lease to heartbeat and finish. Stopping is a hard barrier: it cancels active leases and rejects later provider or manual delivery results. Every path that can claim, renew, create an extension authorization, begin manual delivery, or record a result must serialize with the parent batch state.

**Why:** Checking only the candidate row lets a provider or manual workflow commit after an operator has stopped the batch. A stop and an extension grant exchange can also race unless both use the same batch lock.

**How to apply:** New delivery channels must use the batch lock and the same state policy. Preserve terminal-result idempotency only for a result that was already committed before the stop; never accept a still-in-flight lease after hard stop. Keep retry attempts bounded so failed candidates do not loop indefinitely.