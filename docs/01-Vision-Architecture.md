# VISION & ARCHITECTURE

**See also:** `02-Application.md` · `03-Implementation.md` · `04-Theme-Design-Contract.md` (theme semantics, presets, reader shell & responsive layout §9)

Legend:
✅`Implemented`
⭕`Planned (1/2)`
❓`Open`
📐`Decision`
📘`Resource`

---

## Document Governance

- **Three-Document Model** - Core project documentation is split across three files in `docs/`:
  - `01-Vision-Architecture.md` — Product vision, principles, technical stack, data models, decisions. Stable; changes rarely.
  - `02-Application.md` — Each app area: *Features* grouped under `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open` (plus standalone 📐 / 📘). Changes when features ship or are planned.
  - `03-Implementation.md` — Execution plan and phased sequencing (`⭕1` only). Changes when priorities shift. Each listed item must repeat the **same bold title and trailing text** as its source line in `02-Application.md` or (for Backend items) in this file—verbatim, including punctuation and counts. Only **phase assignment and ordering** may differ.
- **Supplementary specs** - Focused references (e.g. `04-Theme-Design-Contract.md` for semantic tokens, presets, reader responsive/nav contract §9, and design-led reconciliation) extend the core trio; they do not replace `02`/`03` for feature inventory or phased backlog.
- **AI Behavior** - Agent process, approval, scope, and execution rules live in `.cursor/rules/Agent-Discipline.mdc` and first-turn grounding in `.cursor/rules/Startup-Grounding.mdc`.
- **Decision hierarchy** - `01` is the canonical source for platform invariants, data authority, mutation rules, and integrity boundaries. Product or workflow simplification is encouraged, but it must preserve tagging truth, relationship truth, and reader truth.

### Document Structure

- **Heading Lock** - All ATX headings are fixed. Do not add new headings.
- **Subheading Lock** - Subheadings are *Intent*, *Principles*, and *Features*. Do not add new subheadings.
- **Formatting**
  - Headings are **bold**. Subheadings are *italic*.
  - Intent/Principles bullets start with a **bold** 1–2 word subject, then short descriptive text.
  - Under each *Features* block, organize status items into these buckets in order as plain status headings (no list bullet): `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open`.
  - Items under each status heading are plain bullets (`-`) beginning with a **bold** 1–2 word title + " - " + short descriptive text, using the same flush-left layout as `02-Application.md`.
  - Keep `📐` and `📘` as standalone feature bullets outside status buckets.

### Content Placement

- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under **Studio Tags**, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **One Fact, One Home** - Each fact lives in exactly one document. `02-Application.md` describes *what exists today* and *what's planned per area*. `03-Implementation.md` describes *when to do it* (sequencing). When a planned item ships, update its status in `02-Application.md` and remove it from `03-Implementation.md`.
- **Implementation wording** - Do not paraphrase `⭕1` bullets when copying them into `03-Implementation.md`. Paste the **bold label** and the description after `-` exactly as in the source doc (`02-Application.md` or, for Backend planned work, `01-Vision-Architecture.md`). If the product text changes, change it in the source doc first, then mirror the update in `03-Implementation.md`.
- **Execution scope** - `03-Implementation.md` is the active milestone plan, not a historical log. It should carry only the current milestone, the next milestones, their gating criteria, and the active `⭕1` items required to advance them. Dated closeout notes and shipped status narration belong in `02` only if they define current product behavior; otherwise they should be removed from canon.
- **Backend status** - Shipped backend hardening, commercial gates, and slice narration live in `03-Implementation.md`. This file's Backend *Features* carries stack anchors, architectural `📐` contracts, and summary `⭕1` / `⭕2` intent only—not file paths, env wiring, or dated closeout detail.

---

## **Product Vision**

*Intent*

People have masses (boxes, drives, phones) of disorganized media (photos and videos). They want to flexibly and easily enjoy and share them with others, and, in some cases, they want to integrate the stories they contain. But until now no integrated tools provide this. The challenges are the following:

