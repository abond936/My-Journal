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

- **Architecture** - Core model (cards, media, tags) in place.
- **v1 refinements** - Lock reader + Studio behavior; prepare content for import and family demo.
- **Hosted reader** - Private Vercel deployment live; stabilize reader/mobile, auth boundaries, and author prep workflows.
- **Multi-tenant** - Near-term follow-on after v1 proof; not current scope.

**Milestone path**

- **Family demo** - Guided and Freeform reading feel smooth; hosted access correct; author prep dependable; no obvious integrity or trust failures.
- **Hosted alpha** - Repeated family use: import, authoring, and reader workflows dependable; access boundaries trustworthy.
- **Commercial v1** - Security reviewed; workflow- and integrity-critical testing expanded; backup/restore/release procedures realistic; no brittle shortcut in core reader/admin/import paths.

📐 **Demo-first execution stance** - Until the family demo is credible, reader stability and access boundaries outrank aesthetic expansion. **Phase 1.a closed 2026-07-12**; active work is **Phase 2** build slices below (tag authority first).

📐 **Review program closeout** - Engineering review program steps **1–12 closed 2026-07-10** (reader performance, backend hardening, Studio legacy retirement, mobile text edit, E2E, API hardening, security/ops baseline, operational recovery drill). Residual engineering quality items remain incremental Phase 4 backlog, not a rewrite mandate. Shipped slice detail: **📘 Review program archive** below and `docs/NPM-SCRIPTS.md`.

---

## Execution Plan

*Sequenced by dependency: personal use → family demo → hosted alpha → commercial v1. **Phase 1.a closed 2026-07-12.** **Phase 2 (active)** — build slices below; product wording lives in `02` (and Backend planned items in `01`).*

**Gates**

- **Decision reconciliation** - Outcomes that affect future work reconcile into `01` / `02` / `03` or stay explicitly non-canonical.
- **Verification** - No code change is complete without relevant checks; add tests when behavior or integrity risk warrants.
- **Release readiness** - Commercial release requires documented deploy, backup, restore, admin recovery, and rollback/incident procedures.
- **Reviewable slices** - One approved slice at a time; do not chain dependent work before author review.

📐 **Current program stance** - Storytelling surfaces (reader, Studio runtime) are largely credible for family demo; **v1 is not strategically complete** until organize-at-scale, tag authority, commercial entry, and operator trust are productized. **Phase 1.a closed 2026-07-12** (spec + author decisions reconciled in `02` / `01`). **Active build:** Phase 2 slice **Tag inheritance** — Settings toggles (default off) + gallery→card sync per `02` **Studio Tags** 📋. Studio runtime **author-verified 2026-07-11**; no new demo blocker unless a defect appears.

📐 **Canonical task intake** - Chat is intake and approval only. Spec outcomes land in owning `02` 📋 / 📐 (or `01` TECHNICAL for platform rules); build items stay as `⭕1` in `02` / `01` and appear in phases after **1.a** exit.

### Phase 1 — Pre-Import

*Complete — integrity CI baseline and core architecture. Product truth: `02` **Application** 📋.*

### Phase 1.a — Specification *(closed 2026-07-12)*

*Goal met: horizontal **📋** contracts and vertical section specs reconciled in `02` / `01`; author product decisions locked (inheritance defaults off, reader filter subject mode deferred to explicit menu + subject authoring, multi-parent per-path, Apple Photos first adapter, one account per reader, reader presets-only). Deferrable **❓** (Left Nav polish, landing brand assets, provisional schema at build slice) do not block build.*

📐 **Closeout** - Exit gate satisfied. Spec inventory below retained as reference; do not treat as active work.

#### Horizontal — system objects *(reference — spec'd)*

*Status after Phase 1.a batch pass (2026-07-12): **📋 drafted** = reconciled contract in owning doc; **❓** = product contract exists but platform/schema detail open.*

