# IMPLEMENTATION

This document turns Planned capabilities in `02` and Planned constraints in `01` into sequenced, bounded implementation work.

**Current active capability:** Release Candidate author acceptance. Parts 1–3 and the agent-owned Release Candidate engineering gate have passed. The deployed v1 authoring baseline is revision `21145a19`; representative author desktop/mobile acceptance remains before the candidate is declared accepted. Landing Page, Quote and Quote-dependent typography, Video, External Photo Libraries, and discretionary Journal/Editorial tuning remain explicitly parked.

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

**Definition:** Reopened — integrated mutation contract approved
**Execution:** Partial — ordinary workflows verified; hierarchy-wide reconciliation incomplete

**Outcome** — The author can reliably find, filter, assign, edit, and normalize a hierarchical vocabulary without stale presentation, lost assignments, silent reinterpretation, or routine repair scripts. Who preserves stable identities, author-controlled branches, nested names, and optional family-tree facts without making perspective-relative roles assignment truth.

**Actors** — Author, Reader, and system operator.

**Includes** — Tag modal, lookup, filter ownership and scope, save reconciliation, hierarchy authority, identities and nested names, optional family-tree facts, reviewed migration, Card and Media inheritance, subjects, completeness, projection rebuild, and verification.

**Excludes** — Face recognition, a full genealogy platform or interchange standard, multi-tenant perspectives, full What/When/Where semantic redesign, automatic name-based conversion, legacy-tag deletion without verification, marketing, and Quote.

**Contracts** — Firestore remains authoritative; `parentId` owns hierarchy; projections reconcile to it; each named Who subject has one stable identity; nested names preserve specificity; parent/partner facts support a family tree without rewriting authored truth; existing assignments remain authoritative until reviewed; ambiguous conversions remain unresolved; bulk work is bounded and recoverable.

**Current state** — The archive contains 651 tags, 1,281 Cards, 3,503 Media records, and 270 Questions. Shared modal ownership, lookup, scoped filters, assignment, subjects, Any/All filtering, hierarchy display, child creation, governed rename/reparent/remove/merge, and Card completeness filtering are implemented. Canonical Who tags own identity; optional compatibility profiles and parent/partner controls use the same IDs without becoming a second visible People system. The integrated mutation owner reconciles paths, assignments, subjects, projections, completeness, counts, and both search indexes. The author-reviewed cleanup restored nine named people to Friends and removed nine obsolete role/group nodes after strict reconciliation and full reference verification.

**Gaps / slices** — Identity merge/split and import-variant consolidation remain undefined. Compatibility-profile retirement remains gated by zero-live-reference proof. Face assistance remains later work and requires recoverable identity correction first.

**Dependencies** — Valid administrator access, paired backup capability, Firestore and Typesense access, current tag/card/media/question catalogs, and browser verification.

**Risks** — Incorrect identity merges, lost historical names, perspective errors, count drift, stale search projections, partial migration, and unintended Reader-filter changes.

**Decisions needed** — None for the completed hierarchy mutation and vocabulary-cleanup slice. Merge/split product behavior requires a later bounded decision.

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

- **Duplicates (parked)** — Source-byte evidence is stored for 3,064 of 3,503 Media records with 3,062 uncontested identity-registry entries. Studio Media exposes identical-source-byte evidence as an ordinary All Matches / Matches / No Matches Library filter; the author may use standard reference-aware deletion without entering a separate review queue. The sole exact pair's prior Deferred decision remains preserved and unregistered. The remaining 439 records are explicitly assessed as 101 missing local originals and 338 sources whose original bytes were not retained. Paired backup `run-2026-07-17T20-58-32-604Z`, guarded apply, rollback support, and a full post-apply audit prove zero overlap, invalid assessments, or unclassified records. Likely-match discovery and automatic same-asset reconciliation remain parked.
- **Pile merge (retired UI)** — The previously verified backend remains dormant for historical compatibility; Piles are no longer part of the active Media journey.
- **Bursts (parked)** — Resume only after import persists reliable original capture time and source-sequence evidence. Current `createdAt` is import time, and the optional EXIF path does not retain `DateTimeOriginal`; filenames or import proximity cannot truthfully authorize burst proposals.
- **Derivatives (complete)** — Canonical source persistence, orientation correction, Studio and Reader WebP renditions, readiness/retry, and surface-specific URL selection already cover supported image formats. HEIC decoding is not available in the current image runtime and remains a future external-source ingestion concern rather than a parallel converter.

#### Pile Merge

**Definition:** Superseded
**Execution:** Retired from active UI; verified backend retained dormant

**Outcome** — The author can combine two pending story piles as one deliberate operation without moving members individually or changing confirmed archive truth.

**Actors** — Author and administrator.

**Includes** — A Merge action on pending pile headers; destination-pile selection; a confirmation naming both piles and their photo counts; one transactional service operation; destination-first deduplicated membership; preservation of the destination title and suggested tags; a durable merged-source audit record; refresh and focused feedback; authorization, service, route, component, and browser verification.

**Excludes** — Merging accepted, dismissed, merged, or missing piles; transferring or applying source suggested tags; changing confirmed Media tags; changing cards, Media records, Storage objects, stacks, imports, pile generation, or individual membership controls; automatic title selection; multi-pile merge; and UI Undo.

**Contracts** — Source and destination must be distinct pending piles when the transaction commits. The destination survives with its title and suggested tags unchanged. Its existing member order remains first; source members append in source order with duplicates removed. The source becomes `merged`, records the destination ID, retains its prior metadata and members for audit/recovery evidence, and no longer appears in pending views. Confirmed Media tags remain untouched. A conflict or failed transaction makes no partial change. Recovery from the retained audit record is operational; UI Undo requires a separate gate because later membership edits can make automatic reversal ambiguous.

**Current state** — The verified transaction and historical records remain available for recovery compatibility, but the Pile overlay and Merge action are no longer reachable from the active Media interface. No production cluster data was deleted during retirement.

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
**Execution:** Verified

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
**Execution:** Verified

**Outcome** — The author can change meaningful global, shared-system, component, and layout decisions from centralized controls whose inheritance and affected surfaces are predictable, while the application retains responsive, accessibility, and integrity guardrails.

**Actors** — Author-administrator and viewing reader.

**Includes** — Foundation typography, palette, spacing, radius, shadow, and density; shared action, field, selected, destructive, feedback, tag, Type-chip, caption, and media-control recipes; component and variant overrides; meaningful macro layout controls; visible inheritance and scope; Reader and Administration role enforcement; compiler/editor/runtime parity; and removal or explicit containment of confirmed bypasses and compatibility paths.

**Excludes** — Final Journal and Editorial visual tuning and coverage; new named theme packages; raw CSS editing; exposing responsive calculations or accessibility minima as arbitrary controls; unrelated Reader or Administration redesign; Quote-dependent typography; per-reader package selection before Journal and Editorial are complete; and the later service-boundary split of `themeService`.

**Contracts** — The technical path is values → semantics → recipes → surfaces. The authoring cascade is Foundation → Shared system → Component → Variant; lower levels inherit unless an intentional override is visible. Every author control states scope and affected surfaces. Reader and Administration share architecture but retain their product boundaries. Theme input expresses visual intent; code retains breakpoints, fitting, minimum readability, touch targets, overflow prevention, and contrast enforcement. Save persists, Discard restores, and unsaved switching cannot silently save or lose work.

**Dependencies** — Structured theme data, Reader recipe registry, Theme workspace, compiler and draft compiler, scoped persistence, runtime injection, component CSS consumption, current Journal/Editorial foundations, completed Reader Experience surfaces, and shared feedback/dialog infrastructure.

**Risks** — Mistaking token existence for usable author control; broad changes with undisclosed impact; component overrides that sever inheritance; exposing unsafe geometry; replacing intentional overlays or accessibility values during literal cleanup; destabilizing saved themes through compatibility removal; and expanding the workbench before its underlying contract is reliable.

**Decisions** — Preserve the existing design-token architecture rather than rebuild it. Strengthen the product contract around centralized macro controls, visible inheritance, predictable impact, and fixed guardrails. Administration receives one coherent v1 presentation rather than Journal/Editorial personalities. Journal and Editorial remain later validation capabilities built on this standardized contract.

