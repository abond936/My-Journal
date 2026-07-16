# APPLICATION

This document is the human-governable product agreement. It describes capabilities, status, and only the contracts that materially constrain implementation.

Legend: `✅ Complete` · `⭕1 Planned` · `⭕2 Future` · `❓ Open` · `📋 Contract`

---

## Application

*Intent* — Help an author organize family media, connect it to stories, and deliver those stories privately through a mobile Reader.

*Principles*

- **Purpose** — Relive, enjoy, and learn from meaningful moments.
- **Private** — One author controls a private archive for named readers.
- **Integrated** — Media, stories, tags, questions, and collections form one product.
- **Assisted** — The system suggests; the author confirms.
- **Responsive** — Reader is mobile-first; Administration is desktop-primary.

✅ **Complete**

- **Reader** — Published stories and media in Freeform and Guided experiences.
- **Administration** — Protected Studio, Users, Themes, Settings, and operations.
- **Content** — Story, Gallery, Question, and Callout forms.

⭕2 **Future**

- **Tenancy** — Multiple isolated customer archives.
- **Sharing** — Access models beyond named private readers.

📋 **Contracts**

- One administrator authors and operates the archive; readers consume published content.
- Draft and operational content never appear to readers.
- Product truth is shared across Reader and Administration; surfaces do not maintain competing models.

---

## Navigation

*Intent* — Move readers and authors among public entry, Reader, detail, search, and authorized Administration without losing context.

*Principles*

- **Role-aware** — Readers never receive administrative destinations.
- **Contextual** — Back and return behavior preserves the path that brought the user there.
- **Responsive** — Desktop and mobile navigation express the same information architecture appropriately.

✅ **Complete**

- **Entry** — Public landing and credential sign-in.
- **Reader** — Top and left navigation for Reader destinations and filters.
- **Administration** — Authorized routes to Studio and specialist surfaces.

📋 **Contracts**

- `/` is public; `/login` is the single authentication entry; `/view` is the default authenticated Reader destination.
- Navigation state must not corrupt browser history or unexpectedly return an authenticated user to the landing page.
- Menu links open their owning surfaces rather than embedding their behavior.

### Landing Page

*Intent* — Explain who My Stories is for, what problem it solves, and why it matters before asking someone to sign in.

✅ **Complete**

- **Landing** — Public product entry with sign-in path.

⭕1 **Planned**

- **Messaging** — Reconcile the page around the agreed product purpose and audience.
- **Brand** — Complete approved identity assets and presentation.
- **Packaging** — Explain the hosted product and commercial offer when settled.
- **Access** — Make invitation and sign-in expectations clear.

❓ **Open**

- **Audience** — Final public language for the initial customer beyond the current author-first framing.

### Sign-in

*Intent* — Provide a clear, private entry for readers and the administrator.

✅ **Complete**

- **Credentials** — Username and password authentication.
- **Routing** — Safe callback destination with `/view` fallback.
- **Errors** — Generic authentication failure without account disclosure.

📋 **Contracts**

- No public signup in v1.
- Successful sign-in returns to a safe internal destination; unsafe callbacks are rejected.
- Role authorization is enforced server-side after authentication.

### Top Navigation

*Intent* — Provide compact global navigation, appearance, account, and role-authorized entry points.

✅ **Complete**

- **Header** — Reader identity, appearance control, menu, and sign-out.
- **Admin entry** — Authorized access to administrative surfaces.

⭕1 **Planned**

- **Hierarchy** — Finalize Home, Reader, Studio, Users, Settings, Help, appearance, and sign-out structure.
- **History** — Correct mobile Back and edge-swipe behavior.
- **Return** — Preserve safe contextual return paths.
- **Appearance** — Complete Reader theme and mode controls.

⭕2 **Future**

- **Help** — Product guidance beyond essential contextual copy.

### Left Navigation

*Intent* — Support Freeform discovery and Guided authored navigation without turning the Reader into an administrative workspace.

✅ **Complete**

- **Modes** — Freeform and Guided navigation.
- **Filters** — Dimensional tag filtering and Subject-only scope.
- **Collections** — Published authored tree in Guided mode.
- **Admin tags** — Focused tag assignment correction for the administrator.

⭕1 **Planned**

