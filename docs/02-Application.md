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
- **Hierarchy** — Ordered Home, Reader, role-authorized Studio, Users, Settings, Theme, contextual Light/Dark action, Account, and sign-out destinations without development landing-page variants.
- **History** — Native mobile browser edge navigation is not intercepted by the closed Reader sidebar.
- **Return** — Reader detail preserves safe feed, search, query, card-focus, and scroll context with direct-entry fallback.
- **Appearance** — The quick account-backed action offers Light with a sun when Dark is active and Dark with a moon when Light is active; Account retains the personal placeholder.

⭕2 **Future**

- **Help** — Product guidance beyond essential contextual copy.

### Left Navigation

*Intent* — Support Freeform discovery and Guided authored navigation without turning the Reader into an administrative workspace.

✅ **Complete**

- **Modes** — Freeform and Guided navigation.
- **Filters** — Dimensional tag filtering and Subject-only scope.
- **Collections** — Published authored tree in Guided mode.
- **Author editing** — Administrator-only entry to edit the current card and its visible media without leaving Reader context.

⭕1 **Planned**

- **Hierarchy** — Clarify mode, filter, collection, and administrative controls.
- **Mobile** — Improve drawer interaction without breaking browser gestures.

⭕2 **Future**

- **Grouping** — Reconsider only through truthful archive-wide group inventory and per-group pagination; do not group a partially loaded Reader batch.

📋 **Contracts**

- Freeform uses filters and discovery; Guided uses published collection structure and order.
- Viewing users are read-only; Reader mutations remain administrator-authorized server-side.
- Authors may edit the current card and visible media as fully as practical while preserving their Reader position.
- Studio remains the primary workspace for archive-wide, bulk, and taxonomy-structure operations; Reader retains contextual assignment and correction.

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
- Navigate, Inline, and Static govern presentation in the Content Grid; contextual destination rails may represent any published type as a compact link without changing its authored presentation.

### Content Page

*Intent* — Let readers scan and enter stories through clear, type-appropriate closed or inline cards.

✅ **Complete**

- **Story** — Closed Story preview with title, framing, media, and dimensional context.
- **Gallery** — Closed or inline ordered media presentation.
- **Question** — Prompt-led presentation for authored answers.
- **Callout** — Square emphasized-content tile with its complete bounded body, dimensional chip strip, and standard Reader Edit position. Compose measures the rendered minimum-width tile and requires overflowing content to be shortened or changed to Story rather than clipped.
- **Modes** — Navigate and Inline behavior where supported.
- **Chips** — Subject, single-tag, Mixed, empty, and full-assignment disclosure.
- **Tile chrome** — Shared corner grammar keeps selection or Reader identity upper-left, deletion upper-right, editing lower-right, and surface-specific status/content lower-left. Studio uses upper-left for Select; Reader, which has no Select or Delete, uses upper-left for Type and Gallery `x/y`, leaving the image bottom for a bounded active-slide caption. Unsupported controls remain absent.
- **Reader Gallery data** — Reader feed and search cards receive covers plus the complete authored Gallery sequence required for image peeking, swiping, captions, and truthful `x/y` position. Lightweight Administration lists may remain cover-only; feed efficiency may not reduce a Gallery to a thumbnail.
- **Gallery image chrome** — Type and `x/y` share the image upper-left. An active caption uses at most three feed lines at the image bottom, retains its full accessible text and full detail presentation, and reserves the administrator Edit corner. Image chrome uses a paired theme foreground/background treatment whose contrast remains stable in Light and Dark.
- **Alignment** — Content Grid, detail, Compose preview, Explore More, and Read More share the Reader renderer while retaining their legitimate contextual differences.
- **Legibility** — Story titles remain below imagery; image badges, Gallery position, Gallery captions, administrator Edit, and the covered Question cue use stable contrast treatments.
- **Large RTE figures** — Large authored figures place following text below the image; medium, small, and extra-small figures retain optional side wrapping.
- **Discovery** — Freeform provides deduplicated Related and Unrelated exploration without presenting a meaningless Related rail for dimensionally untagged cards.
- **Disclosure** — Gallery Inline is consumed as a swipeable gallery in the feed. Question Reveal discloses and restores its bounded answer on activation. Other forms use their defined Navigate or Static behavior.

