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
- **AI Behavior** - AI process, approval, and execution rules live in `.cursor/rules/Execution-Discipline.mdc`, while the collaboration contract for author and AI roles lives in `00-Project-Framework.md`.
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

- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under Tag Management, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **One Fact, One Home** - Each fact lives in exactly one document. `02-Application.md` describes *what exists today* and *what's planned per area*. `03-Implementation.md` describes *when to do it* (sequencing). When a planned item ships, update its status in `02-Application.md` and remove it from `03-Implementation.md`.
- **Implementation wording** - Do not paraphrase `⭕1` bullets when copying them into `03-Implementation.md`. Paste the **bold label** and the description after `-` exactly as in the source doc (`02-Application.md` or, for Backend planned work, `01-Vision-Architecture.md`). If the product text changes, change it in the source doc first, then mirror the update in `03-Implementation.md`.
- **Execution scope** - `03-Implementation.md` is the active milestone plan, not a historical log. It should carry only the current milestone, the next milestones, their gating criteria, and the active `⭕1` items required to advance them. Dated closeout notes and shipped status narration belong in `02` only if they define current product behavior; otherwise they should be removed from canon.

---

## **Product Vision**

*Intent*

The product combines media (photos and videos) and text into an interactive journal-album that supports both author-guided storytelling and freeform discovery. It is not a generic journal app and not just a photo manager with captions.

- **Storytelling** - A private hosted storytelling journal built from personal and family archives.
- **Comprehensive** - Media, authored narrative, and structured discovery in one coherent product.

Phone-native and scanned-photo imports are both first-class inputs. The product should reduce image overload by helping the author organize, tag, and shape media into meaningful cards and collections for family consumption.

What must make this product distinctly better is not feature breadth alone, but authoring simplicity. The core workflows, creating cards, tagging cards, importing images, tagging images, and assigning images to cards, must feel intuitive, fast, and fluid enough that working with a large archive is manageable rather than exhausting. Even if the product does more than consumer photo apps, it should still aspire to their clarity of navigation, selection, and search rather than tolerating admin friction as the cost of capability.

- **Primary customer** - v1 is for one author first, then for others with similar archive/storytelling needs.
- **Commercial shape** - The initial commercial shape is a **private hosted journal** for one author and family audience.
- **Tenant path** - v1 is intentionally **single-tenant**; near-term commercial follow-up should support **multi-tenant** isolation without weakening current integrity guarantees.
- **Primary roles** - v1 has one author/admin creating and maintaining the archive experience, with family members as the primary readers.

*Principles*

- **Creation + Consumption** - The product succeeds only if both administration and consumption workflows are strong enough to support each other.
- **Authoring Simplicity** - Core archive workflows should feel intuitive, fast, and fluid, with as little friction as possible between media intake, organization, and story-building.
- **Media-native Performance** - Core browsing and authoring interactions should feel closer to a modern media app than to a conventional admin screen, especially for tile browsing, card switching, and lightweight edits.
- **Progressive Honesty** - When work cannot be truly instant, the product should still respond immediately, preserve context, and communicate truthful background progress rather than blanking, stalling, or forcing ritual refresh behavior.
- **Curated & Freeform** - The product should support both guided narrative exploration and open-ended discovery as first-class modes.
- **Import-Critical** - Importing and structuring large photo libraries is a core product capability, not a side utility.
- **Relational** - Large archives should become discoverable through dimensional, hierarchical tags and card relationships rather than feeling like undifferentiated media storage.
- **Multi-Media** - Stories should combine text and media in one interactive reading experience.
- **Archive + Renditions** - Preserve original assets for archive, recovery, and eventual print/export while serving fit-for-surface derivatives for browsing, authoring, and reader delivery.
- **Future-aware Media Model** - The media model should be mature enough for video, phone-native formats, metadata-rich ingest, system-derived organization aids, and eventual print/export workflows without treating those as afterthoughts.
- **Trustworthy** - Private, author-owned, exportable, backed-up, and restorable content handling is part of the product promise.
- **Mobile-first** - Reader experience must work naturally on mobile first, with coherent desktop behavior for administration and reading.
- **Phone-Ready** - Phone-origin media, including video and modern capture formats, should be treated as normal product inputs rather than edge cases bolted on later.
- **Operationally Practical** - The product should support large personal archives without requiring expert-level maintenance.
- **Narrative Control** - The author should be able to shape directed story paths through curated collections, ordering, and card relationships when that structure matters.
- **Commercial Direction** - Build v1 as a credible private hosted journal for one author and family audience without blocking near-term multi-tenant evolution.



