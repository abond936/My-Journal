# MEDIA INTAKE AND TAGGING DEFINITION

This support document holds evidence and working detail for the active Media Intake and Tagging definition in `03`. It does not own product truth, architecture, sequence, or implementation authority. Approved outcomes must be reconciled into `01`, `02`, and `03`.

## Definition objective

Design one understandable path from a user's existing media collection to organized media and meaningful stories. The path must work without live coaching from the product's original designer, preserve confirmed archive truth, and remain useful to experienced authors who need direct access to a specific operation.

## Starting-condition matrix

| Starting condition | Evidence likely available | Evidence that may be unreliable or absent | Required product response |
|---|---|---|---|
| Organized story folders | Folder names, filenames, embedded dates, captions, keywords, intentional grouping | Person identity semantics, relationship perspective, consistent keyword hierarchy | Preview what will become Media, tags, and an optional Card; explain inherited versus proposed facts before import. |
| Apple Photos, Google Photos, or similar export | Exported files, some embedded metadata, possible provider sidecars, album or folder structure, possible person/face information | Stable folder structure, complete originals, consistent sidecar formats, provider IDs after export | Give provider-specific preparation guidance; inventory supported metadata and sidecars; import durable application-owned Media; never imply continuous synchronization. |
| Phone or camera dump | Original files, capture timestamps, device metadata, sequence | Captions, people, events, meaningful folders, reliable timezone after transfers | Preserve source facts, make chronological review useful, and offer bounded organization without pretending device proximity proves a story group. |
| Scanned family archive | High-quality image bytes, sometimes folder or envelope groupings | Capture dates, camera metadata, filenames, people, places, orientation, original order | Treat scan/import date separately from historical date; support approximate When, Unknown, N/A, captions, and efficient human review. |
| Prior DAM or keyworded archive | Embedded IPTC/XMP captions and keywords, possible hierarchical keywords, ratings or labels | Compatibility of hierarchy, duplicate names across dimensions, operational keywords, person-versus-role meaning | Preview exact and case-insensitive mappings, isolate unmapped keywords, never silently reinterpret them, and make reviewed conversion resumable. |
| Mixed archive assembled over time | Some combination of folders, exports, scans, edited copies, duplicates, and partial metadata | Consistency across any field; distinction between originals and derivatives | Report evidence per item or batch, preserve provenance, avoid one global assumption, and provide safe batch-level decisions with exceptions. |
| Existing My Stories archive resuming work | Canonical Media, confirmed tags, provisional clusters, Cards, assignments, readiness and review state | User memory of unfinished work and why a tool is showing an item | Resume from durable state, distinguish completed from pending review, and identify the most useful next action without restarting onboarding. |

## Evidence currently supported

- Media-bank local browse imports supported images from a server-configured local root.
- Local and folder import read embedded metadata through ExifTool. Common caption fields can become Media captions.
- Embedded keywords can map to existing Firestore tags by exact name and then case-insensitive fallback; operational roots are excluded.
- Canonical source persistence, provenance, SHA-256 source identity, metadata, Studio/Reader renditions, readiness, retry, and exact-byte review are implemented.
- Folder-to-Card import and Media-bank import are distinct paths. The visible Media import dialog explicitly says it is the Media-bank path.
- Provider sidecars, provider face/person payloads, and provider-specific preparation are not yet defined as supported intake contracts.
- Face recognition is Future. Any imported or generated face evidence must remain provisional until confirmed against a stable Who identity.

## Current journey inventory

### Entry and orientation

1. An administrator enters Studio and receives five peer pane controls: Organize, Cards, Compose, Questions, and Media.
2. Reader-side Explore, Guided/Freeform controls, and transient collection state remain visible beside Studio. During the observed load, `No collections yet.` appeared before collection truth was available.
3. No first-run or returning-work cue identifies whether the next useful job is import, map existing tags, review readiness, organize people, create a Card, or continue prior work.

### Import

