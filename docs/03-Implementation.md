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

- **Hosted reader launch** - Private Vercel reader deployment is live; current stabilization priority is reader/mobile tuning plus auth/privacy validation rather than expanding mobile authoring scope.



---



## Execution Plan



*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. This document lists only `⭕1 Planned` items, grouped by phase. Wording of each item must match its source in `02-Application.md` or `01-Vision-Architecture.md` verbatim (see Document Governance in `01-Vision-Architecture.md`).*



**Open questions to resolve before starting:**

*(None blocking.)*

📐 **Current optimization stance** - Near-term implementation should favor faster tagging and relationship workflows, narrower mutations, and fewer parallel admin interaction patterns over adding breadth. In Studio specifically, prefer local post-mutation reconciliation over broad reloads: reuse returned card payloads after save, patch card/media catalogs locally when integrity allows, and reserve broad refetch for structural truth changes. Architectural convergence target: formalize **Studio** as a multi-domain shell with explicit separation between **global structure/taxonomy**, **pane-local card/media workspaces**, and the **shell-owned active card**.

📐 **Guided archive program (2026-04-24)** - **Spec:** `docs/05-Guided-Archive-Assistance.md` (seed; expands dual-audience intake, clustering, and promotion). **Intent:** make **large folder / roll ingest** viable for people who have **not** pre-tagged outside the app—**suggest and confirm** before anything becomes reader-facing truth. **Audience A (scans / folder dumps):** unreliable EXIF; lean on **folder scope**, **visual similarity**, **face hints** (never silent identity), and **review stacks** (split/merge) → **promote** to **Gallery** or **Story** with **Who/What/When/Where** and a title (e.g. one occasion), then use existing admin/reader behavior. **Audience B (digital-native):** prioritize **capture time**, **GPS**, **album/event** metadata, **burst** and **near-duplicate** detection, **Live Photo / motion-companion** pairing, and **video** where parity allows; use heavier AI only to **fill gaps**. **Primitives:** **provisional** job state + derived features (embeddings, cluster ids) **separate** from canonical Firestore tags/cards/media until confirmed; **version/burst stacks** so grids and reader surfaces do not present a **firehose of seconds-apart duplicates**. **Engineering guardrails:** promotion and bulk writes must preserve **denormalized counts**, **derived tag fields**, and **card–media integrity** per `docs/01-Vision-Architecture.md` (**Backend** *Principles*, **Delete graph**, **Durability boundary**, 📐 **Bulk writes**); avoid **N× full-card** pipelines on bulk promote. **⭕1 inventory:** `docs/02-Application.md` → **Media Management** (**Spike**, **Evaluation set**, **Heuristic pre-clustering**, **Review UI**); mirrored under **§ Guided archive assistance** in Phase 2 below. **Later sequencing (still in `05` only):** **Export bridge** / in-app promotion writes, **Background workers** at volume. **Packaging** (in-app vs separate importer vs API-only) stays the `05` → **Privacy / operations** decision until commercial shape is chosen.