**Evidence required** — Automated binding and compile-path inventory; classified macro-control and bypass inventory; focused compiler, editor, persistence, and component tests; production typecheck; desktop and mobile live-draft validation on representative Reader and Administration surfaces; Journal/Editorial Light/Dark compilation canaries; and canon reconciliation.

**Verified slice — Definition and enforcement inventory** — The approved author-control hierarchy is now explicit: Foundation, Shared system, Component, Variant, and fixed Guardrail layers. A read-only automated inventory validates all 111 registered Reader component attributes across 13 components and 24 variants against governed recipe paths with zero unresolved bindings. It separately tracks five macro controls that token resolution alone could not prove complete: global font inheritance disclosure, Primary action controls, the shared Reader Type chip, Content Grid spacing, and Question watermark scale. All five are now governed. Responsive fitting and accessibility remain intentionally fixed guardrails. The audit is available through `npm run audit:theme-contract`.

**Verified slice — Typography semantic ownership** — All 38 current Reader typography recipes are assigned exactly once to a Foundation, Shared system, Component, or Guardrail decision. The assessment preserves distinct publishing jobs and component override slots while rejecting card type alone as a reason for separate defaults. It confirms that the present recipe data is fully materialized rather than explicitly inherited: hiding a Family field for four support roles does not establish a cascade. Foundation therefore needs centralized UI, reading, and display family sources; shared title, prose, UI, feedback, and discovery roles need explicit inheritance; Story and Gallery roles remain available as intentional context overrides; Question and Callout retain meaningful component treatments; responsive fitting remains code-owned; and Quote remains parked. Five focused inventory tests enforce complete, nonduplicated role ownership.

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

**Execution:** Verified at the defined capability level. A specific release revision still requires the Operations release checklist after intentional commit and push.

### Service Boundaries

**Definition:** Ready
**Execution:** Verified

**Outcome** — Card and Theme services have explicit, testable ownership boundaries so routine changes can be made without reopening unrelated integrity-sensitive code or duplicating business rules.

**Actors** — Author, administrator, Reader, operator, and developer-maintainer.

**Includes** — Cards read/hydration, query, mutation orchestration, focused mutation domains, hierarchy, media relationships, tag reconciliation, deletion/duplication, and search synchronization boundaries; later Theme schema, normalization, compilation, draft, and persistence boundaries; stable public service entry points during migration; focused regression coverage.

**Excludes** — Product behavior changes, Card schema redesign, Firestore collection migration, search replacement, authorization redesign, new Reader or Studio features, speculative generic repository frameworks, and simultaneous Card/Theme extraction.

**Contracts** — Firestore remains authoritative. Tag counts and derived dimensions, media `referencedByCardIds`, curated hierarchy and cycle protection, Question-backed Q&A integrity, Gallery inheritance, Typesense projections, published visibility, and Reader hydration truth must not change. One operation owns each invariant; extraction must move an existing rule rather than copy it. Public API behavior and error semantics remain stable while callers migrate.

**Current state** — Cards now use explicit domain owners under `services/cards`: read and hydration; list and archive queries; shared mutation integrity and support; focused metadata, content, tag, status, cover, Gallery, and hierarchy mutations; lifecycle and media lifecycle; bulk tags; and broad-update orchestration. Production callers and tests import those owners directly, and the temporary `cardService.ts` compatibility facade has been removed. Shared hierarchy reconciliation now detaches reassigned children from former parents and clears legacy root projections through the same owner used by focused and broad updates.

**Gaps / slices** —

1. **Card reads and hydration** — Complete.
2. **Card mutation foundation** — Complete.
3. **Focused mutation domains** — Complete.
4. **Lifecycle and bulk operations** — Complete.
5. **Compatibility facade retirement** — Complete. All production and test imports migrated and `cardService.ts` was removed.
6. **Theme service gate** — Complete. Schema/document normalization, CSS compilation/scoped delivery, and persistence/fallback loading have explicit owners; callers migrated and the compatibility service was retired.

**Dependencies** — Current Card, Media, Tag, Question, Gallery inheritance, curated-tree, Typesense, and authorization contracts; route and emulator tests; representative Reader and Studio browser workflows; stable Firestore test fixtures.

**Risks** — Circular service imports; copied transaction logic; post-commit search sync being skipped or duplicated; changes to hydration cost or Gallery completeness; lost media backreferences; tag-count or derived-field drift; hierarchy cycles; Question/Card unlink errors; and a compatibility facade becoming permanent.

**Decisions needed** — None for the first slice. Preserve behavior and use domain-oriented modules with a temporary compatibility facade. Do not introduce a generic repository abstraction unless later evidence shows repeated storage mechanics with identical integrity semantics.

**Completion evidence** — Import-boundary inventory; focused unit, API, integrity, and emulator tests; production typecheck and build; read-only data audits where mutations are moved; browser verification of representative Studio create/edit/delete and Reader list/detail/Gallery behavior; no unexplained tag, media-reference, hierarchy, Question-link, or Typesense drift; canon reconciliation.

**Verified slice — Card media and hydration ownership** — Card media-ID collection, hydrated Gallery-item stripping, media loading and public-URL application, media-derived dimension signals, focal-point fallback, complete Card hydration, Admin cover-only hydration, Reader feed hydration, and first-Gallery-slide fallback now have one owner in `services/cards/cardMediaHydrationService`. The existing `cardService` facade imports that domain for both reads and integrity-sensitive mutations, so the extraction moves rather than duplicates media-signal and hydration rules. Public routes and callers are unchanged. Production typecheck, touched-code lint, eighteen focused Reader/search/media-reference tests, and live Freeform verification pass; the live feed rendered 48 images with zero broken assets and preserved complete Gallery counts including 1/12, 1/8, 1/7, 1/6, 1/5, and 1/3 examples.

**Verified slice — Card identity and collection reads** — Single-Card reads, ordered multi-ID reads with Firestore-safe chunking, hydration-mode selection, direct-child feed expansion, ID-list pagination, and collection-child pagination now have one owner in `services/cards/cardReadService`. `cardService` imports and re-exports the same functions and types as a compatibility facade, so API routes, Reader server pages, imports, scripts, and tests do not change call contracts. Production typecheck and touched-code lint pass. One hundred fifty-four focused Reader access, Card search, and administrator-access tests pass; the runner's pre-existing open-handle behavior required bounded `--forceExit` execution after the first combined run was terminated. Live Freeform detail verification loaded the 12-image `Wedding` Gallery as 13 total page images including app chrome, with Explore More present and zero broken images.

**Verified slice — Archive and supporting Card queries** — Archive-wide seeded Random selection and curated-root/descendant collection queries now have one owner in `services/cards/cardArchiveQueryService`; imported-folder lookup, legacy tag search, and parent-by-child safety lookup join the identity and collection operations in `cardReadService`. Random still ranks the complete filtered ID universe before pagination, exact dimensions remain direct-tag checks, collection traversal remains cycle-safe through queued-ID deduplication, and all hydration modes use the extracted hydration owner. `cardService` remains the compatibility facade. Production typecheck, lint, and twenty-one focused Reader/search/import tests pass. The full filtered/sorted `getCards` operation remains the final read-side extraction because its Firestore cursor, projection ordering, oversampling, and legacy-title fallback must move as one unit.

**Verified slice — Filtered and sorted Card queries** — The complete `getCards` operation now belongs to `services/cards/cardListQueryService`, preserving Firestore cursor behavior, projection ordering, oversampling, Random handling, hydration, and legacy-title fallback as one extraction.

**Verified slice — Card mutation domains** — Shared retry, transaction support, search projection, media-reference integrity, and QA validation now have single owners. Focused metadata, content, tag, status, cover, Gallery, and hierarchy operations consume that foundation. Emulator execution exposed and verified a hierarchy invariant repair: assigning a child now removes it from former parents and clears obsolete root projections in both focused and broad mutation paths.