- often images are still in hard copy and difficult to repurpose.
- even if digitized, they lack useful organization.
- even if organized, they lack the integration their stories.
- even if integrated with stories, they lack the flexible, friction-less vehicle to consume and share them.

The easiest part is digitizing the media--many services exist for this. Once the media is digitized, this product solves the remaining three difficult problems. It:

- **organizes** digitized media with the help of AI.
- **integrates** the organized media with the stories behind them, and
- **delivers** the media-illustrated stories in a mobile, private social-media-like feed.

It is not a generic journal app, a photo manager with captions or a social media app.

- **Primary customer** - v1 is for one author first, then for others with similar archive/storytelling needs.
- **Commercial shape** - The initial commercial shape is a **private hosted app** for one author and family/friends audience.
- **Primary roles** - v1 has one author/admin creating and maintaining the archive experience, with family/friends as the primary readers.
- **Tenant path** - v1 is intentionally **single-tenant**; near-term commercial follow-up should support **multi-tenant** isolation without weakening current integrity guarantees.

*Principles*

- **Two halves** - Administration and reader experience must both be strong; neither carries the product alone.
- **Organize to tell** - Import and organization exist so authors can attach and preserve stories at scale; not a DAM and not a side utility.
- **Effortless at scale** - Large archives should feel manageable: intuitive workflows, modern media-app clarity, immediate feedback, and honest progress when work continues in the background.
- **Private and durable** - Family-private, author-controlled, backed up and restorable; not public social.
- **Mobile family reading** - Primary delivery is re-experiencing stories on mobile; administration may remain desktop-heavier.
- **Author shapes the story** - The author decides structure and meaning; the system assists with suggestions but never auto-publishes, auto-deletes, or replaces author judgment.



## **TECHNICAL**

### **Backend**

*Intent*

- **Reliable** - Provide reliable core platform capability
- **Efficient** - Operational and cost awareness.
- **Practical** - Practical for solo-author throughput and family consumption.

*Principles*

- **Server authority** - Server-side validation and authorization; private-by-default; secrets out of source control; type-safe contracts. Managed stack: Next.js, Firebase, Auth.js.
- **Authoritative data planes** - Firestore and Storage are truth; Typesense and other indices are projections. Derived card/tag fields are computed in explicit service rules, not re-derived in UI.
- **Bounded writes & reads** - Classify narrow vs wide mutations; keep transactions and catalog reads minimal; prefer bounded work and deferred secondary sync for authoring responsiveness.
- **Honest denormalization** - Counts and derived tag projections stay correct on every assignment change; faster paths re-home the same accounting rules—never omit them for convenience.
- **Media platform** - Canonical originals plus surface-appropriate renditions; expensive ingest work through background readiness states; preserve metadata for future organization modes without premature UI commitment.
- **Integrity graph** - Card-media references, delete/replace order, and upload durability are first-class; classify drift vs logic bugs and repair at the service layer, not in UI workarounds.
- **Recoverable operation** - Backup, export, and restore are part of platform architecture, not optional maintenance extras.
- **Unit economics** - Track per-archive operational cost drivers (Firestore, Storage, Typesense, paid AI, restoration, faces, video) as platform features ship; informs adapter, processing, and face/API choices before commercial promises.

*Features*
✅ **Complete**

- **App platform** - Next.js App Router, React, TypeScript; API routes secured at the edge.
- **Firebase** - Firestore authoritative data, Storage for media binaries, firebase-admin for server operations.
- **Auth** - Auth.js with Firestore-backed users, admin vs viewer roles, session persistence.
- **Search** - Typesense full-text search for cards and media with CRUD sync and Firestore fallback.
- **Validation** - Zod and explicit service-layer schema validation.
- **Structure** - Layered codebase: routes, components, and shared lib (types, services, hooks, utilities).
- **Data models** - Typed card, media, and tag contracts in shared types.

