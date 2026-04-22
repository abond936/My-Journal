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



📐 **Studio program status (2026-04-22)** - **Shipped (v1):** **Collections Studio** embed (`CollectionsAdminClient` `embedded`)—multi-pane shell, curated tree + **Attach candidates** bank (title/status/sort + **one** `MacroTagSelector` for **on-card** dimensional tags; **no** on-card vs media-signal matrix in Studio), full **embedded** **`MediaAdminContent`** (search/source/caption/assignment + **one** `MacroTagSelector` for **`GET /api/media`**; **no** compose-card→media merge in Studio), **in-shell `CardForm`** (**Compose**) with cover/gallery/children DnD from the media bank (**`Studio selected-context elimination (v1)`**—relationship-only column removed). **Media-derived tag suggestions** and apply remain on **full-page** card admin (`CardAdminList`), not duplicated in the attach bank; **Attach candidates** **list** table omits those suggestion columns (`hideDimensionMediaSuggestions`) and **refreshes catalog** after in-list card updates. **Admin grids:** card and media **grid** views use **natural-aspect** thumbnails + **vertical dimension rails** + card **search-only** tag row / media caption-under-image + identity-on-hover. **Admin list (table)** compact rows: card list merges **PATCH** payload into SWR cache; media list stacks focal/replace/delete in the actions column when focal is not a separate column. **Primary execution track (remaining ⭕1):** **Studio IA demotion**; **Studio tag rail** + **Sidebar integration model** (**Tag Management** in `02-Application.md`); **Studio inline tags without modal** (extend beyond card-grid rail + narrow search); **`TipTap body media from bank (Studio)`**; **`PhotoPicker convergence in Media admin`**—all verbatim in `docs/02-Application.md`. **Broader DnD contract:** **⭕2** **Relationship DnD contract** + **DnD interaction contract** after shell validation in use (`📐 **Studio unified shell contract**` (7)). **Technical baseline to preserve:** curated collections tree DnD **default-on** (`NEXT_PUBLIC_CURATED_TREE_DND` kill switch); `updateCard` `childrenIds` attach semantics (`curatedRoot` clear, `curatedNavEligible`, `CURATED_COLLECTION_CYCLE` / `CURATED_COLLECTION_CHILD_NOT_FOUND`); client **`fetchAdminCardSnapshot`** + optimistic rollback on embedded tree; Studio **`patchSelectedCard` / card GET** with **`throwIfJsonApiFailed`**; tests: `curated-tree-hardening.test.ts`, `emulator.curated-tree-updateCard.test.ts`, `curatedCollectionTree.test.ts`.



### Phase 1 — Pre-Import

*Complete — baseline recorded in `docs/02-Application.md` → **Administration** ✅ **Integrity gate (CI)**.*



### Phase 2 — Admin Productivity

⭕1 **Planned**



*Integrated execution order:* run **§ Studio sequence** (remaining **⭕1** Studio bullets) first, then **§ Card Management**, **§ Tag Management** (remaining), **§ Media Management** (remaining), **§ Backend**. Each bullet matches **⭕1** in `docs/02-Application.md` verbatim (bold title + text after ` - `).



**§ Studio sequence** *(contract: `docs/02-Application.md` → **Administration** → `📐 **Studio unified shell contract**`; completed v1 items are summarized under **`📐 **Studio program status (2026-04-22)**` above—not duplicated here.)*



- **Studio IA demotion** - Execute navigation hygiene from `📐 **Studio unified shell contract**` (6): hide or demote primary admin IA for `/admin/collections`, Card Management **Collections** when redundant, and `/admin/media-triage`; routes may remain in repo.

- **Studio tag rail** - Full Tag Admin workflows in Studio **left rail** on `TagProvider` per `📐 **Studio unified shell contract**` (1); coordinates with **Sidebar integration model** for `/view`.

- **Sidebar integration model** - **Today:** canonical `TagProvider` tree powers **filter-only** `/view` left-sidebar controls for **all** signed-in users and full tag create/edit/reorder/reparent (including DnD) on `/admin/tag-admin` and in the Studio tag column prototype—**not** a second taxonomy. **Planned:** **role-dependent** views on that same tree—**admins** on `/view` get **full tag-library maintenance** in the left sidebar (parity with `/admin/tag-admin`: add/delete/edit/reorder/reparent); **viewers** unchanged. `/admin/tag-admin` stays until **Studio tag rail** + `/view` admin sidebar fully replace those workflows (`📐 **Studio unified shell contract**` (1)).

- **Studio inline tags without modal** - Extend inline dimensional tagging so **routine** work on **full CardForm** and on **media grid tiles** does not depend on **Edit tags…** / heavy modals (today: card **grid** and media **grid** use the same vertical rail for remove + per-dimension preview; full selector remains via `Edit tags…` and compose uses existing `CardForm` tag surfaces).