✅ **Explore destination tiles**

- Explore More includes every published card type as a compact linked destination, including cards authored as Inline or Static in the Content Grid.
- Explore tiles use a readable compact Who, What, When, and Where chip row, open detail directly, and preserve the originating detail page as the return destination.
- For a card with at least one Who, What, When, or Where tag, **Related** uses the existing shared-dimension discovery behavior. A card with no dimensional tags does not show a meaningless Related rail; **Unrelated** remains available for broad exploration. Generated Related and Unrelated results must not repeat the current card, its excluded children, or one another.
- Administrator Edit uses the compact tile image's lower-right corner without changing the destination, child eligibility, or stored presentation.

✅ **Question Open and Reveal**

- Question remains visibly distinct with a question-mark cue whether or not it has a cover. No-cover Content Grid, Reveal, Compose preview, open detail, Explore More, and Read More Question faces use one container-relative watermark and prompt scale; longer prompts receive bounded fitting without changing the surrounding tile.
- Question authoring presents its stored Navigate and Inline modes as **Open** and **Reveal**. Open uses the prompt-led tile and opens the complete answer detail.
- Reveal is one bounded card with two dissolving faces. The initial question face owns the cover, question cue, prompt, and dimensional chips. Reader activation reveals the RTE answer as one vertically and horizontally centered content group without chips; activating the answer background restores the question.
- A Reveal answer may contain concise rich text, one embedded image with caption, and card mentions. Mention activation navigates to the referenced card rather than restoring the question.
- Compose measures the actual Reader answer face at the minimum supported card width. An empty, multi-image, or overflowing answer must be shortened or changed to Open rather than clipped or silently changing presentation.

✅ **Compose Reader preview**

- Compose uses the actual noninteractive Reader card renderer for all valid Navigate, Inline, and Static type combinations, including cards without covers.
- The preview reflects unsaved content and live cover framing without adding Reader navigation or editing actions; the separate Administration tile shell remains owned by the Studio Cards grid.

✅ **Read More destinations**

- Story-detail Read More treats every authored child type as a medium linked destination, including children authored as Inline or Static in the Content Grid.
- Read More preserves authored child order, standard dimensional chips, the parent detail return destination, and each child card's stored Content Grid presentation.

⭕2 **Future**

- **Quote (parked)** — Define quotation, attribution, media, context, and open behavior when Quote returns to the active sequence; current renderer scaffolding is not the final product.
- **Utility typography (parked with Quote)** — Revisit cross-type Question, Quote, and Callout hierarchy when Quote is active rather than redesigning stable treatments around an unfinished type.
- **Polish** — Additional Gallery indicators and feed-specific interactions.

📋 **Presentation**

| Form | Navigate | Inline | Static | Status |
|---|---|---|---|---|
| Story | Preview opens detail | — | — | ✅ |
| Gallery | Preview opens gallery detail | Swipeable gallery in feed | — | ✅ |
| Question | Prompt opens answer detail | Click to reveal and restore a bounded answer | — | ✅ |
| Callout | — | — | Square emphasized content; bounded by rendered fit | ✅ |
| Quote | — | — | Renderer scaffolding only | Parked |

### View Page

*Intent* — Provide focused story and gallery reading with clear continuation back into the archive.

✅ **Complete**

