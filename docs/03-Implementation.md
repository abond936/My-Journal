# IMPLEMENTATION

This document turns Planned capabilities in `02` and Planned constraints in `01` into sequenced, bounded implementation work.

**Current active capability:** None. Interaction Feedback is Verified; Reader Boundary is next for its Definition Gate.

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

**Definition:** Not gated
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

The ordering below preserves the existing Admin → Reader → Scale progression. It is a queue, not evidence that any capability is Ready. Select one capability at a time for Definition Gate assessment.

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

**Definition:** Not gated

- **Taxonomy** — Keep creation, deletion, hierarchy, and library reorganization in Studio.
- **Correction** — Retain focused assignment and correction while editing Reader content.
- **Conflict** — Remove the current full Studio tag-library editor from the Reader sidebar without weakening Reader filtering.

### Studio Cards

**Definition:** Not gated

- **Density** — Reduce tile footprint while preserving legibility and selection.
- **Tags** — Improve keyboard use, hierarchy, and disambiguation.
- **Filters** — Provide clearer single-dimension search without removing advanced filtering.
- **Quote** — Add Quote only with the completed Quote object.

### Studio Compose

**Definition:** Not gated

- **Guidance** — Clarify title, subtitle, excerpt, and body roles.
- **Alignment** — Reconcile Compose, Reader, and compact previews.
- **Reader edit** — Align focused Reader editing with overlapping Compose fields.
- **Editorial** — Add only approved long-form controls.
- **Context** — Keep historical context distinct from writing rewrites.
- **Quote** — Define fields, attribution, media, relationships, presentation, and authoring.

### Studio Tags

**Definition:** Not gated

- **Shortcuts** — Add direct dimension navigation.
- **Density** — Tighten the taxonomy tree without weakening drag targets.
- **Affordance** — Replace generic edit iconography.

### Studio Questions

**Definition:** Not gated

- **Integrity** — Enforce one Question to at most one answer card transactionally in create and link paths.
- **Regression** — Verify open, create, delete, unlink, conversion, usage, and Compose handoff.

### Studio Media

**Definition:** Not gated

- **Duplicates** — Define identity evidence, comparison, decisions, and reconciliation.
- **Readiness** — Add durable upload, processing, indexing, ready, and failure states.
- **Consistency** — Align layout, selection, filters, bulk actions, and drag behavior with Cards.
- **Pile merge** — Add bounded author-controlled pile merging.
- **Bursts** — Propose provisional burst stacks and confirmation behavior.
- **Derivatives** — Reconcile image and phone formats across supported surfaces.

### Apple Photos

**Definition:** Not gated

- **Access** — Establish the supported Apple source-access and authorization model.
- **Preview** — Let the author review selectable photos and videos before import.
- **Identity** — Preserve source identity and metadata for repeat-import reconciliation.
- **Ingestion** — Import selected assets into the canonical media bank.
- **Progress** — Report batch progress, partial failure, retry, and completion.
- **Duplicates** — Use source and content evidence rather than filename alone.
- **Verification** — Prove representative photo/video import and downstream Media behavior.

### Video

**Definition:** Not gated

- **Model** — Reuse image identity, tagging, assignment, reference, and deletion rules.
- **Processing** — Produce playable rendition, poster, duration, readiness, and failure state.
- **Media** — Browse, preview, tag, filter, select, replace, and delete safely.
- **Compose** — Assign and preview Cover, Gallery, and body video.
- **Reader** — Play video in assigned placements without autoplaying sound.
- **Cards** — Use a poster or compact indicator; grid playback is not required.

### User Management

**Definition:** Not gated

- **Revocation** — Reject or invalidate existing sessions after disablement.
- **Consistency** — Align titles, tables, feedback, and spacing with Administration.

### Settings

**Definition:** Not gated

- **Organization** — Separate Reader preferences, author configuration, and operations.
- **Appearance** — Expose Journal/Editorial and Light/Dark Reader choices.
- **Persistence** — Store each reader's selection independently.
- **Account** — Add appropriate signed-in account entry points.
- **Activation** — Explain inheritance consequences and invoke approved enable-time synchronization.

---

## 2. Reader experience

### Landing Page

**Definition:** Not gated

- **Messaging** — Reconcile purpose, audience, and value.
- **Brand** — Complete approved identity assets.
- **Packaging** — Present the hosted offer when settled.
- **Access** — Explain invitation and sign-in expectations.

### Top Navigation

**Definition:** Not gated

- **Hierarchy** — Finalize destinations and remove development or migration entries.
- **History** — Correct mobile Back and edge-swipe behavior.
- **Return** — Establish safe contextual return routing.
- **Appearance** — Integrate per-reader theme and mode controls.

### Left Navigation

**Definition:** Not gated

- **Hierarchy** — Clarify mode, filter, collection, and administrative controls.
- **Mobile** — Improve the drawer without breaking browser gestures.
- **Editing** — Preserve focused correction and Studio taxonomy ownership.

### Content Page

**Definition:** Not gated

- **Alignment** — Reconcile feed, detail, Compose, and compact previews.
- **Quote** — Complete the Quote product and presentation, not only renderer scaffolding.
- **Question** — Refine its visual cue and typography.
- **Typography** — Standardize Question, Quote, and Callout hierarchy.
- **Legibility** — Protect overlays and controls across variable images.
- **Discovery** — Complete related and broader Freeform rails.
- **Disclosure** — Improve Inline continuation.

### View Page

**Definition:** Not gated

- **Presentation** — Reconcile hierarchy and spacing across forms.
- **Quote** — Complete open quotation behavior.
- **Typography** — Validate approved long-form treatments.
- **Continuation** — Distinguish Guided children from Freeform discovery.

### Theme Standardization

**Definition:** Not gated

- **Inventory** — Map every Reader and Administration surface to its owned roles.
- **Standardization** — Re-establish one values → semantics → recipes → surfaces path.
- **Enforcement** — Remove bypasses, duplicated variables, competing aliases, and component-local design systems.
- **Boundaries** — Separate workspace composition from schema, compilation, and persistence.
- **States** — Standardize feedback, focus, disabled, selected, and destructive states.
- **Administration** — Establish one coherent v1 authoring presentation.
- **Workbench** — Improve usability only after the contract is stable.

### Journal

**Definition:** Not gated

- **Light** — Complete the Journal Light package.
- **Dark** — Complete the Journal Dark package.
- **Coverage** — Validate all representative Reader surfaces and states on mobile and desktop.

### Editorial

**Definition:** Not gated

- **Light** — Complete the Editorial Light package.
- **Dark** — Complete the Editorial Dark package.
- **Coverage** — Validate all representative Reader surfaces and states on mobile and desktop.

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
- **Revocation** — End authorization after account disablement.

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
- **Left navigation** — Whether Group by, Created sort, or a messy-archive Studio entry are still desired.
- **Brand assets** — Final Landing identity assets.

These questions remain open; they do not authorize implementation or imply priority.