⭕1 **Planned**

- **Narrow mutation paths** - Extend dedicated narrow admin mutation paths wherever flows still fall back to wider card saves than the change requires; keep wide saves for structural and rich-content edits.
- **Authorization consistency** - Centralize reader/admin route and mutation classification so access rules do not diverge across individual handlers.
- **Service boundaries** - Decompose responsibility-heavy services, beginning with `cardService` and `themeService`, into explicit domain operations without splitting shared integrity rules across competing paths.
- **Code** - Comment code.
- **Directory** - Cleanup directory.
- **Quality** - QA app.
- **Security Hardening** - Threat-model, authorization, secret-handling, and hosted deployment hardening for commercial readiness.
- **Testing** - Expand automated coverage on workflow-critical, integrity-critical, and commercially sensitive paths, including contract-level browser smoke where unit/API tests are insufficient.

⭕2 **Future**

- **Performance** - Possibilities captured from engineering review.
- **Tenant ID** - Multi-tenant isolation when commercial shape expands beyond single-tenant v1.
- **Storage Abstraction** - Centralize storage upload/delete/URL operations to reduce migration scope.
- **Advanced observability** - Tracing, log pipelines, and dashboards beyond baseline error monitoring.
- **Caching Strategy**
- **Sharing**
- **Content Versioning / History**
- **Hosting**
- **Commercial evolution** - Coordinated pass for tenancy, auth expansion, source adapters, and packaging—not piecemeal drift.

