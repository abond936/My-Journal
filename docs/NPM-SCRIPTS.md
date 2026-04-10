# npm scripts (reference)

Run from the repo root. Most maintenance scripts need Firebase Admin env vars (see `Project.md` → TECHNICAL → Scripting).

| Script | Purpose |
|--------|---------|
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npm run generate-migration-plan` | Migration plan helper |
| `npm run backup-codebase` | Local codebase backup utility |
| `npm run export:csv` | Export data to CSV |
| `npm run backfill:tags` | Tag path backfill (`src/lib/scripts/tags/backfill-tag-paths.ts`) |
| `npm run update:tag-counts -- --apply` | Recalculate hierarchical `cardCount` and `mediaCount` on all tags (`--dry-run` to preview) |
| `npm run diagnose:tag` | Debug single tag |
| `npm run diagnose:cover` | Cover image diagnostic |
| `npm run test:clear-cover` | Dev cover clear test |
| `npm run normalize:images` | Local WebP + JSON normalization (`src/lib/scripts/normalize-images.ts`). Args: `<sourceDir> <destDir>`; append `-- --card-export-only` to process only `*__X.*` files (same rule as admin folder import). See `normalize-images-README.md` and `docs/IMPORT-REFERENCE.md`. |
| `npm run cleanup:media` | Firebase media collection cleanup |
| `npm run reconcile:media-cards` | Diagnose/reconcile media ↔ card references |
| `npm run remove:legacy-cover` | Remove legacy cover fields |
| `npm run backfill:media-metadata` | Backfill media metadata |
| `npm run regenerate:storage-urls` | Regenerate Storage URLs on media docs |
| `npm run seed:journal-users` | Seed `journal_users` for auth |
| `npm run sync:typesense` | Firestore cards → Typesense `cards` collection |
| `npm run sync:typesense:fresh` | Same, drop `cards` index first (`--fresh`) |
| `npm run sync:typesense:media` | Firestore media → Typesense `media` collection (search/facets for `/api/media`) |
| `npm run sync:typesense:media:fresh` | Same, drop media index first (`--fresh`) |

**HTTP maintenance API** (admin-auth only): `POST` routes under `/api/admin/maintenance/` (`reconcile`, `cleanup`, `backfill`, `diagnose-cover`) for tooling or manual calls while there is no Maintenance admin UI. Same operations are often easier via `npm run …` from a machine with Firebase Admin env.

Example — **reconcile** (`src/app/api/admin/maintenance/reconcile/route.ts`): JSON body `{ "action": "diagnose" | "fix", "dryRun"?: true, "cardTitleFilter"?: string, "checkStorage"?: true }`. Diagnose-only returns `{ report }`; fix returns `{ report, after }`. Implementation: `src/lib/scripts/firebase/reconcile-media-cards.ts`.

**Parked:** restore an admin **Maintenance Management** page that wraps these endpoints (see `Project.md` → Administration → Maintenance Management).