## **TECHNICAL**

### **Backend**

*Intent*

- **Reliable** - Provide reliable core platform capability
- **Efficient** - Operational and cost awareness.
- **Practical** - Practical for solo-author throughput and family consumption.

*Principles*

- **Client/Server** - Clear separation of concerns; client/server boundaries and service-layer.
- **Validation & Authorization** - Server-side validation and authorization for data integrity.
- **Private-by-default** - Content, admin actions, and operational data should default to least-privilege access. Public exposure is never assumed.
- **Schema** - Type-safe contracts and explicit server-side schema validation.
- **Services** - Use managed services pragmatically (Firebase/Auth.js/Next.js).
- **Secrets & Configuration** - Secrets must stay out of source control and operational flows must preserve safe secret handling across local, hosted, and recovery scenarios.
- **Data planes** - **Firestore** (and Storage for binaries) is the **authoritative** store for cards, media, and tags. **Derived fields** on cards (`filterTags`, dimensional tag arrays, sort keys, denormalized flags) are computed from authoritative inputs by explicit service rules—not re-derived ad hoc in UI or duplicated with conflicting logic. **Typesense** (and any other search index) is a **projection** for search and list efficiency; treat it as **eventually consistent** with Firestore. It must not force **synchronous** full-document pipelines (full hydration, unrelated media index churn, repeated full-tag-catalog reads) on **narrow** mutations unless the product explicitly requires immediate search parity for that path.
- **Asset model** - Treat every media item as a canonical **original asset** plus optional **derived renditions** for tiles, previews, reader display, and future export/print or video playback needs. Reader/admin surfaces should request the smallest sufficient rendition by contract rather than assuming original-asset delivery.
- **Processing lifecycle** - Expensive media work (metadata extraction, thumbnail/poster generation, transcoding, indexing, identity/duplicate analysis) should move through explicit ingest/readiness states and background processing where possible, not through interactive authoring saves or view switches.
- **Metadata enrichment** - Preserve and expose enough capture metadata and processing outputs to support future organization modes such as face clustering, location views, transcript/search enrichment, duplicate detection, and export-safe media decisions without forcing those capabilities into today's UI prematurely.
- **Mutation scope** - Classify every write as **narrow** (e.g. tag-only, status-only, single-field metadata) or **wide** (body HTML, gallery structure, cover changes, structural `childrenIds` / collection edits). **Narrow** paths must use **bounded** Firestore reads/writes: avoid N× full `updateCard`-style pipelines for N rows, avoid reloading entire admin catalogs as the default success path, and skip redundant Typesense/media sync when indexed fields did not change. **Wide** paths may use heavier recomputation and index sync; keep that work explicit and documented at the call site. **Never** skip or weaken **denormalized count and derived-field maintenance** (tag `cardCount` / `mediaCount`, card `filterTags` and dimensional arrays, etc.) solely to look “narrow”—those are **product invariants** for filters, admin truth, and reader consistency; narrow work must still apply the **same accounting rules**, batched or once-per-request, not omitted.
- **Denormalized counts** - Card, media, and tag documents carry **denormalized counts and derived tag projections** so queries and UI stay fast and honest. Any mutation that changes assignments must keep those fields **correct** in Firestore (and indices when the product requires search parity). Refactors that replace “full `updateCard`” for speed must **re-home** the same `updateTagCountsFor*` / `mergeDerivedTags*` (or equivalent) logic into the new path—not drop it. Historical use of the wide pipeline is often **because counts and derived fields were already wired there**; slimmer paths are desirable, but **accuracy is non-negotiable**.
- **Subject-tag invariants** - If `Subject` is added, it is **metadata on an object's assigned tags**, not a separate taxonomy or count source. Unique card/media counts under a tag subtree remain **per object**, not per assignment row, even when both child tags and an ancestor/group tag are assigned directly to the same object. Subject selection must not alter the ordinary assigned-tag derivations (`filterTags`, dimensional arrays, sort keys, tag counts); any subject-only query support must come from **explicit server-maintained subject projections**, not UI-only inference.
- **Responsiveness** - Authoring responsiveness is a product requirement, not a polish pass. Tagging and relationship-editing actions should acknowledge quickly; architectural choices should prefer narrow writes, local patching, and deferred secondary sync where invariants remain intact.
- **Catalog reads** - Do not load the **full tags collection** or **unbounded card lists** once per item inside a single API handler or transaction. Prefer a single read (or request-scoped cache), batched `get`/`in` chunks, or precomputed maps passed into helpers.
- **Transactions** - Keep Firestore **transactions** minimal: only reads and writes that **must** be atomic together. Prefer computing derived payloads **outside** the transaction when ordering and integrity allow, then writing in one transaction.
- **Card–media integrity** - `**coverImageId`**, `**galleryMedia[].mediaId**`, `**contentMedia**`, and media embedded in `**content**` are **foreign keys** to `media/{id}`. The system must not enter a state where a card names a missing media doc, or where a media doc names a **missing Storage object**, without a **classified** incident (logic bug vs drift) and a **repair path** at the service or remediation layer—not a UI-only workaround. Writes that update peer `media` documents (e.g. `referencedByCardIds`, focal metadata, tag counts) **must not assume** the peer still exists; treat absent peers as **integrity violations** to resolve (detach + log, or block with a **domain-level** error), not raw `NOT_FOUND` surfaced to the client.
- **Delete graph** - Deleting or replacing media is a **graph** problem: enumerate every card edge, update **both** card and media sides (and denormalized fields / indices per rules above) in a **documented order**, or **refuse** with an explicit blocker list. If two cards can reference the same media id, that sharing must be **first-class** (reference counting or forbidden duplicates)—never “delete the blob because this card’s delete path listed it” while another card can still hold the id.
- **Durability boundary** - Do not report client success for a new or replaced asset until **Storage** and the `**media`** row (and any card pointer update in the same operation) match: either all durable or none; partial success must be **detectable, retryable, or compensatable**—never a silent orphan pointer.
- **Recoverability** - Backup, export, and restore capability are part of commercial readiness, not optional maintenance extras.
- **Verification** - Code changes require verification by default. Changes affecting behavior, integrity, auth, import, or shared contracts should add or update tests when warranted rather than relying on explanation alone.
- **Commercial readiness** - Commercial readiness requires explicit gates for access/privacy, data integrity, import trust, operational recovery, workflow quality, engineering quality, and security hardening. Treat these as release criteria, not polish.

