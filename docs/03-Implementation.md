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

- **Near-term tenant follow-on** - Multi-tenant isolation is a near-term follow-on after v1 proof, not current-scope implementation work.

**Milestone path**

- **Family demo** - Near-term interim milestone for a credible private hosted journal demo: Guided and Freeform reading feel smooth, hosted reader access behaves correctly, author prep is dependable enough to prepare demo content, and there are no obvious integrity or trust failures.
- **Hosted alpha** - Repeated real family use over time: core import, authoring, and reader workflows are dependable; duplicate/identity issues are manageable; and access boundaries are trustworthy.
- **Commercial v1** - Commercially credible private hosted product: security hardening reviewed, workflow-critical and integrity-critical testing materially expanded, backup/restore/release procedures documented and realistic, and no known brittle shortcut remains in a core reader/admin/import path.

📐 **Demo-first execution stance** - Until the family demo is credible, prioritize work in this order: **reader stability/polish**, **hosted access/privacy correctness**, **author prep workflow friction**, **import coherence**, then broader platform or aesthetic expansion. Do not let Theme Management breadth or speculative product extensions outrank the demo path unless they directly block it.

📐 **External codebase review handoff (2026-06-12)** - A full-repo review found strong integrity engineering, a coherent reader V2 + theme token foundation, and a credible Studio convergence direction, with remaining gaps in CI breadth (integrity-only today), Firebase Storage byte backup, reader performance ceiling (full feed hydration, originals in reader paths, per-tile TipTap on inline display), legacy admin duplication (`question-admin`, unreachable Collections standalone branch), and admin-only bundle loading for viewer sessions. Treat these as sequenced platform work, not a rewrite mandate.

📐 **Review program order** - After current Studio slice verification, prefer: **(1)** engineering safety net — shipped 2026-06-12, **(2)** reader performance — shipped 2026-06-12, **(3)** backend hardening — shipped 2026-06-12, **(4)** Studio legacy retirement — shipped 2026-06-12, **(5)** reader mobile text edit — **shipped 2026-06-12** (5a–5d).

📐 **Review program step 2 — reader performance sequencing (2026-06-12)** - Implement in this order; each slice is independently verifiable:

- **2a Admin-only ThemeAdmin lazy chunk** - `next/dynamic` the Theme Management overlay/workbench out of the shared reader shell bundle; load only for admin sessions when the overlay opens. **Shipped 2026-06-12.**
- **2b Inline feed display rendering** - Closed feed tiles with `displayMode === 'inline'`: use lightweight read-only HTML (`generateHTML` or equivalent) instead of mounting full TipTap per tile. Display-only; does not replace admin edit paths (`ReaderCardEditModal`, Compose). **Shipped 2026-06-12** (`TipTapStaticContent` on closed QA/gallery inline tiles and story inline branch; detail and callout TipTap surfaces unchanged).
- **2c Feed hydration tiers** - Default `/view` feed to `hydration=cover-only`; full gallery/content hydration on card open or when inline body requires resolved media. `/api/cards` already supports `hydration=cover-only`; wire `CardProvider` feed query and regression-check derived feed surfaces. **Shipped 2026-06-12** (`feedHydration` helper + cover-only on `/view` and `/search` CardProvider lists; detail still uses full `getCardById`; gallery no-cover tiles hydrate first slide only).
- **2d Reader rendition delivery** - Serve feed/detail tiles from surface-appropriate derivatives where sufficient. **Shipped 2026-06-12:** reader surfaces use `getReaderDisplayUrl`, reusing existing `renditions.studio` WebP (960px max) with fallback to original; lightbox/zoom keeps original via `getDisplayUrl`. Dedicated `renditions.reader` + backfill deferred.
- **2e Feed virtualization** - Window large feeds after 2a–2d reduce per-tile cost; highest UX regression surface (scroll restore, guided mode, grouped sections). **Shipped 2026-06-12 (2e-1, CSS containment):** feed grid tiles use `content-visibility: auto` + `contain-intrinsic-size: auto 480px`, skipping offscreen layout/paint while keeping tiles in the DOM (scroll restore and `[data-card-id]` focus lookup unchanged). True DOM windowing deferred unless profiling shows DOM node count itself becomes the bottleneck.

📐 **Review program step 3 — backend hardening sequencing (2026-06-12)** - Implement in this order:

- **3a Storage byte backup** - Automated off-site backup of Firebase Storage object bytes (originals + renditions) with manifest + verification, complementing `backup:database`. **Shipped 2026-06-12** (`npm run backup:storage`; dry-run default, `--apply` to download; incremental copy from prior runs when md5 matches).
- **3b API authorization review** - Route-protection audit table + automated tests that anonymous/viewer sessions cannot reach admin-only handlers. **Shipped 2026-06-12** (`src/lib/auth/apiRouteAccessAudit.ts`, `src/__tests__/integrity/admin-api-access-route.test.ts`; reader boundary remains in `reader-access-route.test.ts`).
- **3c Integrity gate expansion** - Extend emulator integrity suite for delete/replace graph, tag counts, derived card fields. **Shipped 2026-06-12** (`findTagCountViolations` / `computeExpectedCardCounts` in `src/lib/integrity/invariantChecks.ts`; unit coverage in `integrity-gate.test.ts`; service-layer emulator scenarios in `emulator.integrity.test.ts` for create/update/delete tag counts, cover backrefs, plus existing delete/replace graph tests).
- **3d Env-password auth fallback retirement** - Remove runtime `ADMIN_EMAIL` / `ADMIN_PASSWORD` login fallback from NextAuth; `journal_users` is the sole sign-in source. **Shipped 2026-06-12:** legacy authorize branch removed from `authOptions.ts`; `ADMIN_EMAIL` / `ADMIN_PASSWORD` remain **seed-only** via `npm run seed:journal-users`.

📐 **Review program step 4 — Studio legacy retirement sequencing (2026-06-12)** - Retire duplicate admin routes/surfaces and rename shared Studio implementation modules to `studio/{cards,media,tags}`. **Complete 2026-06-12** (4a–4d shipped). Implement order was:

- **4a Retire question-admin** - Remove standalone `/admin/question-admin` workflow; Questions administration lives in Studio **Questions** pane only. **Shipped 2026-06-12:** route redirects to `/admin/studio`, admin nav **Questions** tab removed, `next.config.ts` permanent redirect added.
- **4b Remove Collections standalone branch** - Delete unreachable `CollectionsAdminClient` standalone path and `CollectionsMediaPanel`; Studio-only `CollectionsAdminClient` remains. **Shipped 2026-06-12:** removed `embedded` prop, standalone full-catalog load, sticky header, and `CollectionsMediaPanel`; Studio host unchanged.
- **4c Redirect route cleanup (optional)** - Collapse redirect-only legacy route pages into `next.config.ts` redirects; keep shared implementation modules under those folders. **Shipped 2026-06-12:** removed redirect `page.tsx` files for `card-admin` (including `:id` / `new` / `edit`), `media-admin`, `tag-admin`, and `question-admin`; config redirects preserve Studio deep links (`?card=`, `?new=1`).
- **4d Shared module rename (deferred)** - Rename legacy `card-admin` / `media-admin` / `tag-admin` implementation folders to Studio-owned module paths after 4a–4c. **Shipped 2026-06-12:** `src/components/admin/studio/cards`, `studio/media`, `studio/tags`; shell CSS and `MediaAdminContent` co-located there; URL redirects unchanged in `next.config.ts`.



