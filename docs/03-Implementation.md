# IMPLEMENTATION

This document turns Planned capabilities in `02` and Planned constraints in `01` into sequenced, bounded implementation work.

**Current active capability:** Theme Standardization. Its Definition Gate passed; Foundation controls and visible inheritance are the first implementation slice. Left Navigation, Content Page, and View Page passed their Completion Gates.

---

## Operating model

### Definition Gate

A capability is **Ready** only when its implementation brief contains:

- **Outcome** — The user result in plain language.
- **Actors** — Reader, author, administrator, or operator.
- **Includes** — Behavior authorized for this capability.
- **Excludes** — Adjacent behavior intentionally outside scope.
- **Contracts** — Consequential rules from `01` and `02`.
- **Current state** — Verified code, data, tests, and visible behavior.
- **Gaps** — Work remaining inside the capability.
- **Dependencies** — Required services, data, access, and preceding capabilities.
- **Risks** — Integrity, security, migration, cost, compatibility, and regression concerns.
- **Decisions** — No unresolved product choice that materially changes the outcome.
- **Evidence** — Automated, browser, data, and operational proof required for completion.

The agent prepares the brief from canon and repository inspection. The author approves consequential product choices once. File-level design and ordinary implementation tactics are not Definition Gate decisions.

### Completion Gate

A capability moves to `✅ Complete` in `02` only when:

- The approved outcome works for its actors.
- Every applicable contract holds.
- Required slices, migrations, and backfills are complete.
- Relevant automated checks pass.
- Required browser workflows are verified.
- Named regression-sensitive behavior remains intact.
- Failure, retry, and recovery behavior is truthful where applicable.
- `01`–`03` reflect the resulting truth.
- No work remains inside the approved definition.

Completion reports use: **Outcome · Contracts · Tests · Browser · Data/Operations · Regressions · Canon · Remaining work**.

### Execution states

- **Not gated** — Planned capability has not passed the Definition Gate.
- **Ready** — Definition approved; implementation may proceed within its boundary.
- **Active** — Current autonomous implementation capability.
- **Blocked** — Missing decision, authority, access, or external dependency prevents progress.
- **Verified** — Completion Gate passed; update `02` to Complete and remove its remaining slices here.

### Implementation brief

```md
## [Capability]

**Definition:** Not gated | Ready
**Execution:** Pending | Active | Blocked | Verified

**Outcome** —
**Actors** —
**Includes** —
**Excludes** —
**Contracts** —
**Current state** —
**Gaps / slices** —
**Dependencies** —
**Risks** —
**Decisions needed** —
**Completion evidence** —
```

---

## Tag Workflow and Identity

**Definition:** Verified
**Execution:** Verified

**Outcome** — The author can reliably find, filter, assign, edit, and normalize tags without stale presentation, ambiguous hierarchy behavior, lost assignments, or silent reinterpretation. Who distinguishes stable human and non-human identities from names, human relationships, and groups.

**Actors** — Author, Reader, and system operator.

**Includes** — Tag modal, lookup, filter ownership and scope, save reconciliation, hierarchy authority and repair, People and aliases, relationships and perspective, typed groups, reviewed migration, projection rebuild, and verification.

**Excludes** — Face recognition, a full genealogy platform or interchange standard, multi-tenant perspectives, full What/When/Where semantic redesign, automatic name-based conversion, legacy-tag deletion without verification, marketing, and Quote.

**Contracts** — Firestore remains authoritative; `parentId` owns hierarchy; projections reconcile to it; each named Who subject has one stable identity; aliases preserve names; human roles are perspective-relative relationships; existing assignments remain authoritative until reviewed; ambiguous conversions remain unresolved; bulk work is bounded and recoverable.

**Current state** — The archive contains 660 tags, 1,281 cards, 3,503 media, and 270 questions. Tag workflows use shared modal ownership, exact lookup, scoped filters, separate Reader and Studio persistence, authoritative save reconciliation, and consistent Card, Media, and Question filter presentation. Identity administration provides stable human and non-human subjects, canonical names, aliases, details and editing, human parent/spouse/partner relationships with duplicate and parent-cycle protection, typed groups, and an explicit archive perspective. Live review confirms ten people, 100 remaining person candidates, eight relationship-role candidates, 19 structural candidates, one group candidate, and zero remaining alias clusters. Nine approved alias clusters and Alan Bond have stable identity records; Alan owns the archive perspective. Manifested migrations have live rollback-and-reapply proof and changed no Tags, Cards, Media, or Questions. Repair used complete paired backup `run-2026-07-15T15-34-27-951Z` and corrected 656 paths, 117 card projections, 577 media projections, and 289 tags with count or supporting-ID drift. Fresh Typesense rebuilds removed one orphan card and 13 orphan media records. Current audits report zero path, projection, scalar-count, and unique-ID discrepancies; Typesense counts exactly match Firestore. Automated and browser verification cover tag editing, subject handling, Card, Media, Question, and Reader filters, filter isolation, refresh, identity details, perspective, migration, and rollback.

**Gaps / slices** — None inside this capability. Merge/split, additional reviewed conversions, inheritance, and taxonomy refinements remain separate Planned work in `02` and the sequence below.

**Dependencies** — Valid administrator access, paired backup capability, Firestore and Typesense access, current tag/card/media/question catalogs, and browser verification.

**Risks** — Incorrect identity merges, lost historical names, perspective errors, count drift, stale search projections, partial migration, and unintended Reader-filter changes.

**Decisions needed** — None inside this completed capability. Ambiguous legacy meanings, including `Bob & Sandra`, remain decisions for a later reviewed-conversion capability.

**Completion evidence** — Automated model, hierarchy, mutation, filter, and projection tests; browser verification of tag editing and Reader/Studio filtering; zero unexplained path, derived-field, count, and search discrepancies; backup, dry-run, manifest, bounded apply, audit, and rollback proof; reviewed identity migrations; canon reconciliation.

---

## Gallery Tag Inheritance

**Definition:** Ready
**Execution:** Verified

**Outcome** — The author can choose, understand, and control how confirmed Gallery-media tags and subjects become card story truth without losing existing card decisions.

**Actors** — Author and system operator.

**Includes** — Explained onboarding choice, durable per-dimension settings, Gallery-only aggregation, incomplete-child handling, subject rollup, existing-card protection, per-card overrides, re-inheritance, derived-field reconciliation, and verification.

**Excludes** — Body-media inheritance, card-to-card inheritance, cover-only inheritance, automatic activation, AI suggestions, face recognition, and changes to the taxonomy itself.

**Contracts** — Each dimension requires an explicit onboarding selection and remains inactive until selected. Existing card assignments begin protected by per-dimension overrides. New cards follow the selected settings and may override individual dimensions. Releasing an override immediately re-inherits current Gallery children. Confirmed Gallery media are the only participating children; body media do not participate. Blank means Unreviewed; any participating child blank in a dimension makes that card rollup Unreviewed and forces review. N/A and Unknown are intentional tags, roll up like other tags, and may be subjects; no separate Partial state is inferred. A single rolled-up tag is the dimensional subject; multiple tags display Multiple unless the author selects subjects. One explicit subject displays its tag name; multiple explicit subjects display Subjects+. Inheritance changes card work truth only and preserves source-media truth.

**Current state** — Settings store four booleans plus whether the author explicitly configured them; the unconfigured state remains all off until the author chooses. Cards store per-dimension overrides. Missing legacy state is interpreted as fully protected, and a manifested backfill explicitly protected all 1,281 existing cards with zero conflicts while changing no tags, subjects, Gallery membership, counts, or projections. New cards protect every dimension until settings are configured; afterward they inherit only dimensions the author enabled and retain overrides for disabled dimensions. Runtime synchronization masks global settings through each card's overrides. The tested runtime rollup distinguishes no Gallery, reviewed unions, and Unreviewed precedence while treating N/A and Unknown as ordinary intentional tags; it atomically stores server-owned per-dimension status with inherited tags and their derived indexes. Card editing identifies each Unreviewed dimension, and the Cards grid flags affected cards with the dimensions available in the badge tooltip. Card editing also exposes per-dimension controls only where Gallery inheritance is globally enabled: releasing protection immediately re-inherits, while restoring protection preserves current assignments and stops future inheritance. Settings explain these consequences and require confirmation before enabling dimensions; only previously opted-in cards are reconciled, with success and failure counts reported without misreporting a saved setting as failed. Cards and Media accept multiple explicit subjects while mirroring the first into the legacy singular field; subject filtering and search projections use all selected subjects and ancestors. Single-tag Gallery rollups are stored separately as implicit subjects so they become Multiple, not a stale explicit choice, if the rollup later expands. Questions use the same direct-tag and multiple-subject contract, and newly created Q&A cards preserve that subject truth. Shared dimensional presentation shows a single assigned or selected subject name, Multiple when several tags have no selected subject, or Subjects+ when multiple subjects are selected, and exposes the full tag and selected-subject lists in tooltips. Unconfigured authors must explicitly confirm all four new-card defaults, including a valid all-off choice, and Compose links directly to that setup. Browser verification confirmed configured defaults, existing-card protection, override release and re-inheritance, explicit Card and Media subject controls, immediate Compose reconciliation, and shared closed-tile Reader presentation. Final read-only audits covered 1,281 Cards, 3,503 Media, 270 Questions, and 660 Tags with zero subject conflicts, derived-projection mismatches, count or membership mismatches, dimension errors, hierarchy mismatches, or orphan parents after a bounded repair of 11 derived count records; nine Cards and nine Media remain safely compatible legacy-singular records and require no rewrite. Author-approved Completion Gate passed.

**Gaps / slices** —

None. Completion Gate passed.

**Dependencies** — Author settings, Card and Media services, Gallery membership, confirmed tag and subject fields, onboarding/help surfaces, and current hierarchy/projection utilities.

**Risks** — Silent replacement of manual card truth, stale rollups, incomplete media appearing complete, subject drift, excessive fan-out after media edits, count drift, and unclear activation consequences.

**Decisions needed** — None. The author selects each dimension during onboarding; implementation must not choose dimensions on the author’s behalf.

**Completion evidence** — Unit and service tests for rollup and overrides; migration audit proving existing cards are protected; browser verification of onboarding, Settings, Compose overrides, re-inheritance, and Reader results; zero unexplained projection or count drift; canon reconciliation.

---

## Sequence

The ordering below preserves the existing Admin → Reader → Scale progression. It is a queue, not evidence that any capability is Ready. Select one capability at a time for Definition Gate assessment. Complete User Management and then Settings before moving through Reader Experience and then Platform and commercial readiness. Video and external media-source expansion remain parked until those phases establish a solid core application.

## 1. Author workflow

### Admin Shell

**Definition:** Ready
**Execution:** Verified

**Outcome** — The author can enter Administration, identify the current workspace, and move coherently among Studio, Users, Settings, and Theme without competing navigation or unnecessary shell layers.

**Actors** — Author and administrator.

**Includes** — Administration entry and redirect, shared primary navigation, active-destination state, Theme entry behavior, desktop-only gate, shared page shell, specialist-page return to Studio, and removal of unused competing shell structures.

**Excludes** — Cards, Compose, Media, Questions, Tags, or Collections feature behavior; specialist content inside Users, Settings, or Theme; cross-application feedback and messaging; Reader taxonomy correction; mobile authoring; theme-system redesign; and module reduction.

**Contracts** — Studio remains the daily workspace for Cards, Compose, Media, Questions, Tags, and Collections. Users, Theme, and Settings remain specialist administrative destinations. Administration is desktop-primary. Reader and Administration share architecture but retain distinct presentation. This capability owns navigation and shell hierarchy only; interaction behavior remains with the surface that performs it. Theme retains its current governed overlay entry unless the Theme capability later changes that contract.