📐 **Studio program status (2026-04-22)** - **Shipped (v1):** **Studio** at **`/admin/studio`** (`StudioWorkspace` hosts `CollectionsAdminClient` `embedded`)—multi-pane shell with **Organize | Cards | Compose | Questions | Media**, app sidebar closed by default, and collapsible/resizable panes with persisted widths. Collections tree + **Cards** pane (title/status/sort + **one** unified tag-filter area for dimensional quick selection and optional rules; no separate second tag-filter block), **Questions** pane (dimensional tree browsing, **Untagged** cleanup filtering, included/not-included filtering, visible question-tag chips with remove / **Edit tags...**, open/create linked Question card in Compose), full embedded **Media** (`MediaAdminContent` with search/source/caption/assignment + the same unified tag-filter model used by Cards; **no** compose-card→media merge in Studio), and **in-shell `CardForm`** (**Compose**) with cover/gallery/children **and TipTap body** (`drop:body`) DnD from the media bank (**`Studio selected-context elimination (v1)`**—relationship-only column removed). **Admin convergence:** legacy `/admin/card-admin`, `/admin/media-admin`, and `/admin/tag-admin` routes now redirect into Studio (reader-side card edit uses the `/view` modal path). **Admin grids:** Studio card and media grids now use uniform thumbnail framing, tighter overlay-first metadata hierarchy, bottom-pinned **Edit tags...**, tighter rectangular tag chips, and denser Studio-only tile treatment. **Studio shell density:** top controls, pane toggles, and filter rows have been tightened to preserve working area without adding another admin surface. **Studio tag rail** + **Sidebar integration model** ✅ (**Tag Management** / **Left Navigation** in `02-Application.md`) with optimistic reorder/reparent cache updates and faster reparent derived-tag recalculation. **Questions bootstrap closeout (2026-04-25)** ✅: 158 remaining unlinked Question cards were copied into `questions` as untagged prompts and linked back by `questionId`; final dry run reported 202/202 Question cards linked. **Studio inline tags (v1)** ✅ closeout 2026-04-23 (`docs/02-Application.md` → **Administration** ✅). **TipTap body media from bank (Studio)** ✅ 2026-04-23 (`docs/02-Application.md` → **Card Management** ✅). **Studio IA demotion** ✅ (see **Administration** ✅ in `02-Application.md`). **DnD foundation** ✅ for current Studio scope: shared `studioDragContract`, authored drag standardized on `@dnd-kit`, `react-dnd` removed from shared `CardForm`, Collections / Compose / Media drag targets moved onto the bounded-domain contract, with stronger overlays / target states / optimistic local commits. **Performance hardening** ✅ (2026-04-24/25): selected-card saves reuse returned card payloads instead of immediate re-fetch, routine Cards pane edits use local catalog overrides instead of broad refetch, Media bulk tag and most delete flows stay local unless paging underflows, card/media grids plus recursive tree rows are memoized, and tag reorder/reparent avoids UI snap-back while Firestore confirms. **Selection/hydration convergence** ✅ (2026-04-30): shell-owned `selectCard` now accepts preview payloads from cards/tree/questions paths, Compose keeps a visible card during cross-card and question-card handoff instead of blanking first, and question-created cards can open from the create response before background detail hydration completes. **Workspace performance pass** ✅ (2026-04-30): Studio broad card/root loaders continue until the server reports completion instead of stopping at hidden client caps; cards-pane filter/sort recompute uses deferred inputs; selected-card detail can reuse a recent shell cache; embedded media uses debounced search, stale-request cancellation, short-lived query caching, `mediaById` caching, and next-page prefetch, and can skip blocking totals when the pane only needs the working set first. **Technical baseline to preserve:** collections tree DnD **default-on** (`NEXT_PUBLIC_CURATED_TREE_DND` kill switch); top-level collections are explicit roots (`isCollectionRoot`, `collectionRootOrder`), not children of a hidden Master Parent; `childrenIds` now permit **multi-parent** membership while still enforcing `CURATED_COLLECTION_CYCLE` / `CURATED_COLLECTION_CHILD_NOT_FOUND`; root-only updates use the narrow `updateCardCollectionRoot` path; client **`fetchAdminCardSnapshot`** + optimistic rollback remain the embedded tree baseline; tests: `curated-tree-hardening.test.ts`, `emulator.curated-tree-updateCard.test.ts`, `curatedCollectionTree.test.ts`. **Next architectural convergence:** standardize the remaining cross-pane actions as explicit domain actions and keep moving the cards/media workspaces toward more query-backed operator models where that improves scale without weakening the full-universe contract. **Primary execution track (remaining ⭕1):** **`PhotoPicker convergence in Media admin`**—verbatim in `docs/02-Application.md`.



### Phase 1 — Pre-Import

*Complete — baseline recorded in `docs/02-Application.md` → **Administration** ✅ **Integrity gate (CI)**.*