- **Hierarchy** — Clarify mode, filter, collection, and administrative controls.
- **Mobile** — Improve drawer interaction without breaking browser gestures.
- **Editing** — Preserve focused correction without exposing full taxonomy management.

⭕2 **Future**

- **Grouping** — Additional Reader grouping or sorting only when it improves discovery.

📋 **Contracts**

- Freeform uses filters and discovery; Guided uses published collection structure and order.
- Author editing in Reader is limited to focused content and assigned-tag correction.
- Full taxonomy structure remains in Studio Tags.

---

## Content

*Intent* — Present a visual story feed that feels familiar and inviting while preserving authored depth and archive context.

*Principles*

- **Visual** — Media and concise framing lead into stories.
- **Flexible** — Freeform supports discovery; Guided supports authored sequence.
- **Type-aware** — Content forms share a system but retain meaningful differences.
- **Readable** — Long-form content favors sustained mobile reading.

✅ **Complete**

- **Feed** — Responsive visual story feed.
- **Forms** — Story, Gallery, Question, and Callout presentation.
- **Tags** — Who, What, When, and Where context on cards.
- **Continuation** — Freeform discovery and Guided child continuation.

📋 **Contracts**

- Question is a distinct content form; its Reader presentation remains defined here.
- Quote is not complete merely because schema or renderer scaffolding exists.
- Published content only; draft structure remains hidden.

### Content Page

*Intent* — Let readers scan and enter stories through clear, type-appropriate closed or inline cards.

✅ **Complete**

- **Story** — Closed Story preview with title, framing, media, and dimensional context.
- **Gallery** — Closed or inline ordered media presentation.
- **Question** — Prompt-led presentation for authored answers.
- **Callout** — Short emphasized content treatment.
- **Modes** — Navigate and Inline behavior where supported.
- **Chips** — Subject, single-tag, Mixed, empty, and full-assignment disclosure.

⭕1 **Planned**

- **Alignment** — Reconcile presentation across feed, detail, Compose, and compact previews.
- **Quote** — Define quotation, attribution, media, context, and open behavior.
- **Question** — Refine its type cue and typography.
- **Typography** — Standardize utility hierarchy across Question, Quote, and Callout.
- **Legibility** — Protect text and controls over variable imagery.
- **Discovery** — Complete related and broader Freeform rails.
- **Disclosure** — Improve Inline continuation without losing feed context.

⭕2 **Future**

- **Polish** — Additional Gallery indicators and feed-specific interactions.

📋 **Presentation**

| Form | Navigate | Inline | Status |
|---|---|---|---|
| Story | Preview opens detail | Expanded story in feed | ✅ |
| Gallery | Preview opens gallery detail | Swipeable gallery in feed | ✅ |
| Question | Prompt opens answer detail | Answer treatment in feed | ✅ |
| Callout | Emphasized short content | Emphasized short content | ✅ |
| Quote | Defined quotation treatment | Defined quotation treatment | ⭕1 |

### View Page

*Intent* — Provide focused story and gallery reading with clear continuation back into the archive.

✅ **Complete**

- **Story** — Full narrative and authored media.
- **Gallery** — Ordered gallery with captions, Swiper, and lightbox.
- **Question** — Prompt and answer detail.
- **Callout** — Expanded emphasized content.
- **Guided** — Read More with authored children.
- **Freeform** — Related and broader discovery rails.

⭕1 **Planned**

- **Presentation** — Reconcile hierarchy and spacing across forms.
- **Quote** — Complete open quotation behavior.
- **Typography** — Validate long-form editorial treatments.
- **Continuation** — Distinguish Guided children from Freeform discovery.

⭕2 **Future**

- **Mosaic** — Optional Gallery mosaic in addition to ordered viewing.

📋 **Contracts**

- Guided continuation uses authored children in order.
- Freeform ends with related content and broader discovery.
- Gallery order and captions remain those authored on the card.
- Opening from a collection retains enough path context to continue that path.

---

## Administration

*Intent* — Give one author a coherent workspace for building, organizing, protecting, and operating the archive.

*Principles*

- **Studio** — Cards, Compose, Media, Questions, Tags, and Collections form the daily authoring workspace.
- **Specialists** — Users, Themes, and Settings remain dedicated administrative surfaces.
- **Truthful state** — Progress, selection, errors, saves, and background work reflect actual state.
- **Safe change** — Destructive or cross-entity actions are explicit and recoverable where possible.

