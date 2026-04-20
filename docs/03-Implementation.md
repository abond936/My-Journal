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

  **Operational ownership (runbook)**
  - Assign one weekly **Integrity Owner** to monitor `integrity-gate` and `Integrity Emulator` workflow runs.
  - On any failure, triage same day and open a fix ticket immediately with owner + ETA.
  - If `integrity-gate` fails, block merge until resolved; if nightly emulator fails, treat as high-priority and resolve before promotion to required status.
  - Re-evaluate emulator job after 7 consecutive green nightly runs and then promote it to a required check for `main`.



### Phase 2 — Admin Productivity

⭕1 **Planned**

*Card Management (`02-Application.md`)*

- **Writing Assist** - In card edit, provide a simple AI assist for selected text in title/subtitle/excerpt/content with explicit actions (`Make concise`, `Make engaging`, `Elaborate`, `Fix grammar`) and suggestion-only outcomes (`Replace`, `Insert below`, `Dismiss`)—never auto-apply.

- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.

- **Grid tag-chip layout** - In Card Management grid view, move dimensional tag chips to a left-side vertical stack and remove inline dimension-label text (`Who`, `What`, `When`, `Where`) so chips carry the signal without redundant labels.
- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances.

*Tag Management (`02-Application.md`)*

- **Sidebar integration model** - Keep one canonical tag tree/data model (`TagProvider`) and support **different views of the same tree**: lightweight viewer sidebar filter view for all users, admin-augmented sidebar controls for admins, and full edit/reorder/reparent workflows on `/admin/tag-admin` / admin surfaces (not a duplicated second tree model).
- **DnD interaction contract** - Before expanding drag-and-drop to additional admin flows (card assignment, gallery/media assignment, broader tree operations), standardize one interaction contract across admin DnD surfaces: drop semantics (on vs between), sensors/activation thresholds, visual drop indicators, drag handles, and keyboard parity. Expansion is gated on this consistency pass.

*Media Management (`02-Application.md`)*

- **Import Metadata Precedence** - Finalize precedence policy for embedded metadata vs sidecar JSON when both are present across all import paths.
- **Media delete & referrer resolution** - Align `getCardsReferencingMedia` / `deleteMediaWithCardCleanup` with the same reference surface as `removeMediaReferenceFromCard` (cover, gallery, `contentMedia`, inline HTML `data-media-id`), and/or reconcile `referencedByCardIds` before destructive work, so delete and filters do not trust a stale or incomplete array. Complements Administration notes on card PATCH vs missing `media`.
- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.
- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.
- **Grid admin ergonomics** - In Media **grid** view, remove filename text from the card body, increase bulk-select checkbox target sizes (row and select-all) for reliable admin use, and keep visual focus/checked states obvious.
- **Grid tagging UX + empty-dimension filter** - Replace truncated/illegible grid tag display with an admin-usable layout (readable removable chips and inline add/search affordance on each item), align interaction model with card-management tagging (`search → selectable results → chips with remove X`), and support per-dimension filter modes (`has any`, `is empty`, `matches tag`) for Who/What/When/Where.
- **Table header attachment** - In media table view, keep the header attached to the top edge of the table scroll container (correct sticky offset/z-index) so it remains visible while rows scroll.
- **Admin pagination consistency** - Standardize pagination controls on **Previous/Next** across admin media surfaces (Media Admin, Media Triage, related admin panels) with consistent wording/states for seek vs indexed pagination. This applies to admin only; reader/content surfaces remain continuous.
  - Progress update: bulk media tag add/replace/remove now uses `bulkApplyMediaTags` (batched transactions) instead of per-item patch/recompute loops; route-level integrity guard coverage added for the narrow path.

*Administration (`02-Application.md`)*

- **Error/Warning/Notification standardization** - Standardize feedback across admin and reader surfaces with one message contract: domain-coded API errors plus consistent client rendering for success/info/warning/error, actionable copy, and retry guidance where relevant; avoid surfacing raw Firestore/transport errors to users. Align implementation with `docs/04-Theme-Design-Contract.md` §10 and accessibility semantics.

*Backend (`01-Vision-Architecture.md`)*

- **Narrow mutation paths** - Route tag-only and similar **narrow** admin mutations through dedicated service functions that batch Firestore field updates and derived-field recompute **once per request** where possible; avoid N sequential full `updateCard` pipelines for bulk work. Keep wide `updateCard` (or equivalent) for structural and rich-content changes.
  - Progress update: bulk card tag add/remove now uses `bulkApplyTagDelta` (batched transactions) instead of per-card `updateCard`; remaining narrow mutation paths stay in scope.



### Phase 3 — Reader experience

⭕1 **Planned**



*Theme Management (`02-Application.md`)*

- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.



*Content Page (`02-Application.md`)*

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

- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.

- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.
- **Mobile-first filter redesign** - Sidebar freeform filters move to icon-led chip controls: rename **Card type** to **Cards** and replace single select with five toggle chips/buttons (`story`, `gallery`, `qa`, `quote`, `callout`) where “all” means all five active; Tags remove the `All` dimension tab and use only `Who/What/When/Where`; remove legacy copy/controls for **Show children after tag-filtered parents** from reader sidebar UX; tag tree is collapsed by default (especially mobile) and expands per selected dimension on demand.



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