📐 **Provisional storage (product contract)** - Machine proposals (tag suggest, cluster/stack, face hint) live **outside** confirmed tag assignments on media/card documents until author accept (see `02` **Administration** 📋 **Provisional suggestions**). Accept paths must invoke the same assignment/mutation accounting as manual tag apply (counts, derived fields, index sync). Dismiss removes provisional only. **Shipped v1:** cluster/stack records in Firestore **`provisional_clusters`** (see `02` **Provisional suggestions** → **Storage**). Per-media tag-suggest rows, face payloads, retention/TTL: **❓ Open** follow-on slices.
📐 **Media processing lifecycle** - Imports and replacements progress through explicit **readiness states** on the media row (uploaded → thumbnailed/indexed → ready, with failure/retry visible). UI must not imply full readiness before states say so. Background jobs may defer expensive work; **Durability boundary** still governs when client success is reported for new/replaced assets. Video/transcode depth: product **❓ Open** in **Studio Media**.
📐 **Typesense paging** - Typesense allows at most **250 hits per page** (`per_page`). List paths must page or chunk—not pass larger client limits as `per_page`. Exceeding the cap yields **422**, fallback, and masked index health. This is a **transport** limit, not a population cap; larger filtered sets require multiple ordered chunks.
📐 **Card detail hydration** - Single-card reads return native `childrenIds` with the parent; hydrated child documents are optional, paginated sidecar data. Callers that need only parent fields—including child count—must skip child hydration. Studio selection and admin pre-save snapshots use the skip path.
📐 **Mutation scope** - Classify **narrow** writes (tag-only, status-only, single-field metadata) vs **wide** writes (body, gallery, cover, structural children). Narrow paths must stay bounded—no N× full-card-save pipelines, no default full-catalog reload, no redundant index sync when indexed fields unchanged. Never skip denormalized count or derived-field maintenance to look narrow; re-home the same accounting rules instead.
📐 **Card-media integrity** - Cover, gallery, contentMedia, and inline content media ids are foreign keys to media documents and Storage objects. Missing peers are integrity incidents with a service-layer repair path—not UI workarounds or raw transport errors to the client.
📐 **Delete graph** - Media delete/replace is a graph update across every card edge, both card and media sides, denormalized fields, and indices—or an explicit refuse with blockers. Shared media ids require first-class sharing semantics.
📐 **Durability boundary** - Do not report client success for a new or replaced asset until Storage, the media row, and any same-operation card pointer updates are all durable—or failure is detectable, retryable, and compensatable.
📐 **Subject-tag invariants** - If Subject is enabled, it is metadata on assigned tags—not a separate taxonomy or count source. Subject-only query support requires explicit server-maintained projections, not UI inference.
📐 **Denormalized Read** - Keep denormalized read patterns where Firestore query limits demand it.
📐 **List refresh** - After a successful mutation, prefer **patching** the current list or **invalidating a targeted query** over reloading entire admin catalogs; use full reload only when list membership or ordering cannot be derived locally.
📐 **Filtered population & stable ordering** - A filter defines the **full server-side universe** for that query (all matching cards or media), not “whatever rows were fetched first.” **Chunked** delivery—infinite scroll, Load more, or discrete pages—must walk **one deterministic ordered stream**: each chunk uses the **same filter parameters and the same declared sort** as the prior chunk, and ordering must be **stable** across chunks (include a **tie-break**, e.g. `docId`, wherever ties are possible). **Do not** re-sort only the client-held subset across fetches in a way that reorders relative to rows not yet loaded. **Seek-only** modes (e.g. some `GET /api/media` assignment/dimension paths) are **exceptions**: they may be **forward-biased** without stable random access; product copy and controls should reflect that, not imply a fixed numbered book over the whole corpus. **Reader vs admin:** the **reader** may use **infinite-style** loading for consumption UX; **admin** may use **pages** or **append** patterns as long as the **same** stability rules apply to the **active** query. Speed goals still favor **small payloads** and **targeted invalidation** (see 📐 **List refresh** and Frontend **Perceived speed**).
📐 **Bulk writes** - Bulk tag and similar operations must be **O(batch)** bounded work (batched reads/writes, shared tag maps), not **O(cards × full-card-save)** unless explicitly accepted and measured.
📐 **Contract vs product** - Efficiency and pipeline-shape rules in this document are **constraints on how** work is done, not permission to break **what** the product must preserve (accurate counts, derived dimensions, published/draft behavior, auth). If the leanest design appears to conflict with an invariant, **raise the conflict explicitly** (tradeoffs, risks, options)—do not implement a shortcut and later justify regressions by citing “architecture.” Author decides when to accept risk or spend complexity.
📐 **Subject-tag mutation contract** - Subject truth must reconcile anywhere tag assignments reconcile: card/media tag-only edits, bulk tag edits, import/create flows that assign tags, duplicate/clone paths, and delete/merge/removal paths that can drop an assigned tag. If the assigned subject tag is removed, the subject marker clears in the same authoritative write path; do not leave detached subject state for the UI to guess around later.
📐 **Script-Heavy** - Keep script-heavy maintenance available while admin UX matures.
📐 **Auth bootstrap** - Seed Firestore users once when the collection is empty; env admin credentials are **seed-only**, not runtime login. Operational detail: `docs/NPM-SCRIPTS.md`.
📐 **Auth at Rollout** - Sign-in is Firestore-backed users only; ensure at least one enabled admin exists before go-live.
📐 **One Admin** - One admin (author), all other accounts are viewers.
📐 **Local source helpers** - Local/OneDrive import helper routes are admin-only operational surfaces; they are not part of the reader trust boundary.

📘 **Backend status** - Shipped hardening slices, commercial gates, and execution detail: `docs/03-Implementation.md` **§ Backend**.

### **Frontend**

*Intent*

- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*