*Features*
✅ **Complete**

- **Next.js 15** - App Router, all API routes secured at the edge.
- **React 19**
- **TypeScript**
- `**firebase-admin`** - SDK for server-side operations.
- **Zod** - Schema validation.
- **Layered structure** - App Router routes live under `src/app`, reusable UI under `src/components`, and core logic/contracts under `src/lib` with service, type, hook, and utility layers.
- **Data Models** - `src/lib/types/` (read directly; fully commented).
- **Typesense** - Full-text search for cards/media with CRUD sync and Firestore fallback.
- **Typesense list limits** - Typesense Cloud allows at most **250 hits per page** (`per_page`). API routes and services that list cards (or other indexed entities) through Typesense **must not** pass client `limit` values greater than 250 directly as `per_page`; use **paging** (multiple search requests) or cap and document. Exceeding the limit yields **422**, logged failures, and **Firestore fallback**, which harms latency and masks index health. This cap is a **per-request transport** limit on Typesense—not a statement that the **filtered population** is only 250 rows; serving a larger matching set requires **multiple ordered chunks** (or a different list path), not widening `per_page`.
- **Card detail child hydration** - `GET /api/cards/[id]` returns the parent card with its native `childrenIds` (the ID list, free with the parent fetch — no extra reads). Hydrated child documents come back on the `children` sidecar **only when requested** (`?limit=N` paginated, max 250, with `lastChildId` cursor and `hasMoreChildren` flag). Callers that need only parent fields—including the child **count**—pass `?children=skip` to bypass child hydration entirely; the standard Studio card-click, admin pre-PATCH snapshot, and reader edit-modal paths all use `skip`. This implements the **narrow read path** principle for the single-card endpoint.
- **Auth.js** - Firebase adapter, role-based access control, session persistence, app wrapper `AuthProvider`.
- **ESLint CLI** - `npm run lint` now runs the direct ESLint CLI (`eslint .`) instead of deprecated `next lint`. Treat lint status as a maintained engineering baseline and keep canon aligned with the latest verified result rather than preserving an old clean-pass claim after regressions reappear.