**Verified slice — Lifecycle, bulk operations, and facade retirement** — Create, Question-backed create, duplicate, delete, media cleanup, and bulk-tag operations now have explicit domain owners. Routes, Reader/Studio callers, import helpers, scripts, Gallery inheritance, provisional clustering, and tests import those owners directly; no `services/cardService` imports remain and the facade is removed. Production typecheck and touched-code lint pass. Eight focused Jest suites pass 183 tests. Firestore emulator verification passes 23 tests across Card integrity and Question-backed lifecycle behavior. Read-only audits found all 1,281 Card content/media projections synchronized and no subject-contract conflicts. The media-reference audit identified only pre-existing references attached to the existing draft `The Bond Coats of Arms`; no repair was performed. The production build reached Next compilation but could not fetch Google Fonts because this environment routes external requests to the unavailable proxy at `127.0.0.1:9`. Browser automation was attempted against the running local app, but the in-app browser bridge rejected its own claimed tabs as outside the active session; prior verified Reader behavior remains recorded above, and no new live UI result is claimed for this final slice.

**Verified definition gate — Theme service boundaries** — The present server-only `themeService.ts` is 1,666 lines and combines four distinct responsibilities: legacy/scoped document normalization, CSS token compilation and scope wrapping, Firestore plus JSON fallback reads, and Firestore-first save with atomic backup. The public caller surface is small: Root layout consumes resolved documents and compiled CSS; Theme APIs consume document validation, normalization, draft compilation, reads, and saves; the seed script consumes JSON-to-Firestore synchronization. `readerThemeSystem`, `themePresets`, and `types/theme` already own recipes, presets, and schema types and will remain inputs rather than being folded into the service split. Extraction order is document normalization, compiler/draft CSS, persistence/fallback loading, then direct caller migration and facade retirement. The save ordering, development `.next` backup safety, legacy flat-document compatibility, scoped Reader/Admin behavior, and exact generated CSS remain invariant. No new visual semantics or Theme Management controls are included.

**Verified slice — Theme service boundaries** — Theme document validation, legacy normalization, scoped resolution, and persisted-shape conversion now belong to `services/theme/themeDocumentService`; token compilation and scoped draft CSS belong to `themeCssCompiler`; Firestore/JSON resolution, Firestore-first save, atomic backup, and seed synchronization belong to `themePersistenceService`. Root layout, Theme APIs, tests, seed tooling, and the tracked root diagnostic script import those owners directly; `themeService.ts` and all legacy imports are removed. Production typecheck, touched-code lint, and the full production build pass. Three focused suites pass 166 tests, including new canaries proving Firestore precedes backup, backup failure does not hide a successful Firestore save, and JSON fallback remains normalized. A production Reader smoke test rendered Guided and Freeform, injected 91,626 bytes of scoped Reader/Admin Theme CSS, and produced no console errors. Theme Admin navigation later stalled in the browser bridge, so no interactive save result is claimed; save behavior is verified at the persistence boundary.

### Component Boundaries

**Definition:** Ready
**Execution:** Verified

**Outcome** — Studio and Reader components coordinate explicit subsystems instead of owning layout mechanics, data operations, domain workflows, and presentation in the same component.

**Current state** — The initial inventory measured `StudioWorkspace` at 1,548 lines, `MediaAdminContent` at 1,554, and `CardForm` at 1,732, with Reader desktop editing also depending on Studio context and layout CSS. The implemented boundaries now leave `StudioWorkspace` as a 736-line shell coordinator, place pane and selected-Card state behind tested controllers, place destructive and stack Media operations behind Media hooks while existing grid/browse/organize components retain presentation, move Story Assist into its own CardForm subsystem, and route both Studio and Reader through a neutral authoring-surface contract. Reader no longer imports Studio context or Studio layout CSS, and CardForm no longer reads `StudioShellContext`.

**Gaps / slices** —

1. **Studio layout boundary** — Move pane sizing math, resize mechanics, and persisted layout preferences behind a tested layout owner so `StudioWorkspace` retains orchestration rather than DOM layout policy.
2. **Studio selection and action boundary** — Move selected-Card loading/cache, optimistic patching, and lifecycle synchronization behind one controller while preserving SWR and collection synchronization.
3. **Media workspace boundary** — Separate population/filter derivation and media operations from browse/exact/organize presentation; preserve imports, stacks, provisional piles, and assigned-media reconciliation.
4. **Card form boundary** — Separate draft/persistence orchestration, media relationships, and Story Assist from field-section presentation without changing focused endpoint ownership.
5. **Reader edit boundary** — Reuse the focused editing contract without importing the Studio shell or its layout CSS. Preserve the existing mobile quick/full-editor escalation and obtain author input only if the supported desktop field set cannot be derived from the existing contract.

**Dependencies** — Existing Studio shell contexts and imperative registry, stored layout preferences, Card/Media providers, focused Card endpoints, drag/drop contracts, Reader patch reconciliation, and current component tests.

**Risks** — Hidden imperative registration order; stale optimistic caches; resize regressions; duplicated media population state; CardForm dirty-baseline loss; Reader save/close actions becoming unreachable; and accidental reduction of current editing capability.

**Decisions needed** — None for the Studio layout slice. Preserve current dimensions and persistence behavior. Reader desktop field scope may require a later author decision only if the existing focused contract and extracted form sections do not settle it.

**Completion evidence** — Direct import inventory, focused component and utility tests, production typecheck/build, representative wide/narrow Studio pane behavior, Card selection/edit/delete synchronization, Media browse/organize behavior, Reader quick/full editing, and canon reconciliation.

**Verified slice — Studio layout and selected-Card ownership** — Pane minimums, reset widths, sibling reservations, clamping, rendered-width fallback, and DOM width application belong to `studioPaneLayout`. `useStudioPaneLayout` owns preference hydration and persistence, responsive wide mode, resize observation, pane visibility, and pointer resize sessions. Optimistic relationship cloning, SWR cache removal, assigned-media collection, and media-role projection belong to `studioCardSelectionModel`; `useStudioSelectedCard` owns selection, preview/detail loading, LRU cache, optimistic patch/rollback, reconciliation, upsert, and eviction. `StudioWorkspace` is reduced from 1,548 to 736 lines and retains shell orchestration, relationship drag, deletion, and context composition. Ten focused tests, touched-code lint, and production typecheck pass.

**Verified slice — Media operations ownership** — `useMediaBulkActions` owns authoritative delete-consequence verification, modal state, deletion, and active-Card refresh. `useMediaStackActions` owns stack eligibility, expansion, creation, unstacking, refresh, feedback, and selection cleanup. `MediaAdminContent` coordinates those controllers with the already-separated grid, grouped browse, exact review, organize strip, and Story Piles overlay presentations. Thirteen focused Media tests, touched-code lint, and production typecheck pass.

**Verified slice — CardForm and Reader authoring boundaries** — `CardStoryAssist` owns Story Assist guide preference, request lifecycle, results, coaching, application, and its presentation, reducing `CardForm` from 1,732 to 1,433 lines. Draft and persistence state remain with the existing `CardFormProvider`; Gallery and children presentations remain with their existing focused components. `CardFormSurfaceContext` is the neutral capability contract for compact authoring, optional Studio relationship DnD, active-Card refresh, and Media editing. Studio supplies those optional operations; Reader supplies only compact presentation. CardForm no longer imports `StudioShellContext`. Reader title/actions, dirty-leave confirmation, discard, save, duplicate, delete, and baseline synchronization live in `ReaderCardEditChrome`, and Reader owns its modal CSS. Thirteen focused CardForm/Reader suites pass, touched-code lint and production typecheck pass.

**Completion evidence** — Production typecheck, touched-code lint, diff checks, and the full production build pass. Thirty-six focused Studio, Media, CardForm, and Reader tests pass. Live browser verification on the rebuilt development server confirmed Studio pane collapse/restore, Media Browse/Exact mode switching and restoration, Card selection loading the expected Gallery into Compose, and Reader full-editor loading the same Card with Save, Duplicate, and Close controls reachable; closing returned to the Reader detail without a console error. Component Boundaries passed its Completion Gate.

### Authorization

**Definition:** Ready

**Execution:** Verified

**Outcome** — Every protected page and API classifies the same refreshed account-backed session through one revocation-aware policy, while `/login` is the sole authentication entry and successful sign-in returns only to a safe internal destination.

**Actors** — Anonymous visitor, reader, administrator, and operator.

