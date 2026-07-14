# npm scripts (reference)

Run from the repo root. Most maintenance scripts need Firebase Admin env vars (see `01-Vision-Architecture.md` → **TECHNICAL** → **Scripts**; `.env` loading notes there).
**Document role:** Support reference. Owns operator-facing command usage and script-specific caveats.
**Does not own:** Product behavior (`02`), platform principles (`01`), or implementation priority (`03`). When a script reflects a required product/operational guarantee, the guarantee belongs in canon and this file only documents how to operate it.

## Backup model (operator)

| Plane | What | Where |
|--------|------|--------|
| **Code** | Committed source | Git remote (`origin`); do not rely on a second full local tree copy. |
| **Data** | Firestore (+ index/rules, optional Typesense export) + Storage bytes (paired) | **Preferred:** `npm run backup:run -- --apply` → one `Firebase Backups/run-<timestamp>/` with `firestore.json`, `storage/`, `storage-manifest.json`, and `run-manifest.json`. **Legacy:** `backup:database` and `backup:storage` still work separately (separate `run-*` folders). |
| **Storage** | Firebase Storage object bytes only | `npm run backup:storage` → `run-<timestamp>/storage/` + manifest (dry-run by default; `--apply` downloads). Usually use `backup:run` instead. |
| **Repo-root secrets** | `.env*`, `service-account.json`, `*-firebase-adminsdk-*.json` | `npm run backup-codebase` → `CODEBASE_SECRETS_BACKUP_DIR` or default `C:\Users\alanb\CodeBase Backups\` (5 rolling zips + logs). Optional: register a daily Windows task with **`src/lib/scripts/utils/setup-backup-task.ps1`** (run **PowerShell as Administrator**; script resolves repo root via `git`). |

## Restore drill (v1 operator)

This is the current **commercial-readiness restore contract**. **Firestore + Storage byte restore was exercised successfully 2026-07-10** on disposable **`my-journal-restore-drill`**. **Shipped 2026-07-10:** guarded **`restore:storage`** helper, paired **`backup:run`**, and **`restore:run`** orchestrator; post-drill **`npm run build`** + **`npm run test:integrity -- --runInBand`** pass. Remaining release-readiness breadth: disposable-target Typesense rebuild with isolated config, hosted-runtime proof on recovered data, rollback/incident drills.

**Scope and limits**

- **Git remote restores source code**. Do not expect `backup-codebase` to restore the repo tree.
- **`backup:database` restores Firestore data, Firestore indexes/rules snapshots, and optional Typesense document exports.**
- **Storage bytes are not included** in `backup:database` alone; use **`npm run backup:run -- --apply`** for a paired snapshot, or run `backup:storage` separately (legacy separate `run-*` folders).
- **Hosted deployment secrets are not pushed automatically** from the local secrets zip; re-enter them in the host if the platform loses them.
- **The first restore drill target should be a disposable Firebase project, not the live app project.** The guarded restore helper refuses the production project id and defaults to dry-run.

**1. Restore source and local secrets**

- Clone or re-open the repo at the target commit from `origin`.
- Run `npm install`.
- Restore the latest `backup-codebase` zip into the repo root so `.env*`, `service-account.json`, and any `*-firebase-adminsdk-*.json` files are back in place.
- Confirm the restored env files contain the Firebase Admin and Typesense values expected by the target deployment.

**2. Choose the backup run**

- Prefer a **`run-*` folder with `run-manifest.json`** (from `npm run backup:run -- --apply`).
- **`latest-complete-run.json`** under `ONEDRIVE_PATH\Firebase Backups\` points at the newest complete paired run.
- Legacy: **`backup:database` and `backup:storage` each create separate `run-*` folders** — pair by date if needed.
- Check `metadata.json` / `run-manifest.json` for expected collection and object counts.
- Use `firestore.rules` and `firestore.indexes.json` from the **same** run as the restore baseline.

**3. Restore (paired — preferred)**

- Point env at the disposable target: `DOTENV_CONFIG_PATH=.env.test` (keep `.env.live` as production backup).
- Dry-run: `npm run restore:run -- --backup="<run-dir>"`.
- Apply: `npm run restore:run -- --backup="<run-dir>" --apply --confirm-project=<targetProjectId>`.
- Add `--allow-non-empty` only for repeat drills on the same disposable target.
- Legacy single-step commands remain: `restore:database`, `restore:storage`.

**3a. Restore Firestore only (legacy)**

- Treat `firestore.json` as the authoritative database snapshot for that run.
- Point Firebase Admin env vars at the disposable recovery target project first.
- Preview the restore with `npm run restore:database -- --backup="<path-to-run-dir-or-firestore.json>"` (use `DOTENV_CONFIG_PATH=.env.test` or swap `.env` to the disposable target; keep `.env.live` as production backup).
- Apply only after the dry run looks correct: `npm run restore:database -- --backup="<path>" --apply --confirm-project=<targetProjectId>`.
- By default the helper refuses non-empty targets; use `--allow-non-empty` only for an intentional repeat drill on the same disposable target.
- The helper writes documents present in the backup snapshot but does **not** delete extra target documents. For the cleanest drill, use an empty disposable project.
- After the import, deploy Firestore indexes from the restored `firestore.indexes.json` baseline if the target project is missing them.
- If rules drift or a new project is being recovered, restore the matching `firestore.rules` before reopening access.

**3b. Restore Storage only (legacy)**

- Dry-run: `npm run restore:storage -- --backup="<run-dir>"` with `DOTENV_CONFIG_PATH=.env.test`.
- Apply: add `--apply --confirm-project=<targetProjectId>`.
- On a **disposable Firebase project**: enable Storage if needed; publish rules allowing **read on `images/{allPaths=**}`** or reader images 403.
- After Firestore + Storage are both restored, spot-check cards that reference restored media ids before reopening access.

**4. Rebuild search projection**

- After Firestore is restored, rebuild Typesense from Firestore instead of treating the JSONL export as the primary recovery path.
- Run `npm run sync:typesense:fresh`.
- Run `npm run sync:typesense:media:fresh`.
- Use the JSONL exports as inspection evidence or a last-resort reference, not the first restore path.

**5. Reconcile operational content**

- Re-seed the admin user only if `journal_users` is empty: `npm run seed:journal-users`.
- If Theme Management data is missing or stale in Firestore, restore it from the repo fallback with `npm run seed:theme-firestore`.
- If the incident involved media drift, run the existing media repair diagnostics before declaring recovery complete.

**6. Verify before reopening**

- Run `npm run build`.
- Run `npm run test:integrity -- --runInBand`.
- Confirm admin sign-in works.
- Confirm reader sign-in works for a viewer account.
- Check representative cards, media, tags, and search on the hosted or target environment before treating the restore as complete.

## Release readiness (v1 operator)

- Confirm Git `main` is pushed and is the intended rollback point.
- Confirm the latest local secrets backup zip exists and is readable.
- Confirm the latest paired backup run exists with `run-manifest.json`, `firestore.json`, and `storage-manifest.json` (or run `npm run backup:run -- --apply` before release).
- Confirm the hosted environment has the required auth, Firebase, and Typesense env values.
- Confirm hosted Sentry env when error monitoring is desired: `NEXT_PUBLIC_SENTRY_DSN` on Production (and optional `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` for source maps). After deploy, send a test event from the Sentry project **Issues** UI or wait for the first real error.
- Confirm `npm run build`, `npm run lint`, and `npm test -- --ci --runInBand` pass on the intended release revision.
- Confirm GitHub PR CI (`.github/workflows/integrity-gate.yml`) passes lint, build, unit/integrity tests, and hosted Playwright smoke on the intended release revision.
- Confirm there is at least one working admin account and one working viewer account.

## Account recovery (v1 operator)

- **Viewer password reset** - Use **Admin > Users** (`/admin/journal-users`) and set a new password for the affected viewer.
- **Viewer access repair** - Use **Admin > Users** to re-enable a disabled viewer or create a replacement viewer account.
- **Admin password reset** - If an admin can still sign in, use **Admin > Users** to set a new password on the target admin row.
- **Admin lockout** - If no admin can sign in but Firebase Admin credentials still work locally, restore from backup first if needed, then use a controlled Firestore/admin script path to repair the existing admin row or, if `journal_users` is empty, run `npm run seed:journal-users`.
- **Last-admin protection** - The product already blocks disabling the only enabled admin account; do not bypass that safeguard casually during recovery.

## Incident response (v1 operator)

- **Broken deploy** - Roll back to the last known-good pushed revision, confirm hosted env vars, rebuild, then verify login, reader access, and search before reopening.
- **Failed import** - Stop further imports, preserve the failing source folder, run diagnose/reconcile tooling, and verify card/media/tag counts before retrying.
- **Missing media** - Treat as an integrity incident, not just a rendering issue. Diagnose card/media references, repair missing storage links or detach broken references, then verify affected cards.
- **Access leak suspicion** - Treat as highest severity: restrict access, verify route and API protections, rotate affected credentials if needed, and only reopen after boundary verification.
- **Backup or restore failure** - Do not continue with a partial recovery story. Preserve logs, identify the last good backup run, and rerun verification on the chosen recovery point.

## Firebase Admin CLI (dotenv)

**Import order:** If a script has a top-level `import … from '@/lib/config/firebase/admin'` (or anything that pulls in `admin.ts`), Node evaluates that import **before** any `dotenv.config()` in the same file. Firebase Admin then starts with **missing** `FIREBASE_SERVICE_ACCOUNT_*` and fails (e.g. invalid `project_id`).

**Do this:**

- **npm scripts:** run the entry with dotenv preloaded, e.g. `tsx -r dotenv/config path/to/script.ts` (or `ts-node -r dotenv/config -r tsconfig-paths/register -P tsconfig.scripts.json …`).
- **Ad hoc:** `npx tsx -r dotenv/config src/lib/scripts/…` from the repo root. Use `DOTENV_CONFIG_PATH=.env` if the cwd is not the project root.

**Do not** rely on `dotenv.config()` at the top of a script file alone when that file still uses static imports of `admin` above or alongside it—preload wins.

| Script | Purpose |
|--------|---------|
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run lint` | ESLint CLI (`eslint .`) |
| `npm test` | Jest |
| `npm run test:e2e` | Playwright smoke tests (`e2e/smoke/*`), including read-only flows and **6a** admin reader quick-edit PATCH (`admin-save.spec.ts`, restores subtitle after save). **Local:** set `E2E_VIEWER_*` and `E2E_ADMIN_*` in `.env.local`; starts or reuses `npm run dev` when `PLAYWRIGHT_BASE_URL` is unset (default `http://localhost:3000`). **Hosted target:** set `PLAYWRIGHT_BASE_URL` to the Vercel URL (no local dev server). First run: `npx playwright install chromium`. |
| `npm run test:e2e:ui` | Playwright UI mode (local debugging) |

