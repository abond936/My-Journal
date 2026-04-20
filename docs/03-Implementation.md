# IMPLEMENTATION



**See also:** `01-Vision-Architecture.md` · `02-Application.md`



Legend:

✅`Implemented`

⭕`Planned (1)`

❓`Open`

📐`Decision`

📘`Resource`



---



*App Status*

- **Architecture** - Core architecture (cards, media, tags) in place.

- **v1 Refinements** - Lock and solidify v1.

- **Content** - Prepare content for import.



---



## Execution Plan



*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. This document lists only `⭕1 Planned` items, grouped by phase. Wording of each item must match its source in `02-Application.md` or `01-Vision-Architecture.md` verbatim (see Document Governance in `01-Vision-Architecture.md`).*



**Open questions to resolve before starting:**

*(None blocking.)*



### Phase 1 — Pre-Import

*Complete*

- **Stability Sprint 0 — Integrity gate (CI)** - Implement one blocking CI integrity gate for core invariants on card/media/tag mutation paths. Scope: card-media referential integrity (`coverImageId`, `galleryMedia`, `contentMedia` all resolve to existing `media` docs), no dangling `referencedByCardIds`, and tag-count / derived-field consistency checks on representative create/update/delete flows. Assign a single owner and timebox execution to 2–3 days.

  **Definition of complete**
  - A dedicated CI job runs automatically on pull requests and before merge to `main`.
  - The gate includes at least three automated integrity tests covering the scoped invariants above.
  - The CI job is configured as a required, blocking check for merge.
  - The initial gate run is green on the current baseline branch.
  - Owner and scope are explicitly recorded in the work item/PR notes.
  - A separate emulator-backed integrity job runs nightly and on manual dispatch (non-blocking during stabilization).



### Phase 2 — Admin Productivity

⭕1 **Planned**

*Card Management (`02-Application.md`)*

  **Priority bands**
  - **P1 (import-blocking / workflow-critical)** - **Card edit layout polish**; **Tag picker ergonomics**.
  - **P2 (high workflow value)** - **Grid density reduction**; **Grid tag-chip layout**; **Context Assist**.
  - **P3 (quality extension)** - **Writing Assist**.

- **Writing Assist** - In card edit, provide a simple AI assist for selected text in title/subtitle/excerpt/content with explicit actions (`Make concise`, `Make engaging`, `Elaborate`, `Fix grammar`) and suggestion-only outcomes (`Replace`, `Insert below`, `Dismiss`)—never auto-apply.

- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.

- **Grid tag-chip layout** - In Card Management grid view, move dimensional tag chips to a left-side vertical stack and remove inline dimension-label text (`Who`, `What`, `When`, `Where`) so chips carry the signal without redundant labels.
- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances.
- **Card edit layout polish** - Align card-edit page chrome and section hierarchy for a cleaner authoring flow: header/back/action alignment, consistent section heading scale, tighter spacing between Body/Tags/Gallery/Child Cards, and clearer section ordering.
- **Tag picker ergonomics** - Keep macro-tag editing compact and predictable in card edit: controlled expansion below the command bar, root-first dimensional presentation, and searchable keyboard-friendly result selection with path clarity.

*Tag Management (`02-Application.md`)*

  **Priority bands**
  - **P1 (foundation dependency)** - **Sidebar integration model**.
  - **P2 (consistency hardening)** - **DnD interaction contract**.

- **Sidebar integration model** - Keep one canonical tag tree/data model (`TagProvider`) and support **different views of the same tree**: lightweight viewer sidebar filter view for all users, admin-augmented sidebar controls for admins, and full edit/reorder/reparent workflows on `/admin/tag-admin` / admin surfaces (not a duplicated second tree model).
- **DnD interaction contract** - Before expanding drag-and-drop to additional admin flows (card assignment, gallery/media assignment, broader tree operations), standardize one interaction contract across admin DnD surfaces: drop semantics (on vs between), sensors/activation thresholds, visual drop indicators, drag handles, and keyboard parity. Expansion is gated on this consistency pass.

*Media Management (`02-Application.md`)*

  **Priority bands**
  - **P1 (import-readiness / integrity)** - **Import Metadata Precedence**.
  - **P2 (operator productivity)** - **Media identity & duplicate signals**; **Unassigned duplicate triage**; **Grid admin ergonomics**; **Grid tagging UX + empty-dimension filter**; **Table header attachment**; **Admin pagination consistency**.
  - **P3 (already validated in current baseline)** - **Media delete & referrer resolution**.