**Includes** — Active-session and administrator-session classification; protected Reader, Account, and Administration page enforcement; authenticated-reader and administrator API enforcement; `/login` as NextAuth and application sign-in entry; one callback sanitizer for client and server return paths; preservation of the complete API access inventory and disabled-account revocation behavior.

**Excludes** — Public registration; invitations; password recovery; role promotion; account deletion; multi-administrator redesign; tenancy; sharing; permission tiers beyond administrator and reader; UI redesign; database-session migration; and changes to published-content visibility.

**Contracts** — `journal_users` remains account truth. A missing, disabled, or unreadable account fails closed on the next server-backed session read. Raw JWT role possession is insufficient. `isAuthenticatedSession` and `isAdminSession` own active-session classification; protected pages and APIs consume those policies rather than restating role checks. Anonymous Reader requests authenticate through `/login`; administrators retain server-enforced mutation boundaries. Callback destinations must begin with one `/`, reject protocol-relative and external values, preserve safe internal query context, and fall back to `/view`.

**Current state** — Credential authorization and JWT/session refresh validate `journal_users` on every server-backed session read, clear stale roles, and mark revoked access. Reader access helpers reject revoked sessions, and the API route inventory classifies all public-auth, authenticated-reader, and administrator routes. NextAuth points sign-in to `/login`; client and server return paths share one internal callback sanitizer; protected server pages and API routes consume the revocation-aware policy owner rather than restating role checks.

**Gaps / slices** —

1. **Classification owner — Complete** — Shared active-session and administrator-session policy is the only role classification used by protected server surfaces.
2. **Sign-in owner — Complete** — NextAuth and protected-page redirects use `/login` while the public `/` landing page remains public.
3. **Callback owner — Complete** — Safe internal callback normalization is shared and covers malicious, malformed, and valid contextual returns.
4. **Boundary migration — Complete** — Repeated raw server role checks were replaced without changing route status or response contracts.
5. **Audit and close — Complete** — The declared API inventory, revoked-session behavior, safe return paths, Reader visibility, and administrator mutation rejection are covered by focused boundary tests.

**Dependencies** — NextAuth credential, JWT, and session callbacks; `journal_users`; `readerAccess`; protected pages; API route envelope and route audit; login form; navigation; existing User Management revocation tests; route-boundary tests; and browser verification.

**Risks** — Redirect loops; authenticated users returning to `/`; unsafe external callbacks; a revoked token retaining administrator capability; anonymous status-code drift; Reader APIs becoming administrator-only; or client role presentation being mistaken for enforcement.

**Decisions needed** — None. Canon already fixes `/login` as the single authentication entry, `/view` as the fallback, one administrator/reader role model, server-side enforcement, and immediate account-truth revalidation.

**Completion evidence** — Direct authorization-consumer inventory; focused callback, credential, revocation, page, API-envelope, and full route-boundary tests; production typecheck/build; anonymous `/login` redirects with preserved safe callbacks; authenticated Reader access without Administration; active administrator access; and canon reconciliation.

**Verified evidence** — The authorization consumer inventory leaves raw role comparison only in the policy owner and client-side control presentation; server enforcement uses `isAuthenticatedSession` / `isAdminSession`. Shared callback tests cover safe contextual, external, protocol-relative, relative, empty, and missing destinations. The focused authorization and route-boundary run passes 155 tests, touched-route lint passes, production typecheck passes, and the production build compiles, validates types, and generates all 51 static pages. The local post-build HTTP probe timed out because the pre-existing development listener stopped responding; it is not counted as completion evidence.

### Legacy Retirement

**Definition:** Ready

**Execution:** Verified

**Outcome** — Retire only compatibility code whose canonical replacement and zero-caller state are proven; retain intentional entry-point redirects and active domain owners.

**Includes** — Redirect-only administrative and compatibility route inventory; removed Card and Theme service-facade verification; loader ownership inventory; and direct caller proof for `CollectionsAdminClient`.

**Excludes** — Stored-data migrations; legacy-field deletion; removal of bookmarked compatibility URLs; redesign of Studio Collections; speculative directory cleanup; and deletion based only on names containing legacy or compatibility.

**Contracts** — Compatibility redirects may remain when they provide a stable external entry into one canonical implementation. A loader or facade may be removed only after all production callers use the canonical owner. An apparently old component remains required when it is embedded in a live capability.

**Verified assessment** — `/admin` canonically enters Studio, `/settings` canonically enters Account, and `next.config.ts` maps former administrative paths to the single Studio implementation; none owns duplicate page behavior. The temporary `cardService.ts` and `themeService.ts` facades were already removed during Service Boundaries, and production callers import the focused Card and Theme owners directly. `CollectionsAdminClient` is actively embedded by `StudioWorkspace`, supplies the current Collections tree surface, and shares its styles and embedded-bank context with active Studio components; it must not be retired or refactored under a cleanup label.

**Completion evidence** — Direct route, import, tracked-file, and component-caller inventories; successful production typecheck/build after the already-completed facade removals; and an explicit retain/remove disposition for every item named by this gate. No additional code deletion is justified.

### Search and Lists

**Definition:** Ready

**Execution:** Verified

**Outcome** — Search and paginated lists remain truthful, deterministically ordered, and locally reconciled when full-text infrastructure is unavailable or records change.

**Includes** — Authenticated Card search through Typesense; automatic Firestore title-prefix fallback when Typesense is unconfigured or unavailable; explicit degraded-mode response and Reader notice; stable Firestore tie-break ordering; requested-order reconstruction across Firestore ID chunks; and field-scoped Reader list reconciliation.

**Excludes** — A second full-text engine; fuzzy or semantic Firestore search; Typesense deployment; search analytics; archive grouping; and changing the approved Reader sort choices.

**Contracts** — Full-text search returns Typesense relevance/order hydrated in the same requested ID order. Degraded search is title-prefix only and says so rather than failing or presenting itself as equivalent. Readers see published Cards only; administrators may search all statuses. Firestore list sorts end in deterministic document-ID ordering. Saved Reader Cards patch visible cache records immediately and revalidate only when changed fields can alter membership, ordering, or search results.

**Verified assessment** — `getCardsByIds` reconstructs caller order after Firestore-safe 30-ID chunks. Card list queries use stable field and document-ID ordering, and post-filter pages carry the raw query cursor forward. Reader reconciliation distinguishes no revalidation, search-only revalidation, and all-list revalidation. The search route now catches configured Typesense failure and uses the same Firestore title-prefix path used when Typesense is absent; its response identifies `full-text` versus `title-prefix`, and the Search page displays a restrained degraded notice.

**Completion evidence** — Twenty-four focused route and reconciliation tests pass, including administrator/reader scope, configured full-text search, unconfigured fallback, runtime-failure fallback, and field-based cache reconciliation. Touched-code lint and production typecheck pass. Existing Service Boundaries evidence covers deterministic chunk reconstruction and production build integration.

### Operations

**Definition:** Ready

**Execution:** Verified

**Outcome** — An operator can identify a complete recovery point, restore authoritative data and media safely, recover account access, and follow explicit release, rollback, and incident procedures without treating partial work as success.

**Includes** — Paired Firestore and Storage backup manifests and status; guarded paired restore to a disposable project; administrator and reader password/access recovery; total-administrator-lockout recovery; release and rollback checklist; incident classes and containment/recovery sequence; and CI/build/integrity evidence requirements.

**Excludes** — Automatic hosted-runtime backups; automatic production rollback; destructive production restore; automatic secret rotation; a second backup provider; and certification of an arbitrary dirty worktree as a release candidate.

**Contracts** — A complete backup contains `run-manifest.json`, `firestore.json`, `storage-manifest.json`, and Storage bytes from one run. Restore defaults to dry-run, blocks the production project, and requires exact disposable-project confirmation for apply. Account recovery never accepts a replacement password as a CLI argument. Release requires a known pushed rollback revision, complete backup, environment verification, build/lint/tests/CI, and working administrator and reader accounts. Incidents preserve evidence, contain access or mutation first, recover from authoritative sources, and verify before reopening.