- **Tag authority** — **📋 spec'd** (`02` **Studio Tags**). Toggle defaults **off**; reader filter default **any assigned**; subject-only via future menu.
- **Provisional suggestions** — **📋 drafted** (`02` **Administration**). Firestore schema **❓** (`01` 📐).
- **Media bank** — **📋 drafted** (`02` **Studio Media**).
- **Media processing platform** — **📋 drafted** (product target in **Studio Media**; lifecycle 📐 in `01` Backend).
- **Import & source adapters** — **📋 spec'd** (interim export→upload; **Apple Photos first** native adapter).
- **Card model** — **📋 drafted** (`02` **Studio Cards**).
- **Collections & structure** — **📋 spec'd** (`02` **Collections Management**, **Studio Organize**). Multi-parent: **per-path** in Guided reader.
- **Card–media integrity** — **📋 verify** (`01` Backend 📐 set; product cross-refs in **Administration**, **Studio Media**).
- **Archive intelligence** — **📋 drafted** (provisional + Review mode IA; spikes remain ⭕1 build).
- **Person & face identity** — **📋 drafted** (📐 in **Studio Tags** + `05`; faces ⭕2).
- **Filters & populations** — **📋 drafted** (`02` **Administration**, **Application**, **Navigation**, `01` 📐).
- **Search & index** — **📋 drafted** (admin in **Administration**; platform in `01`).
- **Presentation & card matrix** — **📋 drafted** (`02` **Content Page** V1 Matrix). Utility typography parity remains ⭕1 build.
- **Dimensional chip display** — **📋 drafted** (derives from Tag authority + Content Page).
- **Theme & design packages** — **📋 spec'd** (`02` **Theme Management** + `04`). Reader **presets-only** in v1; italic accent **❓**.
- **DnD platform** — **📋 drafted** (`02` **Administration**).
- **Studio state domains** — **📋 drafted** (`02` **Administration**).
- **Session, auth & roles** — **📋 drafted** (`02` **Application**, **User Management**, **Sign-in**, `01` auth 📐).
- **Mutations & API** — **📋 verify** (`01` Backend 📐; no new 1.a gaps identified).
- **AI touchpoints** — **📋 drafted** (summary in **Application**; detail in **Administration** / **Studio Cards**).
- **Operator & backup** — **📋 drafted** (**Top Navigation** Settings v1 + `01` **Backup** + scripts).
- **Shared admin feedback** — **📋 drafted** (`02` **Application**, **Administration** ✅).
- **Selection & bulk** — **📋 drafted** (`02` **Administration**, **Studio Cards**, **Studio Media**).
- **Questions & prompts** — **📋 drafted** (`02` **Studio Questions**).

#### Vertical — `02` sections *(specifications to complete)*

*Status after Phase 1.a batch pass (2026-07-12): **📋 spec'd** = Intent/Principles + 📋 contracts drafted; **❓** = author decisions remain.*

- **Application** — **📋 spec'd** (session, feedback, AI touchpoint summary).
- **Landing Page** — **📋 spec'd**; pricing/contact **TBD** (deferred); brand/hero **❓**.
- **Sign-in** — **📋 spec'd**; route split **shipped** (`/` landing, `/login` credential entry).
- **Top Navigation** — **📋 spec'd** (Settings v1, Help v1, hamburger IA); build ⭕1.
- **Left Navigation** — **📋 spec'd** (Guided/Freeform); Group by, Created sort, messy-archive entry **❓**.
- **Content Page** — **📋 spec'd** (V1 Matrix, chips, shell); utility typography ⭕1 build.
- **View Page** — **📋 spec'd** (detail contracts); kicker/drop-cap ⭕1.
- **Administration** — **📋 spec'd** (shell, DnD, provisional, selection/bulk, interaction economy).
- **Studio Cards** — **📋 spec'd** (card model horizontal, grid contracts).
- **Studio Compose** — **📋 spec'd** (active card, gallery truth, preview parity).
- **Studio Organize** — **📋 spec'd** (domain separation, DnD pointer).
- **Studio Tags** — **📋 spec'd** (tag authority, inheritance defaults off; reader filter scope UI shipped).
- **Collections Management** — **📋 spec'd** (multi-parent **per-path** in Guided reader).
- **Studio Questions** — **📋 spec'd**.
- **Studio Media** — **📋 spec'd** (bank, import interim, Review mode, Apple Photos first); video depth **❓**.
- **User Management** — **📋 spec'd** (one account per reader).
- **Theme Management** — **📋 spec'd** (presets-only for readers; workbench admin-only); italic **❓**.
- **Gallery Management** — **📋 spec'd** (future presets; v1 defers to card gallery).