- **Server contracts first** - UI aligns with validated server contracts; business rules stay in services and API layers, not client overrides.
- **Studio state domains** - Separate global structural truth (tags, collections) from pane-local working sets and the active editing context; one pane's filter must not silently redefine another pane's universe.
- **Perceived speed** - Preview-then-hydrate, progressive first paint, optimistic vs confirmed state, smallest sufficient list updates, and continuous media-native browsing over stable append streams.
- **Reader-first design** - Reader is the primary designed surface; admin reuses tokens and previews; theme evolves as named packages via tokenization (see `04-Theme-Design-Contract.md`).
- **Runtime split** - Viewer sessions stay lean; admin and Studio load lazily; shared data and media contracts; Studio is the single day-to-day content-admin runtime with payload tiers and rendition-appropriate delivery.
- **Shared model, tailored delivery** - Reader and Studio use the same authoritative content model while receiving surface-appropriate payloads, hydration, and presentation; do not create parallel content truth to simplify a UI.

*Features*
✅ **Complete**

- **Reader shell** - Mobile-first `/view` consumption with responsive layout contract in `04` §9.
- **Studio** - Unified admin shell for organize, cards, compose, questions, and media.
- **Theme** - CSS modules, global theme tokens, Theme Management workspace.
- **Editing** - TipTap rich text; `@dnd-kit` drag-and-drop; SWR data fetching.
- **Media UI** - PhotoPicker, galleries (Swiper), optimized images via `next/image`.

⭕1 **Planned**

- **Component boundaries** - Reduce responsibility-heavy UI modules, beginning with `StudioWorkspace`, `MediaAdminContent`, and `CardForm`; separate state coordination, domain operations, and presentation without creating shadow state.
- **Reader edit boundary** - Extract reusable focused-edit capabilities so reader-context editing does not depend on the full Studio form architecture.
- **Theme boundaries** - Separate Theme Management workspace composition from theme schema, transformation, and persistence responsibilities.
- **Legacy surface retirement** - Remove redirect-only admin routes, duplicate loaders, and compatibility paths after callers and navigation are verified; determine whether `CollectionsAdminClient` should be retired before refactoring it.

⭕2 **Future**

- **Dependency cleanup** - Remove unused packages after evaluation.
- **Visual direction** - Archival yet professional consumer feel through theme presets and type roles, not scattered one-off styles.
- **Studio convergence** - Relationship editing and library-first media picking fully inside Studio-owned workflows.

📘 **Frontend status** - Surface behavior, shipped reader/Studio detail, and theme work: `docs/02-Application.md` and `docs/03-Implementation.md`.

### **Scripts**

*Intent*

- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*

- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Complete**

- **Invocation** - TypeScript scripts via ts-node/tsx with path registration; credentials from `.env`.
- **Env footgun** - Load `.env` **before** any static import of Firebase Admin—imports run first. See `docs/NPM-SCRIPTS.md` **Firebase Admin CLI (dotenv)**.
- **Maintenance** - Reconciliation, backup, backfill, and seed scripts wired through `package.json`; index in `docs/NPM-SCRIPTS.md`.

⭕2 **Future**

- **Script Cleanup** - Continue pruning ad hoc helpers not wired into `package.json`, canon, or live maintenance flows.
📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Backup**

*Intent*

- **Protection** - Provide protection against irrecoverable damage to the code repo and the database.

*Principles*

- **Automated** - Backups run without manual intervention.
- **Verified** - Backup integrity is confirmed after each run.
- **Recoverable** - Restore steps are known, tested, and realistic for hosted operation.

*Features*
✅ **Complete**

- **Database backup** - Scheduled Firestore export to off-device storage; details in `docs/NPM-SCRIPTS.md`.
- **Storage backup** - Firebase Storage byte backup with manifest and verification.
- **Source control** - Remote Git is code source of truth; commit and push to main.
- **Secrets backup** - Repo-root env and credential files backed up separately from Git.
- **Recovery playbook** - Restore drill, release checklist, and incident baseline in `docs/NPM-SCRIPTS.md`.

⭕1 **Planned**

- **Operational closeout** - End-to-end backup verification, restore drill, release readiness, account recovery, and incident-response proof before commercial release. Status: `docs/03-Implementation.md` **§ Backup** and step **12**.

⭕2 **Future**