1. Media exposes a single `Import` button in the Library header.
2. The dialog is titled `Import Media` and describes a configured local-folder Media-bank path, explicitly distinguishing it from folder-to-Card CLI import.
3. It presents Albums, folder loading, photo selection, `Import Metadata.`, and a selected-photo count.
4. The observed empty/loading transition showed `Loading folders...`, `No photos in this album`, and disabled `Import 0 photos` together. State precedence is not clear to a novice.
5. The dialog does not explain source preparation, supported metadata, keyword mapping, duplicates, readiness processing, provider exports, or what the user should do after import.

### Media Browse and review

The earlier assessed Media workspace exposed at once:

- Browse and Exact matches modes;
- Whole library and This card population;
- an Organize strip with Raw, Foldered, and Phone source modes;
- Build piles, New pile, Story piles overlay, and Tag suggestions on piles;
- search; source, caption, shape, assignment, batch, and folder filters;
- sort, group, tile size, stack visibility;
- Who, What, When, Where, full-tag, rule, and direct-entry filters.

These controls are individually defensible, but the surface does not currently communicate which are intake stages, alternative views, provisional assistance, permanent structure, Card-specific operations, or advanced tools.

### Tags and people

1. Organize contains Tags and Collections, with import-tag mapping presented above them.
2. Tags contains separate Tags and People sections, then separate Who, What, When, and Where dimension controls.
3. The observed Who view opened a very large expanded hierarchy containing stable people, names, legacy family-role branches, groups, pets, structural labels, and zero-use nodes together.
4. Counts expose Card and Media usage but do not explain Media frame truth versus Card story truth.
5. The interface does not explain why People is distinct from Who, how a person identity differs from a tag node or alias, how Mother/Father/Grandparent depend on archive perspective, when a group is appropriate, or how subjects and Gallery inheritance affect later Card presentation.
6. `Map import tags (39)` presents real pending work but does not place that work in a visible intake sequence.

### Transition to stories

- Media selection can create draft Galleries and assign Cover, Gallery, or body relationships.
- Story piles can create Cards, and folder-to-Card import exists separately.
- Compose supports captions, tags, Gallery order, cover, children, content, and Reader preview.
- The current Media surface does not make the transition from organized Media to Gallery, Card, caption, or story the explicit end of its primary path.

## Initial friction findings

1. **No journey owner** — Import, mapping, identity administration, piles, stacks, exact duplicates, filters, and Card creation have local owners but no shared intake state or next-action owner.
2. **Concept overload** — Pile, stack, group, collection, Card, Gallery, tag, subject, identity, alias, relationship, role, and inheritance are visible concepts without an ordered learning model.
3. **Legacy and canonical Who are interleaved** — The delivered stable-identity model coexists visibly with older role and structural taxonomy, making the canonical model difficult to infer.
4. **Loading can state false absence** — Collection, album, and Media empty messages can appear while authoritative data is unresolved.
5. **Source assumptions are hidden** — The visible import path depends on server-visible local folders and does not yet represent the range of real customer starting conditions.
6. **Assistance is organized by mechanism** — Piles, stack display, grouping, tag suggestions, Exact review, and future faces are presented or planned as mechanisms rather than user jobs.
7. **Completion is undefined** — The user cannot tell what minimum organization is sufficient to begin enjoying or authoring stories.
8. **Cold development load is not product evidence** — Rebuilding the local route required a 42-second Studio compilation and additional API compilation. Production usability must be measured on the deployed release candidate, not inferred from this development startup.

## Definition decisions still required

- What is the smallest successful first session: completed import, reviewed batch, identified people, first Gallery, or first published story?
- Should the primary path be staged onboarding, a resumable work queue, contextual next actions, or a combination?
- Which source types receive explicit preparation guides in the first commercial release?
- Which imported folder, caption, keyword, date, GPS, rating, and person/face fields are supported, ignored, or retained as provenance?
- Where should stable People administration live relative to ordinary Who assignment?
- How should legacy role/group taxonomy remain searchable without teaching it as the new identity model?
- Which jobs belong in the primary Media flow, and which move behind an advanced or maintenance boundary?
- What durable progress summary lets an author stop and resume without reinterpreting the archive?