**§ Card Management (`02-Application.md`)**



*Priority bands after Studio sequence:* **P2** — **Grid density reduction**; **Context Assist** (grid + list/table admin layout shipped—see **Card Management** / **Media Management** ✅ in `02-Application.md`).



- **TipTap body media from bank (Studio)** - In **Studio** in-shell edit, support **drag** (and **paste** where aligned with editor behavior) from **Media admin** into **TipTap** **content** with correct inline node insertion—larger integration than cover/gallery drop slots (`📐 **Studio media & body (2026-04-22)**`).

- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.

- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances—incremental follow-up now that aspect-accurate thumbnails ship.

- **Card edit layout polish** - Align card-edit page chrome and section hierarchy for a cleaner authoring flow: header/back/action alignment, consistent section heading scale, tighter spacing between Body/Tags/Gallery/Child Cards, and clearer section ordering.

- **Tag picker ergonomics** - Keep macro-tag editing compact and predictable in card edit: controlled expansion below the command bar, root-first dimensional presentation, and searchable keyboard-friendly result selection with path clarity.



**§ Tag Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."

- **Node Strategy** - Raw tag overlay to created aggregations.



**§ Media Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



*Priority bands:* **P2 (operator productivity)** — **Media identity & duplicate signals**; **Unassigned duplicate triage**; **Grid admin ergonomics** (checkbox sizing); **Grid tagging UX** (per-tile inline add/search—pane-level dimensional filters shipped).



- **PhotoPicker convergence in Media admin** - Add operator flows in **`/admin/media`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (`📐 **Studio media & body (2026-04-22)**`).

- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.

- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.

- **Grid admin ergonomics** - **Remaining:** larger bulk-select checkbox target sizes (row and select-all) and any further focus/checked-state polish. **Done:** filename removed from grid tile body; identity strings on image hover (`02-Application.md` **Media Management**).

- **Grid tagging UX + empty-dimension filter** - **Remaining:** optional **per-tile** inline add/search (without modal) for parity with card-grid search foot; table view alignment with the new grid rail pattern if desired. **Done:** pane-level per-dimension modes and vertical rail on grid tiles (`02-Application.md`).



**§ Backend (`01-Vision-Architecture.md`)**



*Priority bands:* **P1 (architectural correctness)** — **Narrow mutation paths**.



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

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).



📐 **Matrix rollout checklist** - Sequence implementation of the matrix contract in this order:

- **Baseline contract** - Implement `Feed Presentation Matrix` logic in code paths used by `V2ContentCard` and `CardDetailPage`, and verify all existing `type` + `displayMode` combinations map to one explicit behavior.

- **Grid-first parity** - Apply `Orientation-aware Framing` in default feed grid and open card surfaces first, using bounded ratio buckets to avoid layout drift.

- **Story expansion** - Implement `In-Feed Expansion` only for story cards in default feed before extending to any other type.

- **Rail activation** - Implement `Rail Variant` with curated eligibility and deterministic ordering after grid parity and story expansion are stable.

- **Regression sweep** - Validate navigation, scroll continuity, and card interaction rules (`open` vs `expand`) across feed, rail, and open-card contexts.



*Left Navigation (`02-Application.md`)*



  **Priority bands**

  - **P1 (mobile reader usability)** - **Mobile-first filter redesign**; **Sidebar roles**.

  - **P2 (behavioral consistency)** - **Reader Order Model**; **Sort Semantics**.



- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.

- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.

- **Mobile-first filter redesign** - Sidebar freeform filters move to icon-led chip controls: rename **Card type** to **Cards** and replace single select with five toggle chips/buttons (`story`, `gallery`, `qa`, `quote`, `callout`) where “all” means all five active; Tags remove the `All` dimension tab and use only `Who/What/When/Where`; remove legacy copy/controls for **Show children after tag-filtered parents** from reader sidebar UX; simplify search control copy/presentation (`Search tags...` in-field prompt), reduce sidebar visual density, and keep tag tree collapsed by default (especially mobile) with per-dimension expansion on demand.

- **Sidebar roles** - **Today:** `/view` uses one left-sidebar layout and the same filter-first control surface for every authenticated user (see **✅ Complete**). **Planned:** differentiate layout and control **depth** by **session role** (viewer vs admin) while keeping drawer/toggle behavior per `docs/04-Theme-Design-Contract.md` §9. **Do not** restate tag taxonomy or API rules here—canonical **⭕1** scope for admin tag maintenance on `/view` and Studio rail: **Tag Management** → **Sidebar integration model**.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Backend (`01-Vision-Architecture.md`)*



- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations.

- **Quality** - QA app.



❓ **Open**

- *(None currently.)*