#### Platform — `01` sections *(re-spec or verify)*

- **Product Vision** — **verify** (aligned; no 1.a gaps).
- **TECHNICAL → Backend** — **📋 extended** (provisional storage 📐, processing lifecycle 📐); schema detail **❓** at build slice.
- **TECHNICAL → Frontend** — **verify** (aligned with **Administration** 📋).
- **TECHNICAL → Scripts & Backup** — **verify** (Settings v1 operator path drafted in **Top Navigation**).

📐 **1.a closeout** - Author approved exit **2026-07-12**. Build resumes at **Phase 2** below.

### Phase 2 — Admin Productivity *(active)*

📐 **Active build** - **Reader filter scope** shipped **2026-07-13** (sidebar **Tag match** control; `tagScope=subject` on card and media list APIs when user selects **Subject only**). Prior: **Tag inheritance slice** **2026-07-12**. **Next candidate:** Settings Tag Set 0, inheritance backfill, or organize spine (provisional + Review mode).

*Remaining Phase 2 inventory follows; order is guidance after the active slice completes.*

⭕1 **Planned**

**§ Administration (`02`)**

- **Interaction contract alignment** - Document and enforce user-visible latency/feedback contracts for browse, selection, DnD, and filter persistence across Studio panes.
- **Code path simplification** - Retire deprecated surfaces, duplicate loaders, and dead compatibility paths that no longer support the Studio workflow.
- **Operator message pruning** - Remove low-value shell noise (for example ambient `working in...` messages).
- **Studio light-mode hierarchy** - Collapse header/workspace seam and reduce stacked pale planes without changing pane ownership or DnD structure.

**§ Studio Cards (`02`)**

- **Grid-first convergence** - Finish retiring table/list code paths and stale CSS where grid covers identity, tagging, selection, and relationships.
- **Grid density** - Reduce tile footprint ~25% while preserving legibility and selection affordances.
- **Context Assist** - Keep historical/background context a distinct output from writing rewrites in AI assist.
- **Tag picker polish** - Keyboard-first tree interaction and search disambiguation if needed after current compact picker.
- **Dimension filter evolution** - Searchable tree popover for single-dimension `Matches` without replacing full `MacroTagSelector` for advanced work.
- **Narrative development backlog** - Consolidate story runs, year coverage, question-backed stories, callout/quote expansion.

**§ Studio Compose (`02`)**

- **Compose authoring refinement** - Excerpt guidance reacts to body changes; reader admin editing styled as Compose-grade surface where practical.
- **Compose framing refinement** - Broader parity across Compose, reader feed, reader detail, and admin preview surfaces.
- **Editor presentation** - Optional drop-cap styling in rich-text editor.

**§ Studio Tags (`02`)**

- **Tag recomp** - Queue hierarchical count recomputation when increment semantics insufficient.
- **Node strategy** - Raw tag overlay to created aggregations.
- **Organize shortcuts** - Direct Who/What/When/Where jump buttons in Organize tree.
- **Tag tree density** - Tighter vertical spacing without weakening DnD hit targets.
- **Tag-edit iconography** - Tag-specific affordance instead of generic pencil.
- **Media-to-card tag inheritance** - Auto gallery→card sync per `02` **Studio Tags** 📋 (**shipped 2026-07-12** — Settings toggles + sync hooks; backfill on toggle enable deferred).

**§ Studio Media (`02`)**