- **Story** — Full narrative and authored media.
- **Gallery** — Ordered gallery with captions, Swiper, and lightbox.
- **Question** — Prompt and answer detail.
- **Callout** — Expanded destination that preserves the static Callout's surface, typography, spacing, and centered pushpin watermark while providing room for the complete authored title, subtitle, and body.
- **Guided** — Read More with authored children.
- **Freeform** — Related and broader discovery rails.
- **Mode continuity** — A detail URL's valid Guided or Freeform mode governs the visible sidebar state and every continuation destination on that page without overwriting the saved feed preference. Guided children remain Guided; Freeform discovery remains Freeform.
- **Shared Story and Gallery reading structure** — Both resolve a selected cover as the hero, falling back to the first authored Gallery image for a Gallery without a cover. They then present Type as a kicker, Title, optional Subtitle, dimensional Tags, optional authored content, deduplicated remaining media, and continuation. Media tell concise stories through captions; Cards add longer-form story through optional content. Story remains narrative-led and Gallery media-led. The hero is removed from the lower sequence by media identity, original numbering is preserved, and the complete sequence remains available in the lightbox.
- **Long-form reading measure** — Story and Gallery body copy uses a left-aligned `68ch` maximum measure on wide screens with explicit editorial heading, list, paragraph, and quotation spacing. Figures and other media retain the wider detail canvas, while narrow screens naturally use the available width.
- **Contextual editing** — Administrators receive the shared white-pencil-on-black Edit control rather than a separate text-link treatment.
- **Question hierarchy** — No-cover Question faces preserve the same watermark and prompt proportions across the Content Grid, open detail, Compose preview, Reveal, Explore More, and Read More. The main-grid watermark is approximately 15% larger than its former maximum, and compact and open contexts scale from that baseline rather than using independently tuned viewport values. Long prompts remain contained through shared length-aware fitting.

⭕2 **Future**

- **Quote (parked)** — Complete open quotation behavior when Quote returns to the active sequence.
- **Mosaic** — Optional Gallery mosaic in addition to ordered viewing.

📋 **Contracts**

- Guided continuation uses authored children in order.
- Freeform ends with related content and broader discovery.
- A valid detail-route mode is authoritative for that page's sidebar and outgoing destinations; missing or invalid mode falls back to the saved Reader preference.
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
- **Shell** — Coherent entry and primary navigation for Studio, Users, Settings, and Theme; specialist pages exclude Reader/Studio chrome.

⭕1 **Planned**

- **Feedback** — Standardize success, error, warning, progress, confirmation, and blocking behavior across the application.
- **Boundary** — Keep viewing users read-only, support practical in-context author editing in Reader, and retain archive-wide and bulk organization in Studio.

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
- **Search** — Title search is temporary task state, identifies active no-result queries, and provides direct clearing instead of silently reopening an empty pane.
- **Density** — A compact tile-size control opens continuous adjustment while retaining title, dimensional subjects, selection, and tag access at every permitted size.
- **Selection** — Individual and bulk selection with bounded actions.
- **Filters** — Status, form, dimensions, tags, subject scope, and assignment-related refinements.
- **Tag filtering** — Direct known-tag entry, independent Who/What/When/Where tree browsing, an explicit all-dimensions picker, and compact presence and subject-scope rules shared with Media.
- **Forms** — Story, Gallery, Question, and Callout management.
- **Subjects** — Card subject authoring.
- **Compose** — Open the selected card for full authoring.

⭕1 **Planned**

- **Tags** — Improve keyboard use, hierarchy, and disambiguation.
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

- **Guidance** — Explain field roles in Help when needed; do not add inline definitions to the authoring forms.
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
- **Selection** — Direct entry handles known tags; Who, What, When, and Where open focused assignment trees; and the full four-dimensional selector remains available for comprehensive and bulk classification. Individual Card, Media, and Question assignment preserves hidden dimensions and supports multiple subjects.
- **Integrity** — Canonical hierarchy with reconciled paths, counts, derived fields, and search projections.
- **Identities** — Stable human and non-human subjects with canonical names, aliases, details, and editing.
- **Relationships** — Parent, spouse, and partner records with archive perspective and contextual role resolution.
- **Groups** — Typed couples, families, and households without duplicate people.
- **Migration** — Manifested, reviewed identity conversion with audit and rollback evidence.
- **Management** — Direct dimension navigation, compact labeled actions, explicit rename and child creation, and keyboard-safe editing without weakening drag targets.

