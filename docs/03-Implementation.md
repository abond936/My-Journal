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

📐 **Canonical task intake** - Do not let chat become a shadow backlog. Use chat for intake, audits, clarifications, and approvals; keep canonical product/status truth in `docs/02-Application.md` and canonical active sequencing truth in `docs/03-Implementation.md`. When ad hoc notes reveal real remaining work, normalize them into the owning `02` section and, if they are true next-step work, mirror them here as `⭕1` items rather than leaving them in prompts or chat history.

📐 **Active Studio/admin baseline** - Shipped Studio status and durable contracts live in `docs/02-Application.md` under **Administration**, **Card Management**, **Collections Management**, **Media Management**, **Tag Management**, and **Question Management**. Use those sections as product truth; keep this file focused on remaining planned work and milestone gates.

📐 **Build/deploy contract (2026-05-23)** - Production builds must not depend on optional platform-package resolution quirks or fabricated shared-event types. Current closeout: import metadata resolution no longer assumes direct `exiftool-vendored.pl` module resolution in app code, and Studio relationship DnD now passes the real drag event plus an explicit resolved `overId` instead of constructing a fake `DragEndEvent`. Verification standard for deploy-blocker work: `npm run build` must complete locally before treating Vercel failures as environment-only.

### Phase 1 — Pre-Import

*Complete — baseline recorded in `docs/02-Application.md` → **Administration** ✅ **Integrity gate (CI)**.*



### Phase 2 — Admin Productivity

⭕1 **Planned**



*Integrated execution order:* **§ Studio sequence** inline-tag work is ✅ (2026-04-23 closeout in `docs/02-Application.md` → **Administration**). Then **§ Card Management**, **§ Tag Management** (remaining), **§ Media Management** (remaining), **§ Backend**. Each **⭕1** bullet matches `docs/02-Application.md` verbatim (bold title + text after ` - `) where still planned.



**§ Administration (`02-Application.md`)**



- **DnD hardening pass** - Harden active admin drag/drop flows so reparent, unparent, assign, and reorder behavior is clearer, more reliable, and visually professional before expanding DnD breadth further.



**§ Card Management (`02-Application.md`)**



*Priority bands after Studio sequence:* **P2** — **Context Assist** (Studio/grid-first admin layout is the intended long-term workflow—see **Card Management** / **Media Management** ✅ in `02-Application.md`).



- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.





**§ Tag Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."

- **Node Strategy** - Raw tag overlay to created aggregations.



**§ Media Management (`02-Application.md`)** *(remaining **⭕1** after **Studio sequence**)*



*Priority bands:* **P2 (operator productivity)** — Media import/duplicate handling remains a larger deferred media-management gap rather than the next isolated polish slice.



- **PhotoPicker convergence in Media admin** - Add operator flows in **`/admin/media-admin`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (`📐 **Studio media & body (2026-04-22)**`).


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

  - **P1 (reader UX contract)** - **Feed Presentation Matrix**.

  - **P2 (experience enhancement)** - **In-Feed Expansion**; **Orientation-aware Framing**; **Rail Variant**.



- **Feed Presentation Matrix** - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.

- **Compact rail simplification** - On smaller rail tiles, omit excerpts, tags, and content/gallery type icons so compact discovery cards stay clean and readable.

- **Cover framing contract** - Define one authoritative cover-framing target for authoring and reconcile Compose, reader feed, reader detail, and admin/Studio preview surfaces so focal adjustments do not look correct in one surface and wrong in another. Current diagnosed mismatch: Compose uses a fixed `6:5` crop preview, reader detail/rails use orientation-aware frames, and admin preview tiles use additional thumbnail ratios.

- **Rail Variant** - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.

- **In-Feed Expansion** - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.

- **Orientation-aware Framing** - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.