- **Import Metadata Precedence** - Finalize precedence policy for embedded metadata vs sidecar JSON when both are present across all import paths.
  - Decision closeout (2026-04-20): import contract is embedded-metadata-only for captions/keywords; JSON sidecars are intentionally out-of-scope for app import flows.
  - Regression evidence: `readMetadataCaption` coverage in integrity tests asserts embedded metadata remains the only caption source used by import code paths.
- **Media delete & referrer resolution** - Align `getCardsReferencingMedia` / `deleteMediaWithCardCleanup` with the same reference surface as `removeMediaReferenceFromCard` (cover, gallery, `contentMedia`, inline HTML `data-media-id`), and/or reconcile `referencedByCardIds` before destructive work, so delete and filters do not trust a stale or incomplete array. Complements Administration notes on card PATCH vs missing `media`.
- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.
- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.
- **Grid admin ergonomics** - In Media **grid** view, remove filename text from the card body, increase bulk-select checkbox target sizes (row and select-all) for reliable admin use, and keep visual focus/checked states obvious.
- **Grid tagging UX + empty-dimension filter** - Replace truncated/illegible grid tag display with an admin-usable layout (readable removable chips and inline add/search affordance on each item), align interaction model with card-management tagging (`search → selectable results → chips with remove X`), and support per-dimension filter modes (`has any`, `is empty`, `matches tag`) for Who/What/When/Where.
- **Table header attachment** - In media table view, keep the header attached to the top edge of the table scroll container (correct sticky offset/z-index) so it remains visible while rows scroll.
- **Admin pagination consistency** - Standardize pagination controls on **Previous/Next** across admin media surfaces (Media Admin, Media Triage, related admin panels) with consistent wording/states for seek vs indexed pagination. This applies to admin only; reader/content surfaces remain continuous.
- **Validation evidence (2026-04-20)** - `npm run test:integrity:emulator` now passes with media-delete/referrer scenarios covering stale `referencedByCardIds` reconciliation, multi-surface card detach (`coverImageId` + `galleryMedia` + `contentMedia` + inline HTML), and missing-media no-op safety.

*Administration (`02-Application.md`)*

  **Priority bands**
  - **P1 (cross-surface reliability)** - **Error/Warning/Notification standardization**.

- **Error/Warning/Notification standardization** - Standardize feedback across admin and reader surfaces with one message contract: domain-coded API errors plus consistent client rendering for success/info/warning/error, actionable copy, and retry guidance where relevant; avoid surfacing raw Firestore/transport errors to users. Align implementation with `docs/04-Theme-Design-Contract.md` §10 and accessibility semantics.
  - Progress update: initial media-admin/API slice shipped — `/api/media` GET, `/api/images/[id]` PATCH/DELETE, `/api/admin/media/tags`, `/api/images/[id]/replace`, `/api/images/browser`, `/api/images/local/import`, `/api/import/folder`, and `/api/import/batch` now emit domain-coded error payloads (`code`, `message`, `severity`, `retryable`), with MediaProvider and media admin/triage panels updated to parse and render warning vs error severity consistently.
  - Progress update: second admin slice shipped — `POST /api/cards` plus `GET`/`POST /api/admin/questions` now emit the same domain-coded error payloads, and dependent admin clients now parse `message`-first error responses consistently.
  - Progress update: question-admin detail slice shipped — `/api/admin/questions/[id]` (`PATCH`/`DELETE`/`POST`/`PUT`) and `/api/admin/questions/[id]/create-card` now emit the same domain-coded payloads for auth, validation, not-found, and server-failure paths.
  - Progress update: user-admin slice shipped — `/api/admin/journal-users` (`GET`/`POST`) and `/api/admin/journal-users/[id]` (`PATCH`) now emit the same domain-coded payloads for auth, validation, conflict/not-found, and server-failure paths.
  - Progress update: theme + maintenance slice shipped — `/api/theme` (`GET`/`POST`), `/api/theme/preview-css` (`POST`), and `/api/admin/maintenance` (`reconcile`/`cleanup`/`backfill`/`diagnose-cover` POST routes) now emit the same domain-coded payloads; Theme admin client parsing now reads structured `message` responses for fetch/save/preview failures.
  - Progress update: cards + AI parity slice shipped — cards list/search/random/bulk/by-ids/duplicate routes and `POST /api/ai/suggest-card-drafts` now emit domain-coded payloads for auth, validation, and server-failure paths, aligning reader/admin card flows with the shared contract.
  - Progress update: tags + import-preview gap slice shipped — `GET`/`POST /api/tags`, `GET`/`PUT`/`PATCH`/`DELETE /api/tags/[id]`, `POST /api/tags/[id]/reparent`, and import preview routes (`/api/import/folder/preview`, `/api/import/batch/preview`) now emit domain-coded payloads, closing the remaining major legacy API gaps.
  - Definition-of-done closeout (2026-04-20): scoped standardization is complete for targeted admin/reader routes and key client surfaces.
  - Validation evidence checklist:
    - API coverage verified for scoped routes: domain-coded JSON payload (`ok: false`, `code`, `message`, `severity`, `retryable`) now used across media, cards/AI, tags, questions, users, theme, maintenance, and import-preview paths.
    - UI severity rendering verified on media admin, media triage, and collections media panel (`warning` vs `error` styles and message parsing from structured payloads).
    - Regression evidence recorded from this sprint: lint pass clean on touched files and integrity suites green (`npm run test:integrity`, `npm run test:integrity:emulator`).