✅ **Complete**

- **Studio** — Unified multi-pane authoring environment.
- **Users** — Reader account administration.
- **Themes** — Governed theme authoring workspace.
- **Settings** — Archive preferences and operations.
- **Suggestions** — Provisional grouping and tag assistance separated from confirmed truth.

⭕1 **Planned**

- **Consistency** — Align progress, errors, selection, filters, and drag behavior across Studio.
- **Hierarchy** — Reduce unnecessary visual layers while preserving workspace ownership.
- **Boundary** — Keep full taxonomy management in Studio and focused correction in Reader.

⭕2 **Future**

- **Deduplication** — Share safe repeated administrative reads without obscuring mutation reconciliation.

📋 **Suggestions**

- Provisional suggestions never affect counts, filters, cards, or Reader truth until accepted.
- Pending suggestions remain until accepted or dismissed; reruns may update only unconfirmed suggestions.
- Dismissed suggestions do not reappear from the same analysis unless the author explicitly rebuilds them.
- Acceptance uses the same confirmed mutation path as manual work.

### Studio Cards

*Intent* — Find, compare, select, and manage cards across the archive.

✅ **Complete**

- **Grid** — Searchable, filterable card population with status and type context.
- **Selection** — Individual and bulk selection with bounded actions.
- **Filters** — Status, form, dimensions, tags, subject scope, and assignment-related refinements.
- **Forms** — Story, Gallery, Question, and Callout management.
- **Subjects** — Card subject authoring.
- **Compose** — Open the selected card for full authoring.

⭕1 **Planned**

- **Density** — Reduce tile footprint while preserving legibility and selection.
- **Tags** — Improve keyboard use, hierarchy, and disambiguation.
- **Filters** — Provide clearer single-dimension search without removing advanced filtering.
- **Quote** — Add Quote only with the completed Quote object.

⭕2 **Future**

- **Mosaic** — Richer card comparison layouts if archive scale warrants them.

❓ **Open**

- **Suggestions** — Whether the former Media-derived suggestion workflow has any remaining role in canonical Studio.

### Studio Compose

*Intent* — Author one card completely while retaining access to its media, tags, relationships, and Reader result.

✅ **Complete**

- **Content** — Title, subtitle, excerpt, body, status, and form-appropriate fields.
- **Editor** — Rich text with paste, drop, and library media insertion.
- **Cover** — Cover selection and framing.
- **Gallery** — Ordered membership, captions, insertion, and reorder.
- **Tags** — Dimensional assignment and subject designation.
- **Children** — Attach, remove, and order structural children.
- **Preview** — Reader-oriented presentation preview.

⭕1 **Planned**

- **Guidance** — Clarify the roles of title, subtitle, excerpt, and body.
- **Alignment** — Reconcile Compose, Reader, and compact previews.
- **Reader edit** — Align focused Reader editing with overlapping Compose fields.
- **Editorial** — Add deliberate long-form presentation controls where approved.
- **Context** — Keep historical context assistance distinct from writing rewrites.
- **Quote** — Define and implement Quote authoring.

⭕2 **Future**

- **Mosaic** — Author a Gallery mosaic if Reader adopts it.
- **Assistance** — Advanced authoring help beyond approved v1 guidance.

📋 **Contracts**

- Compose edits card work truth; it never silently rewrites source-media truth.
- Cover, Gallery, body, children, and tags remain explicit relationships.
- Unsaved-work transitions require confirmation.
- Drag targets have distinct meaning: Cover replaces, Gallery appends, body inserts, Children attaches.
- Story Assist is editorial, voice-preserving, and suggestion-only; guides may shape tone but never invent facts.

### Studio Organize

*Intent* — Provide one place to describe the archive with Tags and structure it with Collections.

✅ **Complete**

- **Tags** — Dimensional taxonomy workspace.
- **Collections** — Curated structure workspace.
- **Switching** — Distinct contexts within one Organize area.
- **Import map** — Reconcile operational import tags into the taxonomy.

📋 **Contracts**

- Tags describe content; Collections arrange authored reading paths.
- The two systems cooperate but never merge into one model.
- Each workspace retains its own selection and filters.

### Studio Tags

*Intent* — Describe cards and media through one Who, What, When, and Where language.

*Principles*

