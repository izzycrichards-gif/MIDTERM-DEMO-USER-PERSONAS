# Full Circle

**Intended audience:** Freelancers, artists, and small businesses.

**What it does:** Full Circle is a relationship CRM that keeps contact details and conversation context together, then shows who is due for a follow-up.

**Live app:** [Open Full Circle](https://full-circle-izzycrichards.replit.app/)

## Features

- Add, search, filter, sort, and manage contacts.
- Keep company and role details, contact information, social links, notes, relationship status, and tags.
- Review a contact profile and its interaction history.
- Schedule one-time or recurring follow-ups, with optional times.
- See overdue, due-today, and upcoming follow-ups on the dashboard.
- Manage tags and reminder preferences.
- Sign up and sign in with Clerk.
- Explore a public sample workspace with fictional contact data.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page; signed-in users are routed to the dashboard |
| `/sign-in` | Sign in |
| `/sign-up` | Create an account |
| `/dashboard` | Follow-up overview |
| `/contacts` | Search and manage contacts |
| `/contacts/:id` | Contact profile and relationship history |
| `/follow-ups` | Follow-up list |
| `/settings` | Tags and reminder settings |
| `/demo/dashboard` | Public interactive sample workspace |

In Replit, Full Circle is mounted at `/`. Do not add `/relationship-crm` to its published URL.

## Workspace structure

- `artifacts/relationship-crm` — React and TypeScript frontend, built with Vite.
- `artifacts/api-server` — API server used by the signed-in CRM.
- Shared API client and database packages are managed from the workspace root.

The public sample workspace uses fictional fixtures and browser-local storage. Its edits and resets must remain separate from authentication, the CRM API, and real CRM data.

## Run in Replit

Start both configured workflows:

- `artifacts/api-server: API Server`
- `artifacts/relationship-crm: web`

The workflows provide the required runtime settings. If starting the Vite app manually, it requires `PORT` and `BASE_PATH`; see `artifacts/relationship-crm/.replit-artifact/artifact.toml`.

## Development commands

Run these from the workspace root:

```bash
pnpm install
pnpm --filter @workspace/relationship-crm run typecheck
pnpm --filter @workspace/relationship-crm run build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
```

To start the services manually, run each command in its own terminal and configure the required environment variables:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/relationship-crm run dev
```

## Configuration

Authentication and backend services rely on workspace environment variables. Configure credentials with Replit Secrets; do not commit secret values to the repository.