**Current state** — `/admin` redirects to Studio. The global Navigation is the sole primary destination menu and exposes Studio, Users, Settings, and Theme with active states. Studio retains its sidebar and pane state. Users and Settings are clean specialist pages without the Reader/Studio sidebar or floating create-card action. Theme opens its governed overlay over the originating surface, uses the existing Administration desktop gate on admin routes, and retains its own gate when opened from Reader. The obsolete unused admin-tab component and styles are removed. Server authorization and the existing client session guard remain unchanged.

**Gaps / slices** — None. Completion Gate passed.

**Dependencies** — Existing authenticated administrator session, global Navigation, Admin layout and viewport gate, Theme provider and overlay, Studio route, and Users and Settings routes.

**Risks** — Breaking authenticated entry, opening two Theme surfaces, losing the prior route when Theme closes, hiding Settings, duplicating navigation, introducing session-loading flashes, changing Studio pane state, or weakening the desktop boundary.

**Decisions needed** — None. Users and Settings are clean specialist pages without the Reader/Studio sidebar or floating create-card action; primary navigation remains the route back to Studio.

**Completion evidence** — Focused AppShell and Theme overlay tests pass with lint. Browser verification confirmed `/admin` entry, Studio sidebar retention, clean Users and Settings shells, primary-menu return to Studio, Theme overlay entry, and one desktop-only blocker at narrow viewport. Destination content, authentication, Reader behavior, and Studio feature behavior were not changed. Completion Gate passed and canon is reconciled.

### Interaction Feedback

**Definition:** Ready
**Execution:** Verified

**Outcome** — The application communicates activity, completion, problems, consequences, and required decisions calmly and clearly without moving surrounding content, obscuring ordinary work, or exposing implementation language.

**Actors** — Author, administrator, and Reader.

**Includes** — Shared success, information, warning, error, confirmation, and alert behavior; localized pending and completion states; Compose autosave visibility; stable inline validation and page-level conditions; progress for long-running work; removal of routine full-screen saving blockers; replacement of browser-native confirmations; user-centered message wording; accessibility; and verification across Administration and Reader.

**Excludes** — Marketing copy, Help and onboarding content strategy, workflow redesign unrelated to feedback, visual redesign of task modals, backend logging language, and exhaustive editorial review of text that is not a message, instruction, status, or notification.

**Contracts** — Feedback never pushes or reflows surrounding content. Routine work reports progress and completion in the initiating card, control, row, or reserved status area. Compose instant saves explicitly show Saving, Saved, and failure; fading a Save control is not sufficient. Routine successful edits do not also produce generic Saved toasts when the local result is clear. Toasts float without blocking: success and ordinary information expire, while warnings requiring action and errors persist. Validation appears beside the affected control. Confirmation blocks only before destructive, cross-entity, discard, or consequential settings actions. Full-screen blocking is reserved for states where continuing is unsafe or impossible. Primary wording states what happened, the user consequence, and the next useful action; technical detail stays in logs or optional details.

**Current state** — One application-level provider supplies floating success, error, warning, and information toasts plus shared confirm and alert dialogs. Routine success is now a transient one-line status without a generic Saved heading; errors remain persistent, use assertive accessible announcement, and no longer add a generic Something went wrong heading. Meaningful caller-supplied titles remain supported. Shared dialogs queue instead of replacing an unresolved decision, use Escape as the safe cancel or close action, contain keyboard focus, associate their title and message accessibly, and restore focus after the queue closes. The shared JSON error boundary treats API `message` as user-facing copy while retaining API `error`, code, and HTTP status as technical metadata; absent user copy falls back to contextual language without displaying an HTTP code. Compose full and instant field saves share explicit Save, Saving, Saved, and Retry states in one fixed-width local control; successful routine edits no longer add a generic toast, while successful creation reports Card created because the new-card form remounts before its local Saved state can remain visible. Ordinary saving no longer activates a pane-level blocker. Card transitions retain non-blocking localized Opening feedback without a duplicate inline status that reflows Compose. Reader quick edits, visible caption changes, and visible operations-status refreshes no longer add redundant success notifications. Question and drag-and-drop outcomes retain concise one-line confirmation without generic Saved, Added, Deleted, or Updated headings. Their failure messages, Card Compose failure, and Gallery-inheritance Settings results state the user consequence and next action instead of leading with technical reconciliation language. Settings retains floating results when saving may also update existing cards in the background. All application-owned confirmations use shared dialogs: the unused synchronous CardForm prompt was removed, large-pile dismissal explains the consequence and choices, and Theme switching names save versus discard behavior. Reader title and Users password validation now appears beside the affected input; a failed password update retains the entered password. Focused feedback, form, and Media tests, lint, and changed-component type checks pass. A clean development-server rebuild cleared the stale client manifest and confirmed Studio compiles. Live verification confirms one fixed-width Save control, localized Opening feedback that clears, no pane-level Saving Compose or duplicate Loading selected card message, disposable draft creation and existing-card title persistence, shared delete confirmation, and cleanup with no residual test card. A controlled offline status change displayed Retry, retained the selected value for another attempt, and did not falsely persist it; reload after server recovery restored the prior saved value. The browser captured Saving but could not reliably sample the transient Saved or Card created states because Studio action settling exceeded their display windows; their timing and transition behavior remain covered by focused tests.

**Gaps / slices** — None within this capability. New messages and operations must follow the established feedback contract as their owning capabilities are implemented.

**Dependencies** — AppFeedbackProvider, CardFormProvider, surface-owned mutation state, shared theme roles, modal layering, accessible live regions, and representative browser workflows.

**Risks** — False success, hidden failure, overlapping saves reporting the wrong state, excessive toast noise, lost error detail, duplicate dialogs, layout shift, blocking ordinary work, unannounced assistive-technology state, and changing mutation behavior while changing its presentation.

**Decisions needed** — None. The author approved stable non-reflowing presentation, localized routine status, selective floating notification, minimal blocking, explicit Compose autosave state, and user-centered language.

**Completion evidence** — Provider and surface tests cover timing, persistence, queueing, save-state transitions, validation, dialog semantics, and representative long-running operation status. Browser verification covers Compose full and partial saves, controlled failure retention and Retry, card opening, representative success/error/confirmation flows, no ordinary full-screen save blocker, and no notification-driven layout shift. The message inventory and canon are reconciled. Completion Gate passed.

### Reader Boundary

**Definition:** Ready
**Execution:** Verified

**Outcome** — Viewing users experience a read-only Reader, while the administrator-author can correct the current card and visible media as fully as practical without losing Reader position or repeatedly moving through Studio.

**Actors** — Viewing user and administrator-author.

**Includes** — Server-enforced read-only viewing users; administrator-only edit entry on feed and detail; desktop and mobile editing of the current card; title, subtitle, excerpt, body, status, form, display, cover, Gallery, tags, subjects, inheritance overrides, captions, visible-media corrections, children, duplicate, and delete where the viewport and interaction can support them safely; immediate Reader reconciliation; safe contextual return; and preservation of Reader filters and navigation.

**Excludes** — Archive-wide or bulk card and media operations; taxonomy-wide hierarchy reorganization, merge/split, cleanup, or deletion; Collections authoring; Users, Theme, Settings, import, and operational administration; redesign of Reader presentation; and unrelated Studio Compose improvements.

**Contracts** — Viewing users never receive or execute mutations. Author editing is contextual to the current card or visible media and does not turn Reader navigation into a competing administrative workspace. Desktop and mobile share the same authorization and conceptual capability; viewport may change presentation and staging but does not silently redefine product permission. Card-specific edits update card work truth; canonical media changes remain explicit. Delete, duplicate, discard, publication, inheritance, and cross-entity effects communicate consequences and preserve a safe return path. Successful writes reconcile feed, detail, filters, and derived Reader truth without requiring a manual refresh. Studio remains the primary workspace for archive-wide, bulk, and taxonomy-structure operations.

**Current state** — Viewing users do not receive edit entry points. The exhaustive API access inventory classifies administrator mutations and directly verifies anonymous and viewing-user rejection across card create, patch, delete, duplicate, tag mutation, media metadata, replacement, and other protected operations. Administrators can enter editing from feed cards and detail pages. Desktop embeds the complete Studio CardForm and exposes delete, duplicate, status, type, display mode, Cover, Gallery, card tags and subjects, inheritance, body, Story Assist, and Children. Mobile retains a fast title, subtitle, excerpt, and eligible plain-body editor and now provides an explicit path into that same complete CardForm. At phone width the full editor is edge-to-edge and removes desktop drag and resize affordances; switching with unsaved quick edits requires an explicit discard decision. Gallery captions can be edited directly in Reader. Reader writes patch card data and reconcile visible card caches. Freeform preserves its card/media, dimensional, hierarchy, Subject-scope, search, and active-filter controls without exposing the former archive-wide taxonomy editor. Delete return routing removes a deleted detail destination or matching feed focus while retaining remaining Reader mode and path context. Duplicate now tolerates absent optional card fields, reports failure truthfully, identifies the new draft in the editor, and preserves the original card.

**Reconciliation evidence** — Reader writes immediately replace the saved card in visible list and detail state. Changes that can alter publication, filter membership, search, ordering, grouping, collection structure, Gallery rollup, or preview then revalidate card-list truth; Gallery caption-only changes remain local and do not cause a broad refresh. Live Reader verification proved Draft removal and Published restoration without manual refresh, and the reversible test card was restored. Failed full, partial, quick-edit, duplicate, and delete operations retain the editor and applicable draft or original card. A failed Gallery-caption save keeps the lightbox and revised caption open for retry instead of closing over an unsaved draft. Canonical Media captions are read-only for viewing users and editable for administrators; success patches the visible Media feed, while failure retains the lightbox and caption draft. Tag, subject, and Gallery-inheritance patches reconcile the complete server-derived tag, subject, dimension, filter, sort, rollup, and implicit-subject result into both the open full editor and visible Reader card state. A manual tag addition or removal in an inherited dimension requires confirmation and converts only that dimension to an override; cancel preserves inheritance and current tags. Releasing an override warns that Gallery rollup will replace that dimension's card tags. Gallery detail serialization recursively converts Firestore values to client-safe plain data. Live verification proved Gallery rendering, safe caption initialization, card-specific caption save, restoration of the original caption, the quick-to-full editing path at a 390-by-844 mobile viewport, and shared delete confirmation above Compose followed by safe return to `/view` and removal of the deleted card.

**Implemented repair — full-editor action containment** — Reader full edit retains the complete CardForm but now constrains its flex shell, header, action row, and scrolling body to the Reader modal width. The prior min-content expansion could make an 800-pixel modal contain a roughly 1,501-pixel inner shell, placing Close, Discard, and Save beyond the viewport and clipping them. The correction is owned by the Reader modal boundary and does not change Studio CardForm geometry. Focused Reader editor tests and touched-code lint pass; final desktop and phone-width visual confirmation remains required.

**Gaps / slices** — None. Completion Gate passed.

**Dependencies** — Session role and mutation authorization, ReaderCardEditEntry, ReaderCardEditModal, ReaderMobileQuickEdit, CardForm and focused editing components, card and media APIs, TagProvider and CardProvider reconciliation, Gallery caption editing, AppFeedbackProvider, Reader routing state, and Studio-owned taxonomy management.

**Risks** — Exposing mutations to viewing users; losing Reader position or active collection/filter state; desktop and mobile producing different product truth; full CardForm coupling making Reader fragile or slow; stale feed or detail state after writes; card edits silently changing canonical media; destructive actions with unsafe return; Reader filters losing space or behavior; and duplicating Studio domain logic in Reader-specific components.

**Decisions needed** — None. The author approved read-only viewing users, maximum practical in-context author editing on desktop and mobile, viewport-driven presentation differences, and Studio ownership of archive-wide and bulk organization.