⭕1 **Planned**

- **Narrow mutation paths** - Continue the rollout of dedicated service functions for **narrow** admin mutations. Current shipped slices include card tag-only/status-only/content-only/metadata-only PATCH routing plus dedicated bulk tag mutation paths for cards and media; remaining work is to extend the same bounded-write discipline wherever admin flows still fall back to wider `updateCard`-style work than the change requires. Keep wide `updateCard` (or equivalent) for structural and rich-content changes.
- **Code** - Comment code.
- **Directory** - Cleanup directory.
- **Quality** - QA app.
- **Security Hardening** - Threat-model review, authorization review, secret-handling review, and hosted deployment hardening for commercial readiness.
- **Testing** - Expand automated coverage on workflow-critical, integrity-critical, and commercially sensitive paths.
- **Access & privacy gate** - Re-verify hosted reader/admin boundaries in deployed use: direct URL behavior, hosted auth/session configuration, and absence of admin affordance leakage. Current boundary: hosted reader routes and APIs are authenticated, viewer sessions stay reader-only, admin sessions can access both reader/admin surfaces, and local import helpers remain admin-only operational routes.
- **Integrity gate expansion** - Expand integrity verification for card-media references, tag counts, derived card fields, delete/replace graph behavior, and import drift detection.
- **Import trust gate** - Verify source identity, duplicate signals, metadata preservation, partial-failure handling, and operator recovery paths for import workflows. Current boundary: local-source restore/import now follows a preflight-first, canonical-path, folder-complete workflow rather than mutating cards during partial or ambiguous recovery.
- **Operational recovery gate** - Verify database backup, local secrets backup, restore drill, rollback/incident response, and admin account recovery before commercial release. Current boundary: the core Firestore restore path and viewer recovery flow have been exercised successfully on a disposable target; remaining work is broader recovered-environment and incident-response proof.
- **Workflow quality gate** - Validate family-demo reader flow, hosted-alpha repeated-use flow, admin prep friction, and mobile reader usability against milestone pass criteria. Current boundary: authenticated hosted reader and representative admin save/revert flows are functioning; remaining work is broader live browser usability proof across devices.
- **Hosted search reliability** - Production reader/admin search must not depend on undeclared Firestore composite indexes. If Firestore fallback or non-Typesense paths are part of the supported runtime behavior, the required indexes must be provisioned and documented, or the code path must degrade predictably instead of failing with `FAILED_PRECONDITION`. Current boundary: hosted authenticated search no longer depends on the legacy dynamic `filterTags.<term>` Firestore query path.

⭕2 **Future**