**Verified evidence** — Complete paired run `run-2026-07-17T20-58-32-604Z` is readable with 8,938 Firestore documents across 11 collections and 10,639 Storage objects; its manifest reports `complete: true`. A current paired dry run against `my-journal-restore-drill` validated both Firestore and Storage legs, detected the target's existing collections, printed the post-restore index/rules/Typesense/build checklist, and made zero writes. The prior disposable-target apply drill remains recorded in `docs/NPM-SCRIPTS.md`. Backup-status and restore safety tests pass. In-app User Management covers ordinary reader/admin password and enablement recovery; `recover:journal-admin` now provides dry-run-by-default total-lockout recovery with exact administrator lookup, environment-only replacement password, 12-character minimum, exact project confirmation, and re-enable behavior. The release and incident runbooks enumerate rollback, failed import, missing media, access leak, and backup/restore failure paths; the PR gate runs lint, build, unit/integrity tests, and hosted authenticated Playwright smoke.

**Release distinction** — This gate verifies the operating system and procedures. A specific release revision is ready only after its worktree is intentionally committed, pushed, backed up, and passes the release checklist on that exact revision.

### Engineering Quality

**Definition:** Ready

**Execution:** Verified

**Outcome** — Part 3 closes with explicit security boundaries, broad automated evidence, no speculative structural churn, and a visible distinction between remediated dependency risk and later platform migrations.

**Includes** — Authorization, secret-file, hosted-response, and dependency threat assessment; route and workflow integrity coverage; complete unit/integrity execution; production typecheck, lint, and build; confirmed obsolete-service removal; and bounded dependency remediation.

**Excludes** — Warning-zero cleanup; arbitrary comments; broad folder renaming; forced major framework upgrades; Content Security Policy without a complete resource inventory; and claiming browser evidence when the local process does not respond.

**Security assessment** — No environment, service-account, private-key, or Firebase administrator credential file is tracked by Git. Server authorization consumes refreshed Firestore account truth and rejects disabled or missing users. Safe internal return paths reject external and protocol-relative callbacks. The invalid global wildcard-plus-credentials API CORS grant was removed; all routes now receive `nosniff`, strict-origin referrer, frame-denial, and bounded camera/microphone/geolocation/browsing-topic policies. A CSP remains a separate hosted-deployment slice because Google Fonts, Firebase media, TipTap content, and Sentry must be inventoried and validated together.

**Dependency assessment** — Compatible upgrades moved Swiper 11 to patched 12.1.2, Typesense to 3.0.6, NextAuth to 4.24.14, and ExifTool to 35.21.0. Minimum patched overrides constrain `protobufjs`, `websocket-driver`, `@grpc/grpc-js`, and `fast-xml-builder`. Production audit critical findings fell from three to zero and total production findings from 28 to 18. Remaining direct findings are Next, NextAuth, and Firebase Admin or transitive packages inside those platforms; their available remedies require bounded major migrations and are not force-applied under cleanup.

**Structure and strictness assessment** — Card and Theme compatibility facades are removed and have zero imports. `CollectionsAdminClient`, compatibility redirects, and shared Studio collection styles are proven live and retained. Production typecheck passes. Full lint reports zero errors and 23 warnings; warnings are recorded rather than mechanically changed because they include intentional test images, existing hook-dependency questions, and unrelated unused values that require owner-level review.

**Completion evidence** — The complete Jest run passes 156 suites and 853 tests, with three emulator-only suites and 23 tests skipped in the non-emulator run. Post-upgrade Gallery, rail, Reader tile, search, auth, Firebase Admin, and hosted-security tests pass 46 cases. Production typecheck and lint pass. The final production build wrote a new `BUILD_ID` and build manifest after compiling the upgraded dependency graph. Live `/login` and `/view` responses returned the new security headers; the subsequent local `/admin/studio` probe timed out and is not claimed as browser evidence. Earlier Component Boundaries Studio verification and the 159-case focused administrator/reader boundary run remain the relevant interaction and enforcement evidence.

**Deferred platform migrations** — Upgrade Next, Auth.js, Firebase Admin/Firebase client, and their remaining transport/markdown dependency trees as separately gated migrations with changelog review, focused compatibility tests, full build, and hosted smoke. Add CSP only after the hosted resource inventory is explicit. These are visible future security maintenance, not incomplete hidden work inside this bounded gate.

---

## 4. Stabilization and deferred plan

The active objective is to stabilize the product as implemented, establish one recoverable release candidate, and then let the author concentrate on archive content. This phase does not add new product capability. The controlling execution order is **3. State Communication → 2. Media Intake and Tagging stabilization → 1. Release Candidate**. Items 4–8 are deferred and do not become active merely because they remain documented.

### 1. Release Candidate

**Definition:** Agent-owned engineering gate complete; author acceptance pending

**Outcome** — Convert the accumulated verified work into one known, recoverable, deployed revision and establish the trustworthy v1 baseline from which later product work proceeds.

**Includes** — Intentional worktree review; commit and push; paired backup; exact-revision lint, typecheck, tests, build, CI, deployment, hosted administrator/reader smoke, desktop/mobile validation, rollback revision, and release record.

**Excludes** — New product capability, discretionary styling, major dependency migrations, CSP, and cleanup unrelated to release evidence.

**Responsibility** — The agent owns repository review, verification, defect correction within the stabilization boundary, backup, revision control, deployment checks, rollback evidence, and release recording. The author is required only for final subjective acceptance, representative desktop/mobile use, and any consequential product decision exposed by verification.

**Release evidence** — Full lint and production typecheck pass. All 165 active Jest suites and 891 tests pass. The three emulator suites and 23 emulator tests pass in the exact-revision Firebase emulator gate. A clean no-secret production build passes compilation, type validation, all 52 static pages, optimization, and route tracing. Complete paired backup `run-2026-07-22T13-56-38-736Z` verified 8,932 Firestore documents and 10,639 Storage objects; retention is capped at three complete runs and completed runs request OneDrive online-only storage. Revision `21145a19` is committed, pushed to `main`, and successfully deployed by Vercel. GitHub run `29942610867` passes both the full code gate and all nine hosted administrator/viewer browser smokes; run `29942608642` passes the Firebase emulator gate. The remaining Release Candidate work is representative author desktop/mobile acceptance and confirmation that the candidate is accepted for sustained content authoring.

### 2. Media Intake and Tagging

**Definition:** Ready for bounded stabilization; broader usability and future assistance deferred

**Outcome** — Confirm that the implemented Import → Library → codify/caption → select → Card workflow and hierarchical tagging system operate reliably enough for sustained authoring, and repair only defects that prevent or corrupt that work.

**Actors** — Current author and system operator. Representative first-time archive-owner acceptance is deferred until the author is ready to validate later onboarding and workflow refinement.

**Includes** — End-to-end verification of existing local import, readiness, Library filtering/grouping, codification, captions, hierarchical Who/What/When/Where assignment, subjects, Any/All filtering, Gallery inheritance, selection, Card assignment, governed Tag mutation, counts, completeness, search projections, and recovery from ordinary interruption. Correct defects found in those existing paths.

**Excludes** — New onboarding, first-user redesign, face recognition, identity split, likely-match discovery, saved working sets, new import sources, compatibility retirement, and other capability expansion.

**Contracts** — Source structure may be rich, partial, inconsistent, or absent. Imported facts and machine suggestions remain distinguishable from confirmed truth. Every interruption preserves completed work and provides a truthful resume point. The implemented path must end in usable organized media and a reliable transition to Gallery, Card, caption, or story work without requiring a new product model.

**Definition slices** —