**Completion evidence** — Authorization tests prove viewing users cannot mutate even through direct requests. Component and integration tests cover the shared capability map, desktop and mobile operation availability, cache reconciliation, failure retention, safe deletion and duplication, and filter preservation. Browser verification covers viewing-user read-only behavior plus administrator feed and detail editing on desktop and mobile-width layouts, contextual return, Gallery and tag correction, destructive confirmation, no taxonomy-library replacement of Reader filters, and no manual-refresh requirement. Subject changes reconciled from the detail editor into the feed, manual inherited-tag edits converted only the affected dimension to an override after confirmation, and releasing that override restored current Gallery truth without reload. Canon is reconciled, the Completion Gate passed, and no defined boundary work remains.

### Studio Cards

**Definition:** Ready
**Execution:** Verified

**Outcome** — The author can scan, find, compare, select, and manage cards in a predictable archive bank that is consistent with Media where their roles overlap and retains card-specific information and actions.

**Includes** — Explicit title search and recoverable no-result state; temporary search state; persistent structural working preferences; continuous tile sizing behind a compact control; stable title, dimensional-subject, selection, and tag access at every permitted size; direct known-tag filtering; independent dimensional tree browsing; an all-dimensions fallback; compact tag-presence and subject-scope rules; complete-archive filter correctness; card-specific type, status, display-mode, and bulk controls; and presentation alignment with the Media bank.

**Excludes** — Compose behavior; tag-system rules or hierarchy redesign; Collections behavior; Media-specific assignment, import, stacking, or organization behavior; Quote implementation; global Settings preference implementation; and broader Studio-shell redesign.

**Contracts** — Cards and Media follow one Studio-bank interaction model where their jobs overlap without becoming identical surfaces. Tile size changes density, not feature availability. Each bank may enforce a different content-safe minimum. The current control remains available in Studio; Settings may later own the author default. Free-text search is session task state and does not persist across Studio reloads, while structural working filters may persist. Empty results identify the active constraint and provide direct recovery. Known tags use direct entry; Who, What, When, and Where open independently for focused browsing; the full selector remains available for comprehensive work. Presence and Subject-only rules remain explicit but do not consume the normal bank layout. Archive filters operate on the complete matching population rather than only loaded tiles.

**Current state** — Studio Cards explicitly searches titles, visibly exposes active-search clearing, and names the query when no cards match. Previously stored free text is discarded so a stale verification query cannot make the catalog appear empty on return. Cards and Media use the same compact icon-triggered tile-size popover with a continuous slider and reset action. Cards retain their existing 228-pixel information-safe minimum and may expand to 360 pixels; Media retains its established 140-to-320-pixel range. Card title, dimensional subjects, selection, and tag access remain present throughout the permitted range. Cards and Media now share a dimensional filter control: direct entry is labeled as filtering, dimension headings open only their tree, the full picker remains explicit, and scope/presence rules are compact. The Macro Tag Selector supports dimension-scoped filtering and assignment without discarding hidden selections. Individual Card, Media, and Question assignment uses direct entry, focused dimension browsing, or an explicit all-dimensions picker; tags and multiple subjects save as one coordinated decision. Card assignment continues through inheritance-aware confirmation, while Media and Question editors use their existing authoritative persistence paths. Cards and Media send Has-tags and Empty presence rules to complete-archive server filtering rather than applying them only to loaded tiles. Existing assignments, identities, relationships, inheritance, and taxonomy are unchanged.

**Risks** — Pane width can force a single responsive column below the preferred minimum; large archive rendering can delay browser settling; and future Settings defaults could conflict with current local workspace preferences unless precedence is defined before implementation.

**Decisions needed** — None for the implemented search, density, tag-filter, and individual-assignment foundation. Settings ownership of cross-device defaults belongs to a later Settings capability. Identity-derived relationship or life-stage lenses remain separately gated.

**Completion evidence** — Focused Studio-bank, preference, shared tile-control, dimensional-selector, Macro selector, Card form, Media provider, and subject tests pass. Production type-check passes. Touched-code lint has no errors and retains existing hook-dependency warnings. Live Studio verification confirms direct filter entry on Cards and Media; independently opening the Who tree; opening all four filter dimensions together; explicitly labeled Subject/Any-tag scope and presence rules; Reflections within What; search recovery; density controls; retained card subject presentation; and focused Who, full assignment, and multiple-subject controls in Card Compose, Media edit, and Question creation without changing archive data.

- **Tags** — Improve keyboard use, hierarchy, and disambiguation.
- **Quote** — Add Quote only with the completed Quote object.

### Studio Compose

**Definition:** Ready
**Execution:** Verified

**Outcome** — Title, subtitle, excerpt, and body retain the same meaning across Compose, focused Reader editing, feed tiles, compact previews, and detail reading without cluttering authoring forms with basic field definitions or losing authored text and voice.

**Actors** — Author and administrator.

**Includes** — Author-written excerpt precedence with automatic derivation only as a fallback; shared field labels, validation, and persistence meaning across Compose and focused Reader editing; one field-selection contract across Compose preview, Reader feed, compact previews, and detail; only existing long-form controls with a defined Reader outcome; and Help-owned explanation when basic field definitions are needed.

**Excludes** — Inline definitions for familiar fields; inline Story Assist policy prose; Quote definition or implementation; new generic formatting controls; automatic factual insertion; silent voice rewriting; Reader layout redesign; Theme redesign; card schema replacement; Media, Tags, Collections, or relationship behavior; and broader CardForm decomposition.

**Contracts** — Title is the primary identifying name. Subtitle is optional supporting framing. Excerpt is the concise Reader-facing invitation; authored excerpt wins and automatic text is fallback only. Body is the complete narrative. Surfaces may lay fields out differently but do not reinterpret them. Reader remains focused editing and reuses the same domain meaning rather than becoming a second Compose. Familiar field meanings are not repeated inline; Help owns explanatory material. Assistance remains suggestion-only, preserves author voice, distinguishes researched context from personal memory, and never invents facts.

**Current state** — Repository tracing confirms that Compose and focused Reader editing already share the intended field meanings. Existing persistence gives authored excerpts precedence and uses body-derived text only while `excerptAuto` remains true, so no schema or save-path change is required. Compose preview continues to use the shared Studio/Reader closed-card shell. Inline field guidance and Story Assist policy prose were tried, rejected by the author as unnecessary clutter, and removed from both Compose and Reader editing.

**Gaps / slices** — None inside this definition. Any future explanation belongs in Help. Quote remains a later Studio Compose slice.

**Dependencies** — Card schema and service validation; CardFormProvider; Studio CardForm and Compose preview; Reader quick-edit surfaces; Reader closed, compact, and detail renderers; shared feedback; and existing Story Assist behavior where present.

**Risks** — Overwriting authored excerpts, changing published presentation unexpectedly, duplicating field logic, coupling Reader to the full CardForm, misleading authors about automatic text, expanding editor scope, or presenting generated historical context as personal truth.

**Decisions needed** — None for this slice. The author approved the field roles, authored-excerpt precedence, cross-surface semantic alignment, focused Reader reuse, bounded editorial controls, historical-context separation, and Quote deferral.

**Completion evidence** — Repository tracing and 35 focused tests cover authored-excerpt precedence, automatic fallback, Compose behavior, Reader quick editing, and patch reconciliation. Touched-code lint, production typecheck, diff checks, and the production build pass. The author rejected inline explanatory prose as clutter; it was removed from Compose, Reader quick edit, and Story Assist, and the durable product rule was moved to Help ownership.

### Studio Media

**Definition:** Ready
**Execution:** Verified

**Outcome** — Every newly imported image truthfully reports whether its required source, metadata, Studio rendition, Reader rendition, and search projection are ready, pending, or failed, and the author can retry only the failed downstream work without re-importing or duplicating the asset.

**Actors** — Author and system operator.

**Includes** — A structured readiness contract on new Media records; explicit stage state for source persistence, metadata extraction, Studio rendition, Reader rendition, and Typesense indexing; failure code, retryability, attempt time, and bounded diagnostic detail; import responses and Studio feedback that distinguish complete, partially ready, and failed work; unobtrusive Media-tile indication only for pending or failed assets; an administrator-only idempotent retry path for failed rendition, metadata, or indexing stages; and an audit-only report classifying legacy records whose readiness has not yet been assessed.

**Excludes** — Production backfill or mutation of existing Media records; likely-match discovery; duplicate decisions or same-asset reconciliation; deletion, merge, or reference movement; pile merge; burst proposals; video processing; external photo-library adapters; new background-job infrastructure; generic notification redesign; and unrelated Media-bank layout changes.

**Contracts** — A Media document is not created unless its canonical source object and required dimensions are durable. Optional downstream failure does not erase or duplicate that canonical asset. `ready` means every required image stage completed; `pending` means work is actively expected to finish; `failed` names the failed stage and whether retry is safe. Typesense remains a projection and its failure never rewrites Firestore truth. Retry operates on the existing Media ID and storage paths, is idempotent, and cannot change tags, subjects, captions, card references, identity evidence, or source identities. Legacy records without readiness data remain explicitly unassessed rather than being silently labeled ready.

**Current state** — New image imports now persist structured readiness for source, metadata, Studio rendition, Reader rendition, and search indexing. The canonical source and dimensions remain required before Media creation. Rendition failure produces a retryable failed stage instead of silent omission, and Typesense synchronization is awaited and recorded instead of launched fire-and-forget. Studio adds no status chrome to healthy or legacy-unassessed tiles; pending items show Processing and failed items show a Needs retry action. Administrator-only audit and retry routes are registered in the access inventory. Retry uses the existing Media ID and storage paths. Existing records remain unchanged and explicitly unassessed.

**Gaps / slices** — None inside this definition. Existing records remain legacy-unassessed; any future production backfill requires its own approved mutation gate.

**Dependencies** — Media schema and validators; central image import service; Storage; rendition generation; Typesense media synchronization; local and browser import routes; Studio Media provider/grid; shared feedback; admin authorization; and integrity/audit tooling.

**Risks** — Reporting ready before indexing or renditions finish; creating orphan provisional records; duplicating media during retry; treating a projection failure as source loss; exposing internal errors to the author; adding badges to every healthy tile; or accidentally mutating legacy records during assessment.

**Decisions needed** — None. The author approved this bounded readiness slice. No production data write, migration, or legacy backfill is authorized by that approval.

**Completion evidence** — Readiness derivation, retry eligibility, Media grid, route behavior, and the complete admin-route boundary inventory pass 150 focused tests. Touched-code lint has no errors and retains two pre-existing Media-grid hook warnings. Production typecheck and build pass. The read-only live audit reports 3,503 total, zero assessed, and 3,503 legacy-unassessed records. A uniquely named temporary production image verified healthy `ready`, durable controlled `failed`, targeted return to `ready` on the same Media ID, and preservation of identity and relationship fields. Cleanup removed the Media document, identity entry, Typesense projection, source object, and both rendition objects; final audit confirmed zero temporary records and the original 3,503-record count.

#### Interaction Consistency

**Definition:** Ready
**Execution:** Verified

**Outcome** — Cards and Media provide the same predictable recovery and consequence disclosure for shared bank operations while retaining controls and drag behavior required by their different jobs.

**Actors** — Author and administrator.

**Includes** — Add an active Media-search clear affordance matching Cards; name the active Media query in the no-results state; provide direct Clear search and Clear filters recovery based on the constraint that produced zero results; add direct structural-filter recovery to the Cards empty state; normalize bulk-selection clearing language; and disclose authoritative linked-card consequences before single or bulk Media deletion.

**Excludes** — Cosmetic header or spacing unification; moving Media grouping, import, population, stack, pile, or assignment controls into Cards; making Media cell activation focus Compose; making Card drag behave like Media assignment; changing tile minimums; changing filter persistence; deleting, merging, or moving unrelated records; likely-match work; and generic shared-component refactoring not required by these behaviors.