- **Performance** - Possibilities captured from engineering review.
- **Tenant ID** - Not implemented for v1. If multi-tenancy is needed for commercial SaaS (Model C), add `tenantId` to cards, media, tags, questions, and journal_users; apply tenant filters to all queries/rules.
- **Storage Abstraction** - Wrap storage operations in `storageService.ts` (upload/delete/getUrl) to reduce migration scope and enable cache-busting on replaced images.
- **Error Monitoring / Observability**
- **Caching Strategy**
- **Sharing**
- **Content Versioning / History**
- **Hosting**
- **Commercial evolution** - If the product broadens beyond the current private hosted journal shape, treat tenancy, auth expansion, source adapters, and web-vs-mobile packaging as one coordinated commercial architecture pass rather than piecemeal feature drift.
📐 **Denormalized Read** - Keep denormalized read patterns where Firestore query limits demand it.
📐 **List refresh** - After a successful mutation, prefer **patching** the current list or **invalidating a targeted query** over reloading entire admin catalogs; use full reload only when list membership or ordering cannot be derived locally.
📐 **Filtered population & stable ordering** - A filter defines the **full server-side universe** for that query (all matching cards or media), not “whatever rows were fetched first.” **Chunked** delivery—infinite scroll, Load more, or discrete pages—must walk **one deterministic ordered stream**: each chunk uses the **same filter parameters and the same declared sort** as the prior chunk, and ordering must be **stable** across chunks (include a **tie-break**, e.g. `docId`, wherever ties are possible). **Do not** re-sort only the client-held subset across fetches in a way that reorders relative to rows not yet loaded. **Seek-only** modes (e.g. some `GET /api/media` assignment/dimension paths) are **exceptions**: they may be **forward-biased** without stable random access; product copy and controls should reflect that, not imply a fixed numbered book over the whole corpus. **Reader vs admin:** the **reader** may use **infinite-style** loading for consumption UX; **admin** may use **pages** or **append** patterns as long as the **same** stability rules apply to the **active** query. Speed goals still favor **small payloads** and **targeted invalidation** (see 📐 **List refresh** and Frontend **List stability**).
📐 **Bulk writes** - Bulk tag and similar operations must be **O(batch)** bounded work (batched reads/writes, shared tag maps), not **O(cards × full-card-save)** unless explicitly accepted and measured.
📐 **Contract vs product** - Efficiency and pipeline-shape rules in this document are **constraints on how** work is done, not permission to break **what** the product must preserve (accurate counts, derived dimensions, published/draft behavior, auth). If the leanest design appears to conflict with an invariant, **raise the conflict explicitly** (tradeoffs, risks, options)—do not implement a shortcut and later justify regressions by citing “architecture.” Author decides when to accept risk or spend complexity.
📐 **Subject-tag mutation contract** - Subject truth must reconcile anywhere tag assignments reconcile: card/media tag-only edits, bulk tag edits, import/create flows that assign tags, duplicate/clone paths, and delete/merge/removal paths that can drop an assigned tag. If the assigned subject tag is removed, the subject marker clears in the same authoritative write path; do not leave detached subject state for the UI to guess around later.
📐 **Script-Heavy** - Keep script-heavy maintenance available while admin UX matures.
📐 **Auth in Buildout** - During build/content phase, keep using env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
📐 **One Admin** - One admin (author), all other accounts are viewers.
📐 **Local source helpers** - OneDrive-backed helper routes under `/api/images/local/*` are admin-only operational/import surfaces tied to `ONEDRIVE_ROOT_FOLDER`; they are not part of the reader trust boundary and must not be exposed to anonymous or viewer sessions.

### **Frontend**

*Intent*

- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*