---



## Execution Plan



*Sequenced by dependency: what gates what on the path from personal use → family demo → hosted alpha → commercial v1. This document lists active `⭕1 Planned` work only. Wording of mirrored items should match the source in `02-Application.md` or `01-Vision-Architecture.md` where the item is copied from canon.*



**Open questions to resolve before starting:**

*(None blocking.)*

- **Decision reconciliation rule** - Product, workflow, and milestone decisions that affect future work must be reconciled into `01`, `02`, or `03` immediately or treated as non-canonical.
- **Verification gate** - No code change is complete merely because it appears to work manually. Relevant verification, and test addition/update where warranted by behavior or integrity risk, is part of milestone advancement.
- **Release-readiness gate** - Before commercial release work is treated as complete, the product must have documented and realistic procedures for deployment, backup verification, restore, admin access recovery, and rollback/incident response.
- **Reviewable-slice gate** - The AI owns next-work recommendations, but implementation proceeds one approved, reviewable slice at a time. Do not chain dependent slices before the author can inspect and verify the current one.

📐 **Current optimization stance** - Near-term implementation should favor faster tagging and relationship workflows, narrower mutations, and fewer parallel admin interaction patterns over adding breadth. In Studio specifically, prefer local post-mutation reconciliation over broad reloads: reuse returned card payloads after save, patch card/media catalogs locally when integrity allows, and reserve broad refetch for structural truth changes. Architectural convergence target: formalize **Studio** as a multi-domain shell with explicit separation between **global structure/taxonomy**, **pane-local card/media workspaces**, and the **shell-owned active card**.

📐 **Holistic redesign stance** - The next stage is a directed Studio/media architecture revision, not isolated feature cleanup. For major runtime work, define both the **technical contract** (owners, payload tiers, mutation paths, background processing, cache boundaries) and the **plain-language interaction contract** (what should feel instant, what may hydrate progressively, and what must never block).

📐 **Reference experience** - Use modern media-app responsiveness as the quality bar for browsing and lightweight editing, especially for tile-density changes, moving between collections or albums, opening a selected item, and applying small edits without obvious form-submit delay.
📐 **Program structure** - The current architecture revision should proceed in this dependency order: **(1)** stabilize the Studio runtime and its interaction contract, **(2)** remove redundant loaders/surfaces/code paths that fight that runtime, **(3)** finish card/media workspace performance and narrow-mutation alignment, **(4)** establish the derivative/readiness media pipeline for future image/video scale, and only then **(5)** widen reader/mobile editing breadth on top of the stabilized substrate.
📐 **Current Studio runtime audit handoff (2026-05-30)** - The current audit says the first implementation target is the **card base runtime**, not a generic performance pass. Diagnosed shape before the slice: **selected card** was already trending toward an `edit` payload (`StudioWorkspace` selected-card fetch with `?children=skip`), but the **Cards** bank was still driven by a large streamed local catalog from `CollectionsAdminClient.load`, then locally filtered/sorted in `StudioTreeCandidateCardBank`, while routine Compose saves still triggered broad card-list repair behavior. Current code status: the first four runtime slices have now landed in code. Slice 1 established a **Studio cards workspace query owner** so `StudioTreeCandidateCardBank` shapes its active card universe from server queries keyed to the current workspace filters/sort, and `StudioCardEditPane` no longer broad-invalidates `/api/cards?*` or forces a list refresh after routine Compose saves. Slice 2 narrowed remaining shared ownership: routine selected-card patches now reconcile through local upsert paths instead of broad Collections refresh, the embedded card-bank context now separates `refreshStructure` from local `upsertCard`, and Question-card create/unlink flows now use local card reconciliation for non-structural changes. Slice 3 narrowed Questions runtime presentation: the pane-wide blocking overlay is removed, question add now uses inline form status, row actions use row-scoped pending overlays, question-card open/create now hands Compose a safe preview shell immediately instead of waiting for a full selected-card paint before showing anything useful, and delete reconciliation now updates question linkage locally. Slice 4 narrowed structural refresh: optimistic local structure changes for detach, clear-root, drag-plan mutations, and bulk add now remain primary truth, with rollback on failure, instead of defaulting back to delayed broad `load({ soft: true })` repair after success. Verification status: targeted ESLint and full `npm run build` passed; live browser verification of card-bank, question/card, and structure-mutation behavior is still pending, so these slices are implemented but not yet browser-closed.

📐 **Canonical task intake** - Do not let chat become a shadow backlog. Use chat for intake, audits, clarifications, and approvals; keep canonical product/status truth in `docs/02-Application.md` and canonical active sequencing truth in `docs/03-Implementation.md`. When ad hoc notes reveal real remaining work, normalize them into the owning `02` section and, if they are true next-step work, mirror them here as `⭕1` items rather than leaving them in prompts or chat history.

📐 **Active Studio/admin baseline** - Shipped Studio status and durable contracts live in `docs/02-Application.md` under **Administration**, **Card Management**, **Collections Management**, **Media Management**, **Tag Management**, and **Question Management**. Use those sections as product truth; keep this file focused on remaining planned work and milestone gates.

📐 **Build/deploy contract (2026-05-23)** - Production builds must not depend on optional platform-package resolution quirks or fabricated shared-event types. Current closeout: import metadata resolution no longer assumes direct `exiftool-vendored.pl` module resolution in app code, and Studio relationship DnD now passes the real drag event plus an explicit resolved `overId` instead of constructing a fake `DragEndEvent`. Verification standard for deploy-blocker work: `npm run build` must complete locally before treating Vercel failures as environment-only.

### Phase 1 — Pre-Import

*Complete — baseline recorded in `docs/02-Application.md` → **Administration** → **Integrity gate (CI)**.*



### Phase 2 — Admin Productivity

⭕1 **Planned**



*Integrated execution order:* Start with the Studio/runtime program in **§ Administration** so shell ownership, interaction contract, responsiveness expectations, and code-path simplification are stable before more local improvements accumulate. Then use **§ Card Management** plus **§ Media Management** to complete the shared cards/media workspace contract, including browse feel and lightweight editing expectations. Follow with the remaining **§ Tag Management**, **§ User Management** (policy/trust closeout), and **§ Backend** work. Questions and Collections remain Studio-owned product surfaces throughout. Each **⭕1** bullet matches `docs/02-Application.md` verbatim (bold title + text after ` - `) where still planned.