### Playwright CI (GitHub Actions)

**PR gate:** `.github/workflows/integrity-gate.yml` — on pull requests to `main` (and manual dispatch), runs lint, build, unit/integrity tests, and **hosted** `npm run test:e2e` in parallel (`e2e-smoke` job). Fork PRs skip the E2E job when repository secrets are unavailable.

**Scheduled / manual:** `.github/workflows/e2e-smoke.yml` — **nightly** (03:00 UTC) and **manual** (`workflow_dispatch`). Same hosted target and secrets as the PR gate E2E job. Does **not** boot the Next.js app in CI (avoids production Firebase Admin secrets in GitHub).

**Required repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `E2E_BASE_URL` | Hosted app origin, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `E2E_VIEWER_USERNAME` | Dedicated viewer test account |
| `E2E_VIEWER_PASSWORD` | Viewer password |
| `E2E_ADMIN_USERNAME` | Dedicated admin test account |
| `E2E_ADMIN_PASSWORD` | Admin password |

Use **dedicated test accounts** (rotatable), not personal logins. After adding secrets, run **Actions → E2E Smoke → Run workflow** once to confirm green, then open a PR to confirm the PR gate E2E job. Failed runs upload `playwright-report` and `test-results` artifacts (14-day retention).
| `npm run backup-codebase` | **Local secrets only** — zips **repo root** files Git does not track: `.env*`, `service-account.json`, `*-firebase-adminsdk-*.json`. Output dir: `CODEBASE_SECRETS_BACKUP_DIR` or `C:\Users\alanb\CodeBase Backups\`; keeps 5 zips. **Not** a second copy of the source tree (use Git remote). If none of those files exist, writes a log only. |
| `npm run backup:run` | **Preferred paired backup** — one `run-<timestamp>/` with Firestore + Storage manifest in the same folder. Storage is dry-run by default; **`--apply`** downloads bytes, writes `run-manifest.json`, and updates `latest-complete-run.json`. Optional: `--limit=N`, `--progress-every=N` (storage leg). |
| `npm run backup:database` | Firestore-only backup (legacy / partial). Same run layout as before; use `backup:run` for new paired snapshots. |
| `npm run backup:storage` | Storage-only backup (legacy / partial). Creates its own `run-*` folder unless invoked via `backup:run`. |
| `npm run restore:database -- --backup="<path>"` | Guarded Firestore restore for **disposable recovery targets**. Dry-run by default; `--apply` requires `--confirm-project=<targetProjectId>`. |
| `npm run restore:storage -- --backup="<path>"` | Guarded Storage restore for **disposable recovery targets**. Dry-run by default; `--apply` requires `--confirm-project=<targetProjectId>`. Uploads from local `storage/` using `storage-manifest.json`. |
| `npm run restore:run -- --backup="<path>"` | **Preferred paired restore** — Firestore then Storage from one run folder. Dry-run by default; `--apply` requires `--confirm-project=<targetProjectId>`. Optional: `--allow-non-empty`, `--concurrency=N`. |
| `npm run deploy:firestore:indexes` | Deploy **only** Firestore composite indexes from `src/lib/config/firebase/firestore.indexes.json` (paths set in root `firebase.json`). Runs `npx firebase-tools@13 deploy --only firestore:indexes` from the repo root (no global CLI required). Project: `.firebaserc` default (`my-journal-936`). Requires Firebase CLI auth (`npx firebase-tools@13 login` once, or use a CI token). Not the same as Admin service-account scripts. New indexes can take several minutes to finish building in the Firebase console. |
| `npm run export:csv` | Export data to CSV |
| `npm run backfill:tags` | Tag path backfill (`src/lib/scripts/tags/backfill-tag-paths.ts`) |
| `npm run backfill:journal-when-sort` | Backfill `journalWhenSortAsc` / `journalWhenSortDesc` from When tags (`src/lib/scripts/cards/backfill-journal-when-sort.ts`); dry-run by default, add `-- --apply` to write |
| `npm run update:tag-counts -- --apply` | Recalculate hierarchical `cardCount` and `mediaCount` on all tags (`--dry-run` to preview) |
| `npm run diagnose:tag` | Debug single tag |
| `npm run dry-run:import-metadata` | Scan `zMomDadPics` (or pass `-- <dir>`) for `__X` files; ExifTool read + keyword→tag map; no writes except Firestore tag read. Report: `tools/dry-run-import-metadata-report.txt` |
| `npm run import:folder -- "<path>"` | Import **one** leaf folder as a gallery card (`importFolderAsCard`, same as admin **Import folder**). Path: absolute under `ONEDRIVE_ROOT_FOLDER`, or relative to it (forward or back slashes). Example: `npm run import:folder -- "C:\\Users\\you\\OneDrive\\Pictures\\zMomDadPics\\…\\LeafFolder"`. Source: `src/lib/scripts/dev/import-single-folder.ts`. |
| `npm run import:batch-cards -- "<rootPath>" [--limit=N]` | Discover all leaf folders with `__X` images under `rootPath` and import each as a gallery card; skips already-imported paths; continues on errors (e.g. folder over `IMPORT_FOLDER_MAX_IMAGES`). Summary + per-folder JSON: `tools/import-batch-folders-as-cards-last.json`. |
| `npm run backfill:legacy-import-batch` | Assign shared **`batch-legacy`** `importBatchId` to all media rows missing one (`src/lib/scripts/dev/backfill-legacy-import-batch-id.ts`). Default = dry run; append `-- --apply` to write. |
| `npx tsx -r dotenv/config src/lib/scripts/dev/restore-missing-x-media-as-imported.ts [--report="<path>"] [--apply]` | Local-source missing-media restore helper for `__X` folder imports. **Default = preflight only**: resolves the canonical import-source path before deciding `create` vs `merge`, writes JSON/TXT plus per-folder JSONL checkpoints, and makes no writes. Add `--apply` only after reviewing the plan; apply mode requires complete folder success before mutating a card and preserves existing gallery membership on merge. |
| `npm run diagnose:cover` | Cover image diagnostic |
| `npm run test:clear-cover` | Dev cover clear test |
| `npm run normalize:images` | Local WebP + JSON normalization (`src/lib/scripts/normalize-images.ts`). Args: `<sourceDir> <destDir>`; append `-- --card-export-only` to process only `*__X.*` files (same rule as admin folder import). See `normalize-images-README.md` and `docs/IMPORT-REFERENCE.md`. |
| `npm run cleanup:media` | Firebase media collection cleanup |
| `npm run reconcile:media-cards` | Diagnose/reconcile media ↔ card references |
| `npm run remove:legacy-cover` | Remove legacy cover fields |
| `npm run backfill:media-metadata` | Backfill media metadata |
| `npm run backfill:media-studio-renditions` | Create the optional smaller `renditions.studio` preview on existing media docs. Default = dry run; append `-- --apply` to write, `-- --force` to refresh existing rendition records too. |
| `npm run backfill:media-reader-renditions` | Create the feed-optimized `renditions.reader` preview (640px WebP) on existing media docs. Default = dry run; append `-- --apply` to write, `-- --force` to refresh existing reader rendition records too. |
| `npm run typecheck:strict-api` | TypeScript strict check on `src/lib/api` and selected utils (incremental step **11** gate). |
| `npm run regenerate:storage-urls` | Regenerate Storage URLs on media docs |
| `npm run seed:journal-users` | Seed `journal_users` for auth |
| `npm run seed:theme-firestore` | Copy `theme-data.json` → Firestore `app_settings/theme` (aligns hosted SSR tokens with repo) |
| `npm run sync:typesense` | Firestore cards → Typesense `cards` collection |
| `npm run sync:typesense:fresh` | Same, drop `cards` index first (`--fresh`). **Use after Typesense card schema changes** (new facet/sort fields) so the collection is recreated before import. |
| `npm run sync:typesense:media` | Firestore media → Typesense `media` collection (search/facets for `/api/media`) |
| `npm run sync:typesense:media:fresh` | Same, drop media index first (`--fresh`) |

**HTTP maintenance API** (admin-auth only): `POST` routes under `/api/admin/maintenance/` (`reconcile`, `cleanup`, `backfill`, `diagnose-cover`) plus **`GET /api/admin/maintenance/typesense-status`** (Typesense projection health: counts, sample drift, recent sync failures). Same repair operations are often easier via `npm run …` from a machine with Firebase Admin env.

Example — **Typesense status** (`src/app/api/admin/maintenance/typesense-status/route.ts`): `GET` returns `{ ok: true, report }` with Firestore vs Typesense card/media counts, sample missing/orphan ids, recent runtime sync failures, and repair hints. Read-only; use `npm run sync:typesense` / `sync:typesense:media` to repair drift.

Example — **reconcile** (`src/app/api/admin/maintenance/reconcile/route.ts`): JSON body `{ "action": "diagnose" | "fix", "dryRun"?: true, "cardTitleFilter"?: string, "checkStorage"?: true }`. Diagnose-only returns `{ report }`; fix returns `{ report, after }`. Implementation: `src/lib/scripts/firebase/reconcile-media-cards.ts`.

**Parked:** restore an admin **Maintenance Management** page that wraps these endpoints (see `02-Application.md` → **Administration** → **Maintenance Management**).