**Contracts** — Shared operations use consistent labels and recovery. Search remains temporary task state; structural filters retain their existing persistence. Empty results identify the active constraint and provide the narrowest safe recovery. Media deletion continues to remove authoritative Cover, Gallery, and body references before deleting the canonical Media record and files, but the author sees the number of affected cards before confirmation. If linked-card consequences cannot be verified, deletion does not proceed. Card structural deletion rules remain unchanged. Media population/grouping and Card/Media drag differences remain intentional.

**Current state** — Cards and Media retain their intentional role-specific grouping, population, import, stack, pile, activation, tile-size, and drag behavior. Their shared bank operations now use query-specific search recovery, structural-filter recovery, and `Clear selection` wording. Media has an active-query X clear control; clearing search preserves structural filters. Before single or bulk deletion, Media fetches authoritative reference summaries, names the number of affected cards and the Cover, Gallery, and body consequences, and blocks deletion if that lookup fails.

**Gaps / slices** — None inside this definition. Cosmetic alignment and role-specific Card/Media behavior remain outside the slice by design.

**Dependencies** — Studio Card bank; Studio Media content/grid; debounced search control; Media reference-summary route; reference-aware Media deletion service; shared feedback and confirmation; existing bank tests; and browser verification.

**Risks** — Clearing persistent filters when only search should clear; stale or partial reference counts; allowing deletion after failed consequence lookup; making Media controls noisier; changing cell activation or drag semantics; or broadening into cosmetic redesign.

**Decisions needed** — None. The author approved the visible recovery controls and expanded Media deletion consequence message. No data migration or production mutation is part of this slice.

**Completion evidence** — Twenty-two focused tests pass across Media content/grid, Card-bank recovery, and the authoritative reference-summary client, including deduplication, request chunking, bulk consequence disclosure, and lookup-failure blocking. Production typecheck and build pass; touched-code lint has no errors and retains three pre-existing hook warnings. Live Studio verification confirmed the Media X clear control, query-named no-results recovery, Clear search, and preservation of the selected Local source filter while clearing search. The verification restored Media filters and did not invoke deletion or mutate archive content.

- **Duplicates (parked)** — Source-byte evidence is stored for 3,064 of 3,503 Media records with 3,062 uncontested identity-registry entries. Studio Media provides an author-only Exact matches queue for identical source bytes; the sole exact pair is Deferred and remains unregistered. The remaining 439 records are explicitly assessed as 101 missing local originals and 338 sources whose original bytes were not retained. Paired backup `run-2026-07-17T20-58-32-604Z`, guarded apply, rollback support, and a full post-apply audit prove zero overlap, invalid assessments, or unclassified records. Likely-match review remains parked; same-asset reconciliation remains inactive unless an exact pair is explicitly changed to Same asset.
- **Pile merge** — Add bounded author-controlled pile merging.
- **Bursts (parked)** — Resume only after import persists reliable original capture time and source-sequence evidence. Current `createdAt` is import time, and the optional EXIF path does not retain `DateTimeOriginal`; filenames or import proximity cannot truthfully authorize burst proposals.
- **Derivatives (complete)** — Canonical source persistence, orientation correction, Studio and Reader WebP renditions, readiness/retry, and surface-specific URL selection already cover supported image formats. HEIC decoding is not available in the current image runtime and remains a future external-source ingestion concern rather than a parallel converter.

#### Pile Merge

**Definition:** Ready
**Execution:** Verified

**Outcome** — The author can combine two pending story piles as one deliberate operation without moving members individually or changing confirmed archive truth.

**Actors** — Author and administrator.

**Includes** — A Merge action on pending pile headers; destination-pile selection; a confirmation naming both piles and their photo counts; one transactional service operation; destination-first deduplicated membership; preservation of the destination title and suggested tags; a durable merged-source audit record; refresh and focused feedback; authorization, service, route, component, and browser verification.

**Excludes** — Merging accepted, dismissed, merged, or missing piles; transferring or applying source suggested tags; changing confirmed Media tags; changing cards, Media records, Storage objects, stacks, imports, pile generation, or individual membership controls; automatic title selection; multi-pile merge; and UI Undo.

**Contracts** — Source and destination must be distinct pending piles when the transaction commits. The destination survives with its title and suggested tags unchanged. Its existing member order remains first; source members append in source order with duplicates removed. The source becomes `merged`, records the destination ID, retains its prior metadata and members for audit/recovery evidence, and no longer appears in pending views. Confirmed Media tags remain untouched. A conflict or failed transaction makes no partial change. Recovery from the retained audit record is operational; UI Undo requires a separate gate because later membership edits can make automatic reversal ambiguous.

**Current state** — Pending pile headers now provide Merge when another pending pile exists. The destination dialog names candidate piles and member counts, and a second confirmation names source, destination, both counts, destination metadata preservation, and non-transfer of source suggestions. The administrator action executes one Firestore transaction that revalidates both piles, appends deduplicated source membership after destination membership, preserves destination metadata, and marks the retained source record `merged` with destination and timestamp recovery evidence. Confirmed Media tags, cards, Media records, Storage, stacks, imports, generation, and individual movement remain unchanged.

**Gaps / slices** — None inside this definition. UI Undo remains a separate future gate because later membership edits can make reversal ambiguous.

**Dependencies** — Provisional-cluster schema and service; administrator review-action route; Story Piles overlay; shared confirmation and feedback; Firestore transactions; pending-pile refresh; access inventory and tests.

**Risks** — Duplicate membership, partial writes, stale lifecycle state, self-merge, accidental tag propagation, losing source recovery evidence, or presenting a merge as reversible after later edits.

**Decisions needed** — None. The author approved this exact bounded gate. No production pile merge is authorized during verification; browser verification may use and clean up temporary test piles only.

**Completion evidence** — The merge contract and surrounding Media and administrator-route regressions pass 155 focused tests. The shared dialog behavior suite adds three passing focus, queue, persistence, and dismissal checks. Touched-code lint has no errors and retains one pre-existing hook dependency warning in the pile overlay. Production builds pass. The author verified a successful merge. The reported low-contrast confirmation was corrected at the shared theme boundary: neutral dialog text now pairs the Window surface with Administration chrome text while buttons retain their paired control roles. The rebuilt production server is listening on port 3003.

### External Photo Libraries

**Definition:** Parked

Apple Photos permits deep library access through native Apple-platform applications rather than this v1 Windows-hosted web architecture. Google Photos permits explicit user selection but no longer permits third-party synchronization or general read access to the complete user library. Both therefore act as preparation and ingestion sources rather than synchronized backing libraries.

- **Sequence** — Do not implement Apple Photos, Google Photos, OneDrive, or another provider-specific adapter until the core organization, authoring, retrieval, and Reader experience is proven.
- **Ingestion** — Continue using the canonical import pipeline for provider exports, local folders, and other user-prepared assets.
- **Future gate** — Before any adapter work, establish its supported access model, author benefit beyond generic import, metadata and source-identity guarantees, batch and retry behavior, duplicate evidence, and representative verification.
- **Architecture boundary** — A future picker or native companion may simplify acquisition, but imported bytes and required metadata must become durable application-owned media; the product must not depend on expiring provider URLs or continuous remote-library access.

### Video

**Definition:** Parked

Resume only after User Management, Settings, Reader Experience, and Platform and commercial readiness are complete.

- **Model** — Reuse image identity, tagging, assignment, reference, and deletion rules.
- **Processing** — Produce playable rendition, poster, duration, readiness, and failure state.
- **Media** — Browse, preview, tag, filter, select, replace, and delete safely.
- **Compose** — Assign and preview Cover, Gallery, and body video.
- **Reader** — Play video in assigned placements without autoplaying sound.
- **Cards** — Use a poster or compact indicator; grid playback is not required.

### User Management

**Definition:** Ready
**Execution:** Verified

**Outcome** — The author can create and maintain individual reader accounts, and disabling an account ends that account's authorization on its next server request even when the browser still holds a previously valid session token.

**Actors** — Administrator-author and viewing user.

**Includes** — Revalidate JWT-backed account access against `journal_users`; reject missing or disabled accounts at Reader pages and authenticated API boundaries; preserve administrator-role enforcement; retain self-disable and only-enabled-admin protections; keep enablement reversible; and align the Users specialist page with the current Administration shell, theme roles, feedback, validation, table, spacing, and action patterns.

**Excludes** — Public registration; email invitations; password delivery or recovery; role promotion; account deletion; multi-administrator policy changes; database-session migration; general authorization-boundary consolidation reserved for Platform readiness; Settings implementation; Theme redesign; and unrelated Reader or Studio behavior.

**Contracts** — `journal_users` is account truth. Disabled or missing accounts cannot remain authorized merely because a stateless JWT has not expired. Server boundaries enforce revocation; client presentation is not the security boundary. One enabled administrator remains required, an administrator cannot disable the current account, passwords remain hashed and never returned, and v1 disables rather than deletes accounts. A transiently stale client may display its prior shell only until its next server-backed authorization check and must not receive protected data or execute protected operations.

**Current state** — Firestore-backed credentials support individual reader creation, listing, reversible enable/disable, temporary-password reset, role enforcement, self-disable prevention, and only-enabled-admin protection. Every server-backed JWT/session read now refreshes role and disabled state from `journal_users`; missing, disabled, or unreadable account truth fails closed, removes the stale role, and marks access revoked. Reader pages, authenticated API helpers, and remaining direct authenticated Reader routes reject that revoked session. Administrator role checks continue to reject it independently. The Users page no longer measures or sticks beneath the retired admin-tab shell and uses the current Administration presentation, shared consequential-action confirmation, focused feedback, and inline password validation.

**Gaps / slices** — None inside this definition. Invitations, password delivery/recovery, role changes, account deletion, and broader authorization consolidation remain Future or Platform work.

**Dependencies** — NextAuth credential, JWT, and session callbacks; `journal_users`; Reader access helpers and protected pages; authenticated API envelope and direct authenticated routes; administrator layout and Users API; AppFeedback; Administration theme roles; focused auth, route, and component tests; and browser verification.

**Risks** — Trusting stale JWT claims; protecting admin writes while still leaking Reader data; failing open when account truth cannot be checked; locking out the only administrator; turning revocation into broad authorization refactoring; adding a second session model; stale client presentation; or changing account and password behavior while correcting access enforcement.

**Decisions needed** — None. The author approved completing User Management before Settings and the existing canon requires disabled accounts to lose existing authorization.

**Completion evidence** — Ten focused tests prove credential behavior, active Reader and administrator access, stale-role rejection for revoked sessions, disabled and missing-account token revocation, fail-closed account lookup, and client-session projection. Production typecheck passes. Touched-code lint has no errors and retains one pre-existing unused-import warning in the shared route envelope. The production build passes. Live verification confirms the themed Users specialist page, shared disable confirmation, focused Disabled and Enabled feedback, and a reversible `Test Viewer` disable/enable cycle restored to Active without changing any other account or archive content. The production server on port 3003 has normal Firebase access.

### Settings

**Definition:** Ready
**Execution:** Verified

**Outcome** — Every signed-in user has a clear personal Account destination where Light or Dark mode follows their account across browsers, while the administrator retains a separate Settings surface for archive configuration and protected operations.

**Actors** — Viewing user and administrator-author.

**Includes** — A signed-in `/settings` surface; account identity and sign-out entry; account-backed Light/Dark preference with browser preference only as fallback; role-appropriate navigation; separation of personal preferences from `/admin/settings` archive configuration and operations; bounded organization of taxonomy, inheritance, backup/restore, and search health; and preservation of the already completed inheritance activation and reconciliation behavior.