1. **Starting-condition matrix — Complete** — Representative folders, exports, metadata, existing keywords/person data, duplicates, partial dates, scans, and unstructured files; state what can be inherited, what can only be suggested, and what requires author input.
2. **Current journey inventory — Complete** — Trace preparation, import, readiness, Browse, Exact review, tag assignment, identity administration, piles, stacks, Card creation, and return/resume paths. Identify duplicated concepts, dead ends, hidden state, premature messages, and expert-only terminology.
3. **Tag and identity mental model — Revised and approved** — Media truth and Card story truth remain distinct; Who identities, author-controlled hierarchy, nested names, subjects, dimensions, provisional suggestions, and Gallery inheritance remain central. Parent/partner facts may support a stable family-tree view, but perspective-relative relationship labels, viewer-relative hierarchy changes, and stored filtering Groups are not target assignment truth.
4. **Target journey and information architecture — Unified Library direction approved** — Organize and Tell remain useful descriptions of the product journey but do not become separate Media interfaces. One canonical Library supports import, browsing, codification, captioning, selection, and Card assignment together. All general and dimensional filters remain available; Complete/Incomplete is separate from Assigned/Unassigned, and Incomplete adds unresolved-dimension filters. Batch, folder, metadata, day, and later Face/Similar grouping create working views without dividing Media truth or forcing a mode choice.
5. **Vocabulary direction — Complete for the current baseline** — Preserve hierarchical tag assignment and aggregation consistently across dimensions. Who uses directly assignable aggregate tags with directly assignable nested names and author-controlled branches such as Family and Friends; it does not require visible Person/Name or human/non-human typing. Optional parent/partner facts support a future family-tree view over the same canonical Who IDs; perspective-relative relationship labels do not become assignments or rewrite authored content. Any/OR and All/AND replace stored filtering Groups; Childhood and Parenthood remain What concepts combined with Who and When. Existing Person and Group records remain untouched until a future compatibility-retirement gate is approved.
6. **Unified Media Library interface — Complete for the current baseline** — Import, codification, captioning, stacking, selection, Card assignment, and exact-match evidence operate in one Library without a separate Browse or duplicate-review workspace. Import adds Media to the Library with explicit metadata-application and folder-to-Card choices. Library filters cover source, caption, shape, Assigned/Unassigned, All/Matches/No Matches, Complete/Incomplete, and dimensional tags; Incomplete additionally exposes batch, folder, metadata availability, and unresolved-dimension filters. Grouping covers None, Batch, Folder, metadata source, and capture day. Face and Similar remain deferred.
7. **Pile disposition and working sets — Complete** — Automatic generation, post-import suggestions, manual Pile controls, suggested grouping, tag suggestions, and Pile-based Card creation are retired from the active Media journey. Dormant records and backend compatibility remain temporarily; no destructive migration occurred. Filtering, grouping, search, and ordinary selection form the working set. Card-oriented Media selection defaults the existing All Codification / Complete / Incomplete selector to Complete; All Codification remains the explicit way to include both. A future saved-selection capability requires observed user need.
8. **First-user usability acceptance — Deferred** — A representative new user should eventually validate the journey without live explanation from the original author. That validation is not required to establish the current authoring baseline and will gate later onboarding or workflow redesign.
9. **Current implementation foundation — Complete** — The unified Library, hierarchy-native vocabulary, governed Tag mutation, whole-population Any/All filtering, completeness filtering, Exact-match filtering, Who cleanup, and Pile retirement are implemented. The active work is bounded verification and defect correction, not another redesign.

**Approved vocabulary implementation sequence** — This sequence is deliberately reversible and does not authorize production-data mutation merely by being documented:

1. **Schema and compatibility boundary** — Use the selected canonical Who tag ID as the identity key without requiring a new visible tag type. Read existing `people` documents only as compatibility/profile data keyed to that tag; do not create a second identity authority.
2. **Hierarchy-native vocabulary interface** — Keep creation, naming, nesting, direct assignability, and drag/reparent behavior in the common tag tree. Attach optional profile and parent/partner family-tree facts through actions on a Who tag. Do not present a separate People workspace, human/non-human selector, Person conversion, perspective-relative relationship tree, or named filtering Groups as the target workflow.
3. **Whole-population Any/All filtering — Implemented** — Reader Cards and Media expose a separate Selected Any/All control without changing the existing assigned-versus-subject Match control. Any requires one selected tag within each populated dimension; All requires every selected tag within each populated dimension; populated dimensions continue to intersect. The operator is persisted and sent to server-backed Card, Media, search, seeded-Random, discovery-Random, Typesense, and Firestore fallback paths. Firestore fallbacks scan until a filtered page is filled rather than filtering only a loaded client page.
4. **Manifested dry run — Complete** — The read-only manifest classified all 138 Who tags and inspected 10 compatibility profiles, 1,281 Cards, 3,503 Media records, and 270 Questions. All 10 profiles, including archive perspective, already use their canonical Who tag IDs; no relationship or Person Group records exist. Nine approved nested-name clusters resolve without identity-ID migration. The manifest identified the nine legacy role/group branches later removed through governed cleanup.
5. **Approved migration and rollback — Complete for vocabulary cleanup** — The manifest proved the compatibility IDs already equal canonical Who tag IDs, so no compatibility remap was performed. The 10 profiles remain until the service-retirement gate. Author-approved object disposition was executed through the integrated mutation owner rather than direct deletion or an unreconciled hierarchy script.
6. **Integrated tag mutation and completeness foundation — Complete** — Governed rename and same-dimension reparent preserve stable assignments and reconcile descendant paths, Card/Media projections, Card/Media/Question subject ancestry, Media completeness flags, hierarchical counts, and both search indexes. Studio Cards provide server-backed All Codification, Complete, and Incomplete filtering through Typesense and Firestore fallback, derived from effective Who, What, When, and Where assignments. Remove Everywhere and Merge both require server impact preview plus explicit confirmation. Removal deletes only the selected tag and promotes its children; merge consolidates assignments and subjects into a selected same-dimension target and moves children beneath it. Self, cross-dimension, and descendant-target merges, unqualified deletion, and silent subtree deletion are blocked. Both destructive operations reconcile projections/completeness/counts, strictly refresh search, and delete the authoritative source tag last.
7. **Author-reviewed vocabulary cleanup — Complete** — Nine author-selected people were restored beneath Friends: Karen Albright, Aileen Ferguson, Anne Frank, Betty Edwards, Ed Edwards, Craig Neimiec, Gov. Carroll Campbell, Jerry Pierson, and Stephanie Baker. Bob & Sandra, Children, Cousins, Father, Grandkids, Mother, Parents, Siblings, and Spouse were removed through one guarded, idempotent cleanup. The operation reconciled hierarchy, direct and subject assignments, completeness, counts, and strict Card/Media search projections before deleting the source nodes. Final read-only verification scanned all 1,281 Cards, 3,503 Media records, and 270 Questions and found no removed-ID references.
8. **Compatibility retirement — Deferred** — Remove the legacy `people`, `person_groups`, dormant Pile paths, and old perspective paths only after zero-live-reference proof and a separately approved rollback window.
9. **Face assistance — Deferred** — Add provisional face evidence only after merge/split correction is defined; suggestions target canonical Who tag IDs and require author confirmation before becoming Who assignments.

**Implemented slice — Who-tag compatibility boundary** — Any selected Who tag can be the canonical identity endpoint without a visible Person/Name or human/non-human classification. A tag-first resolver treats that Who tag ID and name as canonical, reads an existing linked `people` document only as optional compatibility/profile data, and fails closed on missing, non-Who, unlinked, or conflicting identity evidence. Archive-perspective validation uses that resolver while preserving current linked-Person behavior. Who tags may carry explicit assignability and optional gender used only for relationship labels. No production Tag, Person, Group, relationship, assignment, perspective, count, or search record was migrated or rewritten. Focused schema, resolver, and relationship tests, touched-file lint, production typecheck, and diff checks pass.

**Implemented slice — Hierarchy-native Who interface** — The duplicate Studio People workspace has been removed. Who names, imported variants, aggregate parents, assignability, and drag/reparent behavior remain ordinary tag-tree capabilities. A Who tag action opens optional gender, archive-perspective, and parent/partner relationship controls using canonical Who tag IDs; those links do not change tag assignments or hierarchical aggregation. Stored compatibility Person, relationship, and Group records remain untouched. Focused tag-row, relationship-modal, schema, resolver, and relationship tests plus production typecheck and touched-file lint pass. Live read-only verification on port 3001 confirmed that the People tab is absent and the Relationships action opens from a Who tag; no mutation control was invoked.

**Implemented slice — Whole-population Any/All filtering** — Reader refinement now separates assignment scope (`Any assigned` or `Subject only`) from selected-tag combination (`Any` or `All`). The same dimensional intersection contract is implemented in Card lists, Media lists, text-search projections, seeded Random feeds, discovery Random selection, Typesense filters, and Firestore scan fallbacks. Any remains the compatible default; All is persisted only when selected. Focused operator, exact-scope, Reader Media, Card search, and Media route tests, production typecheck, touched-file lint, and diff checks pass. Live verification on port 3001 confirmed the control and both options; the saved selection was restored to Any after verification.