⭕1 **Planned**

- **Merge/split** — Define and implement recoverable identity correction without silently changing assignments.

⭕2 **Future**

- **Aggregation** — Suggest and apply useful tag summaries.
- **Faces** — Suggest Who assignments through face recognition.
- **Exclusion** — Add include and exclude filtering.
- **Keyboard** — Complete advanced taxonomy keyboard and drag interaction.

📋 **Contracts**

- Reflections live under What; operational import branches are not normal author or Reader vocabulary.
- Parenthood and Childhood may be stable What concepts when they describe story subject matter; a person's childhood, parenthood, or other life stage is identity-relative context rather than a universal assigned tag.
- Who represents stable human and non-human named identities; What covers events, activities, and Reflections; When uses sortable chronology; Where supports geographic and venue hierarchy.
- Each named subject has one stable identity; canonical and historical names remain searchable aliases of that identity.
- Mother, Father, Parent, Sibling, Grandparent, and similar human roles are contextual relationships resolved from an explicit human perspective.
- Relationship groups may organize Who browsing, but selecting through one assigns the stable identity rather than the relationship label. Existing relational-tag assignments remain unchanged until an author-reviewed migration.
- Identity-relative stages combine an identity with a dated or approximate period for presentation and filtering; they are not inherited as ordinary When tags.
- Multiple people may be subjects; a meaningful couple, family, or household is an explicitly typed group rather than a duplicate person.
- `parentId` is taxonomy authority; paths, counts, dimensional fields, and search records are derived projections that must reconcile to it.
- Existing assignments are never renamed, merged, deleted, or reinterpreted without an author-reviewed migration with affected-object counts and recovery evidence.
- Known tags use direct entry; clicking Who, What, When, or Where opens only that dimension without changing the others; the complete selector is reserved for comprehensive, initial, or bulk classification.
- Tags and subjects save as one assignment decision. Removing an assigned subject clears that subject; focused dimension work preserves every hidden dimension and its subjects.
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
- **Answers** — Transactionally create or open the sole linked Question card in Compose.
- **Unlink** — Preserve the answer as a draft Story.
- **Integrity** — Reject conflicting links, protect linked prompts from deletion, and atomically unlink and convert answers.

📋 **Contracts**

- A Question is a prompt; its Reader content lives in one linked Question card.
- A Question may have zero or one answer card; concurrent create requests resolve to that same card.
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
- **Identity evidence** — New imports retain source-byte SHA-256 identity and source provenance; concurrent exact matches reuse one canonical media record. Existing accessible local originals have verified evidence and uncontested registry entries.
- **Exact review** — An author queue presents records with identical source bytes and records Same asset, Keep both, or Defer without merging, deleting, or moving references.
- **Evidence classification** — Media without source-byte evidence can be explicitly classified as a missing local original or a source whose original bytes were not retained; stored renditions never substitute for original-byte evidence.
- **Readiness** — New imports durably report source, metadata, Studio rendition, Reader rendition, and search-index state; pending and failed work is visible without adding chrome to healthy media, and retry preserves the canonical asset.
- **Consistency** — Cards and Media share narrow search and empty-state recovery, consistent selection wording, and authoritative deletion-consequence disclosure where their bank operations overlap.
- **Pile merge** — Pending story piles can be merged transactionally into a chosen destination while preserving confirmed archive truth and retained source recovery evidence.
- **Derivatives** — Canonical sources produce orientation-correct Studio and Reader renditions with truthful readiness, retry, and surface-specific delivery across Administration and Reader.

⭕1 **Planned**

- **Duplicates** — Recover evidence where original source bytes are unavailable, extend review to likely matches, and reconcile confirmed same-asset records with recovery evidence.
- **Bursts (parked)** — Suggest likely burst stacks only after reliable original capture time and source-sequence evidence is persisted; import timestamps and filenames alone are insufficient.
- **Video (parked)** — Import, browse, assign, preview, process, and play video across Media, Compose, and Reader after User Management, Settings, Reader Experience, and Platform and commercial readiness establish a solid core application.