📐 **Next reviewable slice handoff (2026-05-30)** - According to the current process, the next step is **verification and adjustment** of the landed Studio/runtime slices before widening scope. Required next checks: browser-verify card-bank filtering/sorting, selection continuity into Compose, routine Compose save behavior, delete fallback behavior, question add visual stability, Question-card open/create/unlink behavior, structure-mutation behavior for detach, clear-root, drag reorder/attach, and bulk add under the narrowed ownership split, and embedded Studio media behavior when the media pane is filtered to the active card. Current closeout on that media path: provider delete failures now rethrow truthfully instead of dying silently in provider state, successful deletes from the embedded media grid now quietly reload the active card so `show only assigned` / card-filtered media views drop the deleted assignment immediately, the assigned-only media view now recomputes directly from authoritative provider/cache truth so bulk tag edits no longer wait for the assigned-id set itself to change before the grid updates, direct browser-created media from Compose upload/paste paths now reconcile into the active media working set locally so page-1 newest-first results can show the new item immediately instead of waiting for a later fetch, background media auto-pagination failures now stay row-local instead of replacing the visible grid with a pane-level `Failed to fetch` loop, and the server-side `source = local|paste` listing path now avoids the Firestore `where(source == ...) + orderBy(createdAt)` branch by using the safe seek-style scan path already used for other non-index-friendly media filters. The current contract there is: source-filtered media views should load truthfully without depending on a missing composite index, and later-page failures should keep the already loaded grid visible while waiting for explicit retry. Current closeout on the Questions path: question-card creation no longer uses the broad general card-create-plus-link round trip; it now creates the minimal valid Q&A card shell and question linkage together in one narrowed server transaction and returns that shell directly for the existing preview-first Compose handoff. Known minor issue to preserve: after creating a card from a question, the question row can still flicker out briefly during the Compose handoff and then reappear once Compose finishes loading; linkage truth is correct, but the row-stability transition is not yet fully solved and should not be “fixed” again without live instrumentation. If those checks hold, the next code slice is to reassess any remaining Hosted Admin Responsiveness hotspots without widening into media derivatives, reader/mobile, broad Compose redesign, or video-cover presentation. In parallel, the broader `Hosted Admin Responsiveness Pass` remains open and should now be treated as the next assessment-led performance program for slow text entry and other delayed input feedback across Studio/admin surfaces.



**§ Administration (`02-Application.md`)**



- **Studio runtime redesign program** - Define and execute the end-state Studio runtime so Organize, Cards, Compose, Questions, and Media behave as one media-native workspace with narrow payload tiers, local-first transitions, and no broad refreshes for routine work. The resulting day-to-day contract should make card switching feel preview-first and near-instant, keep Compose visible through handoff, and let routine saves acknowledge without freezing the rest of Studio.

- **Interaction contract alignment** - Pair each major Studio architecture change with a plain-language user-visible contract covering what should feel instant, what may hydrate progressively, and what must never block normal authoring use. Apply that contract explicitly to card/media browsing, selection continuity, drag/drop feedback, and filter persistence so architectural work is reviewed against real operator experience rather than technical cleanliness alone.
  First-useful-paint contract handoff (2026-06-03): treat Studio as five distinct panes in product terms - **Organize**, **Cards**, **Compose**, **Questions**, and **Media** - even where older embedded code still groups some of them under one host. For startup and progressive hydration, optimize for pane usefulness rather than host ownership. Current preferred first-pass priority is: **(1) Cards**, **(2) Compose**, **(3) Media**, **(4) Collections/Organize tree population**, with Questions not allowed to delay the earlier panes. The structural tree may remain the authoritative owner for hierarchy and drag/drop truth, but it must stop acting like the startup gate for the rest of Studio. On initial open, use the smallest truthful working sets that let the pane become usable; stream or hydrate additional results afterward. Also separate **loading**, **empty filter result**, and **real error/integrity problem** states in both copy and styling: startup or zero-match states should use neutral messaging, while red/error treatment is reserved for actual failures or broken structure (for example true missing-child conditions).

- **Code Path Simplification Pass** - Audit Studio and the surviving admin/card/media paths for deprecated surfaces, duplicated interaction models, stale providers/loaders, and dead compatibility code, then retire what no longer supports the current workflow without weakening shipped behavior or canon contracts.
  Deferred execution note (2026-06-02): this remains a bounded cleanup program, not a broad rename sweep. **Shipped 2026-06-12 (slice 4a):** standalone **question-admin** retired. **Shipped 2026-06-12 (slice 4b):** **Collections standalone branch** removed. **Shipped 2026-06-12 (slice 4c):** legacy admin redirect routes collapsed into `next.config.ts`. **Shipped 2026-06-12 (slice 4d):** shared implementation modules renamed under `src/components/admin/studio/{cards,media,tags}`; review program step 4 complete.

- **Retire question-admin** - **Shipped 2026-06-12 (slice 4a)** — see `02` **Administration** and review program step 4a in `03`.

- **Remove Collections standalone branch** - **Shipped 2026-06-12 (slice 4b):** unreachable `CollectionsAdminClient` standalone path and `CollectionsMediaPanel` removed; Studio Organize pane remains the sole Collections surface.

- **Hosted Admin Responsiveness Pass** - Diagnose and remove the interaction stalls that make hosted admin feel broken in real use, starting with search-field focus latency, delayed typing feedback, and other visible input/pane delays on Studio and the surviving admin surfaces. Treat this as measured browser-verified performance work, not cleanup-by-assumption.
  Current assessment handoff (2026-05-30): the first likely hot path is not network alone; several text-entry owners still live in the same components that own the full visible pane, so each keystroke can drive broad local rerender/filter/sort work before any fetch begins. Immediate suspects: embedded Studio Media search state in `MediaAdminContent` above `MediaAdminGrid`, Questions search/filter state in `StudioQuestionsPane`, shared card-bank search/status state flowing through `CollectionsAdminClient` into `StudioTreeCandidateCardBank`, and Compose form-wide `setField` updates / dirty recomputation in `CardFormProvider` + `CardForm`. Current code status: the first responsiveness slice is now landed for search entry in Studio Media, Studio Cards, and Questions by isolating draft typing into a small debounced input owner instead of storing each keystroke in the heavy pane component. The next Compose slice is also landed for the simple text fields: title, subtitle, and custom excerpt now type against local field drafts in `CardForm` and commit on blur / explicit save instead of writing every keystroke through the full form-state owner. The first body/editor slice is now landed too: the rich-text path no longer duplicates media extraction and `contentMedia` updates in both `RichTextEditor` and `CardForm` on each keystroke; the editor remains the immediate owner of body typing and is the sole source of incremental `contentMedia` updates. The next provider-level slice is now landed as well: `CardFormProvider` no longer forces the exact full persistable snapshot comparison through the urgent typing path on every local change. Dirty-state truth still uses the exact snapshot compare, but the provider now gates it behind a local dirty hint and deferred form state so ordinary Compose edits do not pay the whole-card compare cost synchronously. The next media-delivery slice is now landed too: media docs can carry one optional smaller `studio` rendition, new imports/replacements generate it best-effort, Studio/admin preview owners prefer it with fallback to originals, and a backfill script exists for existing media. The next Cards-materialization slice is now landed too: `StudioTreeCandidateCardBank` no longer starts by draining the full query in 250-item loops; it now paints a smaller first batch, keeps stable local reconciliation, and appends later pages on demand through tail-near auto-load plus an explicit fallback button. The next embedded-Collections startup slice is now landed too: `CollectionsAdminClient` no longer blocks the Studio workspace on the old broad all-cards startup pass when embedded; it now renders the Studio shell immediately, fetches collection roots first, and defers descendant hydration until the Collections tab is actually opened. The next embedded-Media startup slice is now landed too: `MediaProvider` no longer auto-fetches just because `/admin/studio` mounted, and embedded `MediaAdminContent` now owns its own first fetch so media does not preempt Cards during initial shell paint. The next initial-selection ownership slice is now landed too: in Studio, the Cards bank now owns the first fallback selection when no explicit `?card=` or `?new=` request is active, and embedded Collections no longer invents the active card before Cards has loaded. The next media-duplication cleanup slice is now landed too: Studio media now reuses in-flight prefetched cursor pages instead of issuing the same next-page request twice, assigned-only hydration now treats already-loaded fallback records as local cache, and linked-card reference summaries now fetch against stable uncached ids instead of refiring on every same-id rerender. The next card-route narrowing slice is now landed too: `PATCH /api/cards/[id]` no longer performs a full hydrated `getCardById()` just to decide which narrow mutation branch to use; it now checks raw Firestore card existence/shape first and leaves hydration to the mutation owner. Current deliberate limit: narrow card mutations still return `getCardById()` after the write, so routine Compose saves still pay one post-mutation full hydrate for the response shape. This still does not add virtualization, and embedded Collections still hydrates all descendants once the Collections tab is opened rather than a true viewport-sized tree slice, so larger future trees may still need another pass. Next verification: browser-check whether search typing now feels materially better in Media/Cards/Questions, whether title/subtitle/excerpt plus body typing in Compose now feel immediate without regressing blur persistence, inline image tracking, explicit save behavior, leave/discard protection, or card-switch correctness, whether Media now waits its turn behind Cards/Compose on Studio open, whether the Cards bank now visibly becomes the first selector for Compose on initial Studio open, whether duplicate media cursor/reference calls are now materially reduced during Studio use, whether card PATCH latencies materially drop during ordinary Compose edits, and whether the Collections tab now avoids exposing transient missing-child red/error-looking states during first hydration.