**Excludes** — Per-reader Journal/Editorial selection until Theme Standardization stores and compiles multiple complete packages; Theme editor or schema redesign; password change, delivery, invitation, or recovery; profile editing; public registration; hosted backup changes; restore execution from the application; new search repair operations; taxonomy redesign; and unrelated Reader presentation changes.

**Contracts** — Personal preferences are readable and writable only by the authenticated account. Archive configuration and protected operations remain administrator-only. Account preference failure must not block authentication or silently overwrite a saved choice; browser storage may provide a temporary fallback but does not become account truth. The existing global materialized Reader package remains authoritative until Theme Standardization can support multiple complete packages. Settings links to owning specialist surfaces rather than duplicating their tools. Inheritance activation continues to require explicit four-dimension choice, confirmation for newly enabled dimensions, protected existing cards, and truthful reconciliation results.

**Current state** — `/account` is a signed-in personal placeholder for every account and presents Light/Dark appearance, account identity, role, and sign-out; legacy `/settings` requests redirect to it. `journal_users.readerThemeMode` is account truth through an authenticated current-account-only GET/PATCH route; ThemeProvider loads that preference after authentication, writes changes through the same route, and retains browser storage only as fallback. Server and client hydrate from the same initial mode before synchronizing browser and account state, so the selected control and rendered appearance agree after reload. Navigation exposes Account to every signed-in user and reserves Settings for `/admin/settings`, the administrator archive surface for additive starter taxonomy, explicit Gallery inheritance configuration, guarded paired backup status and execution, CLI-only restore guidance, and read-only Typesense health. Journal/Editorial remains one globally materialized Reader preset, so individual package selection remains deferred to Theme Standardization.

**Gaps / slices** — None inside this definition. Per-reader Journal/Editorial selection, password recovery, profile editing, hosted operations, and Theme system redesign remain with their owning Future or sequenced capabilities.

**Dependencies** — Active-session enforcement; `journal_users`; NextAuth session identity; ThemeProvider and mode toggle; Navigation; AppFeedback; current Administration Settings routes and services; Gallery inheritance; backup status; Typesense reconciliation; focused tests; and browser verification.

**Risks** — Treating local browser state as account truth; allowing one user to change another's preference; flashing the wrong mode during hydration; weakening admin-only operations; duplicating Theme package storage; conflating personal and archive settings; or changing inheritance and backup behavior while reorganizing presentation.

**Decisions needed** — None. The author approved account-backed Light/Dark now and deferred per-reader Journal/Editorial package selection to Theme Standardization.

**Completion evidence** — Focused self-service API and Account component tests pass alongside the 139-case administrator-route boundary inventory. Touched-code lint and production typecheck pass, and the clean production build succeeds. Live browser verification on port 3003 confirmed the personal Account presentation, legacy redirect, role-appropriate Account and Settings navigation, Light save confirmation, account preference after reload, corrected hydration state, restoration of the original Dark preference, and unchanged archive Settings taxonomy, four-dimension inheritance, paired-backup, restore-guidance, and healthy search-index surfaces. Canon was reconciled after verification.

---

## 2. Reader experience

### Landing Page

**Definition:** Parked

The author parked this capability on July 17, 2026. Its product requirements remain Planned in `02`, but it does not block the remaining Reader Experience sequence.

- **Messaging** — Reconcile purpose, audience, and value.
- **Brand** — Complete approved identity assets.
- **Packaging** — Present the hosted offer when settled.
- **Access** — Explain invitation and sign-in expectations.

### Top Navigation

**Definition:** Ready
**Execution:** Verified

**Outcome** — Every signed-in user can move through a compact, predictable global menu and return from Reader detail without losing safe context or competing with native mobile browser navigation.

**Actors** — Viewing user and administrator-author.

**Includes** — Ordered Home, Reader, role-authorized Studio, Users, Settings, Theme, Light or Dark, Account, and sign-out entries; removal of development landing-page variants; Account naming for the retained personal-settings placeholder; account-backed Light/Dark quick control; active states; safe Reader feed and search return destinations; feed focus and scroll restoration; direct-detail fallback; and removal of the custom closed-sidebar left-edge swipe that conflicts with native browser Back.

**Excludes** — Landing Page implementation; Help; Left Navigation hierarchy or visual redesign; Reader content presentation; Theme editor behavior; Account feature expansion; password recovery; profile editing; and Administration feature behavior.

**Contracts** — Home precedes Reader. Studio, Users, Settings, and Theme are administrator-only. Settings means archive configuration; Account means the personal placeholder. The quick appearance control names the available action—Light with a sun when Dark is active, Dark with a moon when Light is active—and retains per-account persistence. Return destinations accept only bounded same-application Reader paths and cannot redirect externally. A direct Reader detail has a safe Reader fallback. Mobile browser edge navigation is not intercepted to open the Reader sidebar; the visible sidebar button remains available.

**Current state** — The global menu now orders Home, Reader, role-authorized Studio, Users, Settings, Theme, Light or Dark, Account, and sign-out, with all development landing-page variants removed. Settings points only to administrator archive configuration; Account is the retained personal placeholder, and legacy `/settings` redirects there. Navigable Reader cards carry a bounded originating feed, detail, or search path; main-feed origins include the card focus marker used by existing scroll restoration. Header Back accepts only `/view` and `/search` Reader paths and falls back to `/view` for direct or unsafe entry. The mobile shell no longer creates or captures a closed-sidebar left-edge swipe zone; its visible toggle and open-sidebar swipe-to-close behavior remain.

**Gaps / slices** — None inside this definition. Help, Left Navigation hierarchy, Account expansion, Theme packages, and Landing Page work remain with their owning Future, parked, or sequenced capabilities.

**Dependencies** — Navigation, AppShell, Reader feed cards and detail route, search results, Reader return utilities, account-backed ThemeProvider, session roles, focused component and utility tests, production build, and browser verification.

**Risks** — Confusing public Home with authenticated Reader; exposing administrator destinations; losing filters, search, scroll, or card focus; accepting unsafe return URLs; breaking discovery-rail navigation; disabling useful sidebar controls while protecting native gestures; or duplicating Settings and Account meaning.

**Decisions needed** — None. The author approved the exact hierarchy, retained the personal placeholder under Account naming, and reserved Settings for archive administration.

**Completion evidence** — Twenty-eight focused Navigation, AppShell, return-safety, Account, V2 card, and feed tests pass; two additional toggle tests prove the action label and icon state, and viewer and administrator hierarchy plus unsafe-return behavior are covered directly. Touched-code lint and production typecheck pass, and the production build succeeds across 51 routes. Live browser verification on port 3003 confirmed the administrator hierarchy and labels, removal of development links, `/settings` to `/account` compatibility, Account heading and saved Dark state, feed-origin encoding, detail Back with query and card focus, restored originating card presence, rejection of an external return in favor of `/view`, Light with a sun while Dark was active, Dark with a moon after switching to Light, and restoration of the original Dark preference. Canon was reconciled after verification.

### Left Navigation

**Definition:** Ready
**Execution:** Verified

**Outcome** — Viewing users and administrator-authors can move between Guided authored paths and Freeform discovery through a clear, compact hierarchy that preserves personal working context without exposing archive-wide taxonomy changes or competing with native mobile browser navigation.

**Actors** — Viewing user and administrator-author.

**Includes** — Mode-first Guided and Freeform hierarchy; Cards and Media browse targets; Type before Tags in Freeform; Who, What, When, and Where dimensions; active filters; compact tag tree; a visibly active More Controls disclosure containing standard-height tag search, Subtags and Match followed by archive-wide server Sort; removal of partial-batch Group behavior and its legacy persisted preference; Clear filters only when applicable; per-account, per-browser tag-tree expansion initialized from administrator defaults; removal of the archive-wide default-expansion mutation from Reader; safe return from detail when Reader filters change; mobile close after Guided destination selection; retained visible drawer toggle and swipe-to-close; and an inset swipe-to-open activation zone that leaves the native browser edge untouched and rejects vertically dominant movement.

**Excludes** — New filters or sorting choices; archive-wide group inventory, counts, or per-group pagination; taxonomy creation, restructuring, or bulk management; account-backed cross-device expansion synchronization; Theme redesign; Content Page or View Page presentation; Guided collection authoring; and administrator editing behavior outside removal of the Reader taxonomy-default mutation.

**Contracts** — Guided uses published collection structure and order; Freeform uses discovery filters. Mode determines the controls that follow. Type describes card form and does not compete with the Cards browse target. Match means Any assigned or Subject only; Subtags controls descendant inclusion. Personal tree expansion never changes another account or the administrator-authored initial defaults. Administrator defaults remain owned by Studio Tags and initialize only a user without a saved preference. Reader does not mutate archive-wide taxonomy presentation. The extreme mobile browser edge remains available to native navigation; app swipe-to-open begins only in the bounded inset zone, and swipe-to-close remains available while open.

**Current state** — The shared sidebar now places Guided and Freeform first. In Freeform, More Controls sits immediately before Clear filters; Cards or Media, Type when Cards is active, and Tags with independent Who, What, When, and Where dimensions follow. More Controls uses a selected state while open and contains standard-height tag search, then Subtags and Match, then full-width server Sort. Sort is ordered Random; Who; What; When; Where; Title; Created, with compact arrows and recent-first direction listed first for When and Created. Random inserts refresh inside the Sort row. Reader Group was removed after diagnosis proved it grouped only the currently loaded 20-card page, while presenting alphabetized sections that appeared archive-wide; hydration clears the legacy browser preference so invisible grouping cannot survive. Any future grouping requires truthful archive-wide group inventory and per-group pagination. Tag expand and collapse actions are left-aligned. Guided omits inapplicable refinement actions and shows published collection structure. Reader no longer exposes the administrator archive-wide default-expansion mutation; Studio Tags retains that ownership. Personal tag-tree expansion initializes from administrator defaults and persists under the authenticated account's browser key. Detail filter changes use the bounded Reader return destination when available. Mobile provides a visible toggle, backdrop close, open-drawer swipe-close, close after Guided leaf navigation, and deliberate swipe-open from an inset zone while leaving the extreme native browser edge untouched.

**Gaps / slices** — None. Completion Gate passed; no additional Left Navigation slice is authorized by this definition.

**Dependencies** — AppShell, GlobalSidebar, TagTree, persistent expansion hook, CardProvider and TagProvider preference state, Reader return validation, session identity and roles, published collection data, focused component tests, production build, and desktop/mobile browser verification.

**Risks** — Reintroducing native Back conflicts; opening during vertical scroll; sharing expansion across accounts; overwriting a personal expansion with changing administrator defaults; hiding essential discovery state; losing filters or return context; compressing select controls below readable width; exposing global taxonomy mutation; or changing Studio behavior through the shared sidebar.

**Decisions needed** — None. The author approved mode-first hierarchy; Type and Tags ordering; Search then Subtags and Match then Sort; visible disclosure state; compact search and Random refresh; dimensional Sort ordering; removal of partial-batch Group behavior and its legacy preference; personal per-account browser persistence initialized from Studio-owned defaults; removal of Reader global-default mutation; and inset swipe-to-open with native-edge protection.

**Completion evidence** — Twenty-six focused AppShell, flat-feed, dimension-sort, and Reader access tests pass. They cover untouched native edge, inset swipe-open, vertically dominant rejection, open-drawer swipe-close, mobile destination close, visible shell continuity, desktop toggle, administration boundaries, removal of grouped rendering, stable Typesense dimension ordering, Firestore hydration in projection order, and projection-backed routing for plain Who, What, and Where sorts. Touched-code lint and production typecheck pass, and the production build succeeds across 51 routes. Live desktop and mobile-width verification confirms mode-first hierarchy, More Controls immediately before Clear filters, Cards and Media followed by Type and Tags, left-aligned tree actions, no Reader archive-default mutation controls, active More Controls state, standard-height tag search, Search followed by one-line Subtags and Match and then Sort, no Group control or grouped feed sections, compact arrow labels, full-width stacked phone controls, visible mobile toggle, and working drawer open. Read-only live service verification confirms Who, What, and Where each order the full 609-card published population through Typesense before authoritative Firestore hydration; the API no longer depends on missing Firestore composite indexes for those controls. The author verified the result and the Completion Gate passed.

