# npm scripts (reference)

Run from the repo root. Most maintenance scripts need Firebase Admin env vars (see `01-Vision-Architecture.md` → **TECHNICAL** → **Scripts**; `.env` loading notes there).

## Backup model (operator)

| Plane | What | Where |
|--------|------|--------|
| **Code** | Committed source | Git remote (`origin`); do not rely on a second full local tree copy. |
| **Data** | Firestore (+ index/rules, optional Typesense export) | `npm run backup:database` → OneDrive `Firebase Backups/run-<timestamp>/` (see table row below; needs `ONEDRIVE_PATH`). |
| **Repo-root secrets** | `.env*`, `service-account.json`, `*-firebase-adminsdk-*.json` | `npm run backup-codebase` → `CODEBASE_SECRETS_BACKUP_DIR` or default `C:\Users\alanb\CodeBase Backups\` (5 rolling zips + logs). Optional: register a daily Windows task with **`src/lib/scripts/utils/setup-backup-task.ps1`** (run **PowerShell as Administrator**; script resolves repo root via `git`). |

## Firebase Admin CLI (dotenv)

**Import order:** If a script has a top-level `import … from '@/lib/config/firebase/admin'` (or anything that pulls in `admin.ts`), Node evaluates that import **before** any `dotenv.config()` in the same file. Firebase Admin then starts with **missing** `FIREBASE_SERVICE_ACCOUNT_*` and fails (e.g. invalid `project_id`).

**Do this:**

- **npm scripts:** run the entry with dotenv preloaded, e.g. `tsx -r dotenv/config path/to/script.ts` (or `ts-node -r dotenv/config -r tsconfig-paths/register -P tsconfig.scripts.json …`).
- **Ad hoc:** `npx tsx -r dotenv/config src/lib/scripts/…` from the repo root. Use `DOTENV_CONFIG_PATH=.env` if the cwd is not the project root.

**Do not** rely on `dotenv.config()` at the top of a script file alone when that file still uses static imports of `admin` above or alongside it—preload wins.

| Script | Purpose |
|--------|---------|
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npm run generate-migration-plan` | Migration plan helper |
| `npm run backup-codebase` | **Local secrets only** — zips **repo root** files Git does not track: `.env*`, `service-account.json`, `*-firebase-adminsdk-*.json`. Output dir: `CODEBASE_SECRETS_BACKUP_DIR` or `C:\Users\alanb\CodeBase Backups\`; keeps 5 zips. **Not** a second copy of the source tree (use Git remote). If none of those files exist, writes a log only. |
| `npm run backup:database` | Full Firestore (all root collections) + copy `firestore.indexes.json` / `firestore.rules` + optional Typesense `cards`/`media` JSONL → OneDrive `Firebase Backups/run-<timestamp>/` (needs `ONEDRIVE_PATH` + service account; `tsx -r dotenv/config`). Does not download Storage bytes. |
| `npm run deploy:firestore:indexes` | Deploy **only** Firestore composite indexes from `src/lib/config/firebase/firestore.indexes.json` (paths set in root `firebase.json`). Runs `npx firebase-tools@13 deploy --only firestore:indexes` from the repo root (no global CLI required). Project: `.firebaserc` default (`my-journal-936`). Requires Firebase CLI auth (`npx firebase-tools@13 login` once, or use a CI token). Not the same as Admin service-account scripts. New indexes can take several minutes to finish building in the Firebase console. |
| `npm run export:csv` | Export data to CSV |
| `npm run backfill:tags` | Tag path backfill (`src/lib/scripts/tags/backfill-tag-paths.ts`) |
| `npm run backfill:journal-when-sort` | Backfill `journalWhenSortAsc` / `journalWhenSortDesc` from When tags (`src/lib/scripts/cards/backfill-journal-when-sort.ts`); dry-run by default, add `-- --apply` to write |
| `npm run update:tag-counts -- --apply` | Recalculate hierarchical `cardCount` and `mediaCount` on all tags (`--dry-run` to preview) |
| `npm run diagnose:tag` | Debug single tag |
| `npm run dry-run:import-metadata` | Scan `zMomDadPics` (or pass `-- <dir>`) for `__X` files; ExifTool read + keyword→tag map; no writes except Firestore tag read. Report: `tools/dry-run-import-metadata-report.txt` |
| `npm run import:folder -- "<path>"` | Import **one** leaf folder as a gallery card (`importFolderAsCard`, same as admin **Import folder**). Path: absolute under `ONEDRIVE_ROOT_FOLDER`, or relative to it (forward or back slashes). Example: `npm run import:folder -- "C:\\Users\\you\\OneDrive\\Pictures\\zMomDadPics\\…\\LeafFolder"`. Source: `src/lib/scripts/dev/import-single-folder.ts`. |
| `npm run import:batch-cards -- "<rootPath>" [--limit=N]` | Discover all leaf folders with `__X` images under `rootPath` and import each as a gallery card; skips already-imported paths; continues on errors (e.g. folder over `IMPORT_FOLDER_MAX_IMAGES`). Summary + per-folder JSON: `tools/import-batch-folders-as-cards-last.json`. |
| `npm run diagnose:cover` | Cover image diagnostic |
| `npm run test:clear-cover` | Dev cover clear test |
| `npm run normalize:images` | Local WebP + JSON normalization (`src/lib/scripts/normalize-images.ts`). Args: `<sourceDir> <destDir>`; append `-- --card-export-only` to process only `*__X.*` files (same rule as admin folder import). See `normalize-images-README.md` and `docs/IMPORT-REFERENCE.md`. |
| `npm run cleanup:media` | Firebase media collection cleanup |
| `npm run reconcile:media-cards` | Diagnose/reconcile media ↔ card references |
| `npm run remove:legacy-cover` | Remove legacy cover fields |
| `npm run backfill:media-metadata` | Backfill media metadata |
| `npm run regenerate:storage-urls` | Regenerate Storage URLs on media docs |
| `npm run seed:journal-users` | Seed `journal_users` for auth |
| `npm run seed:theme-firestore` | Copy `theme-data.json` → Firestore `app_settings/theme` (aligns hosted SSR tokens with repo) |
| `npm run sync:typesense` | Firestore cards → Typesense `cards` collection |
| `npm run sync:typesense:fresh` | Same, drop `cards` index first (`--fresh`). **Use after Typesense card schema changes** (new facet/sort fields) so the collection is recreated before import. |
| `npm run sync:typesense:media` | Firestore media → Typesense `media` collection (search/facets for `/api/media`) |
| `npm run sync:typesense:media:fresh` | Same, drop media index first (`--fresh`) |

**HTTP maintenance API** (admin-auth only): `POST` routes under `/api/admin/maintenance/` (`reconcile`, `cleanup`, `backfill`, `diagnose-cover`) for tooling or manual calls while there is no Maintenance admin UI. Same operations are often easier via `npm run …` from a machine with Firebase Admin env.

Example — **reconcile** (`src/app/api/admin/maintenance/reconcile/route.ts`): JSON body `{ "action": "diagnose" | "fix", "dryRun"?: true, "cardTitleFilter"?: string, "checkStorage"?: true }`. Diagnose-only returns `{ report }`; fix returns `{ report, after }`. Implementation: `src/lib/scripts/firebase/reconcile-media-cards.ts`.

**Parked:** restore an admin **Maintenance Management** page that wraps these endpoints (see `02-Application.md` → **Administration** → **Maintenance Management**).