- **Studio light-mode shell hierarchy** - Rework the current light-mode Studio shell so the top `Content Studio` header block, the pane workspace block, and the outer gutters read as one intentional hierarchy. The gap between the Studio menu block and the main Studio block should collapse to a near-hairline seam, and the current stacked gray/pale planes should be reduced without changing drag/drop, pane ownership, or shell interaction structure.
  Current diagnosis handoff (2026-06-01): the visible gap and unchanged pale top block are not primarily owned by the embedded Collections header. The top `Content Studio` menu block is still rendered through `cardAdminPageStyles.stickyTop` inside `StudioWorkspace`, so its old `padding-bottom`, `margin-bottom`, and `layout-background1` treatment remain active. The lower embedded Collections header was tightened, but that was the wrong layer for the seam the author was reacting to. The remaining gray gutters are also not a Reader `AppShell` issue: `/admin/studio` is on the admin shell, and the visible outer backdrop is largely the admin/body background showing through the Studio page shell. The next safe fix should target the top-level Studio header shell, the seam between that header and the main Studio workspace host, and the Studio page backdrop together, without changing drag/drop or pane composition.

- **Studio naming cleanup** - Rename the remaining `Content Management` surface/chrome language to `Content Studio` so the product vocabulary matches the shipped `Studio` IA.

- **Bulk bar idle collapse + selection semantics** - Hide the bulk-actions bar entirely when nothing is selected, and reconcile selection copy/behavior with the current growing-list model so surfaces do not imply a paged `Select all on page` contract where the UI now behaves as `Select visible`.

- **Operator message pruning** - Remove low-value shell messages such as `working in...` where they add noise without helping the author make a decision.

- **DnD hardening pass** - Reopened. The required contract remains narrower and explicit: keep structural tree drag with **on-row** nest/attach and **between-row** insert/reorder semantics; keep `Media -> Cover` and `Media -> Gallery` as direct assignment drops; simplify `Cards -> Children` and `Media -> Content` to append-only cross-pane actions, with later local reorder/editor refinement owned by the destination surface. Current repair focus: keep the shell/runtime ownership split honest in code, ensure the root-card PATCH contract actually accepts `isCollectionRoot` / `collectionRootOrder`, and do not mark this closed again until browser verification proves the repaired path.
- **DnD reviewer map** - Keep the reviewer-facing contract in `docs/02-Application.md` current as implementation changes land: drag class, source pane, valid targets, fallback rules, mutation owner, and required browser-proof path must stay explicit enough for another engineer to audit without reconstructing the model from code.



**§ Card Management (`02-Application.md`)**



*Current status:* the earlier **Context Assist** item is now shipped truth in `docs/02-Application.md` under **Card Management**. Remaining Card Management planned work is lower-priority polish relative to Tag Management, Media Management, and Backend narrow-mutation rollout.

- **Studio relationship contract closeout** - Rework right-side Studio drag/drop around the simplified approved contract now recorded in `docs/02-Application.md`: `Media -> Content` appends to the end of body, `Cards -> Children` appends to the end of children, and precise reordering remains local to TipTap/gallery/children surfaces. Close this only after real browser verification proves target activation, drop result, and post-drop caret recovery in Compose.





**§ Tag Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."

- **Node Strategy** - Raw tag overlay to created aggregations.

- **Tag-edit iconography** - Replace the generic pencil affordance in tag-edit entry points with tag-specific iconography so the action reads as taxonomy editing rather than generic row edit.



**§ Media Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



*Priority bands:* **P2 (operator productivity)** — Media import/duplicate handling remains a larger deferred media-management gap rather than the next isolated polish slice.



- **PhotoPicker convergence in Media admin** - Add operator flows in **`/admin/media-admin`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (see 📐 **Studio media & body (2026-04-22)**).

- **Source-library inventory + restore triage** - Add a Media-admin/operator tool that can browse local source libraries with thumbnails, show which source files are already imported into the app, surface files missing from the media bank, and support a restore shortlist workflow before import. This should help prevent accidental re-import sprawl, make recovery from source more deliberate, and tighten governance around what local images enter the library. Current closeout at the script layer: the local-source missing-media restore helper now resolves canonical import-source paths before `create` vs `merge`, defaults to preflight/plan-only output, requires complete folder success before card mutation, preserves existing gallery membership on merge, and writes per-folder JSONL checkpoints. The approved 2026-05-28 apply run restored `158/159` planned folders; the lone corrupt-file blocker (`zMomDadPics/BobSandra/Portraits/3/03793_p_12af5lw97p2003_b__X.jpg`) was intentionally removed from the source restore set after confirming the other four images were already attached to the existing card, so the remaining work is the operator-facing inventory/restore UI, not another unsafe blind rerun loop.

- **Media derivative architecture** - Preserve originals for archive/export while generating and serving surface-specific derivatives for tiles, previews, reader display, and future print/export or video playback workflows; treat video and phone media as first-class inputs rather than image-only edge cases. This should support fast grid browsing, later density changes, and lightweight editing without forcing the workspace to depend on original-asset delivery. **Status (2026-06-12):** reader feed/detail tiles now prefer `renditions.studio` via `getReaderDisplayUrl` (slice 2d); dedicated reader renditions, video, and full backfill coverage remain follow-up.

- **Media readiness pipeline** - Introduce explicit ingest/processing/readiness states for imported media so metadata extraction, thumbnail or poster generation, transcoding, and future identity/index work happen in background pipelines instead of interactive authoring paths. New imports should become visible quickly with truthful processing state rather than feeling absent or frozen until every derivative is finished.

- **Media editor control stacking** - In the Studio media editor, stack the horizontal/vertical adjustment controls vertically so the edit surface stays readable and predictable at the current modal width.