### Content Page

**Definition:** Verified

**Outcome** — Readers can scan, consume, and enter published cards through type-appropriate Content Grid presentations while Compose and contextual destination rails remain truthful to those presentations.

**Actors** — Reader and author-administrator.

**Includes** — Story Navigate, Gallery Navigate and Inline, Question Open and Reveal, Callout Static, dimensional chips, Reader Gallery hydration and captions, contextual editing, Compose preview, Explore More, Read More, image legibility, large-figure wrapping, and feed-context preservation.

**Excludes** — The parked Quote product; Quote-dependent cross-type typography redesign; optional Gallery polish; View Page hierarchy; Theme-system redesign; new discovery algorithms; and new card types or presentation modes.

**Contracts** — Published content only; stored presentation governs the Content Grid rather than contextual destination rails; Gallery counts and captions reflect the complete authored sequence; contextual destinations do not rewrite stored presentation; Reader remains mobile-first; and administrator controls do not change viewing-user capability.

**Dependencies** — Reader card hydration, canonical Card and Media records, theme recipes, authentication, and the completed Left Navigation capability.

**Risks** — Shared renderer regressions across Content Grid, Compose, Explore More, and Read More; incomplete Gallery hydration; loss of return context; misleading discovery grouping; and overlay contrast drift.

**Decisions** — Contextual destinations may open Inline and Static cards without changing their Content Grid behavior. Question Inline is Reveal. Quote and its dependent typography work remain parked by author decision.

**Gaps / slices** — None inside the approved active scope. Completion Gate passed.

**Inventory state** — Content Grid, Explore More, Read More, and Compose preview have legitimate contextual differences. Navigate, Inline, and Static govern the Content Grid rather than global card navigability. Explore More is a compact destination context: every published type is represented as a closed linked tile without changing its stored presentation. Read More retains its separately authored-continuation role. Compose now previews the actual Reader presentation rather than approximating only eligible closed tiles through the Administration grid shell.

**Verified slice — Explore destinations** — Explore More now forces a compact square destination representation for Story, Gallery, Question, Quote, and Callout. Inline bodies and Static bodies do not expand inside the rail; selection opens the existing detail page with the originating detail retained as `returnTo`. The rail restores all four dimensional chip slots with a 10-pixel compact treatment and full accessible labels and tooltips when visible text truncates. Content Grid presentation, stored display mode, Read More, Compose preview, detail rendering, and discovery selection remain unchanged. Thirteen focused tile and child-rail tests, touched-code lint, production typecheck, live detail-page geometry and navigation checks, and the production build provide completion evidence.

**Verified slice — Compose Reader preview** — Compose now renders `V2ContentCard` directly in noninteractive preview mode for Story Navigate; Gallery Navigate and Inline; Question Navigate and Inline; Quote Static; and Callout Static. The preview uses current unsaved card truth, remains available without a cover, preserves live focal positioning, allows Inline and Static height instead of forcing a square, and exposes no link or edit entry. The separate Administration closed-tile shell remains unchanged for the Studio Cards grid. Thirty-three focused preview, cover, and Reader-tile tests, touched-code lint, production typecheck, and the 51-route production build pass. The author verified the result.

**Verified slice — Read More destinations** — Story-detail Read More now applies one contextual destination rule to every authored child type. Story, Gallery, Question, Quote, and Callout children use medium square tiles with the standard four-slot chip row and open detail while retaining the parent detail return destination; Inline and Static bodies do not expand inside the rail, and stored Content Grid presentation is unchanged. Nineteen focused continuation, detail, and tile tests, touched-code lint, and production typecheck pass. The real published `Society & Culture` route with a published Static Callout child loads successfully, and the author verified the result.

**Verified slice — Question Open and Reveal** — The existing Question Navigate and Inline values are presented to authors as Open and Reveal without a schema migration. Open retains prompt-led navigation. Reveal is a square, reversible dissolve: the question face owns its cover, question cue, prompt, and chips; the answer face centers the existing RTE content as one vertical and horizontal group without chips and permits one embedded image/caption plus card mentions. Mention activation retains navigation rather than toggling the face. Compose renders an offscreen minimum-width Reader probe and prevents saving an empty, multi-image, or overflowing Reveal answer, directing the author to shorten it or use Open. Covered Question tiles add a persistent question cue. Compact Explore More and Read More Question destinations now use a 14-pixel title and 116-pixel watermark at the live 200-pixel rail width instead of inheriting the 24-pixel title and 224-pixel main-grid watermark. Twenty-four focused Question, destination-tile, validation, and Compose-preview tests pass; touched-code lint has no errors; the 51-route production build succeeds; live Reader measurement confirms the compact proportions; and the author verified the corrected Open-identical question face, reversible reveal, and centered answer.

**Verification correction — Reveal question face** — Initial author verification confirmed that Reveal exposed and restored its answer, but also found that the closed Reveal face did not match the ordinary no-cover Open Question tile. Two independent causes were corrected: Reveal had been excluded from the shared square feed-shell classifier because Inline was generically treated as expanded content, and a Reveal-only internal flex override then shrank the prompt hero to 114 pixels and pulled the chip strip to 96 pixels instead of the Open tile's 306-pixel hero and 288-pixel chip position at the live 308-pixel grid width. Question Reveal now uses the same outer square shell and the same internal prompt/chip geometry as Open; only its activation behavior differs. The author verified the correction.

**Verified slice — Large RTE figure wrapping** — Reader rich-text figures retain authored optional wrapping for extra-small, small, and medium sizes. Large left- or right-aligned figures now clear floats and keep their authored alignment so subsequent prose begins below the figure. This prevents the verified 700-pixel figure in a 768-pixel body from forcing prose into the unusable remainder column while preserving deliberate wrapping around smaller media. Live geometry confirmed zero paragraphs beside the large figure, and the author verified the result.

**Verified slice — Standard tile chrome** — Studio Cards, Studio Media, and Reader content tiles share a capability-based corner grammar: the upper-left is the leading selection/identity slot, deletion occupies upper-right when supported, editing occupies lower-right, and lower-left holds surface-specific status or content. Studio Cards retains `Type | Status`; Media retains `Source | Status | Linked`; Reader uses Type plus Gallery `x/y` in the upper-left because it has no Select or Delete, while Gallery captions may use the lower image edge. Edit is one compact white pencil on black across Reader, Studio Cards, and Studio Media; the smaller Media pencil and the Card pencil occupy the visual area's lower-right corner, while Card and Media deletion share the same upper-right trash symbol. The chrome reserves separate corner regions without changing selection, deletion, editing, navigation, authored content, or chips. Twenty-one focused Reader, Cards, and Media tests plus production typecheck pass. Live desktop and 390-pixel Reader geometry confirms Edit intersects neither title nor chips, and live Studio geometry confirms Card and Media Delete/Edit controls occupy separate upper- and lower-right positions.

**Regression repair — Reader Gallery hydration** — The June 12 feed-performance change incorrectly switched Reader feed and search lists from full hydration to the Administration-oriented cover-only tier. That removed established Gallery peeking, swiping, captions, and truthful position for covered Galleries and reduced coverless Galleries to their first image. Reader lists now use a distinct bounded hydration tier: every visible card receives its cover, Gallery cards additionally receive their complete authored Gallery sequence, and non-Gallery body media remain deferred to detail. Administration cover-only behavior and the other June performance improvements remain unchanged. Seventeen focused feed-hydration and Reader-access tests plus production typecheck pass. Live Reader verification confirms the published `Canada` Gallery receives its cover plus 12 ordered Gallery images and reports `1/13`; other visible multi-image Galleries likewise expose their complete counts.

**Verified slice — Reader Gallery image chrome** — Reader Type and Gallery position now share the image upper-left, using the upper-left identity slot that Reader does not need for Select. Active Gallery captions occupy the image bottom, clamp visually to three lines while retaining their complete accessible label and detail-page text, and reserve the lower-right administrator Edit corner. Type, position, and caption use the existing paired strong-control theme roles instead of independently resolved light-on-light-prone image-overlay colors. Studio tile positions, Gallery swipe and peek, title, chips, dimensions, and detail presentation remain unchanged. Twenty-nine focused Reader tile, hydration, and access tests plus production typecheck pass. Live desktop verification covers bright, dark, color, and monochrome images; computed Type/position colors are `rgb(15, 76, 129)` and `rgb(238, 242, 246)` in both Light and Dark. The saved appearance was restored to Dark after verification.

**Verified slice — Explore More discovery correction** — A read-only assessment of 609 published cards found 281 with no Who, What, When, or Where tags. For those cards, the previous Related and Unrelated requests both sampled essentially the same broad archive; Explore More now omits the meaningless Related request and rail while retaining Unrelated. Tagged cards retain the existing shared-dimension Related behavior: the assessment found no tagged card with zero Related candidates, with candidate-pool medians from 83 to 180 by populated-dimension count and a minimum of 6. Generated results are defensively deduplicated across exclusions, Related, and Unrelated. Existing child presentation, type filtering, and tagged-card eligibility remain unchanged. Compact-rail Edit now occupies the lower-right image corner; live image tiles measured 7 pixels from the right and 6.75 pixels from the bottom. Twenty-seven focused discovery, Reader-tile, and access tests, touched-code lint, and production typecheck pass. Live verification confirmed an untagged card shows only Unrelated and a tagged Gallery shows distinct Related and Unrelated rails.

**Verified assessment — Content Page legibility** — No additional implementation is justified. Story titles are outside the image rather than dependent on an overlay. Story and Gallery type badges, Gallery position, and Gallery captions use the paired strong-control theme roles already verified over bright, dark, color, and monochrome imagery. Administrator Edit retains the author-approved white-on-black treatment. The covered Question cue owns a solid themed surface and border instead of relying on the underlying image. The broad Legibility inventory line is therefore complete without another styling change.

**Verified assessment — Inline disclosure** — No additional Reader behavior is justified. Gallery Inline already exposes its ordered swipeable media directly in the Content Grid. Question Inline is the completed bounded Reveal interaction, which discloses and restores the answer without losing feed context. Story is Navigate-only, while Callout and the parked Quote renderer are Static; the former presentation matrix incorrectly claimed Story Inline and omitted the Static mode. Canon now reflects the enforced display-mode contract.

**Completion evidence** — Outcome: all active Content Page forms use their defined presentation. Contracts: shared rendering preserves stored presentation, Gallery truth, return context, authentication, and contextual editing boundaries. Tests: the focused tile, Compose preview, Question Reveal, continuation, Gallery hydration, access, and discovery suites plus production typechecks passed in their owning slices. Browser: desktop and mobile-width Content Grid, Story/Gallery/Question presentations, Reveal, Gallery swipe/peek/captions, Explore More, Read More, editing geometry, return navigation, Light/Dark contrast, and tagged/untagged discovery were verified. Data/Operations: the 609-published-card discovery assessment and live Gallery hydration checks were read-only. Regressions: Inline/Static destination handling, children, type filtering, caption truth, and viewing-user access remain intact. Canon: `02`, `03`, and `CONTINUITY` are reconciled. Remaining work: none inside the active definition; Quote, Quote-dependent typography, and optional Gallery polish remain parked or Future. Completion Gate passed.

- **Quote and utility typography (parked)** — Quote product definition and dependent cross-type typography remain outside the completed active scope by author decision. The archive has two draft and zero published Quote cards.

### View Page

**Definition:** Ready