⭕2 **Future**

- **External library adapters (parked)** — Add provider-specific export guidance, explicit-selection import, or native companion access only after the core experience is proven. Apple Photos, Google Photos, OneDrive, and similar services are ingestion sources, not synchronized backing libraries.
- **External edit** — Managed export, external editing, and replacement round trip.
- **Similarity** — Suggest non-burst visual stacks.
- **Motion pairs** — Preserve related still and motion assets.
- **Reader stacks** — Let readers explore intentionally exposed stack members.

📋 **Contracts**

- PhotoPicker selects existing assets; folder import belongs to Studio Media.
- Assignment never removes media from the bank or alone controls Reader discovery.
- Media caption and tags are frame truth; card placement overrides are explicit and local.
- Delete checks every authoritative card surface; replace preserves identity and relationships.
- Exact source bytes or an exact provider asset identity may reuse one canonical asset. Filename, dates, dimensions, size, and visual similarity are review evidence only and never authorize automatic merging.
- Duplicate review decisions are Same asset, Keep both, or Defer. Keep-both decisions persist; same-asset reconciliation requires an explicit canonical asset and field-by-field conflict resolution before references move.
- A pile is provisional, exclusive to one pending pile per item, append-only when rebuilt, and distinct from a stack.
- Applying pile tags confirms tags but does not accept the pile; dismissal deletes no media or confirmed tags.
- Pile tag suggestions default visible when the overlay opens; dismissing more than 40 members requires confirmation and returns them to Unsorted.
- A stack is author-confirmed, has one hero, can be dissolved without deleting members, and contributes one Gallery position during card creation unless explicitly expanded.
- External photo libraries do not remain live backing stores in v1. Exported, locally available, or explicitly selected assets enter the same canonical import pipeline, which preserves available source identity and metadata and stores durable application-owned media.
- Video follows image identity, tagging, assignment, reference, and deletion rules; it plays in Media, Compose placements, and Reader. Studio Cards may use a poster only. Video never autoplays with sound.

### User Management

*Intent* — Let the author control who can enter the private archive.

✅ **Complete**

- **Admin** — Initial administrator setup.
- **Readers** — Create individual reader accounts.
- **Status** — List, enable, and disable accounts.
- **Passwords** — Set a new temporary password.
- **Roles** — Enforce Reader and administrator boundaries.
- **Revocation** — Revalidate JWT-backed account truth and end existing authorization on the next server request when an account is disabled or missing.
- **Consistency** — Use the current Administration shell, theme, feedback, confirmation, validation, table, spacing, and action patterns.

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
- **Predictable** — Every author-facing control states whether it changes a foundation, shared system, component, variant, or layout and which surfaces inherit it.
- **Macro first** — Central controls govern broad decisions such as typography, primary actions, shared Type chips, density, and grid spacing before narrower component overrides.
- **Guarded** — Theme controls express visual intent while responsive fitting, minimum readability, touch targets, overflow prevention, and accessibility remain enforced by the application.

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