- **Infinite-scroll hardening** - Continue the append-style media working set toward a fully smooth infinite-scroll feel, with no obvious paging seams during normal admin use and no need for repetitive manual paging rituals in the normal browsing contract.

- **Dimension filter picker evolution** - Revisit admin card/media `Matches tag` interaction later with a lighter single-dimension picker: keep fast text entry for known tags, use a searchable tree popover for the common one-dimension case, and reserve full `MacroTagSelector` expansion for multi-select and deeper taxonomy work.


**§ User Management (`02-Application.md`)**



*Priority bands:* **P2 (trust/policy closeout)** — credential behavior should be explicit before hosted family use broadens.



- **Credential-sharing policy audit** - Confirm and document whether multiple simultaneous sign-ins with the same username/password are acceptable in v1, and whether user creation/update should enforce stricter uniqueness or session expectations.


**§ Guided archive assistance (`02-Application.md` → **Media Management**)** *(after **PhotoPicker convergence** / identity triage pressure; order: prove value, then ship clustering UX; see the `Guided archive program (2026-04-24)` decision in `docs/02-Application.md`)*

- **Spike** - End-to-end on a fixed folder: ingest → embeddings → candidate clusters → simple review UI → export JSON of confirmed groups and proposed tags (no production auth required) (`docs/05-Guided-Archive-Assistance.md`).

- **Evaluation set** - Curated subset with human-labeled "true events" to score precision/recall of clustering variants (`docs/05-Guided-Archive-Assistance.md`).

- **Heuristic pre-clustering** - Cheap, explainable first pass: time windows, folder boundaries, burst detection, optional GPS buckets—outputs **candidate segments** for ML refinement (`docs/05-Guided-Archive-Assistance.md`).

- **Review UI** - Grid of **candidate stacks** with merge/split, keyboard-friendly for large sets (`docs/05-Guided-Archive-Assistance.md`).



**§ Backend (`01-Vision-Architecture.md`)**



*Priority bands:* **P1 (architectural correctness)** — finish the remaining **Narrow mutation paths** rollout beyond the already-shipped card tag/status/content/metadata PATCH routing and card/media bulk tag mutation paths.



- **Narrow mutation paths** - Continue the rollout of dedicated service functions for **narrow** admin mutations. Current shipped slices include card tag-only/status-only/content-only/metadata-only PATCH routing plus dedicated bulk tag mutation paths for cards and media; remaining work is to extend the same bounded-write discipline wherever admin flows still fall back to wider `updateCard`-style work than the change requires. Keep wide `updateCard` (or equivalent) for structural and rich-content changes.



### Phase 3 — Reader experience

⭕1 **Planned**



*Theme Management (`02-Application.md`)*



  **Priority bands**

  - **P2 (reader polish enabler)** - **CSS Tokenization**.


📐 **Theme implementation status (2026-04-27)** - The core theme pipeline is now much further along than the original Phase 3 framing implied. Theme Management is already a **floating live-draft workspace** with **Light / Dark** and **Journal / Editorial** controls in the workspace toolbar, a **component/attribute editor on the left**, and **Colors / Type / Structure** values on the right. The runtime generator path has now been substantially reconciled with the editor for **foundations, chrome, controls, cards, overlays, discovery, and media/lightbox surfaces**, and most of the earlier bypasses / bridge-only outputs have been removed or narrowed. Reader **general feedback** and **error feedback** are now wired to live reader surfaces. The main explicit reader-theme exception that remains is **success / warning / info** feedback panels: those values exist in the theme contract, but the current reader UI does not yet render matching surfaces for them. Closed-card background selection is also now truthful: `General` remains the shared baseline and card-family closed backgrounds can explicitly choose `Use General` or a curated override. **Admin/theme wiring status:** Theme Management now runs inside the actual admin theme scope rather than a reader-to-admin bridge layer, shared admin chips/buttons/grids have been moved onto theme-driven variables in the first-risk areas, and the selected filled-control text path is now unified across reader sidebar tabs and admin-selected controls.

📐 **What remains in Phase 3 after reconciliation** - The bullets below are now mostly about **finishing and hardening** the system rather than inventing it from scratch: continue tokenization where raw literals still block design portability, finish the remaining theme-contract inventory for any holdout surfaces, keep tightening the structured persisted schema and recipe model, and complete Journal / Editorial as coherent design packages now that the editor/runtime loop is much closer to truthful.



- **CSS Tokenization** - Move **design-affecting** values-colors, typography scale, spacing rhythm, radii, shadows, and key surfaces-into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a "theme" concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.
- **Theme contract inventory** - Complete an inventory-driven semantic theme contract before treating Journal / Editorial as finished themes: enumerate reader/admin surfaces, visible elements, current token use, required semantic token families, and migration status.
- **Theme schema** - Define the structured Firestore theme document shape that stores atomic tokens, semantic token-class assignments, and reader/admin recipe assignments for live draft application and saved runtime themes, with Theme Management as the editing interface; do not expose raw Firestore editing as the product workflow.
- **Preset completion** - Expand Journal / Editorial from partial preset bundles into coherent light/dark design packages only after the semantic surface inventory and schema are defined.
- **Theme workspace chrome simplification** - Remove unnecessary background shading from the floating Theme workspace so the editor feels lighter and keeps more attention on the actual reader/workbench surface beneath it.
- **Theme workspace fit and height** - Fit the active editor controls within common desktop windows more cleanly and increase the effective workspace height by roughly 20% so the floating editor shows more useful content before inner scrolling.
- **Admin-only bundle loading** - Shipped 2026-06-12 (slice 2a): Theme Management overlay loads via admin-gated lazy chunk when the workbench opens; viewer sessions no longer pull the ThemeAdmin workbench in the shared AppShell bundle. Shipped 2026-06-12 (slice 5d): feed-tile edit paths lazy-load `ReaderCardEditEntry`; full Compose modal loads only when an admin opens edit. Studio remains admin-route scoped.
- **Theme editor model refactor** - Before deeper Theme Management UI rewrites, freeze the author-facing editing model as **Component -> Attribute -> Value**: canonical component inventory first, allowed attributes per component second, typed value groups third, then remap the current token/recipe workbench into that model with compatibility for existing saved themes. Do not blur `Padding`, `Spacing`, `Sizing`, `Radius`, `Border Width`, and similar metric families into one generic layout/length pool in the editor contract, even if storage stays shared temporarily.
  First implementation target: `Canvas`, `Header`, `Sidebar`, `Field`, `Feedback Panel`, `Story Card`, `Gallery Card`, `Question Card`, `Quote Card`, `Callout Card`, and `Lightbox`.
  Variant rule: all card types are editable in **closed** state; only `Story Card`, `Gallery Card`, and `Question Card` include **open** state because those are the only reader card types that open.
  Discovery rule: treat discovery as **one shared support surface** with bounded type-specific content treatment for `Story Card`, `Gallery Card`, and `Question Card`; exclude `Quote Card` and `Callout Card` from discovery.
  Current UI direction after the first refactor pass: the **left side** is component-first and now owns component selection, variant selection, attribute selection, and direct attribute editing; the **right side** is the values panel and now includes **relevant-value guidance**, highlighted matching value groups, direct binding visibility, and explicit **Reader / Workbench** scope routing. Keep pushing that split toward truthfulness rather than drifting back into a mixed token-lab/editor hybrid.
  Status addendum (2026-04-29): the structural overhaul described above is now effectively complete. Theme Management has explicit **Reader / Workbench** scope switching, saved reader/admin scoped persistence, direct Workbench targets for **Header, Sidebar, Shell, Tabs, Controls, and Feedback**, and a values panel that now surfaces **relevant value groups** and the current binding more truthfully. The main remaining work is no longer architecture rescue; it is **preset completion, live validation, and finishing the remaining consumer gaps** such as reader success / warning / info panel surfaces.