- **PhotoPicker convergence** - Bank import and library pick in Media admin so card edit PhotoPicker becomes optional.
- **Import and duplicate triage** - Trustworthy bank workflow and source-aware duplicate review (not filename-only).
- **Manual phone aggregation** - Select imported phone group, assign to card, flesh out story/tags.
- **Media derivative architecture** - Surface-specific derivatives; video and phone as first-class inputs.
- **Media readiness pipeline** - Background ingest/processing states so imports appear quickly with truthful status.
- **Workspace parity** - Shared operator contract with Cards for layout, selection, and drag affordances.
- **Caption workflow** - Inline caption edit and two-line clamp on grid tiles.
- **Gallery override posture** - Studio Media defaults primary; Compose overrides explicit exceptions.
- **External-editor replace loop** - Smooth GIMP/Topaz round-trip via replace-in-place.
- **Guided archive spikes** - Clustering review UI per `docs/05-Guided-Archive-Assistance.md` (heuristics, evaluation set, review stacks).

**§ User Management (`02`)**

- **User surface polish** - Page title, `All Users` casing, heading alignment with rest of admin chrome.

**§ Backend (`01`)**

- **Narrow mutation paths** - Extend bounded-write discipline wherever admin flows still fall back to wider `updateCard`-style work than the change requires.

### Phase 3 — Reader experience

*Build inventory — pending **Phase 1.a** exit and re-sequence.*

⭕1 **Planned**

📐 **Suggested order** - **Landing & entry** (public surface) when demo needs it → **Content/View** polish → **Navigation** chrome → **Theme** preset completion. Pick one slice at a time from demo-first priorities.

**§ Landing & entry (`02` Navigation — Landing Page, Sign-in)**

- **Landing page program** - **shipped** (full v1 section stack; pricing/contact forms are disabled placeholders until tiers and operator channel are locked).
- **Hero** - **shipped** — product promise and **Sign in** CTA.
- **About** - **shipped** — audience and problem statement.
- **Features** - **shipped** — organization, stories, private reading, publishing.
- **How it works** - **shipped** — in-app steps + honest external pipeline.
- **Pricing** - **placeholder shipped** — three-tier card layout (Personal / Family / Legacy); **Pricing TBD** copy; **Request access** links to contact section; numeric tiers and interest form wiring **TBD**.
- **Resources** - **shipped** — curated external pointers (disclaimer: not endorsements).
- **Privacy & trust** - **shipped** — family-private hosting summary.
- **FAQ** - **shipped** — access, mobile vs admin, help pointers.
- **Contact / access** - **placeholder shipped** — disabled request form; channel TBD.
- **Sign-in route** - **shipped** at `/login` with landing CTAs and auth redirects.

**§ Top Navigation (`02`)**

- **Top-nav refinement** - Logo, Back clarity, chrome density.
- **Hamburger restructure** - Home, Settings, Help, Theme row per 📋 contract.
- **In-app Help** - Reader basics + link to landing FAQ.
- **Settings surface** - Narrow v1 scope (design pass first).

**§ Left Navigation (`02`)**

- **Left-nav refinement** - Control order (`Cards | Media` above taxonomy); browse-target clarity; mobile ergonomics for Guided/Freeform.

**§ Content Page (`02`)**

- **Feed presentation refinement** - Enforce matrix across contexts; orientation-aware inline paths; overlay legibility.
- **Rail variant** - Curated horizontal sequences separate from main grid.
- **Read more** - In-feed progressive disclosure for story excerpts.
- **Question cover cue** - Type-native cover treatment for closed Question tiles.
- **Utility typography parity** - Rail vs grid Quote/Question scale; blocked until unified utility tokens.
- **Trivia card** - Flip prompt/answer family evaluation.
- **Quote attribution** - Attribution modeling (content vs subtitle/excerpt).
- **Questions / Quotes sourcing** - Import/source material paths.

📐 **Closed-tile sequencing (reference)** - Steps 1–4 largely shipped (chip row, unified shell, Studio grid, rail tokens). Open: **utility typography parity**, **tag aggregation** (Studio Tags), matrix enforcement above.

**§ View Page (`02`)**

- **Detail presentation refinement** - Optional kicker/subhead; discovery typography and hierarchy.
- **Drop cap** - Long-form story openings evaluation.

**§ Theme Management (`02`)**

- **CSS tokenization** - Move design-affecting literals into theme variables incrementally.
- **Theme contract inventory** - Surface/element/token migration status before Journal/Editorial are "finished."
- **Theme schema** - Formalize Firestore theme document (atomic + semantic + recipes).
- **Preset completion** - Journal/Editorial coherent light/dark packages after inventory and schema.
- **Workspace chrome** - Lighter floating panel; ~20% more effective height before inner scroll.