**Implemented slice — Governed Tag rename and reparent** — Tag PUT/PATCH rename and the reparent endpoint now share one server owner. It plans the prospective catalog before writes, rejects missing parents, sibling-name conflicts, cycles, and cross-dimension moves, then batch-reconciles descendant paths, Card and Media dimensional/filter projections, explicit and Gallery-implicit subject ancestry, Question subject ancestry, Media presence/completeness fields, full-population published-Card and Media rollup counts, and strict Card/Media Typesense refresh. Each attempt records `planning`, authoritative, projection, count, and search stages in `tag_mutation_operations`; failed attempts remain visible, and retrying the same desired value reruns reconciliation idempotently. Non-structural edits such as ordering stay on the narrow update path. No production mutation was used for verification. Eight focused catalog/route tests, the 138-case administrator boundary suite, Tag projection/count tests, touched-file lint, production typecheck, and diff checks pass.

**Implemented slice — Manifested Who-vocabulary dry run** — A reproducible read-only manifest now inventories hierarchy classification, approved nested-name clusters, compatibility Person mappings, perspective, relationships, Groups, direct assignments, subjects, and projected count/search effects. The refreshed live manifest fingerprint is `2618124cc1617c2319a9ba43fa2e4d14a3b6f27cd0ee49b008d05ea186f690bc`. All 10 compatibility Person IDs already equal their canonical Who tag IDs; there are zero relationship records, zero Person Group records, zero unresolved compatibility mappings, and nine approved nested-name clusters. The author decided not to retain the nine legacy role/group branches. The object-level manifest now identifies the exact 33 Cards, 73 Media records, 29 Questions, and five subject references that require disposition before deletion; no production writes occurred.

**Implemented slice — Author-reviewed Who cleanup** — One guarded cleanup restored Karen Albright, Aileen Ferguson, Anne Frank, Betty Edwards, Ed Edwards, Craig Neimiec, Gov. Carroll Campbell, Jerry Pierson, and Stephanie Baker beneath Friends and removed the nine rejected role/group nodes. A failed first strict-index attempt exposed a Firestore delete sentinel leaking into the in-memory Typesense projection; deletion correctly remained blocked. The projection was repaired, focused tests/typecheck/lint passed, and the idempotent operation completed. The hierarchy service now uses validated bulk Typesense imports with one in-memory tag map rather than per-object tag lookups. Final verification found the expected 651 tags and zero obsolete-ID references across all Cards, Media, and Questions.

**Implemented slice — Unified Library control hierarchy** — The Studio Media pane now presents Library and Selected Card as its population selector without a separate View label. The obsolete Organize heading, scoped photo/batch summary, and Raw/Foldered/Phone source lenses are removed from the visible hierarchy. At this historical slice, existing Pile operations occupied one compact row; the later Pile-retirement slice removed that row and its workflow. Search and existing general filters share the first filter row; the dimensional tag selector follows; grouping, batch/folder controls, and stack disclosure follow on the next row. Tile size sits beside Import because it controls presentation rather than filtering or grouping.

**Implemented slice — Server-backed Library workflow** — Complete/Incomplete evaluates the four persisted dimensional-presence fields on the server. Incomplete reveals server-backed unresolved Who/What/When/Where, import batch, source folder, and metadata-outcome filters while ordinary dimensional tag filters remain available. Leaving Incomplete atomically clears every hidden workflow filter. New local imports persist whether metadata reading was attempted and whether caption or keyword metadata was found, absent, or failed; paste imports record not requested and legacy records remain Unknown. A protected options route supplies full-Library Batch and Folder choices. Ordinary grouping offers None, Folder, Batch, Metadata, and Day and automatically loads every matching server page before rendering groups.

**Implemented slice — Pile retirement and Card-oriented completeness** — Import now ends with the new Media selected and ready for codification or captioning; it does not generate provisional clusters or expose Pile suggestions. Pile controls, overlay, manual creation, suggested grouping, tag application, merge, dismissal, and Pile-based Card creation are absent from active Media UI. Existing records and backend services remain dormant and were not destructively migrated. When an active Studio Card makes the Library a Card-selection surface, the server-backed Media query defaults the existing All Codification / Complete / Incomplete selector to Complete; All Codification remains the explicit way to include both populations. Twenty focused Media, grouping, and preference tests, touched-code lint, and production typecheck pass.

**Implemented slice — Exact-match filter and tag-picker repair** — The separate Browse / Exact Matches workspace selector and duplicate decision states are removed from the author interface. Exact source-byte evidence now drives a server-backed All Matches / Matches / No Matches filter on the ordinary Library row, composable with the other Library filters; ordinary reference-aware Media deletion remains the disposition mechanism. Card status labels are All Statuses, Assigned, and Unassigned; incomplete-detail labels use All/Who/What/When/Where Unresolved; stack disclosure is Show Stacks. Individual dimensional tag pickers render the requested dimension as one full-width column, and shared edit dialogs render at the document root so Media-tile overlays cannot cover them. Stored duplicate evidence and historical decisions are preserved; likely-match discovery remains deferred.

**Stabilization completion evidence — Passed for the current authoring baseline** — Focused Media, Tag, hierarchy, filter, provider, route, and assignment checks pass. Live desktop verification on a clean development server confirmed the unified Library, persisted-filter recovery, mutually exclusive loading and empty states, the complete hierarchy and counts, and the existing import entry point without mutating archive data. The full active Jest suite passes 165 suites and 891 tests. Destructive Tag mutation and new import execution remain covered by focused tests and their previously verified governed paths rather than being repeated against production data. First-time-user and mobile Reader usability remain later product-validation work rather than blockers to the authoring baseline.

**Definition evidence** — The starting-condition matrix, current-journey inventory, observed friction, and unresolved definition questions are maintained in `docs/06-Media-Intake-Tagging.md`. That support document does not change product truth or authorize implementation independently of this brief.

### 3. State Communication

**Definition:** Verified

**Outcome** — Normal loading never masquerades as missing data or failure, and genuine empty, warning, error, and success states are calm, truthful, timely, and actionable.

**Includes** — Application-wide inventory of transient copy and state timing; loading-versus-empty contracts; delayed or skeleton presentation where appropriate; suppression of premature messages such as `No collections yet`; consistent recovery actions; accessible announcements; and representative Reader, Studio, Users, Theme, Settings, import, and search verification.

**Excludes** — General copy rewriting, visual redesign, and hiding genuine failures.

**Responsibility** — The agent may inventory and correct objective state-timing and recovery defects independently. Author input is required only when wording or presentation presents a consequential preference rather than a truthfulness or accessibility defect.

**Verified evidence** — Reader collections now distinguish loading, successful readiness, genuine empty results, and load failure; non-Reader administration routes no longer imply that collections are absent before Reader data is requested. Studio Media, Studio Card selection, and Collections administration do not render empty-state copy while their initial data is loading. Theme, Settings, Search, and Users expose calm user-facing failure or recovery paths instead of technical dead ends or authoritative defaults after a failed load. Focused component checks, production typecheck, full lint, and the complete active Jest suite pass. Live verification on a clean development server confirmed the administration guidance, populated Reader collection tree, Media loading transition, persisted-filter recovery, populated Library, and hierarchy workspace.

### 4. Landing, Onboarding, and Commercial Offer

**Definition:** Parked pending author reactivation

**Outcome** — A prospective customer understands who the product serves, why it matters, what is included, how a private archive begins, and what access or payment is required.

**Includes** — Audience decision, messaging, brand assets, hosted-product packaging, invitation/sign-in expectations, initial onboarding, secure reader invitation/password setup or recovery, and commercial validation.

**Excludes** — Multi-tenancy, public signup, broad sharing, and speculative acquisition machinery.

### 5. Identity Correction and Face Assistance

**Definition:** Deferred

**Outcome** — The author can safely correct identity mistakes and use face evidence to accelerate Who classification without turning machine inference into confirmed archive truth.

**Includes** — Recoverable Tag/identity merge and split first; face-region and provider-data import assessment; recognition-service evaluation; provisional face clustering and candidate matching; author confirmation, rejection, correction, retention, deletion, provenance, reprocessing, and bounded application of accepted Who assignments.

