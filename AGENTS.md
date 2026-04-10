# AGENTS — my-journal

This file is an **index only**. Canonical instructions are not duplicated here (avoids drift).

| Topic | Location |
|--------|----------|
| Agent process (assess → recommend → wait; explicit approval before edits) | `.cursor/rules/# AI_InteractionRules.mdc` |
| Vision, principles, tech stack, decisions | `docs/Vision-Architecture.md` |
| App areas: features (✅/⭕/❓/🔵) per section | `docs/Application.md` |
| Execution plan, phased sequencing | `docs/Implementation.md` |

For new work: the author states **what**; the agent proposes **how** after assessment. Implement only after explicit approval.

## Cursor Cloud specific instructions

### Architecture

Next.js 15 (App Router) + React 19 + TypeScript. All data lives in **Firebase** (Firestore + Storage); search via **Typesense Cloud**. No Docker, no local databases — the only local process is the Next.js dev server.

### Required secrets

The `.env` file is gitignored. In Cursor Cloud, add these via the **Secrets panel** (they are injected as env vars; a `.env` must still be written for `NEXT_PUBLIC_*` client-side bundling):

`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_STORAGE_BUCKET_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

### .env file requirement

Next.js **requires** `NEXT_PUBLIC_*` variables in a `.env` file (process env vars alone are not inlined into the client bundle). Future agents must write a `.env` from the injected secrets before running the dev server.

### Running services

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on `localhost:3000` |
| `npm run lint` | ESLint — has pre-existing warnings (see `next.config.ts` `ignoreDuringBuilds`) |
| `npm test` | Jest — some suites have pre-existing failures (missing modules, ESM transform) |
| `npm run build` | Production build |

### Gotchas

- **Typesense** is optional; search falls back to Firestore prefix queries when credentials are absent. Media search returns 503 without it.
- **`FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`** often contains literal `\n` characters; ensure the secret value preserves them correctly.
- The app may already be authenticated (session cookie) after first login; subsequent page loads skip the login screen.