- **UI Alignment** - Align UI behavior with **validated server contracts** (types/schemas); the client does not override server authority on writes. Clear **presentation and client-state** boundaries; business rules stay in services/API layer.
- **State domains** - Complex admin shells (especially **Studio**) should separate **global structural truth** (tag taxonomy, collections structure) from **pane-local working sets** (filtered cards/media lists) and from the **active editing context** (selected card). One pane's visible subset must not silently redefine another pane's universe.
- **Design surfaces** - The reader (`/view`) UI is the primary **designed** surface—typography, color rhythm, spacing, and tone. Admin may stay denser for workflows but should **reuse the same design tokens** (and previews where it matters) so what the author sees while authoring matches what the family sees when reading.
- **Swappable looks** - Theme Management should move toward **named design packages** (coherent font, color, and spacing choices) selected as a whole, not only isolated slider tweaks. **Tokenization** (CSS variables in `theme.css` driven from persisted theme data) is the practical path to plug-and-play designs.
- **List stability** - After mutations, update the **smallest** sufficient UI state: patch a row, remove/add ids in the current page, or refetch **one** page or cursor scope—not entire unbounded lists by default. Reserve full catalog refetch for recovery, unknown membership change, or explicit user refresh.
- **Authoritative confirmation** - Separate **optimistic** display from **confirmed** server state where it improves perceived speed; do not block the UI on secondary work (search index sync, full media hydration) when the user action can be acknowledged from Firestore alone.
- **Preview then hydrate** - In authoring shells with an active object (for example, the selected card in **Studio**), selection should populate local context from the best available preview immediately, then enrich from background hydration. Hydration failure should degrade detail, not blank the active editing surface.
- **Progressive first paint** - In dense admin shells, prefer a **truthful first batch** and then background catch-up over blocking the whole pane on totals or full hydration. Use cancellable requests, short-lived query caches, and chunked stable streams where they preserve the same authoritative query contract.
- **Media-native browsing** - Browsing interactions such as tile-density changes, album or workspace switches, and open-detail transitions should behave like local presentation changes over already-available data whenever possible, not as full reload rituals.
- **Continuous browsing** - Large card/media libraries should normally browse through stable append or virtualized streams rather than page-by-page rituals. Density changes, filter refinements, and sort/view switches should preserve flow instead of feeling like a reset to a different tool.
- **Lightweight mobile edits** - Reader/mobile-safe edits such as caption changes, story touchups, and future lightweight card creation should use narrow mutation paths with immediate local reconciliation rather than form-like round trips that freeze the browsing surface.
- **Runtime split** - Desktop Studio authoring, reader consumption, and future lightweight mobile editing should share data truth and media contracts, but they should not share one blunt runtime model. Each surface should load and hydrate to the level its job requires.
- **Surface simplification** - Prefer fewer, stronger interaction models for authoring when capability is preserved. Simplification should remove parallel UI patterns, not remove the tagging and relationship power the product depends on.
- **Admin performance strategy** - Treat slow admin work as an **architecture** problem before a polish problem. Converge on **Studio** as the only day-to-day content-admin runtime, and remove duplicated loaders, modes, and compatibility branches before spending time on isolated UI tuning. Prioritize: 
  -  **thumbnail-tier media delivery** for admin grids, pickers, and previews instead of original-image URLs; 
  - **server-shaped card/media workspaces** so filtering, sorting, and pagination define the active universe on the server rather than in large client-held catalogs; 
  - **windowed/virtualized rendering** for large banks and grids; 
  - **payload tiers** (`tile`, `preview`, `edit`) so only the active object is fully hydrated; and 
  - **local post-mutation reconciliation** over broad reloads wherever integrity allows. Current first landed slice for media delivery: admin/Studio preview surfaces may prefer one optional smaller Studio/admin rendition on each media doc, with safe fallback to the canonical original until backfill catches up. When old card/media admin code still powers Studio, retire runtime duplication first and postpone naming-only cleanup until behavior is simpler.

*Features*
✅ **Complete**

- **Theme** - CSS modules for styling, global `theme.css` and `fonts.css`.
- **Rich Text Editing** - `@tiptap/react`.
- **Media Selection** - PhotoPicker for admin modal picker and simple upload.
- **Galleries** - GalleryManager and Swiper.
- **Image Optimization** - `next/image` via `JournalImage`.
- **Drag and Drop** - `@dnd-kit/core` and `@dnd-kit/sortable`.
- **Data Fetching** - `SWR` for client-side fetching and caching.

⭕2 **Future**

- **Unused Dependencies** - Remove unused packages from `package.json`: `react-markdown`, `@uiw/react-md-editor`, `@minoru/react-dnd-treeview`. Evaluate `react-photo-album` and `framer-motion` before removing.

- **Visual direction** - The product should feel **journal / archival** and **mobile-native**, while also reading as a **clear, professional** consumer app. Those aims can conflict (for example, a handwriting display face vs neutral UI typography). Prefer resolving tension through **theme presets** and distinct **type roles** (e.g. display vs body) wired to tokens, rather than scattered one-off styles. Iteration on the Theme Management model is expected as presets mature.
- **Unified Studio (content admin)** - Long-term content administration converges on **Studio** as the unified shell for cards, media, tags, questions, collections, and their relationships. Users and Themes remain separate admin routes. Relationship editing and library-first media picking should converge inside shell-owned card/media workflows rather than parallel standalone admin surfaces.