### Phase 2 — Admin Productivity

⭕1 **Planned**



*Integrated execution order:* **§ Studio sequence** inline-tag work is ✅ (2026-04-23 closeout in `docs/02-Application.md` → **Administration**). Then **§ Card Management**, **§ Tag Management** (remaining), **§ Media Management** (remaining), **§ Backend**. Each **⭕1** bullet matches `docs/02-Application.md` verbatim (bold title + text after ` - `) where still planned.



**§ Card Management (`02-Application.md`)**



*Priority bands after Studio sequence:* **P2** — **Grid density reduction**; **Context Assist** (grid + list/table admin layout shipped—see **Card Management** / **Media Management** ✅ in `02-Application.md`).



- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.

- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances—incremental follow-up now that aspect-accurate thumbnails ship.

- **Card edit layout polish** - Align card-edit page chrome and section hierarchy for a cleaner authoring flow: header/back/action alignment, consistent section heading scale, tighter spacing between Body/Tags/Gallery/Child Cards, and clearer section ordering.

- **Tag picker ergonomics** - Keep macro-tag editing compact and predictable in card edit: controlled expansion below the command bar, root-first dimensional presentation, and searchable keyboard-friendly result selection with path clarity.



**§ Tag Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."

- **Node Strategy** - Raw tag overlay to created aggregations.



**§ Media Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



*Priority bands:* **P2 (operator productivity)** — **Media identity & duplicate signals**; **Unassigned duplicate triage**; **Grid admin ergonomics** (checkbox sizing); **Grid tagging UX** (per-tile inline add/search—pane-level dimensional filters shipped).



- **PhotoPicker convergence in Media admin** - Add operator flows in **`/admin/media-admin`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (`📐 **Studio media & body (2026-04-22)**`).


- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.

- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.

- **Grid admin ergonomics** - **Remaining:** larger bulk-select checkbox target sizes (row and select-all) and any further focus/checked-state polish. **Done:** filename removed from grid tile body; identity strings on image hover (`02-Application.md` **Media Management**).

- **Grid tagging UX + empty-dimension filter** - **Remaining:** optional **per-tile** inline add/search (without modal) for parity with card-grid search foot; table view alignment with the new grid rail pattern if desired. **Done:** pane-level per-dimension modes and vertical rail on grid tiles (`02-Application.md`).

**§ Guided archive assistance (`02-Application.md` → **Media Management**)** *(after **PhotoPicker convergence** / identity triage pressure; order: prove value, then ship clustering UX—see 📐 **Guided archive program (2026-04-24)**)*

- **Spike** - End-to-end on a fixed folder: ingest → embeddings → candidate clusters → simple review UI → export JSON of confirmed groups and proposed tags (no production auth required) (`docs/05-Guided-Archive-Assistance.md`).

- **Evaluation set** - Curated subset with human-labeled "true events" to score precision/recall of clustering variants (`docs/05-Guided-Archive-Assistance.md`).

- **Heuristic pre-clustering** - Cheap, explainable first pass: time windows, folder boundaries, burst detection, optional GPS buckets—outputs **candidate segments** for ML refinement (`docs/05-Guided-Archive-Assistance.md`).

- **Review UI** - Grid of **candidate stacks** with merge/split, keyboard-friendly for large sets (`docs/05-Guided-Archive-Assistance.md`).



**§ Backend (`01-Vision-Architecture.md`)**



*Priority bands:* **P1 (architectural correctness)** — **Narrow mutation paths**.



- **Narrow mutation paths** - Route tag-only and similar **narrow** admin mutations through dedicated service functions that batch Firestore field updates and derived-field recompute **once per request** where possible; avoid N sequential full `updateCard` pipelines for bulk work. Keep wide `updateCard` (or equivalent) for structural and rich-content changes.



### Phase 3 — Reader experience

⭕1 **Planned**