- **Standardization** — Restore one path from approved values through roles and recipes to surfaces with visible inheritance and explicit overrides.
- **Enforcement** — Remove bypasses, competing aliases, duplicated variables, and local design systems.
- **Coverage** — Reconcile surfaces, editor, schema, generator, runtime, and components.
- **Foundations** — Provide centralized typography, palette, spacing, radius, shadow, and density decisions with understandable cascade impact.
- **Shared systems** — Expose coherent Primary action, secondary action, field, selected, destructive, feedback, dimensional-tag, Type-chip, caption, and image-control recipes.
- **Macro layout** — Expose meaningful layout controls such as Content Grid spacing without exposing responsive safety calculations as arbitrary styling.
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
- The authoring cascade is Foundation → Shared system → Component → Variant. Lower levels inherit unless they declare an intentional override.
- Typography distinguishes shared semantic jobs from component override slots. Card type alone does not create a separate default; Story, Gallery, and other component roles inherit shared typography until a product-relevant context or treatment is deliberately overridden.
- Primary action is one shared commit/proceed treatment. Selected navigation, selected filters, Edit, Delete, feedback actions, and media controls retain separate semantic ownership even when their current colors resemble Primary action.
- Reader Type chips use one shared visual recipe for background, text, border, and hover identity across the content grid, Explore More, Read More, opened-card context, and inline Gallery headers. Contexts may retain proportional font size, padding, and placement differences required by their available box; card type does not create a separate default treatment.
- Content Grid tile spacing is one authorable layout recipe selected from the governed spacing scale. It changes the gap between tiles on desktop and mobile without changing the fixed minimum tile width, Guided width limits, single-column mobile behavior, page padding, or rail spacing.
- The no-cover Question watermark uses one authorable opacity and proportional scale across the Content Grid, Reveal face, opened detail, destination rails, and Compose preview. Scale is bounded to 50–90%; prompt fitting, line clamps, optical centering, and overflow prevention remain component safeguards.
- Administration consumes explicit success, error, warning, and information semantic aliases compiled from the Administration theme scope. Admin panels, grids, forms, filters, Studio status, and shared app feedback use those aliases rather than Reader-named roles, undefined warning fallbacks, or legacy hard-coded state colors. Brand, dimensional-tag, image-overlay, selected-control, and destructive-action meanings remain separate.
- Active Journal and Editorial presets do not append post-recipe CSS overrides. Preset defaults live in the recipe data, so an authored live-draft or saved recipe remains authoritative while its preset metadata is active. Theme Management workbench chrome uses Administration aliases; Reader aliases are reserved for explicit Reader preview surfaces. Static delivery fallback, modal atomic safety fallbacks, Compose Reader preview aliases, and fixed image-action contrast are retained only at their documented boundaries.
- When a dirty Theme draft must be saved before switching presets, that intermediate save must not refresh the route. The current draft is persisted first and the requested preset is then applied as the active unsaved draft; route reconciliation must not restore the old preset over the requested selection.
- Theme persistence treats Firestore as the live durability boundary. In development, the secondary JSON snapshot is written atomically under ignored `.next/theme-data.backup.json` so Turbopack does not attempt to hot-reload a mutable compiled `theme-data.json` module. Production retains the repository fallback path. Compiler canaries must validate the normalized saved recipe contract rather than assume one preset's historical token value.
- Theme Management states the complete active Foundation/Content, component, variant, and attribute path above the editor. A dirty live draft displays a compact Unsaved changes status, and Discard requires shared confirmation before restoring the last saved Reader and Administration settings.
- Theme Management distinguishes authorable visual decisions from fixed behavioral and accessibility guardrails.
- Changing a control has a disclosed scope; a technically generated variable is not considered a complete author control when its inheritance and affected surfaces are unclear.
- Save persists; Discard restores; switching with unsaved work cannot silently save or lose it.

### Settings

*Intent* — Configure archive-wide preferences and guarded operations without becoming a catch-all.

✅ **Complete**

- **Taxonomy** — Install or remove optional additive Tag Set 0.
- **Inheritance** — Per-dimension gallery-to-card controls.
- **Backup** — Status and supported paired backup execution.
- **Restore** — Guarded command-line guidance.
- **Index** — Search-index health and refresh.
- **Organization** — Personal Reader preferences are separate from administrator archive configuration and protected operations.
- **Appearance** — Every signed-in user can select Light or Dark from Account or the global quick control; Journal/Editorial package selection remains owned by Theme Standardization until both packages can be stored and compiled truthfully.
- **Persistence** — Each reader's mode is stored independently by account, with browser preference only as an anonymous or unavailable-service fallback.
- **Account** — Account exposes signed-in identity and sign-out as a retained placeholder; Settings is reserved for administrator archive configuration.
- **Activation** — Inheritance consequences are explicit and previously released cards synchronize when settings change.

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
