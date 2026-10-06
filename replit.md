# Full Circle

A focused CRM for freelancers, artists, creative entrepreneurs, and small businesses to organize contacts and maintain relationships through follow-ups.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/relationship-crm` — React web app, branded authentication, dashboard, contacts, follow-ups, and settings.
- `artifacts/api-server/src/routes/crm` — authenticated CRM API routes.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts.
- `lib/db/src/schema` — Drizzle database models.

## Architecture decisions

- Clerk owns authentication; never implement local passwords or browser bearer-token handling.
- Data belongs to the authenticated account. Ownership must be checked for all reads, writes, and related tags.
- Follow-up dates are calendar days; optional times are interpreted in the user's browser timezone.
- In-app reminders are checked while open and by the API's background worker. Email is opt-in and uses a real Resend sender only when configured; push is not implemented.
- Email scheduling uses the saved account timezone. Run the API on an always-running deployment for closed-app delivery. See `artifacts/api-server/REMINDERS.md` for sender setup, retry safety, and verification.

## Product

- Add, edit, delete, search, and organize contacts with tags and eight relationship statuses.
- Schedule one-time or recurring follow-ups; complete them and optionally create the next reminder.
- Record interaction history and track the most recent contact date.
- Follow-up-first dashboard and in-app notification list.
- Individual accounts with isolated persistent data, sign-up, sign-in, password reset, and logout.

## User preferences

- Prioritize simplicity over adding too many features.
- The first version should make the contact → reminder → interaction → completion → next follow-up workflow extremely easy and intuitive.
- Modern, minimal, professional presentation with clear typography and plenty of whitespace.

## Gotchas

- Run API codegen after every OpenAPI change.
- Generated Zod response schemas coerce dates. Validate responses but send original calendar-date strings to avoid turning date-only values into timestamps.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