*Theme Management (`02-Application.md`)*



  **Priority bands**

  - **P2 (reader polish enabler)** - **CSS Tokenization**.


📐 **Theme implementation status (2026-04-27)** - The core theme pipeline is now much further along than the original Phase 3 framing implied. Theme Management is already a **floating live-draft workspace** with **Light / Dark** and **Journal / Editorial** controls in the workspace toolbar, a **component/attribute editor on the left**, and **Colors / Type / Structure** values on the right. The runtime generator path has now been substantially reconciled with the editor for **foundations, chrome, controls, cards, overlays, discovery, and media/lightbox surfaces**, and most of the earlier bypasses / bridge-only outputs have been removed or narrowed. Reader **general feedback** and **error feedback** are now wired to live reader surfaces. The main explicit reader-theme exception that remains is **success / warning / info** feedback panels: those values exist in the theme contract, but the current reader UI does not yet render matching surfaces for them. Closed-card background selection is also now truthful: `General` remains the shared baseline and card-family closed backgrounds can explicitly choose `Use General` or a curated override. **Admin/theme wiring status:** Theme Management now runs inside the actual admin theme scope rather than a reader-to-admin bridge layer, shared admin chips/buttons/grids have been moved onto theme-driven variables in the first-risk areas, and the selected filled-control text path is now unified across reader sidebar tabs and admin-selected controls.

📐 **What remains in Phase 3 after reconciliation** - The bullets below are now mostly about **finishing and hardening** the system rather than inventing it from scratch: continue tokenization where raw literals still block design portability, finish the remaining theme-contract inventory for any holdout surfaces, keep tightening the structured persisted schema and recipe model, and complete Journal / Editorial as coherent design packages now that the editor/runtime loop is much closer to truthful.



- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.
- **Theme contract inventory** - Complete an inventory-driven semantic theme contract before treating Journal / Editorial as finished themes: enumerate reader/admin surfaces, visible elements, current token use, required semantic token families, and migration status.
- **Theme schema** - Define the structured Firestore theme document shape that stores atomic tokens, semantic token-class assignments, and reader/admin recipe assignments for live draft application and saved runtime themes, with Theme Management as the editing interface; do not expose raw Firestore editing as the product workflow.
- **Preset completion** - Expand Journal / Editorial from partial preset bundles into coherent light/dark design packages only after the semantic surface inventory and schema are defined.
- **Theme editor model refactor** - Before deeper Theme Management UI rewrites, freeze the author-facing editing model as **Component -> Attribute -> Value**: canonical component inventory first, allowed attributes per component second, typed value groups third, then remap the current token/recipe workbench into that model with compatibility for existing saved themes. Do not blur `Padding`, `Spacing`, `Sizing`, `Radius`, `Border Width`, and similar metric families into one generic layout/length pool in the editor contract, even if storage stays shared temporarily.
  First implementation target: `Canvas`, `Header`, `Sidebar`, `Field`, `Feedback Panel`, `Story Card`, `Gallery Card`, `Question Card`, `Quote Card`, `Callout Card`, and `Lightbox`.
  Variant rule: all card types are editable in **closed** state; only `Story Card`, `Gallery Card`, and `Question Card` include **open** state because those are the only reader card types that open.
  Discovery rule: treat discovery as **one shared support surface** with bounded type-specific content treatment for `Story Card`, `Gallery Card`, and `Question Card`; exclude `Quote Card` and `Callout Card` from discovery.
  Current UI direction after the first refactor pass: the **left side** is component-first and now owns component selection, variant selection, attribute selection, and direct attribute editing; the **right side** is the values panel and now includes **relevant-value guidance**, highlighted matching value groups, direct binding visibility, and explicit **Reader / Workbench** scope routing. Keep pushing that split toward truthfulness rather than drifting back into a mixed token-lab/editor hybrid.
  Status addendum (2026-04-29): the structural overhaul described above is now effectively complete. Theme Management has explicit **Reader / Workbench** scope switching, saved reader/admin scoped persistence, direct Workbench targets for **Header, Sidebar, Shell, Tabs, Controls, and Feedback**, and a values panel that now surfaces **relevant value groups** and the current binding more truthfully. The main remaining work is no longer architecture rescue; it is **preset completion, live validation, and finishing the remaining consumer gaps** such as reader success / warning / info panel surfaces.