**Outcome** — Readers can consume a complete card and continue through the archive without losing the Guided or Freeform path that opened it.

**Actors** — Reader and author-administrator.

**Includes** — Story, Gallery, Question, and Callout detail presentation; authored media and captions; Guided Read More; Freeform Explore More; mode and return continuity; contextual editing; and responsive hierarchy.

**Excludes** — Parked Quote completion; Quote-dependent typography; Content Grid behavior; collection authoring; discovery algorithm redesign; optional Gallery mosaic; and Theme-system redesign.

**Contracts** — Guided uses authored children in order. Freeform uses related and broader discovery. A valid detail-route mode governs that page and its destinations without overwriting the persisted feed preference. Gallery order and captions remain authored truth. Collection return context remains intact.

**Current state** — Story, Gallery, Question, and Callout have verified type-specific detail hierarchy; Gallery provides captions, Swiper, and lightbox; Question faces use one proportional prompt and watermark contract across Reader contexts; Guided and Freeform continuation surfaces are structurally separate; contextual editing and return navigation are verified.

**Dependencies** — Card and Media hydration, Reader mode preference, detail URL state, collection children, discovery services, theme roles, authentication, and completed Content Page behavior.

**Risks** — Mode drift between URL, sidebar, and destination links; losing collection return context; exposing Freeform discovery during Guided reading; changing persisted preferences from a detail route; Gallery truth regressions; and shared detail-style regressions.

**Decisions** — Quote and Quote-dependent typography remain parked. Guided Read More and Freeform Explore More remain distinct; children may still appear in Freeform discovery when otherwise eligible.

**Evidence required** — Focused route-mode, detail, child-rail, discovery, access, Gallery, and contextual-edit tests; production typecheck; desktop and mobile-width browser verification; live Guided child and Freeform discovery navigation; and canon reconciliation.

**Verified slice — Guided and Freeform mode continuity** — Detail rendering, sidebar selection, collection-tree loading, and outgoing destination links now use the valid explicit `mode=guided|freeform` on `/view/[id]`. Missing or invalid mode falls back to the persisted Reader preference. The route mode does not overwrite that preference, clear the selected collection, change filters, or mutate archive data. Live `Society & Culture` verification confirms Guided selection, five `mode=guided` Read More links, preserved parent `returnTo`, and a clicked `Movies` child that remains Guided without Explore More. Live `1937 Chrysler Royale` verification confirms Freeform selection and `mode=freeform` Explore More links. Thirty-eight focused route-mode, detail, rail, destination-tile, discovery, and Reader-access tests plus production typecheck pass; touched-code lint has no errors and retains one pre-existing unused-variable warning.

**Verified slice — Callout presentation** — Content Grid Callouts now use the square Reader tile, retain the complete authored body within the available area, expose the standard dimensional chip strip, and place administrator Edit at the shared lower-right position. Compose measures the real Reader rendering at the minimum supported width and blocks an overflowing Callout with an instruction to shorten it or change it to Story. A Callout reached through a contextual rail opens as an expanded destination while preserving the static Callout's themed surface, typography, spacing, and centered pushpin watermark. Focused tile and detail tests, production typecheck, and live Dark-theme verification of five-item Callouts and expanded `Culture` detail provide completion evidence.

**Verified slice — Shared Story and Gallery reading structure** — Open Story and Gallery now share one ordered media-and-identity contract without merging their authoring or feed types. A selected cover is the hero; a Gallery without one falls back to its first authored image. Type kicker, Title, optional Subtitle, dimensional Tags, optional authored content, deduplicated remaining media, and continuation follow. Matching hero media is removed from the lower sequence by stable media ID while original numbering, captions, caption editing, and the complete lightbox sequence remain authoritative. Story remains narrative-led, Navigate-only, and eligible for authored Read More; Gallery remains media-led with Navigate and Inline feed behavior. Fourteen focused detail and gallery tests, production typecheck, and live verification confirm that `Basketball Court` renders its cover once and begins its attached Gallery at image 2, while `Scot's Birth 1961` renders image 1 as hero, begins remaining media at 2/12, and opens a complete 1/12 lightbox.

**Verified slice — Long-form reading measure and Edit parity** — Story and Gallery detail body copy now uses a left-aligned `68ch` maximum reading measure on desktop with explicit editorial spacing for headings, paragraphs, lists, and quotations. Figures remain on the wider detail canvas and mobile copy continues to use the available width. The administrator detail-page Edit action now uses the same accessible white-pencil-on-black control as other Reader and Studio tile editing surfaces.

**Verified slice — Imported text encoding repair** — A reusable Firestore audit scanned all 1,281 Card documents across title, subtitle, excerpt, rich-text content, and card-specific Gallery captions. It found 1,147 Unicode replacement characters across 221 Cards: 1,143 in content, three in titles, and one in an excerpt. The author reviewed and approved all 55 otherwise ambiguous characters and explicitly waived backup. A guarded migration repaired apostrophes, contextual quotation marks, em dashes, Word-list debris, and the reviewed special cases; it refused mutation until its dry-run reached zero unresolved characters. Post-write audit reports zero affected Cards and zero replacement characters. All 1,281 Cards were then re-upserted into Typesense from repaired Firestore truth.

**Verified slice — Proportional Question hierarchy** — No-cover Question faces now derive watermark and prompt sizing from their own container across Content Grid, Reveal, Compose preview, open detail, Explore More, and Read More instead of using separate viewport-based values. The shared watermark is 78% of the available prompt container: the live 331-pixel Reader tile measures 257.9 pixels, approximately 15% above the former 224-pixel maximum, while the live 198-pixel Explore tile measures proportionally. Standard, compact, and dense prompt classes preserve the same visual contract while preventing long questions from clipping; the verified long prompt remains contained on desktop and at the narrow Reader width. Twenty-five focused Question, tile, and detail tests, touched-code lint, production typecheck, and live desktop, rail, and narrow-width checks pass.

**Gaps / slices** — None inside the active View Page definition. Quote and Quote-dependent typography remain parked and do not block completion.

**Completion evidence** — Guided and Freeform route continuity, Story and Gallery reading structure, Gallery sequence truth, Callout detail presentation, long-form reading measure, contextual editing, imported-text repair, and proportional Question hierarchy are verified through their focused tests, production typechecks, live desktop and narrow-width browser checks, and author acceptance. Canon is reconciled and the Completion Gate passed.

### Theme Standardization

**Definition:** Ready

**Outcome** — The author can change meaningful global, shared-system, component, and layout decisions from centralized controls whose inheritance and affected surfaces are predictable, while the application retains responsive, accessibility, and integrity guardrails.

**Actors** — Author-administrator and viewing reader.

**Includes** — Foundation typography, palette, spacing, radius, shadow, and density; shared action, field, selected, destructive, feedback, tag, Type-chip, caption, and media-control recipes; component and variant overrides; meaningful macro layout controls; visible inheritance and scope; Reader and Administration role enforcement; compiler/editor/runtime parity; and removal or explicit containment of confirmed bypasses and compatibility paths.

**Excludes** — Final Journal and Editorial visual tuning and coverage; new named theme packages; raw CSS editing; exposing responsive calculations or accessibility minima as arbitrary controls; unrelated Reader or Administration redesign; Quote-dependent typography; per-reader package selection before Journal and Editorial are complete; and the later service-boundary split of `themeService`.

**Contracts** — The technical path is values → semantics → recipes → surfaces. The authoring cascade is Foundation → Shared system → Component → Variant; lower levels inherit unless an intentional override is visible. Every author control states scope and affected surfaces. Reader and Administration share architecture but retain their product boundaries. Theme input expresses visual intent; code retains breakpoints, fitting, minimum readability, touch targets, overflow prevention, and contrast enforcement. Save persists, Discard restores, and unsaved switching cannot silently save or lose work.

**Dependencies** — Structured theme data, Reader recipe registry, Theme workspace, compiler and draft compiler, scoped persistence, runtime injection, component CSS consumption, current Journal/Editorial foundations, completed Reader Experience surfaces, and shared feedback/dialog infrastructure.

**Risks** — Mistaking token existence for usable author control; broad changes with undisclosed impact; component overrides that sever inheritance; exposing unsafe geometry; replacing intentional overlays or accessibility values during literal cleanup; destabilizing saved themes through compatibility removal; and expanding the workbench before its underlying contract is reliable.

**Decisions** — Preserve the existing design-token architecture rather than rebuild it. Strengthen the product contract around centralized macro controls, visible inheritance, predictable impact, and fixed guardrails. Administration receives one coherent v1 presentation rather than Journal/Editorial personalities. Journal and Editorial remain later validation capabilities built on this standardized contract.

**Evidence required** — Automated binding and compile-path inventory; classified macro-control and bypass inventory; focused compiler, editor, persistence, and component tests; production typecheck; desktop and mobile live-draft validation on representative Reader and Administration surfaces; Journal/Editorial Light/Dark compilation canaries; and canon reconciliation.

**Verified slice — Definition and enforcement inventory** — The approved author-control hierarchy is now explicit: Foundation, Shared system, Component, Variant, and fixed Guardrail layers. A read-only automated inventory validates all 109 registered Reader component attributes across 13 components and 24 variants against governed recipe paths with zero unresolved bindings. It separately tracks five macro controls that token resolution alone could not prove complete: global font inheritance disclosure, Primary action controls, the shared Reader Type chip, Content Grid spacing, and Question watermark scale. All five are now governed. Responsive fitting and accessibility remain intentionally fixed guardrails. The audit is available through `npm run audit:theme-contract`.

**Verified slice — Typography semantic ownership** — All 36 current Reader typography recipes are assigned exactly once to a Foundation, Shared system, Component, or Guardrail decision. The assessment preserves distinct publishing jobs and component override slots while rejecting card type alone as a reason for separate defaults. It confirms that the present recipe data is fully materialized rather than explicitly inherited: hiding a Family field for four support roles does not establish a cascade. Foundation therefore needs centralized UI, reading, and display family sources; shared title, prose, UI, feedback, and discovery roles need explicit inheritance; Story and Gallery roles remain available as intentional context overrides; Question and Callout retain meaningful component treatments; responsive fitting remains code-owned; and Quote remains parked. Five focused inventory tests enforce complete, nonduplicated role ownership.

**Verified slice — Foundation typography inheritance** — Reader recipes now contain centralized UI, Reading, and Display Foundation family sources. Typography roles reference their assigned Foundation source by default; the compiler resolves those references through the same saved and live-draft path. Journal and Editorial preserve their prior output while using inherited Display families except for deliberate literal overrides such as Editorial Gallery detail and Question treatment and Journal Subtitle. The Foundation editor discloses how many assigned roles inherit or override each family and offers an explicit `Use across assigned roles` adoption action; every role Family selector states whether it inherits its assigned source or overrides it and can individually return to `Use Foundation`. Legacy fully materialized saved roles remain literal overrides during normalization rather than being silently reclassified. Twenty-five focused compiler, inventory, and Theme-overlay tests, touched-code lint, production typecheck, and live Theme-workbench verification pass.

**Verified slice — Shared Primary action** — One `controls.primaryAction` recipe now owns background, text, border, and hover treatment for genuine commit and proceed controls. Theme Management exposes it under Controls. Settings and Users actions, Theme Save, Reader quick-edit confirmation, Studio Tags actions, Studio Cards save/load-more, Media Edit confirmation, bulk tag Save, Gallery save actions, and Macro Tag Save consume the compiled Primary action variables. Selected navigation, selected filters, support controls, feedback-specific actions, Edit, Delete, resize handles, and media/lightbox controls remain intentionally separate. Legacy component-solid values provide the appearance-preserving default, while recipe changes do not mutate the excluded roles. Focused compiler and registry tests enforce that separation.