❓ **Open (`02` Theme Management)** - **Italic** — right-leaning ink font for editorial accent?

### Phase 4 — Scale & polish

*Build inventory — pending **Phase 1.a** exit and re-sequence.*

⭕1 **Planned**

**§ Backend / platform (`01`)**

- **Code** - Comment code.
- **Directory** - Cleanup directory.
- **Quality** - QA app.
- **Security hardening** - Threat model, authorization, secrets, hosted deployment hardening beyond current baseline.
- **Testing** - Expand automated coverage on workflow-critical, integrity-critical, and commercially sensitive paths; contract-level browser smoke where unit/API tests are insufficient.
- **Access and privacy gate** - Re-verify hosted boundaries as deployment or auth config changes.
- **Operational recovery gate** - Remaining before commercial release: rollback/incident-response drills, disposable-target Typesense rebuild with isolated config, hosted-runtime proof on recovered data. Operator path: `docs/NPM-SCRIPTS.md` -> **Restore drill**.
- **Workflow quality gate** - Full visual mobile/desktop usability proof for family-demo and hosted-alpha criteria.

📐 **Phase 4 incremental backlog (partial closeout)** - Broader `withApiRouteHandler` migration, per-directory TS strict rollout, `cardService` facade split, unused-deps cleanup — ship opportunistically, not as demo blockers.

---

📘 **Review program archive (shipped — reference only)**

*Do not treat as active sequencing. Use for slice IDs, scripts, and regression context.*

- **Step 2 Reader performance (2026-06-12)** - 2a Theme lazy chunk; 2b inline feed static HTML; 2c cover-only hydration; 2d/9a reader renditions; 2e-1 CSS containment.
- **Step 3 Backend (2026-06-12)** - 3a storage byte backup; 3b API route audit; 3c integrity gate expansion; 3d env-password auth retirement.
- **Step 4 Studio legacy (2026-06-12)** - 4a–4d question-admin retirement, Collections standalone removal, redirect cleanup, `studio/{cards,media,tags}` modules.
- **Step 5 Reader mobile edit (2026-06-12)** - 5a–5d quick edit, gallery caption, plain-prose body, lazy edit bundles.
- **Step 6 E2E (2026-06-12)** - 6a admin-save smoke; 6b PR gate Playwright.
- **Step 7 API/service (2026-06-12)** - 7a–7e input caps, route envelope, Typesense retry/status, transaction catalog reads, atomic media-reference removal.
- **Step 8 Security/ops (2026-06-12)** - 8a–8d rate limits, maintenance log hygiene, tag API projection, Sentry baseline.
- **Step 9 Reader follow-ups** - 9a reader renditions backfill; 9b CSS containment retained; 9c sidebar hydration.
- **Step 10–11 Studio/quality (partial 2026-07-10)** - Shell registry, PhotoPicker extract; strict-api typecheck baseline.
- **Step 12 Operational recovery (2026-07-10)** - Firestore + Storage drill on `my-journal-restore-drill`; `backup:run`, `restore:storage`, `restore:run`; post-drill build + integrity pass.
- **Studio runtime + DnD (2026-07-11 author verified)** - Cards workspace query owner, local reconciliation, Questions/Compose handoff, structure optimistic updates, gallery/children reorder, Compose scroll containment, naming cleanup, bulk bar semantics.

❓ **Open**

- **Deferrable product** - Left Nav Group by / Created sort / messy-archive Studio entry; landing brand assets; Theme italic accent; video readiness depth on first video slice.
- **Build-slice detail** - Provisional suggestions Firestore schema when organize spine slice opens.
- **Engineering hygiene inventory** - Module boundary map (`cardService`, `StudioWorkspace`, `CollectionsAdminClient`, `CardForm`, `themeService`); dead table-era code; ESLint/API envelope/TS strict ratchet — track under Phase 4 incremental backlog until **1.a** spawns explicit **📋** or a later hygiene phase.