## Draft Tag and Identity mental model

This model is derived from current canon and implementation. The author approved it on July 20, 2026; it now governs the target journey definition.

1. **Media records frame truth and can tell a micro-story** — Codification records what can be confirmed about an image or asset: who appears, what appears or occurs, when it was captured or represents, and where it was captured or represents. A caption is not another codification field; it is the first narrative level and preserves the optional micro-story of that Media item wherever it is used.
2. **Cards describe the story** — A Card selects and arranges Media, adds a title and optional longer narrative, and records the Who/What/When/Where truth of that story. Card truth may inherit from Gallery Media under explicit policy, but it is not merely a copy of every fact visible in every frame.
3. **Dimensions answer four questions** — Who is a named human or non-human identity; What is an event, activity, object, topic, or reflection; When is chronological context; Where is geographic or venue context. Operational import labels do not belong in normal story vocabulary.
4. **A person is an identity, not a name-shaped tag** — One person has one stable identity. Current, maiden, married, historical, nickname, and misspelled names are aliases used to find or display that identity; they do not create multiple people.
5. **A relationship role is contextual** — Mother, Father, Grandparent, spouse, child, and sibling describe how two stable people relate from an explicit perspective. `Sandra Bond` can be Alan's Mother and another person's Grandmother without becoming separate Mother and Grandmother identities.
6. **A group is a meaningful plural subject** — A couple, household, family, team, or other meaningful set may be represented as a typed group whose members remain stable identities. A convenience branch used only to browse people is not automatically a subject assigned to Media or Cards.
7. **A subject is emphasis, not another classification system** — Subjects are selected from already assigned tags to say which people, topics, time, or place the Media or Card is principally about. Removing the assigned tag removes its subject status.
8. **Inheritance is an author-controlled bridge** — Confirmed Gallery-Media tags can inform new or explicitly released Card dimensions. Existing Card decisions remain protected; incomplete child review stays visible; body Media and parent/child Cards do not silently contribute.
9. **Imported and machine evidence is provisional** — Folder names, embedded keywords, provider people, face clusters, GPS, dates, and other extracted signals may supply facts or suggestions with provenance. A signal affects counts, Reader filters, or story truth only through a supported deterministic import rule or explicit author confirmation.
10. **Codification has a truthful completion condition** — A Media item is complete only when Who, What, When, and Where have each been resolved through a substantive assignment, Unknown, or Not applicable. Any Unreviewed dimension leaves the item incomplete. Incomplete Media remains usable in Cards and can be included or excluded through Media filters, but use in a story does not mark codification complete.

### Example

A scanned photograph shows Sandra and Alan at a house in Greenville around 1965.

- Media Who: stable identities `Sandra Bond` and `Alan Bond`.
- Media What: only confirmed visible/event facts that are useful.
- Media When: `circa 1965` or the approved approximate-period representation, not scan date.
- Media Where: the confirmed house, street, or Greenville at the most reliable level.
- Media caption: the concise story or frame-specific recollection.
- Relationship display: Sandra may resolve as `Mother` when Alan is the archive perspective; `Mother` is not assigned as Sandra's identity.
- Card: a Gallery or Story may use this and other Media, choose Sandra as a subject, inherit selected dimensions, and add the longer narrative.
- Face suggestion: a provider or recognition service may propose Sandra; the proposal remains provisional until confirmed against Sandra's stable identity.

### Current-interface contradiction

The observed Who tree visibly interleaves stable people with branches such as Parents, Mother, Father, Siblings, Me, Children, Grandkids, family groupings, and structural labels. That legacy vocabulary may remain searchable or migration evidence, but it cannot serve as the teaching surface for this model. The target journey must distinguish stable identity assignment, relationship-based browsing, group selection, and legacy taxonomy without silently rewriting existing assignments.

## Control disposition

The disposition classifies the job, not the current component. A control may move, be renamed, or be represented by a work item without changing the underlying capability.

### Primary journey

These controls and states form the ordinary intake-to-story path:

| Job | Current capability | Target responsibility |
|---|---|---|
| Add media | Media `Import`; local album/folder selection; metadata option | Start with source choice and preparation guidance, preview what can be inherited, then import into one resumable batch. |
| Understand the result | Import progress; readiness stages; batch and folder metadata | Present one batch summary: imported, reused exact assets, pending processing, failed, metadata found, keywords mapped/unmapped, and review work created. |
| Review what needs attention | Readiness failures; unmapped import tags; exact matches; missing dates or captions; future face suggestions | Create one prioritized review queue whose items explain why they need attention and what confirmation changes. |
| Confirm Who/What/When/Where | Media dimensional tag assignment; direct lookup; focused dimension trees; subjects | Let the user confirm useful facts on selected Media without entering taxonomy administration. Explain dimensions and subject emphasis in context. |
| Identify people | Stable People identities; aliases; provisional face/provider candidates | Search or create one stable person during Who assignment. Offer deeper identity editing only when needed. |
| Add concise story | Media caption editing | Treat captioning as the first Tell activity while keeping it available through the shared Media capability. |
| Use organized media | Draft Gallery/Card creation; assignment to Cover, Gallery, or body; Story-pile Card creation | End each useful review unit with an obvious option to create a Gallery/Card, add to an existing Card, or leave organized Media ready for later. |
| Stop and resume | Durable import batches, readiness, provisional clusters, confirmed assignments | Show completed work, remaining work, and a reliable resume action without replaying onboarding. |

### Contextual actions

These appear only when the current selection, batch, or problem makes them useful:

- Caption and tag editing for selected Media.
- Marking one or more assigned tags as subjects.
- Exact-match review when source-byte evidence produces a candidate.
- Retry when a readiness stage is pending or failed and eligible.
- Mapping imported keywords when a batch contains unmapped terms.
- Adding selected Media to a new or existing Gallery/Card.
- Creating or selecting a stable person while confirming Who.
- Releasing or restoring a Card's Gallery-inheritance override while editing that Card.
- Reference-aware delete, replace, position, and role changes for the selected Media.

### Advanced workspace

These remain directly accessible to experienced authors but do not define first-run sequence:

- Whole-library search, population, source, caption, shape, assignment, batch, and folder filters.
- Sort, Group by Folder/Day/Batch, tile density, and large-scale selection.
- Global taxonomy creation, rename, reparent, dimension navigation, counts, and drag management.
- People details, aliases, archive perspective, relationships, typed groups, and reviewed identity conversion.
- Manual stacks, stack visibility, unstacking, and hero/member management.
- Story-pile construction, source lenses, overlay, split, merge, dismissal, and batch rebuilding.
- Collections and global Gallery-inheritance settings.
- Include/exclude, aggregation, and future assistance controls after their own gates.

### Maintenance and recovery

These must be available to the operator but must not compete with daily organization:

- Duplicate-evidence recovery, legacy evidence classification, and confirmed same-asset reconciliation.
- Projection, count, hierarchy, Media/Card reference, and search-index reconciliation.
- Backup, restore, account recovery, index rebuild, and readiness audits.
- Failed-import diagnosis, missing-source/media repair, destructive cleanup, and migration rollback.
- Legacy tag and identity migration manifests, audits, and recovery evidence.

## Unified Media Library direction

**Status: Approved product direction; the unified control hierarchy, server-backed workflow filters, and exact-match filter are implemented. Broader intake and usability slices remain pending.**

Organize and Tell remain useful descriptions of the overall journey, but they are not separate Media workspaces. The author works in one canonical Library and may codify, caption, select, and assign the same working set without changing modes.

1. **Import** brings Media into the Library. The import dialog exposes the consequential choices: whether extracted metadata is applied and whether source folders create or assign Cards. Folder-to-Card behavior requires a preview and repeat-import-safe rules.
2. **Find a working set** through search, sorting, filtering, and grouping. General and dimensional filters remain composable rather than appearing only in a special task view.
3. **Codify and caption together** as the Media warrants. Who, What, When, and Where record frame truth; the optional caption records the Media item's micro-story.
4. **Use the working set** by creating a Card, adding it to an existing Card, or leaving the Media organized for later.