*Backend (`01-Vision-Architecture.md`)*

  **Priority bands**
  - **P1 (architectural correctness)** - **Narrow mutation paths**.

- **Narrow mutation paths** - Route tag-only and similar **narrow** admin mutations through dedicated service functions that batch Firestore field updates and derived-field recompute **once per request** where possible; avoid N sequential full `updateCard` pipelines for bulk work. Keep wide `updateCard` (or equivalent) for structural and rich-content changes.



### Phase 3 — Reader experience

⭕1 **Planned**



*Theme Management (`02-Application.md`)*

  **Priority bands**
  - **P2 (reader polish enabler)** - **CSS Tokenization**.

- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.



*Content Page (`02-Application.md`)*

  **Priority bands**
  - **P1 (reader UX contract)** - **Feed Presentation Matrix**; **Layout `@media` hardening**.
  - **P2 (experience enhancement)** - **In-Feed Expansion**; **Orientation-aware Framing**; **Rail Variant**.

- **Layout `@media` hardening** - Replace `var(--breakpoint-*)` inside `@media` where it affects layout (`V2ContentCard`, `Navigation`, `ViewLayout`, `ContentCard`, `ThemeAdmin`, `TagTree`, etc.) so breakpoints match `docs/04-Theme-Design-Contract.md` §9.2 (literal `px`).
- **Feed Presentation Matrix** - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.
- **Rail Variant** - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.
- **In-Feed Expansion** - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.
- **Orientation-aware Framing** - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.

📐 **Matrix rollout checklist** - Sequence implementation of the matrix contract in this order:
- **Baseline contract** - Implement `Feed Presentation Matrix` logic in code paths used by `V2ContentCard` and `CardDetailPage`, and verify all existing `type` + `displayMode` combinations map to one explicit behavior.
- **Grid-first parity** - Apply `Orientation-aware Framing` in default feed grid and open card surfaces first, using bounded ratio buckets to avoid layout drift.
- **Story expansion** - Implement `In-Feed Expansion` only for story cards in default feed before extending to any other type.
- **Rail activation** - Implement `Rail Variant` with curated eligibility and deterministic ordering after grid parity and story expansion are stable.
- **Regression sweep** - Validate navigation, scroll continuity, and card interaction rules (`open` vs `expand`) across feed, rail, and open-card contexts.

*Left Navigation (`02-Application.md`)*

  **Priority bands**
  - **P1 (mobile reader usability)** - **Mobile-first filter redesign**.
  - **P2 (behavioral consistency)** - **Reader Order Model**; **Sort Semantics**.

- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.

- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.
- **Mobile-first filter redesign** - Sidebar freeform filters move to icon-led chip controls: rename **Card type** to **Cards** and replace single select with five toggle chips/buttons (`story`, `gallery`, `qa`, `quote`, `callout`) where “all” means all five active; Tags remove the `All` dimension tab and use only `Who/What/When/Where`; remove legacy copy/controls for **Show children after tag-filtered parents** from reader sidebar UX; simplify search control copy/presentation (`Search tags...` in-field prompt), reduce sidebar visual density, and keep tag tree collapsed by default (especially mobile) with per-dimension expansion on demand.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Content Page (`02-Application.md`)*

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).



*Tag Management (`02-Application.md`)*

- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."


*Backend (`01-Vision-Architecture.md`)*

- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations.

- **Quality** - QA app.



❓ **Open**

- *(None currently.)*