📐 **Theme execution stance** - Theme work now targets one compile path for both authoring and runtime: **atomic tokens -> semantic token classes -> recipes -> emitted CSS vars**. The dedicated preview is no longer the source of truth; Theme Management applies an unsaved **live draft** to the real app in-session, with **Save** persisting the draft and **discard/reset** restoring the last saved theme. Reader and admin may share atomic tokens, but they should diverge cleanly at the semantic-class and recipe layers where their UI jobs differ.



*Content Page (`02-Application.md`)*



  **Priority bands**

  - **P1 (reader UX contract)** - **Feed Presentation Matrix**.

  - **P2 (experience enhancement)** - **In-Feed Expansion**; **Orientation-aware Framing**; **Rail Variant**.



- **Feed Presentation Matrix** - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.
- **Feed matrix target (agreed 2026-05-31)** - Implement the now-agreed contract before broader reader polish: closed cards drop tag/context badges entirely; only `Story` and `Gallery` keep type badges on closed feed cards; excerpts are excluded from reader card presentation for now; `Gallery` should differentiate from `Story` through stronger image-sequence cues rather than more text; `Question` should use a type-native background with overlaid title in closed state and carry that visual identity more clearly into open state; `Quote` remains quote-first; `Callout` is de-emphasized until its role is clearer.
- **Closed-card matrix alignment (2026-05-31)** - The first Reader implementation slice is now in `V2ContentCard`: closed feed cards no longer render tag/context badges or content/gallery icon badges; only `Story` and `Gallery` retain a closed-card type badge; closed `Story` and `Gallery` supporting text is now subtitle-only by default instead of excerpt-first; and closed `Question` cards no longer render teaser/excerpt copy in the feed. This closes the first closed-card cleanup slice, but it does **not** close the broader matrix: open-card header placement, `Question` closed-to-open continuity, and the desktop height/orientation decision remain separate Reader follow-up work.
- **Open-card header alignment (2026-05-31)** - The next Reader slice is now partially implemented in `CardDetailPage`: `Question` detail pages no longer drop straight into the generic detail header. Their metadata, title, and subtitle now sit inside a dedicated question-header panel that reuses the question-card background/watermark language, so the open card carries stronger continuity with the closed feed card. `Story` and `Gallery` still use the existing open-header structure with metadata above the title. Remaining matrix work is still open: final header-placement polish for all open card families and the broader desktop height/orientation decision.
- **Desktop feed rhythm normalization (2026-05-31)** - The closed-card sizing rule is explicit but not yet behaviorally closed: desktop feed cards should resolve to one standard landscape height and one restrained portrait variant at the same width, with square covers folded into the landscape family. `Story` is now canonically cover-led in reader presentation, so story cards without a real cover should use a standard story placeholder instead of a separate no-cover story layout. Excerpts are out of reader presentation for now so they stop acting as another height driver. Current status: the latest work in `V2ContentCard` is a **first repair pass**, not a closed fix.
- **Mobile closed-story cover rhythm (2026-06-01)** - Mobile closed `Story` cards now intentionally collapse portrait covers and story placeholders into the same shorter landscape-style cover frame used by landscape story cards. This is a feed-rhythm exception for the small-screen closed grid only; it does not change open Reader detail framing or the desktop portrait-variant rule.
- **Reader badge + open title polish (2026-06-01)** - Reader type/count badges now follow one shared stronger badge contract instead of mixing translucent overlay pills and cramped rectangular counts: use the support-chip color treatment for contrast, keep the shape pill-like across closed-card type badges and gallery count pills, and give badges enough vertical room for the chosen text scale. Small discovery/rail tiles such as `Explore More` should use a compact badge variant rather than the main feed/detail badge scale. Open `Gallery` detail titles should sit in the same visual size band as open `Story` titles even if their font family differs; do not let gallery detail default to a visibly larger title treatment by accident.
- **Closed feed title scale (2026-06-01)** - Main closed-feed `Story` and `Gallery` titles now use a slightly lifted feed-title token derived from their base reader title recipes, while small discovery/rail tiles continue to use the compact title path. This keeps the primary feed more readable after excerpt removal without making `Explore More` or other compact rails feel oversized.
- **Light-mode surface hierarchy (2026-06-01)** - Light-mode Reader now gives the sidebar and closed `Story` / `Gallery` tiles a slightly deeper surface treatment than the surrounding page so the app does not read as washed-out in light mode. This is a presentation-only hierarchy adjustment for light mode; dark mode keeps the prior raw surface mappings.
- **Closed utility-tile parity (2026-06-01)** - Closed utility cards should continue to read as one feed family: `Question`, `Quote`, and `Callout` now share the same closed utility-surface family rather than letting `Callout` drift to a darker special-case background, and in the current Reader shell they also share the same restrained portrait utility frame so mixed rows keep one height. Closed covered `Story` / `Gallery` title bands should also use that same question/utility surface across light and dark mode so the lower title panel reads as one consistent reader card family.
- **Closed utility-card headline / watermark alignment (2026-06-01)** - Within that shared utility-card family, closed `Quote` and `Callout` should visually relate to `Question`: quote headline scale and callout title scale now sit on the same stronger utility headline step used by the closed question card; quote tiles use the same roomier centered headline band as question tiles, but keep a distinct quote face; the quote watermark now follows the darker question-mark family treatment with a larger optically centered glyph; and closed callouts keep the centered watermark / vertical placement while returning their text stack to left alignment so they do not read like centered quote cards.
- **Closed utility-card content-owner correction (2026-06-01)** - The prior quote/callout height pass was incomplete because the two cards did not share the same content-owner contract: closed `Quote` was still rendering rich-text body content from `content`, while closed `Callout` body content could still dictate the tile's natural height. The current Reader rule is now explicit in `V2ContentCard`: closed `Quote` follows the same title-driven utility-tile contract as `Question`, while closed `Callout` continues to render Rich Text Editor content but must stay clipped inside the fixed utility-tile shell instead of expanding the card. The remaining outlier turned out to be frame selection, not body overflow: quote/callout closed tiles must ignore hidden cover metadata and stay on the same utility portrait frame as the current no-cover `Question` tile.
- **Reader persisted-state hydration correction (2026-06-01)** - Reader persisted browse/filter state now reconciles after mount instead of during the first client render. `CardProvider` and `TagProvider` start from server-safe defaults, then apply browser-stored reader mode, browse target, active dimension, collection, feed sort/grouping, card-type filters, and selected filter tags after hydration. This removes the earlier `/view` branch mismatch where server and client could disagree about empty-feed messaging and current-reader state during hydration.
- **Desktop feed rhythm diagnosis / handoff (2026-05-31)** - The first desktop-rhythm implementation failed because multiple competing height owners were still active at once: shell aspect ratio, older no-cover aspect-ratio rules, image-frame aspect ratio, content natural height, and the extra closed `Story`/`Gallery` text-row reservation. The concrete failure shape was: no-cover cards still obeyed the older `6:5` no-cover rule while covered story/gallery cards stayed `aspect-ratio: auto`; desktop overrides disabled content growth so some no-cover titles floated to the top; portrait and square routing existed in code but the shell ratio did not actually win because `.card.story/.gallery/.qa { aspect-ratio: auto; }` still overrode it; and the reserved second text row kept story/gallery structurally taller than question/quote/callout. The latest repair pass addresses some of this by raising desktop shell-ratio specificity, removing the closed story/gallery second text row, and making `Story` use a placeholder cover when real cover is missing, but the slice still needs manual desktop-feed verification before it can be considered landed.
- **Desktop feed rhythm verification checklist (2026-05-31)** - Before any new Reader slice, manually verify: story cards without real covers now behave like cover cards with a placeholder; no-cover titles no longer jump to the top unexpectedly; covered story cards do not remain taller than other landscape-family cards; question/quote/callout align with the same landscape family; square covers do not create a third size; portrait cards resolve to one restrained taller size rather than drifting freely. If any of these fail, continue the closed-card sizing repair instead of widening scope.