### Library controls

- **Always-available filters** — Source, caption presence, shape, Card assignment status, exact source-byte match status, codification completeness, and Who/What/When/Where tags. These filters are server-backed and composable.
- **Status** — Means Assigned or Unassigned to one or more Cards. It does not represent import processing or codification completeness.
- **Codification** — Complete or Incomplete. Selecting Incomplete adds server-backed filters for unresolved dimension, batch, folder, and metadata outcome; it does not remove ordinary dimensional filters. An author can, for example, filter Where = Charleston and then resolve missing What assignments. Leaving Incomplete clears every hidden workflow filter and pile state.
- **Grouping** — None, import batch, source folder, metadata outcome, and capture day. The interface loads the entire matching result before presenting groups. Face and Similar are deferred until their evidence systems exist.
- **Contextual vocabulary** — Applying or correcting existing tags and identities remains available in the Library. Structural merge, split, reparent, relationship, alias, and destructive vocabulary work belongs to the fuller governance surface.
- **Story progression** — Selection leads directly to creating a Card or adding to an existing Card without making Card participation part of codification truth.

### Piles and genuine suggestions

Current suggested piles are deterministic groupings by capture day plus folder, capture day, folder, or identical Who assignments. Those groupings are reproducible through the unified Library and should not be presented as novel suggestions.

Piles therefore leave the target primary information hierarchy. Until a bounded implementation is approved, their shipped behavior remains intact. That implementation must decide whether to retain a plainly named persistent working set for manual membership adjustment and Card creation. Future Face and Similar evidence may provide suggestions that cannot be reproduced through ordinary Library filters and grouping.

### Completion and access contracts

- Who, What, When, and Where each require a substantive tag, Unknown, or Not applicable for the Media item to be Complete.
- Incomplete Media remains available for Cards; Media selection can include, exclude, or exclusively show incomplete items.
- Whether Media participates in zero, one, or several Cards is relationship information, not a codification status.
- Folder grouping may be weak semantic evidence for dimensional tags while remaining useful evidence of an intended Card grouping.
- Assistance mechanisms such as exact-match evidence, stacks, imported mappings, and future face or similarity results remain supporting tools; they do not define the Library's primary mental model. Exact matches are an ordinary Library filter, not a separate review workspace.
- The unified Library control hierarchy must be tested with at least one representative new user before major Studio ownership changes are considered complete.

### Approved Vocabulary direction

- Preserve the existing hierarchical assignment engine: direct child assignments aggregate to ancestor filters and counts.
- A Who parent node may be a stable, directly assignable aggregate. Its nested names and imported variants are also directly assignable and remain exact-filterable; no separate visible Person type is required.
- The author may keep multiple variants or preview and consolidate selected variants into one corrected tag. Consolidation requires an auditable, recoverable migration across Media, Cards, Questions, subjects, counts, derived fields, and search.
- Parent and partner are the only currently contemplated relationship facts. They are optional, attach to selected Who tag IDs, and do not block ordinary Who assignment.
- Do not add Grandparent, Parent, Sibling, Couple, Family, or Household as target assignment entities. Any/OR and All/AND filters replace stored Groups; Collections own authored narrative groupings.
- Face evidence resolves provisionally to a canonical Who tag. The author confirms the applicable aggregate or nested-name assignment.
- Apply the common hierarchy rule to What, When, and Where: meaningful parent and child nodes may be assigned; descendants aggregate upward; an explicitly navigational node may be filter-only.
- Use Childhood and Parenthood as What tags combined with Who and When. Automatic identity-relative life-stage filters are outside the current target.
- Treat the selected canonical Who tag ID as the identity reference without requiring Person/Name or human/non-human typing. Relationship, perspective, migration, and future face-evidence references use that ID directly. Optional profile data may use a sidecar keyed by the same ID, but it is not a second identity. Preserve existing Person records until the manifested compatibility migration and rollback proof are complete.

## Earlier target-journey draft

