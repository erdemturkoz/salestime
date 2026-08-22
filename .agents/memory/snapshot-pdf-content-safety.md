---
name: Snapshot PDF content safety
description: Safe rendering rule for values included in snapshot offer PDFs.
---

Any text carried from an offer snapshot into HTML-based PDF output must be HTML-escaped before interpolation, including education, student, campaign, branch, and gift labels.

**Why:** A direct API request can bypass client-side Excel validation. Persisted values are later opened by staff in a browser print window, so unescaped markup becomes a stored script-injection path.

**How to apply:** Preserve raw values for data and messaging, but convert every dynamic text value to safe HTML at the PDF rendering boundary. Add a regression test whenever a new snapshot text field is introduced.