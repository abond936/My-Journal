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
| `npm run update:tag-counts` | Recalculate tag counts |
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

**HTTP maintenance API** (admin-auth only): `POST` routes under `/api/admin/maintenance/` (`reconcile`, `cleanup`, `backfill`, `diagnose-cover`) remain available for tooling or manual calls; the **Maintenance** admin page was removed in favor of this document + CLI.