- **Shared library** — Cards and media use one hierarchy but retain separate assignments.
- **Two truths** — Media records frame truth; cards record story work truth.
- **Confirmed** — Reader-facing tag truth requires author action, accepted suggestion, or enabled inheritance.
- **Subject** — Subject emphasizes an assigned tag; it is not a fifth dimension.

✅ **Complete**

- **Taxonomy** — Hierarchical Who, What, When, and Where management.
- **Assignment** — Card and media tagging across supported surfaces.
- **Subjects** — Subject authoring and Subject-only filtering.
- **Inheritance** — Author-controlled per-dimension Gallery-media rollup with existing-card protection, Unreviewed precedence, overrides, subjects, and reconciled projections.
- **Counts** — Confirmed card and media usage counts.
- **Mapping** — Import-tag preview and confirmed remapping.
- **Starter set** — Optional additive Tag Set 0.
- **Reader filters** — Any assigned and Subject only.
- **Reliability** — Shared modal ownership, exact lookup, scoped filters, and post-save reconciliation.
- **Integrity** — Canonical hierarchy with reconciled paths, counts, derived fields, and search projections.
- **Identities** — Stable human and non-human subjects with canonical names, aliases, details, and editing.
- **Relationships** — Parent, spouse, and partner records with archive perspective and contextual role resolution.
- **Groups** — Typed couples, families, and households without duplicate people.
- **Migration** — Manifested, reviewed identity conversion with audit and rollback evidence.

⭕1 **Planned**

- **Merge/split** — Define and implement recoverable identity correction without silently changing assignments.
- **Shortcuts** — Direct Who, What, When, and Where navigation.
- **Density** — Tighten the tree without weakening drag targets.
- **Affordance** — Replace generic edit iconography.

⭕2 **Future**

- **Aggregation** — Suggest and apply useful tag summaries.
- **Faces** — Suggest Who assignments through face recognition.
- **Exclusion** — Add include and exclude filtering.
- **Keyboard** — Complete advanced taxonomy keyboard and drag interaction.

📋 **Contracts**

- Reflections live under What; operational import branches are not normal author or Reader vocabulary.
- Who represents stable human and non-human named identities; What covers events, activities, and Reflections; When uses sortable chronology; Where supports geographic and venue hierarchy.
- Each named subject has one stable identity; canonical and historical names remain searchable aliases of that identity.
- Mother, Father, Parent, Sibling, Grandparent, and similar human roles are contextual relationships resolved from an explicit human perspective.
- Multiple people may be subjects; a meaningful couple, family, or household is an explicitly typed group rather than a duplicate person.
- `parentId` is taxonomy authority; paths, counts, dimensional fields, and search records are derived projections that must reconcile to it.
- Existing assignments are never renamed, merged, deleted, or reinterpreted without an author-reviewed migration with affected-object counts and recovery evidence.
- Provisional assignments do not affect counts, filtering, or presentation.
- Gallery inheritance has independent Who, What, When, and Where controls. Onboarding explains them and requires an explicit author selection; no dimension is implicitly enabled.
- Delivered inheritance applies the deduplicated union of confirmed Gallery-media tags to enabled card dimensions.
- Existing card assignments begin as per-dimension overrides and do not change when inheritance is configured. Releasing an override re-inherits current Gallery-media truth.
- Cards do not inherit tags from parent or child cards.
- Closed tiles show the exact tag for a single assignment, `Multiple` for several assignments without an explicit subject, the selected tag name for one explicit subject, `Subjects+` for multiple explicit subjects, or `-` when empty; tooltips disclose the assigned tags and selected subjects, and presentation labels are not tags.
- Question tags classify prompts; answer-card tags copy at creation and then diverge.
- Future face processing prefers a quality cloud service for the initial private-family use case unless privacy or quality requires another model.

### Collections

*Intent* — Arrange cards into authored Guided reading paths without changing the underlying content.

✅ **Complete**

- **Roots** — Promote, remove, and order collection roots.
- **Structure** — Attach, detach, nest, and order cards.
- **Multiparent** — Place one card on multiple paths.
- **Cycles** — Reject direct and indirect cycles.
- **Drag** — Reorder and nest with distinct cues.
- **Compose** — Manage children while authoring.
- **Reader** — Project published structure into Guided navigation.

📋 **Contracts**