**Verified slice — Shared Reader Type chip** — One `controls.typeChip` recipe now owns the shared background, text, border, and hover identity of Type chips used by the Reader content grid, Explore More and Read More rails, opened-card context, and inline Gallery header. The recipe is directly available in Theme Management and no longer borrows generic support-control colors. Existing base, compact, and rail font size, padding, and placement variables remain context guardrails so a small rail chip is proportional to its tile without becoming a different semantic treatment. Card types inherit the same default recipe.

**Verified slice — Content Grid spacing** — One `treatments.contentGridGap` recipe now owns the space between Reader Content Grid tiles and is directly available as Content → Content Grid → Tile spacing in Theme Management. The author selects from the governed spacing scale; the default remains `spacing/sm`, preserving the prior appearance. Desktop and mobile grid gaps consume the compiled variable. The 300px desktop minimum, Guided tile-width limits, single-column mobile behavior, page padding, rail spacing, virtualization, and overflow protection remain fixed component safeguards.

**Verified slice — Question watermark scale** — `treatments.questionWatermarkOpacity` and bounded `treatments.questionWatermarkScale` now govern the no-cover Question watermark across the Content Grid, Reveal face, opened detail, destination rails, and Compose preview. The current 78% proportional scale remains the default and replaces viewport-specific preview sizing. Theme Management exposes both controls under Question. Scale is clamped to 50–90% at compilation; container-relative sizing, optical centering, prompt fitting, line clamps, and overflow protection remain fixed safeguards.

**Verified slice — State and Administration standardization** — The compiler and fallback theme now emit explicit `--admin-state-*` background, hover, border, and text aliases for success, error, warning, and information from the active Administration theme scope. Administration panels, grids, forms, filters, Studio status surfaces, Theme Management, and shared app feedback consume those aliases rather than global Reader-shaped state names. Undefined `--admin-feedback-warning-*` fallbacks and confirmed legacy error/danger/warning literals were removed. Black/white image action chrome, dimensional-tag colors, selected controls, and destructive-action semantics remain intentionally separate. Focused compiler and representative Administration component tests, touched-code lint, and production typecheck pass.

**Verified slice — Bypass and compatibility cleanup** — The compiler no longer appends legacy Journal or Editorial preset-alias blocks after governed recipe output; preset defaults are already materialized in recipe data, and authored values can no longer be silently overwritten merely because preset metadata remains active. Theme Management's Administration workbench chrome now consumes Administration Window, Support, and Chrome aliases, with a test-enforced boundary before explicit Reader preview CSS. Undefined text-on-accent and dimensional-color fallbacks were replaced by governed control-contrast and dimensional-tag variables. The automated contract inventory classifies two removed bypasses, two retained delivery-safety paths, and two retained intentional paths; no unclassified compatibility path remains in this slice. Focused compiler, inventory, Theme overlay, and representative Media tests, touched-code lint, and production typecheck pass.

**Verified slice — Workbench usability** — The active editor states its complete Foundation/Content, component, applicable variant, and attribute path. A dirty live draft shows a compact Unsaved changes status. Discard uses the shared confirmation system and names that it will restore the last saved Reader and Administration settings; Keep editing is the safe cancel. The existing component hierarchy, editor density, and Values disclosure remain unchanged. Thirty-six focused compiler, inventory, and Theme-overlay tests, touched-code lint, and production typecheck pass. The author verified the active path, harmless spacing edit, dirty status, shared Discard confirmation, and restoration of the saved SM spacing without saving the draft.

**Verified repair — preset save/switch ordering** — Saving a dirty current draft as part of `Save and switch` no longer refreshes the route before the requested preset is applied. This prevents the just-persisted old preset from reconciling over the new selection. Normal explicit Save retains its refresh behavior. Focused Theme tests, touched-component lint, and production typecheck pass; a safe live check confirmed Journal becomes the active unsaved preset and Discard restores the persisted Editorial theme without changing stored data.

**Verified repair — development save console error** — Theme saving no longer rewrites the compiled `theme-data.json` module while Turbopack is running. Firestore remains primary; development writes the secondary snapshot atomically to ignored `.next/theme-data.backup.json`, while production retains the fallback artifact path. Compiler canaries now follow the normalized saved recipe instead of assuming an obsolete Editorial covered-fade value. Twenty-three focused Theme compiler tests, touched-code lint, and production typecheck pass. Final live confirmation is the next ordinary Theme save; no additional data mutation was performed solely for verification.

**Gaps / slices** — None inside the Theme Standardization definition. Journal and Editorial package completion and full Light/Dark surface validation remain separately sequenced theme-package work.

### Journal

**Definition:** Gated — preserve the current Journal identity and evolve it into a warmer, coherent publishing theme rather than redesigning it. Light and Dark are two modes of one system and must use consistent semantic relationships. The landing/home page may supply reference examples for warmth, texture, typography, and surface treatment, but is not a template to copy.

- **Audit first** — Inventory serious semantic, contrast, and treatment inconsistencies between the current Light and Dark packages before discretionary visual tuning.
- **Light** — Complete the warmer Journal Light package without radical departure from its current identity.
- **Dark** — Complete Journal Dark as the same theme expressed for dark conditions, not as a separate visual system.
- **Coverage** — Validate all representative Reader surfaces and states on mobile and desktop after token-level corrections.

**Completed audit — initial shell and reading surfaces** — Live desktop comparison covered the Content Grid, Reader controls/sidebar, and an opened Story in both modes, supported by the saved token/recipe readback. Journal Light's warm-paper page and opened reading surface are coherent, but the secondary background scale reaches white, making the sidebar, closed cards, and support controls feel detached from the warm canvas. Journal Dark retains distinct brown levels and strong measured text contrast, but page, chrome, controls, and closed cards use the brown family so broadly that the Content Grid hierarchy becomes muddy. The opened Story is substantially more coherent in both modes and should anchor the package rather than be redesigned. A separate observed Dark-to-Light logo mismatch requires fresh-load reproduction before classification because the correct black Light asset exists and initial Light rendering was correct.

**Implemented slice — shell warmth and hierarchy** — Initial review proved that assigning the Sidebar to the canvas surface erased hierarchy while the former raised scale reached stark white. Journal Light now uses a deeper warm foundation whose raised surface remains tinted, and Sidebar and closed-card surfaces use that raised semantic level. Editorial remains unchanged. This separates chrome and tiles from the page without introducing white panels; Journal Dark retains its existing foundation. The no-cover Question watermark uses the shared brown Question/Type accent rather than neutral title gray. Focused compiler and Reader tests and touched-code lint pass; the updated preset still requires save and representative mobile/desktop author review.

**Verified slice — Journal chip contrast and Type consistency** — Author review of persisted Journal Light exposed three contract defects: dimensional chips used muted dark text over dark fills; covered Gallery Type badges overrode the shared Type recipe with strong-control styling; and the inherited field border produced a stark white outline. Journal now defines one warm principal Type treatment with light text and matching border, and every Reader tile/rail Type badge consumes it. Dimensional filled chips now compile from their dimensional recipe instead of the muted-tag text role and use Journal's light-on-fill value. The Journal shell and chip revision was saved through Theme Management; the development Turbopack console error did not recur. Thirty-eight focused compiler and Reader-tile tests, touched-code lint, and production typecheck pass. A clean server restart confirmed SSR emits the saved warm sidebar, principal Type background, and light dimensional-chip text tokens.

**Implemented repair — Reader Question and continuation consistency** — Actual dimensional chips now use their filled semantic colors without detail-only outlines or washed blends; empty disclosure slots retain their lighter empty treatment. Covered Questions use the standard closed title band and image-first opened identity, while no-cover opened Questions place Type and Tags on separate rows. Explore More destinations inherit the original safe feed or collection return destination across chained exploration. The mobile full editor exposes a visible Save label and continues to load the complete stored rich-text document; quick edit remains intentionally limited. Fifty-two focused Reader, editor, and compiler tests pass, and touched-code lint has no errors. Live author review of covered Questions and the updated saved Journal preset remains required.

### Editorial

**Definition:** Gated — preserve the publication-style identity while correcting semantic and contrast defects before discretionary tuning.

- **Light** — Complete the Editorial Light package.
- **Dark** — Complete the Editorial Dark package.
- **Coverage** — Validate all representative Reader surfaces and states on mobile and desktop.

**Implemented slice — Light chip, watermark, and Gallery-control contrast** — Editorial Type and Gallery `x/y` now consume the same Type-chip fill, text, and matching border so neither presents a contrasting outline. Question, Quote, and Callout watermark opacity is strengthened from the nearly invisible Light treatment to `0.3`; Question and Quote consume their own compiled watermark color and opacity roles across Reader and Compose preview. Open-Gallery navigation uses mode-aware input text on the existing Media Control surface, correcting the measured near-white-on-light-gray arrows without creating Gallery-only CSS. Forty-nine focused compiler, tile, detail, and preview tests pass; touched-code lint and diff checks pass. Reapply/save Editorial and complete Light/Dark author review before closeout.

---

## 3. Platform and commercial readiness

### Service Boundaries

**Definition:** Not gated

- **Cards** — Split `cardService` into explicit domain operations without duplicating integrity rules.
- **Themes** — Split `themeService` by schema, transformation, compilation, and persistence.

### Component Boundaries

**Definition:** Not gated

- **Studio** — Split `StudioWorkspace` coordination from domain and presentation work.
- **Media** — Split `MediaAdminContent` population, operations, and presentation responsibilities.
- **Forms** — Split `CardForm` by content, relationships, and presentation responsibilities.
- **Reader edit** — Extract reusable focused editing without depending on the full Studio form.

### Authorization

**Definition:** Not gated

- **Classification** — Centralize Reader and administrator route and mutation policy.
- **Sign-in** — Make `/login` the single authentication entry.
- **Callbacks** — Preserve safe return destinations and reject unsafe ones.
- **Enforcement** — Centralize authorization boundaries without weakening the completed disabled-account revocation contract.

### Legacy Retirement

**Definition:** Not gated

- **Routes** — Remove redirect-only administrative and compatibility routes after caller verification.
- **Loaders** — Remove duplicate data paths only after canonical ownership is proven.
- **Collections** — Determine whether `CollectionsAdminClient` remains required before refactoring or retirement.

### Search and Lists

**Definition:** Not gated

- **Fallback** — Define truthful degraded search behavior without Typesense.
- **Ordering** — Verify stable full-population filtering and chunk ordering.
- **Refresh** — Replace unnecessary full-catalog reloads with targeted reconciliation.

### Operations

**Definition:** Not gated

- **Backup** — Prove complete paired backup operation.
- **Restore** — Repeat restore drill against a disposable target.
- **Accounts** — Prove administrator and reader recovery procedures.
- **Release** — Establish release and rollback readiness.
- **Incident** — Prove incident-response and recovery steps.

### Engineering Quality

**Definition:** Not gated

- **Security** — Threat-model authorization, secrets, and hosted deployment.
- **Testing** — Expand workflow, integrity, commercial, and browser contract coverage.
- **Quality** — Perform application QA against selected capability gates.
- **Directory** — Remove obsolete structure only when ownership is proven.
- **Comments** — Add documentation only where code intent is not evident from names, types, tests, or contracts.
- **Strictness** — Continue bounded TypeScript, lint, API-envelope, and unused-dependency cleanup.

---

## Open questions

- **Landing audience** — Final public language for the initial customer.
- **Card suggestions** — Remaining role, if any, of the former Media-derived suggestion workflow.
- **Suggestion storage** — Per-media tag suggestions, face payloads, and retention beyond provisional clusters.
- **Left navigation** — Whether a messy-archive Studio entry is still desired. Created sort remains; partial-batch Reader Group was removed, and any future grouping requires archive-wide inventory and per-group pagination.
- **Brand assets** — Final Landing identity assets.

These questions remain open; they do not authorize implementation or imply priority.