**Dependencies** — Product Comprehension and Workflow; stable Who identity and nested-name contracts; optional family-tree facts; source and rendition access; explicit privacy, cost, quality, and provider-data decisions.

**Excludes** — Automatic relationship-role inference, silent assignment, genealogy-platform scope, and face-based access control.

### 6. Bounded Product Extensions

**Definition:** Deferred

Prioritize individually only after Release Candidate and the relevant comprehension work:

1. **Reader package choice** — Per-reader Journal/Editorial selection and persistence.
2. **Help** — Product guidance beyond essential contextual copy. `07-Users-Guide.md` now owns the initial support guidance for the author method, with substantive chapters on product purpose, starting small, and Tag design. Remaining Media, tagging, Card, Collection, Reader-review, maintenance, and worked-example chapters are unwritten; in-app delivery remains deferred and requires its own Definition Gate.
3. **Editorial controls** — Deliberate long-form presentation controls where approved.
4. **Media duplicates** — Evidence recovery and confirmed same-asset reconciliation; likely-match review remains low priority unless archive pain proves otherwise.
5. **Search and taxonomy extensions** — Include/exclude filtering, useful aggregation, and advanced keyboard/drag behavior.

**Authoring adjustment inventory — Deferred**

- **What-vocabulary migration** — The approved structural and deterministic phases are complete. The structural phase created 12 missing nodes, renamed `Themes` to `Topics` and `Cars` to `Vehicles`, and reparented the agreed reusable categories without changing assignments. The deterministic phase replaced 70 superseded tags across 50 Cards, 393 Media records, and 15 Questions, covering named-employer detail, birthday ages, anniversary numbers, school-specific Graduation, detailed Reflection pairs, vehicle models, Army/Navy, and Reception. Recovery manifests precede both phases; verification found zero stale removed-tag references, Card or Media projection mismatches, or hierarchical count mismatches. `zMisc`, `Portrait`, `Postcards`, `Romance`, and other occurrence-specific review populations remain unchanged pending author review.
- **Consistent tag filtering** — Cards, Media, and the Reader left sidebar must expose the same exhaustive tag-filter semantics and behavior, including an explicit choice between exact assignment and assignment through descendants. Cards and Media should use a graphical hierarchy treatment comparable to the Reader sidebar rather than hiding important scope choices behind secondary controls.
- **Visible filter scope** — Media must expose Any assigned versus Subject only on the primary Filter row. Dimensional filter changes must refresh against the newly selected tag map rather than the preceding state. Library versus Selected Card must have unmistakable selected-state presentation, and hidden-on-card messaging must name the active Library context.
- **Non-displacing bulk actions** — Cards and Media must enter and leave bulk-selection mode without moving the result population vertically or changing the user's apparent place in the grid. When one or more items are selected, render the bulk-action controls within the existing control-region footprint by temporarily replacing controls that are not useful during a bulk operation, following the stable-toolbar pattern used by Notion. Do not insert or remove an additional row above the results. Preserve selection count, applicable bulk actions, clear selection, keyboard access, responsive behavior, and the results container's scroll position across the mode transition.
- **Administrative tag counts** — Studio Tag counts must disclose all assignments rather than presenting draft-only use as zero. If status is separated, use an explicitly labeled Published Cards / Draft Cards / Media treatment; Reader counts remain scoped to the published population in the current view.
- **Live Tag-pane count synchronization — Delivered for Studio authoring** — Successful individual and bulk Media tag edits, Media deletion, registration of newly imported tagged Media, inline and bulk Card tag edits, Card publish/draft transitions, Card creation, Card deletion, and Compose saves that change tags or status now revalidate the shared `/api/tags` cache after the authoritative mutation. An already-open Studio Tags pane therefore receives current counts without a page refresh; failed mutations and ordinary non-count-changing edits do not refresh or optimistically alter counts. The Tag provider's five-minute deduplication and disabled focus/reconnect revalidation make this explicit post-mutation reconciliation mandatory for any future count-changing path.
- **New-Card Gallery inheritance — Delivered** — Card creation now runs the authoritative Gallery-inheritance reconciler after the initial Card, Gallery membership, and Media back-references are committed and before the created Card is returned. Enabled dimensions therefore populate on the first save, while explicitly protected dimensions remain unchanged; the same existing tag, subject, count, derived-field, and search paths remain authoritative.
- **Hierarchy editing — Delivered** — The Tag editing tree provides visible per-node chevrons, per-dimension Expand all and Collapse all controls, locally persisted collapse state, and delayed expansion when a Shift-drag hovers over a collapsed reparent target. Expansion remains separate from the dedicated drag handle, and existing hierarchy and mutation safeguards remain authoritative.
- **Mutation progress** — After confirmed Tag deletion, retain the row in a disabled pending state with a spinner and `Removing…` until backend reconciliation succeeds; remove it only on success and restore it with a clear error on failure.
- **Compose Gallery density** — Shorten and visually de-emphasize the Gallery instruction currently rendered as `Paste or drop an image here, pick from the library, or drag from the Media pane (Studio).` Review the adjacent Gallery-inheritance guidance in the same bounded copy-and-density slice so necessary direction remains available without cluttering Compose.
- **Media grouped by Card — Implemented** — Media Browse can group the complete filtered population by Gallery Card. Draft and published Gallery Cards are included; media used in multiple Galleries appears in each applicable group, while cover-only, body-only, and otherwise ungrouped media remains under `Not in a Gallery Card`. This is a derived working view over existing Card membership, not a new Pile or saved Media-set model. Focused tests, touched-code lint, and production typecheck pass; final author verification remains.
- **Media codification default** — Change the default Studio Media codification filter from `Complete` to `All Codification`. This is deferred; do not change current runtime behavior until implemented as its own bounded adjustment.
- **Retired admin-surface cleanup** — Remove evolutionary remnants of the pre-Studio standalone Tags, Cards, Media, Collections, table, and obsolete grid implementations only after a reachability and dependency audit. The former route directories no longer contain page entrypoints, but stale standalone-route comments and conditional variants remain in shared Studio components. Initial dead-code candidates include the unreferenced `DirectDimensionChips` table variant and the unused `tableEmbed` command-bar branch. Do not remove active Studio presentation merely because a component or CSS class still uses `Grid` in its name: `CardAdminGrid`, `MediaAdminGrid`, and the Collections layout currently serve Studio. The bounded cleanup must classify each route directory, component branch, stylesheet, utility, test, and API dependency as Studio-active, shared-active, or unreachable before deletion, then compare bundle/type-check/test results and preserve current Studio behavior.

### 7. Parked Media and Content Expansion

**Definition:** Parked

- **Quote and dependent typography** — Resume only with a complete product definition.
- **Video** — Resume after the core release and workflow prove their value.
- **External photo libraries** — Provider export guidance, explicit-selection ingestion, or native companion evaluation; no assumption of continuous Apple Photos or Google Photos synchronization.
- **Bursts, similarity, motion pairs, external edit, and Reader stacks** — Reassess from demonstrated archive needs and reliable source evidence.
- **Gallery mosaic and additional themes** — Optional presentation expansion, not core readiness.

### 8. Platform Evolution

**Definition:** Deferred except for the backup, recovery, deployment-integrity, and critical-security checks included in Release Candidate

- **Security maintenance** — Separately migrate Next, Auth.js, Firebase, and remaining vulnerable dependency trees; add CSP after hosted resource inventory and validation.
- **Hosted operations** — Automate backup, monitoring, recovery, and observability without weakening current safeguards.
- **Scale architecture** — Multi-tenancy, expanded sharing, history/versioning, storage abstraction, and provider portability only when the commercial model requires them.

---

## Open questions

- **Landing audience** — Final public language for the initial customer.
- **Card suggestions** — Remaining role, if any, of the former Media-derived suggestion workflow.
- **Suggestion storage** — Per-media tag suggestions, face payloads, and retention beyond provisional clusters.
- **Left navigation** — Whether a messy-archive Studio entry is still desired. Created sort remains; partial-batch Reader Group was removed, and any future grouping requires archive-wide inventory and per-group pagination.
- **Brand assets** — Final Landing identity assets.

These questions remain open; they do not authorize implementation or imply priority.