- **Trivia card flip treatment** - Evaluate a `Trivia` card family for short prompt/answer content with a tap/click flip interaction (front = prompt, back = answer) so lightweight Q&A can feel distinct from full Question cards without forcing a detail-page open.

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).
- **Current feed/card presentation status (2026-04-29)** - The reader feed is no longer using the earlier portrait-overlay default for closed image cards. The current baseline is a **single stable, landscape-leaning closed-card shell** with **stacked media on top and text below** for closed `Story`, `Gallery`, and `Question` cards, plus tighter one-line supporting text. Guided mode now behaves more like a TOC: the sidebar shows the real collections tree, the feed shows the selected node's direct children (not the parent card itself), and a sticky guided title bar keeps the current collection visible during scroll. This is still an intentional interim presentation baseline, not the final matrix closeout: the broader `Feed Presentation Matrix` still needs explicit completion and visual validation across all card types, rail contexts, and viewport sizes, and a narrow-viewport card-sizing regression remains open in guided mode.
- **Cover fit / fill closeout (2026-05-23)** - The first flexible cover-mode slice is now shipped in the main authoring/reader path. Cards can persist `Fill` vs `Fit`; Compose exposes that framing control in the cover editor; and the main reader surfaces honor it in closed cards, detail view, and child-card rails. Remaining cover work should focus on any later zoom-style control or further preview harmonization, not on reintroducing fit/fill as an open baseline item.



📐 **Matrix rollout checklist** - Sequence implementation of the matrix contract in this order:

- **Baseline contract** - Implement `Feed Presentation Matrix` logic in code paths used by `V2ContentCard` and `CardDetailPage`, and verify all existing `type` + `displayMode` combinations map to one explicit behavior.

- **Grid-first parity** - Apply `Orientation-aware Framing` in default feed grid and open card surfaces first, using bounded ratio buckets to avoid layout drift.

- **Story expansion** - Implement `In-Feed Expansion` only for story cards in default feed before extending to any other type.

- **Rail activation** - Implement `Rail Variant` with curated eligibility and deterministic ordering after grid parity and story expansion are stable.

- **Regression sweep** - Validate navigation, scroll continuity, and card interaction rules (`open` vs `expand`) across feed, rail, and open-card contexts.



*Left Navigation (`02-Application.md`)*

- **Mobile drawer swipe closeout (2026-05-23)** - The reader drawer open gesture now uses a dedicated mobile left-edge capture zone in `AppShell` instead of relying only on broad content-wrapper touches. This keeps the intended in-app drawer-open swipe more competitive with browser-history gestures while preserving left-swipe close and desktop behavior. Remaining mobile reader work should treat this as closed unless real-device verification reveals a narrower follow-up issue.







*View Page (`02-Application.md`)*

  **Priority bands**
    - **P1 (reader polish)** - **Kicker strategy**; **Related / Explore More refinement**; **Drop cap treatment**.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Backend (`01-Vision-Architecture.md`)*



- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations. **During feature work**, fix ESLint/TypeScript issues introduced in **approved scope** on touched files per `.cursor/rules/# AI_InteractionRules.mdc` → **Lint and type hygiene on touched code**; repo-wide cleanup and re-enabling lint in production builds remain this phase.

- **Quality** - QA app.
- **Security Hardening** - Threat-model review, authorization review, secret-handling review, and hosted deployment hardening for commercial readiness.
- **Testing** - Expand automated coverage on workflow-critical, integrity-critical, and commercially sensitive paths.
- **Access & privacy gate** - Re-verify hosted reader/admin boundaries in deployed use: direct URL behavior, hosted auth/session configuration, and absence of admin affordance leakage. Current closeout: hosted anonymous requests to `/view`, `/search`, and `/admin` now redirect to login, while `/api/cards`, `/api/cards/search`, and `/api/view/media` reject anonymous access with `401`, so the root reader page-route mismatch is resolved. Remaining work in this gate should focus on broader deployed-use re-verification and any future admin-affordance leakage findings, not this specific `/view` and `/search` route-protection defect. Local import helpers are expected to remain admin-only operational routes; audience-based reader sharing is future scope, not part of current v1 verification.
- **Integrity gate expansion** - Expand integrity verification for card-media references, tag counts, derived card fields, delete/replace graph behavior, and import drift detection.
- **Import trust gate** - Verify source identity, duplicate signals, metadata preservation, partial-failure handling, and operator recovery paths for import workflows.
- **Operational recovery gate** - Verify database backup, local secrets backup, restore drill, rollback/incident response, and admin account recovery before commercial release.
- **Workflow quality gate** - Validate family-demo reader flow, hosted-alpha repeated-use flow, admin prep friction, and mobile reader usability against milestone pass criteria. Current closeout: hosted authenticated card search is working again for both `viewer` and `admin`, so the earlier missing-index production failure on `/api/cards/search` is no longer blocking repeated-use reader verification.



❓ **Open**

- *(None currently.)*
