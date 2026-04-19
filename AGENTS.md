# AGENTS — my-journal

This file is an **index only**. Canonical instructions are not duplicated here (avoids drift).

| Topic | Location |
|--------|----------|
| Agent process (assess → recommend → wait; explicit approval before edits) | `.cursor/rules/# AI_InteractionRules.mdc` |
| **Change scope** (approved surface only; ask before adjacent UI/API/context edits) | `.cursor/rules/# AI_InteractionRules.mdc` → **Change scope boundary** |
| Vision, principles, tech stack, decisions | `docs/01-Vision-Architecture.md` |
| **Data planes, mutation scope, Typesense limits, list refresh** (normative—read before writes/admin list changes) | `docs/01-Vision-Architecture.md` → **TECHNICAL** → **Backend** / **Frontend** *Principles* + Backend 📐 |
| **Product invariants vs efficiency** (counts, derived tags—no shortcuts that break them; escalate conflicts) | `.cursor/rules/# AI_InteractionRules.mdc` → **Product invariants vs efficiency**; `docs/01-Vision-Architecture.md` → **Denormalized counts** principle + 📐 **Contract vs product** |
| App areas: features (buckets + 📐/📘) per section | `docs/02-Application.md` |
| Execution plan, phased sequencing (`⭕1` only) | `docs/03-Implementation.md` |
| Theme: semantic tokens, presets, reader shell & responsive layout (§9), design-led reconciliation | `docs/04-Theme-Design-Contract.md` |
| Guided archive / AI clustering & story elicitation (seed spec) | `docs/05-Guided-Archive-Assistance.md` |
| Firebase Admin / Firestore CLI scripts (dotenv preload, import order) | `docs/NPM-SCRIPTS.md` → **Firebase Admin CLI (dotenv)** |

**Document count** — Do **not** add new top-level `docs/*.md` files unless the author explicitly approves a new document. Integrate new guidance into the existing split: vision/stack → `01`; app features & behavior → `02`; phased work → `03`; tokens **and** reader responsive/nav layout contract → `04` §9; guided-archive seed → `05`. If unsure, extend the closest existing section rather than creating `06-…`.

For new work: the author states **what**; the agent proposes **how** after assessment. Implement only after explicit approval. If something important is adjacent but **not** specified (extra files, shared state, separate screens), **ask** before adding it to the edit set—do not bundle it by default.

**Operational:** Run **`npm run backup:database`** from the repo root before large Firestore-changing work (e.g. mass import) when the author expects the agent to handle backups; it requires a local `.env` with Firebase Admin + `ONEDRIVE_PATH` (and optional Typesense vars). See `docs/NPM-SCRIPTS.md` → **Firebase Admin CLI (dotenv)** and the `backup:database` row.

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

- **Local image import** (folder + `/api/images/local/import`) uses **`exiftool-vendored`** to read captions and keywords from files. Requires **Node ≥ 20** (dependency engines). The bundled ExifTool runs in child processes on the machine hosting the Next.js server (typical: your desktop with `ONEDRIVE_ROOT_FOLDER`).
- **Typesense** is optional; search falls back to Firestore prefix queries when credentials are absent. Media search returns 503 without it.
- **`FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`** often contains literal `\n` characters; ensure the secret value preserves them correctly.
- **Firestore / Admin scripts:** Preload dotenv (`tsx -r dotenv/config …` or equivalent) so `.env` is loaded **before** modules that import `@/lib/config/firebase/admin`; otherwise static imports initialize Firebase with empty credentials. Details: `docs/NPM-SCRIPTS.md` → **Firebase Admin CLI (dotenv)**.
- The app may already be authenticated (session cookie) after first login; subsequent page loads skip the login screen.
