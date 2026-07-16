# IMPLEMENTATION

This document turns Planned capabilities in `02` and Planned constraints in `01` into sequenced, bounded implementation work.

**Current active capability:** Gallery Tag Inheritance.

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

**Definition:** Ready
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
**Execution:** Active

**Outcome** — The author can choose, understand, and control how confirmed Gallery-media tags and subjects become card story truth without losing existing card decisions.

**Actors** — Author and system operator.

**Includes** — Explained onboarding choice, durable per-dimension settings, Gallery-only aggregation, incomplete-child handling, subject rollup, existing-card protection, per-card overrides, re-inheritance, derived-field reconciliation, and verification.

**Excludes** — Body-media inheritance, card-to-card inheritance, cover-only inheritance, automatic activation, AI suggestions, face recognition, and changes to the taxonomy itself.

**Contracts** — Each dimension requires an explicit onboarding selection and remains inactive until selected. Existing card assignments begin protected by per-dimension overrides. New cards follow the selected settings and may override individual dimensions. Releasing an override immediately re-inherits current Gallery children. Confirmed Gallery media are the only participating children; body media do not participate. Blank means Unreviewed; any participating child blank in a dimension makes that card rollup Unreviewed and forces review. N/A and Unknown are intentional tags, roll up like other tags, and may be subjects; no separate Partial state is inferred. A single rolled-up tag is the dimensional subject; multiple tags display Multiple unless the author selects one or more subjects, which display as Subjects+. Inheritance changes card work truth only and preserves source-media truth.

**Current state** — Settings store four booleans plus whether the author explicitly configured them; they remain unconfigured and all off. Cards store per-dimension overrides. Missing legacy state is interpreted as fully protected, and a manifested backfill explicitly protected all 1,281 existing cards with zero conflicts while changing no tags, subjects, Gallery membership, counts, or projections. New cards protect every dimension until settings are configured; afterward they inherit only dimensions the author enabled and retain overrides for disabled dimensions. Runtime synchronization masks global settings through each card's overrides. The tested runtime rollup distinguishes no Gallery, reviewed unions, and Unreviewed precedence while treating N/A and Unknown as ordinary intentional tags; it atomically stores server-owned per-dimension status with inherited tags and their derived indexes. Card editing identifies each Unreviewed dimension, and the Cards grid flags affected cards with the dimensions available in the badge tooltip. Card editing also exposes per-dimension controls only where Gallery inheritance is globally enabled: releasing protection immediately re-inherits, while restoring protection preserves current assignments and stops future inheritance. Settings explain these consequences and require confirmation before enabling dimensions; only previously opted-in cards are reconciled, with success and failure counts reported without misreporting a saved setting as failed. Cards and Media now accept multiple explicit subjects while mirroring the first into the legacy singular field; subject filtering and search projections use all selected subjects and ancestors. Single-tag Gallery rollups are stored separately as implicit subjects so they become Multiple, not a stale explicit choice, if the rollup later expands. Complete Multiple / Subjects+ presentation, Questions alignment, data audit, and full onboarding remain incomplete.

**Gaps / slices** —

1. **Rollup** — Derive tags, review state, and subjects from participating Gallery media.
2. **Activation** — Explain choices in onboarding and Settings and initialize new-card behavior from the selected policy.
3. **Reconciliation** — Recompute safely after Gallery, media-tag, override, and settings changes.
4. **Verify** — Prove existing-card protection, new-card defaults, override release, incomplete children, subjects, counts, projections, Reader truth, retry, and rollback.

**Dependencies** — Author settings, Card and Media services, Gallery membership, confirmed tag and subject fields, onboarding/help surfaces, and current hierarchy/projection utilities.

**Risks** — Silent replacement of manual card truth, stale rollups, incomplete media appearing complete, subject drift, excessive fan-out after media edits, count drift, and unclear activation consequences.

**Decisions needed** — None. The author selects each dimension during onboarding; implementation must not choose dimensions on the author’s behalf.

**Completion evidence** — Unit and service tests for rollup and overrides; migration audit proving existing cards are protected; browser verification of onboarding, Settings, Compose overrides, re-inheritance, and Reader results; zero unexplained projection or count drift; canon reconciliation.

---

## Sequence

The ordering below preserves the existing Admin → Reader → Scale progression. It is a queue, not evidence that any capability is Ready. Select one capability at a time for Definition Gate assessment.

## 1. Author workflow

### Administration

**Definition:** Not gated

- **Consistency** — Align progress, errors, selection, filters, and drag behavior across Studio.
- **Hierarchy** — Reduce unnecessary visual layers while preserving workspace ownership.
- **Boundary** — Keep full taxonomy management in Studio and focused correction in Reader.

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

- **Inheritance policy** — Confirm aggregation and manual-edit persistence.
- **Inheritance backfill** — Synchronize existing cards when a dimension is enabled.
- **Inheritance verification** — Verify settings, gallery changes, media-tag changes, counts, projections, and Reader filters.
- **Count repair** — Add hierarchical reconciliation where incremental counts are insufficient.
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