- Collections are ordered card relationships, not a content type.
- Root and sibling order are author-controlled.
- A multi-parent card appears once on each authored path but opens the same card document.
- Draft cards and subtrees remain hidden from readers.
- Collection relationships never imply tag assignments.

### Studio Questions

*Intent* — Maintain prompts that help the author begin meaningful Question stories.

✅ **Complete**

- **Prompts** — Create, edit, search, tag, and delete unlinked prompts.
- **Filters** — Text, taxonomy, Assigned, Unassigned, Untagged, and descendant scope.
- **Answers** — Create or open the linked Question card in Compose.
- **Unlink** — Preserve the answer as a draft Story.

📋 **Contracts**

- A Question is a prompt; its Reader content lives in one linked Question card.
- A Question may have zero or one answer card; service enforcement is still Planned in `03`.
- The prompt supplies the initial title and tags; prompt and answer then evolve independently.
- A linked prompt cannot be deleted.
- Unlinking removes the relationship and converts the answer to a draft Story.

### Studio Media

*Intent* — Turn raw media into an organized, trustworthy archive ready for stories.

*Principles*

- **One bank** — Assets enter one canonical library and cards reference them.
- **Integrity** — Originals, metadata, identity, and relationships are preserved.
- **Workshop** — Tags, piles, stacks, and assignments prepare media for stories.
- **Confirmation** — Suggested organization remains provisional until accepted.

✅ **Complete**

- **Import** — Bank import, card-oriented folder tools, paste, and drop.
- **Browse** — Search, filters, grouping, batches, and population scopes.
- **Editing** — Captions, tags, subjects, positioning, and replace-in-place.
- **Assignment** — Cover, Gallery, and body relationships through drag or library selection.
- **Selection** — Bulk tags, subjects, and draft Gallery creation.
- **Protection** — Reference-aware deletion.
- **Renditions** — Optimized Reader and Studio images with originals retained.
- **Piles** — Provisional story grouping, correction, tagging, dismissal, and card creation.
- **Stacks** — Manual hero/member grouping without deleting assets.
- **Map preview** — Transient media view from import-tag mapping.

⭕1 **Planned**

- **Duplicates** — Review likely duplicates using source and content evidence.
- **Readiness** — Show truthful upload, processing, indexing, ready, and failure states.
- **Consistency** — Align Media with Cards interaction patterns.
- **Pile merge** — Merge and refine piles beyond moving individual members.
- **Bursts** — Suggest likely burst stacks for confirmation.
- **Derivatives** — Cover phone images, unusual formats, and every supported surface.
- **Apple Photos** — Import photos and videos with metadata, source identity, batches, and duplicate evidence.
- **Video** — Import, browse, assign, preview, process, and play video across Media, Compose, and Reader.

⭕2 **Future**

- **Adapters** — Google Photos and OneDrive after Apple Photos establishes the model.
- **External edit** — Managed export, external editing, and replacement round trip.
- **Similarity** — Suggest non-burst visual stacks.
- **Motion pairs** — Preserve related still and motion assets.
- **Reader stacks** — Let readers explore intentionally exposed stack members.

📋 **Contracts**

- PhotoPicker selects existing assets; folder import belongs to Studio Media.
- Assignment never removes media from the bank or alone controls Reader discovery.
- Media caption and tags are frame truth; card placement overrides are explicit and local.
- Delete checks every authoritative card surface; replace preserves identity and relationships.
- A pile is provisional, exclusive to one pending pile per item, append-only when rebuilt, and distinct from a stack.
- Applying pile tags confirms tags but does not accept the pile; dismissal deletes no media or confirmed tags.
- Pile tag suggestions default visible when the overlay opens; dismissing more than 40 members requires confirmation and returns them to Unsorted.
- A stack is author-confirmed, has one hero, can be dissolved without deleting members, and contributes one Gallery position during card creation unless explicitly expanded.
- Apple Photos is the first planned native adapter; export then import remains the interim path.
- Video follows image identity, tagging, assignment, reference, and deletion rules; it plays in Media, Compose placements, and Reader. Studio Cards may use a poster only. Video never autoplays with sound.

### User Management

*Intent* — Let the author control who can enter the private archive.

✅ **Complete**

- **Admin** — Initial administrator setup.
- **Readers** — Create individual reader accounts.
- **Status** — List, enable, and disable accounts.
- **Passwords** — Set a new temporary password.
- **Roles** — Enforce Reader and administrator boundaries.

