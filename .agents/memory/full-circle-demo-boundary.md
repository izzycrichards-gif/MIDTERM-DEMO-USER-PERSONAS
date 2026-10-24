---
name: Public sample workspace boundary
description: Privacy and persistence constraints for Full Circle's interactive public demo.
---

Keep the public demo isolated from authentication, CRM APIs, the database, and email. It uses fictional fixtures and browser-local storage; demo edits and resets must affect only that sample data.

**Why:** Visitors should be able to explore working examples without exposing or changing real CRM records.

**How to apply:** Build demo features against the namespaced sample store only. Do not reuse authenticated API clients or persistence paths from the signed-in CRM.