📐 **Theme execution stance** - Theme work now targets one compile path for both authoring and runtime: **atomic tokens -> semantic token classes -> recipes -> emitted CSS vars**. The dedicated preview is no longer the source of truth; Theme Management applies an unsaved **live draft** to the real app in-session, with **Save** persisting the draft and **discard/reset** restoring the last saved theme. Reader and admin may share atomic tokens, but they should diverge cleanly at the semantic-class and recipe layers where their UI jobs differ.



*Content Page (`02-Application.md`)*



  **Priority bands**

  - **P1 (reader UX contract)** - **Feed Presentation Matrix**; **Layout `@media` hardening**.

  - **P2 (experience enhancement)** - **In-Feed Expansion**; **Orientation-aware Framing**; **Rail Variant**.



- **Layout `@media` hardening** - Replace `var(--breakpoint-*)` inside `@media` where it affects layout (`V2ContentCard`, `Navigation`, `ViewLayout`, `ContentCard`, `ThemeAdmin`, `TagTree`, etc.) so breakpoints match `docs/04-Theme-Design-Contract.md` §9.2 (literal `px`).

- **Feed Presentation Matrix** - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.

- **Rail Variant** - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.

- **In-Feed Expansion** - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.

- **Orientation-aware Framing** - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.

- **Trivia card flip treatment** - Evaluate a `Trivia` card family for short prompt/answer content with a tap/click flip interaction (front = prompt, back = answer) so lightweight Q&A can feel distinct from full Question cards without forcing a detail-page open.

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).
- **Current feed/card presentation status (2026-04-29)** - The reader feed is no longer using the earlier portrait-overlay default for closed image cards. The current baseline is a **single stable, landscape-leaning closed-card shell** with **stacked media on top and text below** for closed `Story`, `Gallery`, and `Question` cards, plus tighter one-line supporting text. Curated mode now behaves more like a TOC: the sidebar shows the real collections tree, the feed shows the selected parent card first and then its direct children, and a sticky curated title bar keeps the current collection visible during scroll. This is still an intentional interim presentation baseline, not the final matrix closeout: the broader `Feed Presentation Matrix` still needs explicit completion and visual validation across all card types, rail contexts, and viewport sizes, and a narrow-viewport card-sizing regression remains open in curated mode.



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



- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Guided** ignores sort controls and always follows curated tree/TOC order.

- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.

- **Mobile-first filter redesign** - Remaining reader-sidebar polish: resolve the mobile search keyboard/result-visibility issue, finish alignment of selected tag state in the tree, and keep Freeform controls visually compact while preserving saved per-user expansion choices and fast manual expand/collapse.

*View Page (`02-Application.md`)*

  **Priority bands**
    - **P1 (private hosting / access correctness)** - **Reader-only auth path**; **Temporary reader audience scope**.

- **Reader-only auth path** - Reader-only user login must work cleanly in production without requiring admin credentials or accidentally exposing admin affordances.

- **Temporary reader audience scope** - Add a reversible reader-access scope (for example a family-only share window) that gates feed, direct card open, guided children, and discovery together so temporary hosted access cannot leak into unrelated published content through child rails, direct URLs, or `Explore More`.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Backend (`01-Vision-Architecture.md`)*



- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations. **During feature work**, fix ESLint/TypeScript issues introduced in **approved scope** on touched files per `.cursor/rules/# AI_InteractionRules.mdc` → **Lint and type hygiene on touched code**; repo-wide cleanup and re-enabling lint in production builds remain this phase.

- **Quality** - QA app.



❓ **Open**

- *(None currently.)*