⭕1 **Planned**

- **Revocation** — End existing authorization when an account is disabled.
- **Consistency** — Align the surface with Administration patterns.

⭕2 **Future**

- **Recovery** — Secure invitation, password setup, and recovery.

📋 **Contracts**

- One administrator; every other account is an individual reader.
- No public registration or reader promotion to administrator.
- Readers can access published Reader content but not Administration.
- Passwords are hashed, never retrievable, and never returned by APIs.
- v1 disables accounts rather than deleting them.

### Theme Management

*Intent* — Let the author shape the Reader while preserving one governed design system.

*Principles*

- **Reader first** — Theme serves reading comfort, tone, and immersion.
- **Governed** — Author customization uses approved values, roles, and recipes.
- **Distinct** — Reader and Administration share architecture but not necessarily presentation.
- **Live** — Actual Reader surfaces are the preview.

✅ **Complete**

- **Workspace** — Floating, draggable, resizable live editor.
- **Draft** — Live changes with Save and Discard.
- **Scopes** — Separate Reader and Administration settings.
- **Modes** — Light and dark editing foundations.
- **Themes** — Functioning Journal and Editorial foundations.
- **Editor** — Component, variant, attribute, and value selection.
- **Recipes** — Reusable values and semantic roles.
- **Persistence** — Structured saved data, generated variables, and fallback.

⭕1 **Planned**

- **Standardization** — Restore one path from approved values through roles and recipes to surfaces.
- **Enforcement** — Remove bypasses, competing aliases, duplicated variables, and local design systems.
- **Coverage** — Reconcile surfaces, editor, schema, generator, runtime, and components.
- **Journal** — Complete and validate Light and Dark.
- **Editorial** — Complete and validate Light and Dark.
- **Reader choice** — Let each reader select theme and mode.
- **Persistence** — Preserve each reader's choice independently.
- **Administration** — Establish one coherent administrative presentation.
- **States** — Standardize success, warning, error, information, focus, disabled, selected, and destructive states.
- **Usability** — Improve the workbench after the contract is stable.

⭕2 **Future**

- **Themes** — Additional named packages with distinct purposes.
- **Portability** — Export and import validated packages.

📋 **Contracts**

- Required Reader outcomes are Journal Light, Journal Dark, Editorial Light, and Editorial Dark.
- Completion requires representative mobile and desktop validation across Reader surfaces and states.
- Readers select only their own theme and mode; they never alter package definitions or Administration.
- Administration has one coherent v1 presentation and is not a substitute Reader preview.
- Components consume approved recipes or semantic roles; new roles require coordinated system changes.
- Save persists; Discard restores; switching with unsaved work cannot silently save or lose it.

### Settings

*Intent* — Configure archive-wide preferences and guarded operations without becoming a catch-all.

✅ **Complete**

- **Taxonomy** — Install or remove optional additive Tag Set 0.
- **Inheritance** — Per-dimension gallery-to-card controls.
- **Backup** — Status and supported paired backup execution.
- **Restore** — Guarded command-line guidance.
- **Index** — Search-index health and refresh.

⭕1 **Planned**

- **Organization** — Separate Reader preferences, author configuration, and protected operations.
- **Appearance** — Reader selection of Journal or Editorial and Light or Dark.
- **Persistence** — Preserve each reader's selection independently.
- **Account** — Add appropriate signed-in account entry points.
- **Activation** — Explain inheritance overwrite behavior and synchronize existing cards when enabled.

⭕2 **Future**

- **Recovery** — Reader password setup or recovery through secure delivery.
- **Hosting** — Hosted backup and operations without weaker safeguards.

📋 **Contracts**

- Reader preferences are reader-accessible; archive configuration and operations are administrator-only.
- Settings links to Theme, Tags, Media, and Users rather than duplicating their management tools.
- Tag Set 0 is optional, additive, conflict-safe, removable by install identity, and assigns nothing automatically; its starter vocabulary covers common family roles, topics, dates, and US locations.
- Inheritance controls are off by default and follow the Studio Tags contract.
- A complete backup pairs Firestore and Storage; partial work is not success.
- Restore is not executed from the application in v1.
- Index refresh never silently rebuilds or mutates the index.