- **Desktop feed card sizing consistency** - Reconcile closed-card sizing on wider desktop feeds so cover-mode changes do not leave mixed tile heights and awkward rhythm across adjacent cards; preserve the better mobile behavior while making desktop grids look intentionally aligned.

- **Compact rail simplification** - On smaller rail tiles, omit excerpts, tags, and content/gallery type icons so compact discovery cards stay clean and readable.
- **Type-native card placeholders** - Add reader/admin preview parity for non-media-led card types (`Question`, `Quote`, `Callout`) by using type-native placeholder treatments when no real cover exists, instead of presenting them as empty missing-cover tiles. Preferred direction: reuse the existing reader-family background treatment, keep this purely presentational (`type` + no cover), and avoid backend-generated preview assets.
- **Inline-title editing boundary for placeholder cards** - If type-native placeholders are added to admin/Studio cards, preserve inline title editing for media-led card presentations first and keep `Question` / `Quote` / `Callout` title edits in Compose until a cleaner overlay-edit affordance is justified.

- **Cover framing contract** - Define one authoritative cover-framing target for authoring and reconcile Compose, reader feed, reader detail, and admin/Studio preview surfaces so focal adjustments do not look correct in one surface and wrong in another. Current agreed direction: Compose is the authoring truth for the primary cover presentation, open Reader should match that authored crop, and stored focal-point data may still drive alternate-shape secondary surfaces such as closed feed cards, rails, and `Explore More`. Current implementation status: open Reader detail now follows the authored Compose crop more directly, and cropped open-gallery strips now honor the same gallery focal source as closed gallery cards (gallery override first, then Studio Media default), while fullscreen gallery viewing remains whole-image. Broader secondary-surface framing policy still needs a full parity review.

- **Rail Variant** - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.

- **In-Feed Expansion** - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.

- **Orientation-aware Framing** - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.

- **Closed-card overlay legibility** - Strengthen overlay icon/button readability on card media without drifting into heavy-handed chrome; cues should remain quiet but clear against varied imagery.

- **Trivia card flip treatment** - Evaluate a `Trivia` card family for short prompt/answer content with a tap/click flip interaction (front = prompt, back = answer) so lightweight Q&A can feel distinct from full Question cards without forcing a detail-page open.

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).
- **Inline feed display rendering** - Shipped 2026-06-12 (slice 2b): closed feed tiles with `displayMode === 'inline'` render via `TipTapStaticContent` (`generateHTML`) instead of mounting full TipTap per tile. Display-only; admin edit paths (`ReaderCardEditModal`, Compose) and detail/callout TipTap surfaces unchanged.
- **Feed hydration tiers** - Shipped 2026-06-12 (slice 2c): reader feed/search CardProvider queries pass `hydration=cover-only` (covers + first gallery slide when no cover); card detail still loads full hydration via `getCardById`. Full gallery swiper hydration remains on detail open.
- **Reader rendition delivery** - Shipped 2026-06-12 (slice 2d): reader feed/detail tiles use `getReaderDisplayUrl` (`renditions.studio` WebP when present, else original). InlineGallery/ViewMediaFeed lightbox+zoom keep originals. Run `backfill-media-studio-renditions` for legacy media without studio derivatives.
- **Feed virtualization** - Shipped 2026-06-12 (slice 2e-1, CSS containment): feed grid tiles use `content-visibility: auto` + `contain-intrinsic-size` so offscreen tiles skip layout/paint while staying in the DOM (scroll restore, focus lookup, grouped sections, guided mode unchanged). True DOM windowing deferred unless profiling shows DOM node count itself is the bottleneck.
- **Current feed/card presentation status (2026-04-29)** - The reader feed is no longer using the earlier portrait-overlay default for closed image cards. The current baseline is a **single stable, landscape-leaning closed-card shell** with **stacked media on top and text below** for closed `Story`, `Gallery`, and `Question` cards, plus tighter one-line supporting text. Guided mode now behaves more like a TOC: the sidebar shows the real collections tree, the feed shows the selected node's direct children (not the parent card itself), and a sticky guided title bar keeps the current collection visible during scroll. This is still an intentional interim presentation baseline, not the final matrix closeout: the broader `Feed Presentation Matrix` still needs explicit completion and visual validation across all card types, rail contexts, and viewport sizes, and a narrow-viewport card-sizing regression remains open in guided mode.
- **Cover fit / fill closeout (2026-05-23)** - The first flexible cover-mode slice is now shipped in the main authoring/reader path. Cards can persist `Fill` vs `Fit`; Compose exposes that framing control in the cover editor; and the main reader surfaces honor it in closed cards, detail view, and child-card rails. Remaining cover work should focus on any later zoom-style control or further preview harmonization, not on reintroducing fit/fill as an open baseline item.



📐 **Matrix rollout checklist** - Sequence implementation of the matrix contract in this order:

- **Baseline contract** - Implement `Feed Presentation Matrix` logic in code paths used by `V2ContentCard` and `CardDetailPage`, and verify all existing `type` + `displayMode` combinations map to one explicit behavior.
- **Closed-card closeout status** - Closed feed-card cleanup is now partially implemented in `V2ContentCard`; remaining matrix work should treat open-card/header behavior and desktop sizing/orientation as the next explicit Reader slices rather than reopening closed-card metadata cleanup.

- **Grid-first parity** - Apply `Orientation-aware Framing` in default feed grid and open card surfaces first, using bounded ratio buckets to avoid layout drift.

- **Story expansion** - Implement `In-Feed Expansion` only for story cards in default feed before extending to any other type.

- **Rail activation** - Implement `Rail Variant` with curated eligibility and deterministic ordering after grid parity and story expansion are stable.

- **Regression sweep** - Validate navigation, scroll continuity, and card interaction rules (`open` vs `expand`) across feed, rail, and open-card contexts.



*Left Navigation (`02-Application.md`)*

- **Mobile drawer swipe closeout (2026-05-23)** - The reader drawer open gesture now uses a dedicated mobile left-edge capture zone in `AppShell` instead of relying only on broad content-wrapper touches. This keeps the intended in-app drawer-open swipe more competitive with browser-history gestures while preserving left-swipe close and desktop behavior. Remaining mobile reader work should treat this as closed unless real-device verification reveals a narrower follow-up issue.