The four-stage draft below records the prior definition work. The approved unified Library direction above supersedes it for Media interface design but does not independently authorize implementation.

## Target journey

The target is a resumable work system, not a mandatory wizard. It has four user-facing stages and a permanent expert library.

### 1. Add

- Choose the source type: local folders/files, supported provider export, or another explicitly supported path.
- Show concise preparation requirements before browsing, including what metadata and sidecars are supported.
- Preview files, source structure, metadata availability, likely duplicate reuse, and keyword/person evidence before committing.
- Import as one durable batch with truthful progress and safe interruption.

### 2. Understand

- Land on the completed or interrupted batch, not the undifferentiated whole library.
- Summarize what the system preserved, derived, reused, could not read, and needs the author to decide.
- Separate healthy background processing from errors. Do not show zero, empty, or failure states until they are authoritative.
- Offer one recommended next action based on actual evidence, while allowing Skip for now and Go to library.

### 3. Organize

- Work through evidence-based review units: unmapped terms, unknown or suggested people, useful dates/places, captions, exact duplicates, or candidate story groups.
- Present only the controls needed for the current review unit.
- Confirmed facts use the approved dimensional and identity model. Suggestions retain provenance and remain provisional until accepted.
- Allow batch decisions with per-item exceptions and preserve progress after every bounded action.

### 4. Tell and use

- At natural grouping points, offer Create Gallery/Card, Add to existing Card, write or improve captions, or Finish for now.
- Show that Media organization is useful even without exhaustive classification.
- Preserve the selected Media and confirmed work when moving into Compose and provide a clear return to remaining review.

### Library

The permanent Library is the direct expert entry to all Media. It owns browse, search, filters, grouping, density, selection, and contextual operations. Intake and Review link into filtered Library states when that is the clearest presentation; they do not create another Media truth.

## Proposed information architecture

Within Studio Media:

- **Add media** — Primary action, always available.
- **Resume review** — Primary when unresolved or interrupted work exists; states the number and kind of work items without using an alarming total.
- **Library** — Default experienced-author browse surface.
- **Batches** — Import history, readiness, provenance, and batch summaries.
- **Review** — Prioritized work queue containing import mapping, identity candidates, exact duplicates, processing failures, and other confirmed review categories.

Within Studio Organize:

- **Tags** — Advanced Who/What/When/Where taxonomy administration.
- **Who tag actions** — Optional perspective and relationships for individual Who tags; names, aliases, and aggregates remain in the tag hierarchy.
- **Collections** — Authored Guided reading structure.

Ordinary Media assignment opens focused tag selection without opening Studio Organize. Organize defines the vocabulary and optional Who relationships; Media applies tags to frames; Cards apply or inherit them for stories.

## Rules for progressive disclosure

1. Do not show an advanced mechanism merely because it exists.
2. Present one recommended action, not one compulsory action.
3. Show why a review item exists and whether acting changes confirmed truth.
4. Keep Browse available throughout; onboarding never traps the user.
5. Preserve direct expert access to Library, Tags, and Collections, with optional Who relationships available from tag actions.
6. Keep integrity/recovery tools out of the ordinary author path unless a detected problem requires them.
7. Do not promote piles, stacks, grouping, or face recognition to top-level concepts until the user job they solve is clear.
8. Never use a loading placeholder that asserts an empty archive, empty batch, missing collection, or failed import.

## Target journey decisions still requiring author approval

- Whether `Library`, `Batches`, and `Review` are the right visible names.
- Whether Add, Understand, Organize, and Tell are visible stage labels or an internal design model expressed through contextual next actions.
- Whether Story piles remain a named advanced tool or become one implementation behind suggested story groups.
- Whether the large legacy tag tree remains in Tags with canonical/legacy distinctions or moves to a dedicated migration view.
- What counts as the first successful session for usability testing.

## Next definition slice

Resolve the target-journey decisions above, then create low-risk implementation slices beginning with truthful loading/empty-state precedence and a non-destructive batch/resume summary. No existing control moves and no new automation begins until the visible information architecture is author-approved.