### **Scripts**

*Intent*

- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*

- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Complete**

- **Syntax** - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`.
- **Firebase Setup** - Credentials live in `.env`.
- **.env** - Scripts load `.env` **before** any static import of `admin.ts` (`-r dotenv/config` on the Node/tsx invocation, optionally `DOTENV_CONFIG_PATH=.env`). In-file `dotenv.config()` alone is **not** enough if the same file statically imports Firebase Admin—imports run first. See `docs/NPM-SCRIPTS.md` → **Firebase Admin CLI (dotenv)**.
- **Maintenance Scripts** - Active scripts: `reconcile:media-cards`, `regenerate:storage-urls`, `cleanup:media`, `backup:database`, `backfill:media-metadata`, `seed:journal-users`.

⭕2 **Future**

- **Script Cleanup** - Legacy migration/debug/demo utilities have been pruned aggressively; `src/lib/scripts/` is down to 66 files as of 2026-05-27. Continue reviewing anything not wired into `package.json`, canon, or live admin-maintenance flows so ad hoc helpers do not quietly become permanent product surface.
📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Backup**

*Intent*

- **Protection** - Provide protection against irrecoverabel damage to the code repo and the database.

*Principles*

- **Automated** - Backups run without manual intervention.
- **Verified** - Backup integrity is confirmed after each run.
- **Recoverable** - Restore steps are known, tested, and realistic for hosted operation.

*Features*
✅ **Complete**

- **Database** - `npm run backup:database` writes under `ONEDRIVE_PATH/Firebase Backups/run-<timestamp>/` (all Firestore root collections, index/rules copies, optional Typesense JSONL). Storage file bytes are not included. Optional Windows task: `src/lib/scripts/setup-database-backup-task.ps1` (uses `tsx -r dotenv/config` and `firebase/backup-firestore.ts`; requires `.env` visible to the task user).
- **Source tree (Git)** - **Off-device source of truth** is the **remote** (`origin`): commit to `**main`** and push. Do not use feature branches or PR merge flow unless explicitly requested for a specific task. No second full-tree copy is maintained locally or in CI.
- **Local secrets (not in Git)** - `npm run backup-codebase` (see `docs/NPM-SCRIPTS.md`) zips only **repo-root** files that stay out of version control: `.env`*, `service-account.json`, and `*-firebase-adminsdk-*.json`. Default output directory: `C:\Users\alanb\CodeBase Backups\` (override with `CODEBASE_SECRETS_BACKUP_DIR`); keeps 5 rolling zips plus `backup-*-metadata.json` and `backup-*-output.txt`. If no matching files exist, only a log is written. Optional Windows task registration: `src/lib/scripts/utils/setup-backup-task.ps1` (daily; run **PowerShell as Administrator**; task resolves repo root via `git`). **Paradigm:** Git = code; this zip = env/credentials; `backup:database` = app data.
- **Recovery playbook** - `docs/NPM-SCRIPTS.md` carries the restore drill, release-readiness checklist, account-recovery path, and incident-response baseline. Current contract: restore source from Git, restore repo-root secrets from `backup-codebase`, restore Firestore from one `backup:database` snapshot, rebuild Typesense from Firestore, and verify auth/integrity before reopening. The guarded `restore:database` helper is for disposable recovery targets first, and local-source missing-media recovery follows a preflight-first, folder-complete workflow before card mutation. Storage bytes remain outside the automated database backup boundary.

⭕1 **Planned**

- **Operational** - Ensure both backups are operational and verified end-to-end.
- **Restore Drill** - Execute the documented restore procedure for database backup, local secrets backup, and deployment configuration against a realistic recovery target before commercial release.
- **Release Readiness** - Run the documented minimum production-release checklist for deployment, auth configuration, backup verification, and rollback/recovery against the intended launch revision.
- **Account Recovery** - Exercise the documented v1 password reset, viewer access repair, and admin lockout recovery path against live Firestore-backed users before treating the gate as closed.
- **Incident Response** - Dry-run the documented v1 operator response for broken deploy, failed import, missing media, access leak suspicion, and backup/restore failure so the playbook is proven, not just written.

⭕2 **Future**