- **Sidebar control-row reorder** - Revisit the Freeform sidebar header order so `Guided | Freeform`, `Cards | Media`, and `Clear` sit in the most intuitive arrangement for real browsing rather than preserving the current stack by inertia.

- **Cards-before-tags ordering** - Keep card/media scope visibly above taxonomy browsing so browse target is set before tag-tree exploration begins.







*Application (`02-Application.md`)*

- **Reader mobile text edit** - Allow admin users on `/view` to make narrow text edits (title, body, caption) through lightweight reader-path UI and narrow PATCH routes, without requiring full Studio or the current desktop-oriented edit modal for routine touch-ups. **Shipped 2026-06-12 (slices 5a–5d):** card detail + feed tiles use `ReaderCardEditEntry` (mobile quick edit via narrow PATCH branches; desktop compose modal on demand); gallery lightbox caption edit via `updateCardGallery`; plain-prose body quick edit via `updateCardContent` when eligible.

- **Reader bundle separation** - Keep viewer sessions on a minimal reader bundle; load admin-only surfaces (Theme Management, Studio, full Compose) through admin routes or explicit lazy admin chunks on `/view`, not in every authenticated session bundle. **Shipped 2026-06-12 (slice 5d):** feed tiles lazy-load `ReaderCardEditEntry` so viewer sessions no longer statically import full Compose; Theme Management overlay lazy-loaded (slice 2a); Studio remains admin-route scoped.

*View Page (`02-Application.md`)*

  **Priority bands**
    - **P1 (reader polish)** - **Kicker strategy**; **Related / Explore More refinement**; **Drop cap treatment**.

- **Chronological filter aggregation** - Evolve `When` browsing beyond flat tag-tree selection toward expandable time buckets (for example decade -> year -> month -> day where data quality supports it), while allowing `Who` to diverge later into a more visual reader filter model if face/person-oriented browsing becomes first-class.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Backend (`01-Vision-Architecture.md`)*



- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **Quality** - QA app.
- **Security Hardening** - Threat-model review, authorization review, secret-handling review, and hosted deployment hardening for commercial readiness. Current boundary: `storage.rules` and `.env.example` are present in repo (shipped 2026-06-12); **API route access audit + automated admin-boundary tests shipped 2026-06-12 (slice 3b)** — see `src/lib/auth/apiRouteAccessAudit.ts` and `docs/02-Application.md` **API route access audit**; **env-password auth fallback retired 2026-06-12 (slice 3d)** — sign-in is `journal_users` only; `ADMIN_EMAIL` / `ADMIN_PASSWORD` are seed-bootstrap only.
- **Testing** - Expand automated coverage on workflow-critical, integrity-critical, and commercially sensitive paths, including contract-level browser smoke tests for reader and admin workflows where API/unit tests alone are insufficient.
- **CI gate expansion** - Shipped 2026-06-12: `.github/workflows/integrity-gate.yml` PR gate runs `npm run lint`, `npm run build`, and `npm test -- --ci --runInBand` on pull requests; nightly emulator-backed integrity remains in `integrity-emulator.yml`.
- **Playwright smoke tests** - Shipped 2026-06-12 (v1 read-only): `npm run test:e2e` covers login, anonymous redirect, reader feed + card detail, and viewer/admin route boundary via `e2e/smoke/*`. CI: `.github/workflows/e2e-smoke.yml` runs nightly + manual against hosted `E2E_BASE_URL` (not a PR gate yet). Remaining: PR-gate promotion after stable green history, admin-save mutation scenario.
- **Access & privacy gate** - Re-verify hosted reader/admin boundaries in deployed use: direct URL behavior, hosted auth/session configuration, and absence of admin affordance leakage. Current closeout: hosted anonymous requests to `/view`, `/search`, and `/admin` now redirect to login while the corresponding reader APIs reject anonymous access with `401`; `viewer` sessions can use reader routes/APIs but are redirected away from representative admin routes, do not see admin navigation affordances on reader surfaces, and receive `403` from `/api/admin/journal-users`; `admin` sessions can access both reader/admin routes and the admin users API. The root reader page-route mismatch observed on 2026-05-23 is resolved, and this verification pass found no concrete hosted access/privacy leak. Local import helpers are expected to remain admin-only operational routes; audience-based reader sharing is future scope, not part of current v1 verification.
- **Integrity gate expansion** - Expand integrity verification for card-media references, tag counts, derived card fields, delete/replace graph behavior, and import drift detection. **Shipped 2026-06-12 (slice 3c):** tag-count invariants (`findTagCountViolations`), expanded unit gate tests, and emulator-backed `createCard` / `updateCardTags` / `deleteCard` / `updateCardCover` scenarios alongside existing delete/replace graph coverage in `emulator.integrity.test.ts`.
- **Import trust gate** - Verify source identity, duplicate signals, metadata preservation, partial-failure handling, and operator recovery paths for import workflows. Current closeout: the local-source missing-media restore helper now runs as a preflight-first plan/apply workflow, resolves the canonical import-source path before `create` vs `merge`, refuses to mutate cards after partial folder imports, and completed the approved 2026-05-28 restore apply at `158/159` planned folders with the sole corrupt source file intentionally removed from the restore set after review.
- **Operational recovery gate** - Verify database backup, local secrets backup, restore drill, rollback/incident response, and admin account recovery before commercial release. Current closeout: the backup serializer now reserves `id` for the Firestore document id in new backup output; a fresh `backup:database` run completed successfully on 2026-05-27; `restore:database` dry-run and apply both succeeded against the disposable Firebase project `my-journal-restore-drill`; the matching Firestore indexes plus rules were deployed successfully to that drill target; and the documented viewer recovery path was exercised successfully there (password reset, disable/reenable access, and restoration of the original password). The Firestore restore path plus viewer-account recovery are now credibly proven. **Storage byte backup script shipped 2026-06-12** (`npm run backup:storage`); remaining work includes a documented Storage restore drill on a disposable target, Typesense/search parity on recovered targets, broader incident-response proof, and deployment/runtime validation on a recovered environment.
- **Workflow quality gate** - Validate family-demo reader flow, hosted-alpha repeated-use flow, admin prep friction, and mobile reader usability against milestone pass criteria. Current closeout: hosted authenticated reader data paths now work for `viewer` sessions across feed, detail, search, media, and at least one dimensional filter; hosted admin save/revert verification also succeeded against a draft gallery card for metadata save plus gallery reorder/revert. Remaining gap: full visual mobile/desktop usability proof still needs a working live browser session rather than API-only confirmation.

*Backup (`01-Vision-Architecture.md`)*

- **Storage byte backup** - Shipped 2026-06-12 (slice 3a): `npm run backup:storage` backs up Firebase Storage object bytes (originals + renditions) to OneDrive `Firebase Backups/run-<timestamp>/storage/` with `storage-manifest.json` and post-run size verification. Dry-run by default; `--apply` downloads or incrementally copies unchanged blobs from prior runs. **Restore drill:** operator path documented in `docs/NPM-SCRIPTS.md`; automated restore helper remains follow-up.



❓ **Open**

- *(None currently.)*
