# Email reminder operations

Email is off by default. No email is simulated when a sender is unavailable.

## Enable real delivery

1. Configure Resend with a verified sending domain. Set `RESEND_API_KEY` through
   Replit Secrets (never source control).
2. Set `RESEND_EMAIL_FROM` to a permitted sender, for example
   `Full Circle <reminders@your-verified-domain>`.
3. Set `REMINDER_WORKER_ENABLED=true` only in the environment intended to send
   reminders. Keep it off in development when production uses the same sender.
4. Apply the additive database schema using the project's normal schema rollout.
   The development schema push does not migrate production automatically.
5. Run the API on an always-running Reserved VM deployment. Autoscale can stop
   when idle and cannot guarantee reminders while the app is closed. The worker
   runs at API startup and every minute, without browser traffic. Publish only
   after configuring the database and sender.
6. Each user opts in under Settings, saves their IANA timezone, and needs a
   verified primary Clerk email. Settings reports unavailable delivery until the
   three sender variables above are set.

## Timing and lifecycle

Dates remain calendar days in the saved timezone. An omitted time means midnight.
A nonexistent spring-DST time sends at the next valid local minute; repeated fall
times use one durable delivery record. Missed/overdue reminders are caught up on
restart. Completing a recurring follow-up still creates the next follow-up using
the existing completion flow; the worker never completes or advances it.

Rescheduling increments the occurrence revision. An old pending occurrence is
cancelled before sending; a new revision can get its own reminder. Contact
deletion cascades queue cleanup. Already-accepted emails cannot be recalled.
Opt-out cancels unsent jobs; re-enabling does not replay previously cancelled or
sent occurrences. Reschedule the follow-up to request a new reminder.

## Durability and retries

Delivery records are separate from in-app notifications, so reading or deleting
an in-app notification does not reset email deduplication. A database uniqueness
constraint covers follow-up + revision. Each delivery has a database-generated
UUID used as the provider idempotency key, avoiding collisions across environments.
The exact sender, recipient, subject, and body are frozen on first attempt.

The first-attempt timestamp and a five-minute recovery lease are committed before
the network send. The worker holds lifecycle and preference row locks during
the bounded (15-second) request. Concurrent workers recheck state under those
locks; retries reuse the same provider key and payload after a crash.

Retryable failures use exponential backoff starting at one minute, capped at
thirty minutes. Eight attempts or a 23-hour safety window stops automatic retries.
This is deliberately shorter than Resend's 24-hour key retention: if a request
was accepted but its acknowledgement was lost, a late retry could send twice.
Such records become `uncertain` rather than pretending to be delivered or
silently sending again. Reconcile them against Resend before any manual action.
Permanent rejection is `failed`. `sent` means provider acceptance, not inbox
delivery; bounce/delivery webhooks are not part of this implementation.

If the account's verified primary email changes, the old attempt is cancelled.
Save Settings again to verify the new address. Frozen retries never switch
recipients.

## Checks

- `pnpm --filter @workspace/api-server test`: calendar/timezone, DST, retries,
  key-window, and unconfigured-transport tests; no delivery is simulated.
- `pnpm --filter @workspace/api-server test:db`: real development PostgreSQL
  fixtures covering uniqueness, owner isolation, persisted retry state,
  rescheduling/completion/deletion, and crash-window guards. This script explicitly
  disables email sending and removes its fixtures. Never run it against production.
- `pnpm run typecheck`: full workspace type check.

A live inbox test requires the sender connection, verified domain, and a consenting
test account. It has not been performed when those are unavailable.
