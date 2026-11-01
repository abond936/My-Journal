# APPLICATION

This document is the human-governable product agreement. It describes capabilities, status, and only the contracts that materially constrain implementation.

Legend: `✅ Complete` · `⭕1 Planned` · `⭕2 Future` · `❓ Open` · `📋 Contract`

---

## Application

*Intent* — Help an author organize family media, connect it to stories, and deliver those stories privately through a mobile Reader.

*Principles*

- **Purpose** — Relive, enjoy, and learn from meaningful moments.
- **Private** — One author controls a private archive for named readers; future sharing begins from private work rather than a common raw-media pool.
- **Integrated** — Media, stories, tags, questions, and collections form one product.
- **Assisted** — The system suggests; the author confirms.
- **Responsive** — Reader is mobile-first; individual Story authorship is adaptive across phone and desktop; archive-scale Administration remains desktop-primary.

✅ **Complete**

- **Reader** — Published Cards and their deliberately referenced Media through Collection and Feed entry paths over the delivered curated and freeform reading mechanisms. The former raw Media browse path is now author-only and does not expose the private archive to ordinary readers.
- **Administration** — Protected Studio, Users, Themes, Settings, and operations.
- **Content** — Story, Gallery, Question, and Callout forms.
- **State communication** — Loading, empty, success, warning, error, and unavailable states appear only when true. Normal asynchronous work does not masquerade as missing data, and recoverable failures provide a useful next action where one exists.
- **Role-aware authenticated entry** — Safe internal callbacks remain authoritative. Without one, reader-only accounts enter Reader and the author-administrator enters Author Home; Reader remains available to the administrator through normal navigation.
- **Reader Home** — Fresh ordinary Reader entry offers Continue Reading when meaningful, Collections, Feed, and independently shared photo collections. It has no sidebar until the reader selects a path.

⭕2 **Future**

- **Personal and family spaces** — Private author workspaces may later publish selected stories into authorized shared family archives without exposing the author's complete Media library.
- **Family feed** — A chronological view of newly published family stories may complement archive exploration; it does not replace the structured archive or add engagement-driven social-network behavior.

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
- **Authenticated entry resolution** — Safe direct destinations resolve first; otherwise reader-only accounts enter `/view` and the author-administrator enters `/admin`.
- **Reader** — Top and left navigation for Reader destinations and filters.
- **Administration** — Authorized routes to Studio and specialist surfaces.
- **Reader paths** — Reader Home, Collections, and Feed are the principal Reader destinations. A returning active session may restore its exact reading context; a fresh entry exposes Continue without trapping the reader in the previous destination.

📋 **Contracts**

- `/` is public; `/login` is the single authentication entry; `/view` is the default reader-only destination and `/admin` is the default administrator destination.
- Navigation state must not corrupt browser history or unexpectedly return an authenticated user to the landing page.
- Menu links open their owning surfaces rather than embedding their behavior.
- A direct Collection or Card link preserves its encoded reading context when authorized. A standalone Card link does not choose an arbitrary Collection merely because the Card appears in one or more authored paths.

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
- **Routing** — Safe callback destination with role-aware `/view` or `/admin` fallback.
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
- **Hierarchy** — Ordered Home, Reader, role-authorized Studio, Guide, Users, Settings, Theme, contextual Light/Dark action, Account, and sign-out destinations without development landing-page variants.
- **History** — Native mobile browser edge navigation is not intercepted by the closed Reader sidebar.
- **Return** — Reader detail preserves safe feed, search, query, card-focus, and scroll context with direct-entry fallback.
- **Appearance** — The quick account-backed action offers Light with a sun when Dark is active and Dark with a moon when Light is active; Account retains the personal placeholder.
- **Help** — The administrator menu opens the canonical User's Guide as a read-only phone-and-desktop surface. The guide covers product purpose, starting small, Tag design, Media intake and review, classification standards, Story authoring, Collection structure, Reader review, archive maintenance, and worked phone-first and scanned-archive examples.
- **Reader/Author switch** — The author-administrator always has a labelled header action that switches to the other role surface without opening the menu. Each side remembers its last safe same-origin Reader or Author location for the current browser session and falls back to Reader Home or Author Home when no valid location exists. The menu names Author Home explicitly. Reader-only accounts never receive the Author switch or Author destinations.

### Left Navigation

*Intent* — Let a reader choose Collection or Feed context and navigate that context without turning the Reader into an administrative workspace.

✅ **Complete**

- **Modes** — Reader-facing Collections and Feed navigation over the compatible `guided` and `freeform` route modes.
- **Filters** — Dimensional tag filtering and Subject-only scope.
- **Collections** — Published authored tree in Guided mode.
- **Author editing** — Administrator-only entry to edit the current card and its visible media without leaving Reader context.
- **Hierarchy** — Mode, Type, Tags, collection, count, and administrative controls have distinct hierarchy in their applicable Reader modes.
- **Mobile** — The drawer preserves practical open/close behavior without replacing browser-edge navigation gestures.
- **No pre-path sidebar** — Bare Reader Home has no contextual sidebar, toggle, or mobile opening gesture. The contextual sidebar appears after the reader selects Collections or Feed and remains available for direct reading routes.
- **Mode selection** — Collections and Feed are the reader-facing choices on Reader Home and at the top of the contextual sidebar.
- **Collection contents** — The delivered root-Card and nested-Card hierarchy uses full-row selection, separate 44-pixel expand/collapse controls, restrained indentation, strong current-location treatment, retained expansion, and automatic mobile drawer closure after selection.
- **Feed context** — A sticky main-page context band shows a stable Feed title, a separately labelled single-author archive scope, and horizontal Who/What/When/Where summaries with selected values listed vertically and `All` for unrestricted dimensions. Selecting a dimension opens the existing sidebar on that filter; on mobile the same action opens the drawer.
- **Responsive context** — Desktop keeps the contextual sidebar available; mobile presents the same Collection contents or Feed filters in the drawer without changing the information architecture.

⭕1 **Planned**

- **Multi-author Feed selection** — When the product gains truthful multi-author Card attribution and shared archives, extend the separate `Stories from` area into author selection. Authorship remains distinct from Who/What/When/Where and is not inferred from Who tags.

⭕2 **Future**

- **Grouping** — Reconsider only through truthful archive-wide group inventory and per-group pagination; do not group a partially loaded Reader batch.

📋 **Contracts**

- Feed uses the delivered freeform filters and discovery; Collections uses the delivered guided published structure and order.
- `guided` and `freeform` remain internal compatibility tokens until deeper Reader migration is justified; they are not competing reader-facing product modes.
- Collection context uses the published nested hierarchy to select the Card feed. Choosing a Part, Chapter, or Section updates the feed directly rather than requiring intermediary overview pages or repeated drill-down before Cards are readable.
- Feed context retains the reader's author and dimensional filters, Card position, and return state. Collection context retains the selected Collection placement, expanded contents, current Part, Chapter, or Section, Card position, and return state.
- Viewing users are read-only; Reader mutations remain administrator-authorized server-side.
- Reader authorization applies to Cards and Collections. Media referenced by authorized content is visible in that content context; authorization does not expose the complete Media bank or create a standalone Media publication decision.
- Ordinary readers do not receive raw Media-library browsing. A Shared Media Collection is an explicitly curated publication object with its own audience rather than a filter over the author's private library.
- Authors may edit the current card and visible media as fully as practical while preserving their Reader position.
- Studio remains the primary workspace for archive-wide, bulk, and taxonomy-structure operations; Reader retains contextual assignment and correction.

---

## Content

*Intent* — Present a visual story feed that feels familiar and inviting while preserving authored depth and archive context.

*Principles*

- **Visual** — Media and concise framing lead into stories.
- **Flexible** — Feed supports discovery; Collection supports authored sequence.
- **Type-aware** — Content forms share a system but retain meaningful differences.
- **Readable** — Long-form content favors sustained mobile reading.

✅ **Complete**

- **Feed** — Responsive visual story feed.
- **Forms** — Story, Gallery, Question, and Callout presentation.
- **Tags** — Who, What, When, and Where context on cards.
- **Continuation** — Freeform discovery and Guided child continuation.
- **Collection context** — A persistent context band shows the selected parent title, actual clicked hierarchy breadcrumb, and visible child count, including while the section loads or has no visible children. The selected structural parent is context rather than a duplicate feed tile.
- **Feed reading-context band** — Feed mode has a stable title, separately labelled `Stories from` scope, and compact Who/What/When/Where summary without repeating the complete filter control surface.
- **Feed title and author scope** — v1 truthfully labels `This archive` under `Stories from`; it does not imply unavailable author choice or treat authorship as a Who tag.
- **Dimensional summary** — Who, What, When, and Where appear horizontally, each selected dimension lists its values vertically, unrestricted dimensions show a quiet `All`, and each summary opens the corresponding existing sidebar filter.
- **Parent introduction** — When the selected parent Card has authored subtitle, cover, prose, embedded Media, or Gallery content, the Collection context expands into an introduction before the child Card feed. The parent is not repeated as a child tile; a title-only parent remains the compact context band.
- **Introduction length** — Short introductions render completely. Rendered overflow, not character count, produces a bounded preview with in-place `Continue reading` and `Show less`; expansion persists while the selected parent remains active, resets when the parent changes, uses a smaller mobile allowance, and prints in full.

⭕1 **Planned**

- **Feed author selection** — Replace the truthful single-author archive label with horizontal author selection only after the data and access model can identify multiple authors correctly.

📋 **Contracts**

- Browse and explicit graphical Who/What/When/Where filtering are foundational Reader retrieval. A future natural-language request interprets into those controlled criteria rather than replacing them or creating a separate content destination.
- Question is a distinct content form; its Reader presentation remains defined here.
- Quote is not complete merely because schema or renderer scaffolding exists.
- Published content only; draft structure remains hidden.
- Content determines whether the selected parent renders as a title-only context or a richer introduction. Independent Feed inclusion remains an explicit author publication decision and never changes silently because introductory content was added or removed.
- Introduction expansion is content- and viewport-dependent rather than another required author setting. Mobile may use a smaller initial allowance than desktop, but both preserve the same authored content and expose the expansion clearly. Reader preview shows the applicable bounded or full presentation.
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
- **Gallery image chrome** — Type and `x/y` share the image upper-left and the same Type-chip visual recipe. An active caption uses at most three feed lines at the image bottom, retains its full accessible text and full detail presentation, and reserves the administrator Edit corner. Image chrome uses paired theme foreground/background treatments whose contrast remains stable in Light and Dark.
- **Alignment** — Content Grid, detail, Compose preview, Explore More, and Read More share the Reader renderer while retaining their legitimate contextual differences.
- **Legibility** — Story titles remain below imagery; image badges, Gallery position, Gallery captions, administrator Edit, and the covered Question cue use stable contrast treatments.
- **Large RTE figures** — Large authored figures place following text below the image; medium, small, and extra-small figures retain optional side wrapping.
- **Discovery** — Freeform provides deduplicated Related and Unrelated exploration without presenting a meaningless Related rail for dimensionally untagged cards.
- **Disclosure** — Gallery Inline is consumed as a swipeable gallery in the feed. Question Reveal discloses and restores its bounded answer on activation. Other forms use their defined Navigate or Static behavior.

✅ **Explore destination tiles**

- Explore More includes every published card type as a compact linked destination, including cards authored as Inline or Static in the Content Grid.
- Explore tiles use a readable compact Who, What, When, and Where chip row and open detail directly. Chained exploration inherits the original safe feed or collection return destination instead of trapping Back navigation one detail page at a time.
- For a card with at least one Who, What, When, or Where tag, **Related** uses the existing shared-dimension discovery behavior. A card with no dimensional tags does not show a meaningless Related rail; **Unrelated** remains available for broad exploration. Generated Related and Unrelated results must not repeat the current card, its excluded children, or one another.
- Administrator Edit uses the compact tile image's lower-right corner without changing the destination, child eligibility, or stored presentation.

✅ **Question Open and Reveal**

- Question remains visibly distinct. No-cover Content Grid, Reveal, Compose preview, open detail, Explore More, and Read More Question faces use one container-relative watermark and prompt scale in the shared Question accent family; longer prompts receive bounded fitting without changing the surrounding tile. Covered Questions use the standard image-first tile and opened-card identity hierarchy rather than repeating a framed prompt treatment.
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

- **Transparent Ask** — Let a reader express an ordinary-language memory request and show the interpreted Who, What, When, Where, relationship, and time criteria as correctable graphical controls before presenting results in the same Reader system used by Browse and Filter. Direct Story meaning, derived visible-Media facts, private archival Media, authorization, and publication scope remain distinguishable.
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
- **Question** — A no-cover Question opens with its framed prompt, followed by Type and then dimensional Tags on a separate row. A covered Question opens image-first, followed by Type, Title, optional Subtitle, Tags, and answer without an additional framed prompt.
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
- **Feedback** — Success, error, warning, progress, confirmation, and blocking behavior use shared semantic states and bounded workflow ownership.
- **Boundary** — Viewing users remain read-only; authors have practical in-context Reader editing; archive-wide and bulk organization remain in Studio.
- **Desktop Author Home foundation** — Administrator-only `/admin` is a read-only Author Home with Continue in Studio, Card totals by status, Media totals and unresolved Who/What/When/Where review counts, failed Media processing, and active or failed durable-operation counts. Home navigation returns administrators to this overview; truthful Card-status actions set only the existing Studio Card filter, while Media and operations use honest owning-surface links where no equivalent filter handoff exists.
- **Role-aware fresh entry** — Successful credential login and an already-authenticated `/login` visit preserve a safe explicit callback; without one, Authors enter the delivered Author Home and Readers enter Reader.
- **Collection Needs Attention** — Author Home derives read-only publication work from each active durable Collection and its required Cards and referenced Media. Draft Cards, dimensional review, meaningful What, missing references, Media review, rendition readiness, and the Collection's authored audience state remain separate truthful work areas; overlapping counts are not collapsed into a fabricated completion percentage. Missing legacy audience data is shown truthfully as all enabled readers, explicit empty selection is shown as no readers selected, draft work continues normally, and the dashboard performs no publication or content mutation.
- **Collection attention handoff** — Each active Collection named in Author Home links to that exact durable Collection in Studio. The handoff opens the Collections pane and selects the requested active Collection by durable ID; a missing or inactive ID falls back to the ordinary first-active Collection instead of issuing a speculative structure read. Attention categories that Studio cannot reproduce exactly remain summary evidence rather than misleading filter links.
- **Collection exception review** — Each active Collection also opens a read-only Needs Attention review that lists the exact Cards, Media, and missing references behind every count. Card items open directly in Compose; Media-review items open the existing Tags and Subjects review for that exact Media record; readiness items open the exact Media editor; and a missing Media reference names every referring Card so the author can remove or replace it at the source. Queues follow the current classification requirements, may overlap, and never repair, approve, publish, or create a competing Task record.
- **Card publication-integrity core** — Every server-owned path that changes a draft Card to Published, including create-as-published, status-only saves, and broad Card saves, applies the archive-wide classification requirements selected in Settings. When Card classification is required, Who/What/When/Where review and at least one confirmed meaningful What are required. When Media classification is required, every referenced Media item's four dimensions are reviewed. Unknown and Not applicable truthfully complete applicable review, but do not replace meaningful What. Existing referenced Media and Ready processing remain inherent publication requirements regardless of classification preference. A blocked attempt remains Draft, returns a structured conflict, and explains the unresolved areas. Draft creation and saving remain unrestricted. New publication also requires an explicit nonempty audience and at least one Reader destination through Feed inclusion or active Collection placement; Collection publication has its own lifecycle owner and integrity gate.
- **Sequential mobile Author destinations** — At phone width Studio now presents one focused Cards, Media, Prompts, Collections, or Tags destination at a time behind persistent labelled bottom navigation. Cards opens as a list and then replaces that list with Compose after selection or New Card; Back returns safely through the existing unsaved-work guard. Direct Card, new-Card, and Collection handoffs open the appropriate destination, the last ordinary destination is retained locally, and the desktop configurable multi-pane Studio remains unchanged. Prompts uses the delivered additive structured Prompt Library foundation; the remaining curation and prompt-block work is separately Planned below.
- **Individual mobile Card workflow** — The Cards destination creates, resumes, edits, previews, publishes, and corrects the existing Card types through the shared Card owner. Story work provides Words, Media, Details, Placement, and Preview wayfinding, including explicit audience, Feed, and Collection placement; publication retains the same server-owned integrity boundary as desktop.
- **Mobile Card-first Prompt handoff** — The labelled destination bar remains available while editing an existing mobile Card. Leaving Cards for Prompts passes through the existing unsaved-work guard and retains the selected Card in the route. Choosing one prompt or a Topic returns to that same Card and inserts the queued ordinary headings after Compose remounts; no separate response record or background Card mutation is introduced.
- **Mobile Author entry** — Fresh Author entry opens the same responsive Author Home. Continue resumes prior work, Start a Story opens the existing unsaved Story flow, and Cards, Media, and Collections handoffs identify their truthful mobile destinations without turning Home into a sixth bottom-navigation item.
- **Mobile Media intake** — The focused Media destination can select one or more images through the device's native chooser. Each selected image is copied into the canonical private Media bank, successful imports remain selected for immediate classification or Card work, and a failed file does not discard successful imports. The existing bounded-folder importer remains available as a separate desktop-oriented action.
- **Media-to-Card assignment** — A selected Media population can create a new Gallery Card or open an explicit searchable Card chooser and append only new items to that Card's Gallery. Existing slot captions, framing, stack identity, and order are preserved; successful assignment refreshes the open Card when applicable. Published targets warn that the current practical publication policy makes the Gallery change reader-visible immediately.
- **Author Home object handoffs** — Author Home keeps its general Continue in Studio action so an in-progress mobile destination or desktop layout can resume. Its Cards status actions now name the Cards destination while retaining the exact existing status filter, and its generic Media and Collections actions name those destinations without pretending to reproduce a narrower Collection-scoped attention population. Desktop ignores the mobile destination presentation hint and retains its saved simultaneous panes.
- **Recent Story work** — Author Home identifies the most recent draft Story to continue and the most recently published Story as bounded accomplishment. These are direct Card handoffs derived from Card timestamps, not a second activity log or a claim about archive completion.
- **Tag-to-content inspection** — In Studio, every Tag count is an explicit handoff to the matching Cards or Media. The destination replaces unrelated filters with that one hierarchical Tag population, opens the owning pane on desktop or destination on mobile, and remains read-only until the author deliberately edits an item.
- **Mobile Collections workflow** — The focused Collections destination browses each active durable hierarchy, opens its canonical Cards, searches and places an existing Card, creates a private draft Collection or a title-only Part, Chapter, or Section Card, changes role or compatible parent, orders siblings, removes a leaf placement without deleting its Card, and protects Published structure. The same revision-checked Collection owner serves desktop and mobile.
- **Card-first Prompt entry** — A Prompt that already owns a legacy linked Question Card may still open that Card. An unlinked Prompt no longer creates a response Card from the library: with no Card open it offers Start a Card through the ordinary Cards destination; after that Card is saved, the author returns to Prompts and copies one prompt or Topic into it as ordinary editable content. The legacy create-linked-Question service remains compatibility infrastructure, not an active authoring entrance.

⭕1 **Planned**

- **Author dashboard expansion** — Extend the delivered Card, recent-Story, Media-review, Collection-attention, and durable-operation foundation with bounded import progress and additional exact owning-surface handoffs only after their authoritative state and reproducible filters exist. The delivered Card publication-integrity core remains a separate mutation gate rather than a dashboard responsibility.

📋 **Planned dashboard contracts**

- Do not introduce a general Task entity merely to mirror existing object state. Draft Cards, publication blockers, incomplete imports, unresolved Media dimensions, unidentified people, failed processing, and Collection issues remain owned by their existing records and services.
- Unknown and Not applicable count as completed dimensional review. Neutral available-work counts remain visually distinct from failures and integrity blockers.
- Global life-story completion is never fabricated. Percentages and completed/remaining counts require a bounded population such as one import, review set, publication checklist, or explicitly chosen body of work.
- Local indicators lead to the same truth summarized centrally; dashboard and pane counts cannot diverge into separate progress systems.
- Author Home is reached through upper application Home/navigation rather than consuming a mobile bottom-navigation position. Returning to active object work preserves that destination; the dashboard does not repeatedly interrupt an in-progress session.

⭕2 **Future**

- **Deduplication** — Share safe repeated administrative reads without obscuring mutation reconciliation.

📋 **Suggestions**

- Provisional suggestions never affect counts, filters, cards, or Reader truth until accepted.
- Pending suggestions remain until accepted or dismissed; reruns may update only unconfirmed suggestions.
- Dismissed suggestions do not reappear from the same analysis unless the author explicitly rebuilds them.
- Acceptance uses the same confirmed mutation path as manual work.

### Adaptive Author Navigation

*Intent* — Present the same primary authoring objects through a simultaneous desktop workspace and a sequential mobile workspace without creating separate product truth. Card is the shared content object; Story is one Card type alongside Gallery, Question, Callout, and any later approved type.

*Principles*

- **Desktop is spatial** — The configurable Studio keeps multiple object panes visible for comparison, selection, and drag-and-drop.
- **Mobile is sequential** — One focused object destination occupies the phone screen at a time; explicit actions replace cross-pane drag-and-drop.
- **Shared domain** — Cards, Media, prompt records, Collections, and Tags retain the same identity, permissions, validation, and mutations on both surfaces; the delivered additive Prompt Library foundation extends rather than duplicates the Questions domain.
- **Scope by interaction** — Mobile supports complete individual-Story work and useful contextual object work; dense, bulk, structural, and recovery operations remain desktop-primary.

⭕1 **Planned**

- **Mobile destination completion** — Build on the delivered labelled shell, individual Card workflow, Media intake and assignment, Prompt handoff, and Tag-to-content inspection with the remaining destination-specific touch actions below. Cards remains the default object-work destination; Author Home remains in upper application navigation rather than becoming a sixth bottom item. Reader/Author switching, account, appearance, and settings remain in upper application navigation.
- **Media destination** — Build on delivered device image intake, browse, search, filter, classify, selection, Create Card, Add to existing Card, and Shared Media Collection actions with remaining capture refinements and destination-specific touch presentation.
- **Prompts destination** — Build on delivered Card-first entry, Category, Topic, Primary Question, Follow-up Question, filtering, explicit legacy-organization review, hierarchical Topic browsing, direct sibling ordering, and desktop or mobile copy-to-open-Card behavior with the remaining duplicate-resolution and prompt-block work. Authored responses do not begin in the library.
- **Tags destination** — Build on delivered Who, What, When, and Where browsing, governed creation/correction, and exact matching Card/Media handoffs with touch-first contextual assignment. Hierarchy restructuring, merge or split, and collection-scale correction remain desktop-primary.
- **Desktop visual operation** — Retain configurable panes while improving image-forward tiles, full-row hierarchy targets, pane controls, active-object and relationship states, drag previews, drop explanations, resizing, and contextual primary actions. Visual modernization does not replace the object-based Studio architecture.

📋 **Contracts**

- Mobile cross-object work uses explicit actions such as Create Story, Create Gallery, Add to existing Card, Add writing prompts, Add to Collection, Edit tags, and View matching Cards and Media.
- Entering full-screen Story creation may temporarily replace global bottom navigation with the Story sections Words, Media, Details, Placement, and Preview plus a clear Back or Close action. Autosave and transition protection preserve work.
- Each destination retains its own safe search, filters, selection, and position when the author moves between destinations. Cross-object actions carry only explicit context and do not create hidden global selection state.
- Required-attention counts and optional AI suggestions appear as distinguishable badges or contextual actions inside their owning destinations. They do not become additional bottom-navigation items or a separate AI-centric workspace.
- Desktop and mobile may differ in presentation and available scale of operation, but they do not define different Card, Media, Question, Collection, Tag, classification, or publication truth.

### Studio Cards

*Intent* — Find, compare, select, and manage cards across the archive.

✅ **Complete**

- **Grid** — Searchable, filterable card population with status and type context.
- **Search** — Title search is temporary task state, identifies active no-result queries, and provides direct clearing instead of silently reopening an empty pane.
- **Density** — A compact tile-size control opens continuous adjustment while retaining title, dimensional subjects, selection, and tag access at every permitted size.
- **Selection** — Individual and bulk selection with bounded actions. Card tiles display assignment truth but do not repeat the former inline `Edit tags…` entry; single-Card assignment belongs to Compose and multi-Card assignment belongs to the bulk `Card Tags` action. Bulk Card tagging uses the same four-column assignment language as Compose without merging unrelated Gallery truth: each dimension defaults to `Keep`, summarizes inherited and overridden Cards plus missing- or unreviewed-Gallery conditions, and can be changed explicitly to `Inherit` from each Card's own Gallery or `Override`. Only overridden dimensions enable mixed-state tag and Subject deltas; Empty/Some/All preserves per-Card differences unless the author explicitly adds or removes a value for every selected Card.
- **Filters** — Status, form, dimensions, tags, subject scope, and assignment-related refinements.
- **Tag filtering** — One all-dimensions picker exposes Who/What/Where taxonomy trees and the structured When control. Each dimension independently supports `Subjects only` and `Empty`: selected tags match any assignment by default, `Subjects only` limits that dimension to subject assignments, `Empty` finds no assignments in that dimension, and `Subjects only` plus `Empty` finds no subject in that dimension. All four dimensions may also filter by visible `Blank`, `Unknown`, or `Not applicable`; `Blank` maps to the internal unreviewed workflow state and is not a tag, while an intentional resolution counts as assigned rather than Empty. The When review filter remains independent from its structured-date filter, whose own `Blank` means that no structured date is stored.
- **Forms** — Story, Gallery, Question, and Callout management.
- **Subjects** — Card subject authoring.
- **Subject truth** — The normalized `subjectTagIds` array is authoritative whenever it is present, including an explicit empty array; the legacy singular `subjectTagId` is read only for records that do not yet have the array field. A Known structured Media date is offered as its own selectable When subject with durable checked state, while every legacy When-tag subject is suppressed and the underlying legacy When tag is retained for migration safety.
- **Compose** — Open the selected card for full authoring.
- **Tags** — Keyboard-safe dimensional filtering, hierarchy, direct known-tag entry, and disambiguated subject scope.

⭕1 **Planned**

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
- **Tags** — The closed Compose section uses the same icon-and-word dimensional-heading typography as the other Studio panes and underlined selected tags and subjects; inheritance state remains inside the assignment modal rather than repeating `Inherited` or `Overridden` labels on the Compose face. The former `Edit tags…` field, separate Gallery-inheritance block, and new-card help copy do not compete with the assignment surface. Its tag-icon action opens `Card Tags`. The modal begins with the dimensional headings, shows the current Gallery tags in matching columns, then stages one `Inherit?` choice per dimension; `Search tags…` follows that source row before the aligned Subjects band and four taxonomy trees. Inherited dimensions lock tag membership to Gallery truth while leaving their assigned tags available for explicit Subject choices. Overridden dimensions dim the Gallery tags as reference and enable ordinary tag and Subject editing. Turning inheritance off keeps the inherited tags as the editable starting selection; turning it back on confirms that manual assignments will be replaced by the current Gallery tags. Cancel discards every staged change, while Apply commits tags, subjects, and inheritance together through one server-authoritative mutation.
- **Inheritance truth** — Gallery inheritance is evaluated from actual Gallery membership, not every Media reference on the Card. A participating blank or unreviewed item makes the inherited dimension Unreviewed; intentional Unknown and Not applicable resolutions remain reviewed outcomes. Membership changes, tag/date/review changes, and inheritance override changes all reconcile stored tags, subjects, review state, derived fields, counts, and search projections before the operation is complete.
- **Children** — Attach, remove, and order structural children.
- **Preview** — Reader-oriented presentation preview.
- **Alignment** — Compose, Reader, and compact previews share the applicable Reader rendering contracts.
- **Reader edit** — Focused Reader editing shares overlapping authoring capabilities while retaining a smaller Reader-owned shell.

⭕1 **Planned**

- **Guidance** — Explain field roles in Help when needed; do not add inline definitions to the authoring forms.
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
- A published Card is one live living-archive object in the current bounded policy. Saved edits may become visible immediately wherever that Card is already readable. The authoring surface warns about that consequence; an author who needs privacy while changing the Card deliberately returns it to Draft first and publishes it again when ready. Private working revisions and version history remain Future rather than implied protection.
- Drag targets have distinct meaning: Cover replaces, Gallery appends, body inserts, Children attaches.
- Story Assist is editorial, voice-preserving, and suggestion-only; guides may shape tone but never invent facts.

### Mobile Story Authorship

*Intent* — Let an author complete one Story on a phone while preserving the same durable Card, Media, classification, placement, access, and publication truth used by Studio.

*Principles*

- **Complete individual Story** — Mobile supports the full individual-Story journey; it is not limited to a reduced editor that fails when rich or embedded Media is present.
- **Adaptive, not compressed** — Present graphical, touch-first sections for words and voice, Media, details and tags, Collection placement, preview, and publication rather than reproducing the multi-pane Studio on a narrow screen.
- **Draft freedom; publication integrity** — Creation and autosave remain friction-light. Publication is the deliberate integrity checkpoint.
- **Shared model** — Mobile and desktop edit the same Card and Media relationships. Unsupported content is preserved rather than flattened, discarded, or hidden behind an unsafe editor choice.
- **Bounded stewardship** — Desktop remains primary for archive-scale import, contact-sheet comparison, bulk classification, taxonomy restructuring, identity merge or split, relationship-graph inspection, Collection restructuring, backup, and recovery.

✅ **Complete**

- **Entry, editing, and recovery** — Start a Story, open or resume a draft, edit the same complete Card used on desktop, use device typing or dictation, save with truthful local state, recover saved work, preview, and leave without publishing.
- **Media intake and composition** — Select device images into the canonical Media bank from the Story workflow or choose existing Media; make or change the cover, add, order, caption, frame, or remove Gallery Media, and preserve canonical Media when a Story reference is removed.
- **Placement** — Place one durable Story Card in one or more Collection, Part, Chapter, or Section contexts without copying it; choose sibling order; remove a placement without deleting the Story; publish to Feed independently; and create a lightweight draft Collection or title-only structural destination through the existing owners.
- **Preview and publication** — Preview the Reader presentation, review integrity and effective audience, publish deliberately, understand that edits to a still-published Story may become reader-visible immediately, and deliberately return it to Draft before private editing when needed. Private working revisions, republish history, and restore remain Future.
- **Card-word Tag suggestions** — On demand, the open Card compares its current title, subtitle, and body with exact names in the existing governed Tag library. It proposes bounded Who, What, When, and Where matches with visible title-or-story-text evidence; nothing is assigned until the author adds one suggestion, and it never creates vocabulary or claims that text proves identity or meaning.

⭕1 **Planned**

- **Voice capture** — Record speech as canonical audio Media, transcribe it into the open draft Card, preserve the untouched recording, and let the author deliberately include the original telling or a separate final narration in Reader and Book output.
- **Media and identity assistance** — Build on delivered Who, What, When, and Where review, exact taxonomy search, governed creation, explicit blank, Unknown, or Not applicable resolution, and Card-word proposals with provisional visible-Media evidence, restrained person suggestions, and a safer minimal-identity creation flow. Proposals remain provisional until accepted, corrected, or rejected.

📋 **Contracts**

- Draft saving is allowed at any point. Publication applies the archive-wide Settings choices independently to Stories/other Cards and Media. Required Card classification means intentional review of Who, What, When, and Where plus at least one confirmed meaningful What. Required Media classification means intentional review of each dimension for every cover, Gallery, and body Media reference. Existing references and Ready Media processing remain required in every mode. A new publication transition also requires an explicit nonempty audience selection and at least one Reader destination: standalone Feed inclusion or placement in an active Collection, including an active draft Collection being assembled for later publication. Missing legacy audience data remains readable under the compatibility policy but does not count as author confirmation for a new publication. Feed inclusion is independently author-controlled and does not alter Collection placement. Unknown and Not applicable complete review when truthful.
- A likely match to an existing identity may be offered for confirmation. An unrecognized person instead asks who the person is, whether an existing identity applies or a new identity should be added, and what minimal relationship context distinguishes that person. Unknown remains available with appropriate privacy treatment.
- New capture time and location are strong source evidence but do not silently become Story When or Where; a phone photograph may depict an older print or a different event. Scanned or imported Media uses its available metadata, OCR, faces, neighboring items, filenames, and visual clues as provisional evidence with visible provenance.
- What assistance compares Story text and visible Media with existing What tags, offers the closest existing meaning first, searches related vocabulary next, and creates a new tag only after the author distinguishes a synonym, narrower child, or genuinely new concept.
- AI assistance appears through contextual actions such as Help me write, Suggest tags, Identify people, Find related Media, and Suggest placement. Each capability may be Off, On demand, or Offer suggestions; suggestions remain restrained and require confirmation before changing canonical truth.
- Integrity validation is always active regardless of AI preferences. It separates blocking reference, readiness, privacy, identity, classification, access, and publication defects from optional improvements.
- Publication, access, and distribution are separate decisions. Publishing releases an approved version to a confirmed audience; access defines who may see it; sharing notifies, directs, or explicitly grants additional access. A convenient Publish and share flow may combine the decisions without collapsing their meaning.
- Adding a Story to another Collection may expand its effective audience. Publication and placement confirmation disclose the combined audience in plain language, and shared links do not bypass authorization unless explicit link access is enabled.
- Mobile navigation does not expose desktop-only administrative destinations as ordinary clickable choices that lead to an unavailable message; unavailable capabilities are absent or clearly disabled before selection.
- Saving protects the author's work; publishing changes the reader's experience.
- Editing a transcript never alters or relabels the original recording. A narration that follows materially edited prose is stored and presented separately from the original telling; synthetic narration is disclosed and custom-voice generation remains unavailable until its consent, verification, provenance, deletion, and abuse safeguards pass a separate gate.

### Studio Tags and Collections

*Intent* — Keep taxonomy management and Reader-path organization distinct while allowing both to participate in the shared Studio workflow.

✅ **Complete**

- **Tags pane** — Independent fixed-width dimensional-taxonomy workspace and future home of import vocabulary mapping.
- **Collections pane** — Independent fixed-width curated Reader-structure workspace. Its compact hierarchy orders the solid-triangle expansion control, text-colored drag handle, and visible saved-state selector, provides text-colored master Expand all and Collapse all controls on a right-aligned row beneath the title, and measures nesting as a 12-pixel text-to-text indent. Text-colored per-row action menus open in Compose, attach child Cards, detach/remove collection status, and confirm Card deletion.
- **Visibility** — Tags and Collections are separately closeable like every other Studio pane; Studio never closes a pane automatically.

📋 **Contracts**

- Tags describe content; Collections arrange authored reading paths.
- The two systems cooperate but never merge into one model.
- Each workspace retains its own selection and filters.
- Studio preserves the order Tags → Collections → Cards → Compose → Questions → Media. Tags, Collections, Compose, and Questions use stable fixed widths; Cards and Media share the remaining adjustable space and stop at content-safe minima. Cards and Media control rows wrap rather than defining an oversized minimum. The author closes panes when more space is needed.

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
- **Structured date control** — Media and Cards may also carry one optional structured date assertion, independently of the preserved legacy When taxonomy. Assignment and filter modals present the structured control in the When column instead of exposing the legacy When tree as a competing authoring mechanism. Direct Decade, Year, Month, and Day entry requires no selectors or user-entered separators; Decade and Year exclude one another, Month requires Year, Day requires Year and Month, and Approximate follows the fields. Entry remains literal while the field has focus and normalizes only after commit, so Decade and multi-digit Year values are not rewritten during typing. Compact presentation is generated as `1960s`, `1968`, `1968-10`, or `1968-10-12`, with `~` for approximate values and an expanded human-readable tooltip. The same value and resolution are used on Media, Card, Compose, Reader, and inheritance surfaces. A partial filter matches every more-precise date within that period; filter surfaces additionally accept an inclusive From year / To year range. More-specific month/day range filtering remains deferred. Card chronological sort keys prefer the structured date and fall back to legacy When tags when no Known structured date exists. When a Card inherits When from its Gallery, every participating item must be reviewed and support the same structured date or intentional resolution. A blank or unreviewed item therefore keeps the inherited When dimension Unreviewed; conflicting reviewed values do the same until the author supplies an explicit Card value by overriding inheritance.
- **Subjects** — Subject authoring and Subject-only filtering.
- **Inheritance** — Author-controlled per-dimension Gallery-media rollup with existing-card protection, Unreviewed precedence, overrides, subjects, and reconciled projections.
- **Counts** — Confirmed card and media usage counts.
- **Starter set** — Optional additive Tag Set 0.
- **Reader filters** — Any assigned and Subject only.
- **Reliability** — Shared modal ownership, exact lookup, scoped filters, and post-save reconciliation.
- **Selection** — Card, Media, and Question assignment uses one comprehensive four-dimensional modal rather than competing inline entry fields. Questions show compact colored dimensional chips and a tag-icon action; `Question Tags` uses the same search-first headings, aligned Subjects band, creation controls, trees, legend, and Cancel/Apply language as Media and Card assignment. Every assignment surface preserves hidden dimensions and supports multiple subjects.
- **Integrity** — Canonical hierarchy with reconciled paths, counts, derived fields, and search projections.
- **Identity compatibility** — Canonical Who tags own identity; the 10 existing compatibility profiles use those same tag IDs, and archive perspective resolves to the canonical Alan Bond Who tag.
- **Family-tree facts** — Optional parent, spouse, and partner records can reference canonical Who tag IDs to construct a stable family-tree view. No relationship records currently exist, and derived kinship words do not become assignments or alter authored content.
- **Groups** — Stored filtering Groups are not part of the target model. No Person Group records currently exist, and the rejected legacy role/group tag nodes have been removed through governed cleanup.
- **Migration evidence** — The read-only vocabulary manifest covers all 138 Who tags, 10 compatibility profiles, 1,281 Cards, 3,503 Media records, and 270 Questions. It proves no ID remapping, assignment rewrite, count repair, or search reindex is required for the approved nested-name clusters.
- **Management** — Direct dimension navigation, compact labeled actions, explicit rename and child creation, and keyboard-safe editing without weakening drag targets. Parent rows place the solid-triangle expand/collapse control before the dedicated drag handle and expose their Reader expanded/collapsed state beside it; each dimension provides Expand all and Collapse all; Studio collapse state persists locally; and a collapsed nesting target expands after a short drag hover. The dedicated drag handle owns a stable, non-shifting drag presentation: a row's upper edge places before, its narrow center nests, and its lower edge places after, with visual target and invalid-state feedback rather than surface instructions. Edge placement adopts the target row's parent when necessary, so any tag can move directly between desired siblings in one gesture. The drag overlay stays above the pointer instead of covering the destination. Reorder commits every affected sibling atomically. Reparenting is dimension-safe and cycle-checked across the prospective subtree before optimistic display; a rejected server move reloads authoritative tags rather than leaving the editable tree unusable.
- **Governed rename and reparent** — Rename and same-dimension reparent preserve stable direct assignments and reconcile descendant paths, Card and Media dimensional/filter projections, Card and Media subject ancestry, Question subject ancestry, Media completeness flags, hierarchical published-Card and Media counts, and both search indexes. Each operation records durable stage and failure evidence and is idempotent so the same request can safely resume reconciliation after a partial failure.
- **Governed merge** — Merge requires a same-dimension surviving Tag, previews exact affected Card, Media, Question, child, and completeness consequences, blocks self, descendant, and cross-dimension targets, then reconciles assignments, subjects, paths, counts, completeness, and search before deleting the source Tag.

⭕1 **Planned**

- **Split** — Define and implement recoverable identity separation through an explicit author-selected partition of affected assignments and subjects; never guess which records should move to the new identity.
- **Import consolidation** — Build on governed merge by preserving imported-name provenance and letting the author preview selected variant consolidation into a corrected Tag without losing assignments, subjects, counts, provenance, or search truth.
- **Family organization** — Who remains an author-controlled hierarchy. Stable people may live beneath meaningful branches such as Family or Friends; historical married, maiden, and imported names may remain nested beneath their canonical person. A future family-tree view uses the same stable identities and parent/partner facts without converting relationship words into assignable tags or changing authored stories for each viewer.

⭕2 **Future**

- **Aggregation** — Suggest and apply useful tag summaries.
- **Faces** — Import supported face/person evidence or generate face recognition suggestions, cluster repeated faces, and let the author confirm them against stable Who identities. Relationship roles remain separately resolved from perspective.
- **Exclusion** — Add include and exclude filtering.
- **Keyboard** — Complete advanced taxonomy keyboard and drag interaction.

📋 **Contracts**

- Source facts, imported or machine evidence, confirmed dimensional assignments, contextual working organization, and Story meaning remain distinguishable even when one review surface presents them together.
- Complete classification requires an intentional reviewed resolution for each applicable dimension, not necessarily a named tag. Known or approximate values, Unknown, and Not applicable may complete a dimension. An unreviewed dimension appears blank, remains internally queryable as review work, and is incomplete whenever that object's classification is required.
- Reflections live under What; operational import branches are not normal author or Reader vocabulary.
- Parenthood and Childhood are stable What concepts when they describe story subject matter. Combine them with Who and When when person- or period-specific context is required; identity-relative time filters are not part of the current target model.
- Who represents stable people and named animals used as subjects. Employers, schools, teams, and other named organizations are not Who identities merely because they appear in or matter to a story; use a reusable What concept and preserve occurrence-specific names in the title, caption, or narrative. What covers Life, Events, Activities, Topics, Objects, and Reflections; When uses sortable chronology; Where supports geographic and venue hierarchy.
- The compact What starter tree is: `Life` (`Childhood`, `Parenthood`, `Education`, `Career`, `Marriage`); `Events` (`Birth`, `Birthday`, `Engagement`, `Wedding`, `Anniversary`, `Graduation`, `Funeral`, `Reunion`, `Party`, and `Holidays` with useful named-holiday children); `Activities` (`Sports` with useful sport children, `Hobbies`, `Clubs`, `Travel`, `Recreation`, `Performing`, `Building`); `Topics` (`Business`, `Culture`, `Technology`, `Politics`, `Music`, `Books`, `Movies`, `Television`, `Food`, `Ancestry`); `Objects` (`Homes`, `Vehicles`, `Clothing`, `Machinery`); and `Reflections` (`Outcomes`, `Lessons`, `Superlatives`, `Future`). This is a starter vocabulary, not a requirement to populate every branch.
- Meaningful What parents and children are assignable. Authors normally choose one primary What subject and no more than one useful tag from a branch, with one to three What assignments overall. A child contributes to ancestor filtering without requiring a duplicate ancestor assignment. Multiple What tags are appropriate when they add independent retrieval value, such as `Education > College`, `Activities > Sports > Football`, and `Events > Engagement`; occurrence-specific details belong in the Card title or narrative.
- A Who parent node may serve as the stable aggregate identity. Its nested names and variants remain directly assignable and exact-filterable while automatically contributing to the parent's hierarchical counts and filters; the parent may also be assigned directly.
- The ordinary Who hierarchy, not a second visible People classification system, owns identity naming and aggregation. Optional relationship/profile data may use a sidecar keyed by the selected Who tag ID, but no sidecar may become a second identity authority.
- Parent and partner connections are optional family-tree facts, not assignable Who tags. Kinship labels may be derived as explanatory navigation, but they do not rewrite the Who hierarchy, Card titles, authored perspective, assignments, or filtering truth.
- Arbitrary combinations of people use Any/OR or All/AND filtering rather than persistent Group identities. Collections own authored narrative groupings; a future saved filter may preserve a repeated query without becoming a tag.
- Across all dimensions, a meaningful parent or child may be assigned directly, child assignments aggregate to ancestors, and purely navigational nodes may be explicitly nonassignable.
- `parentId` is taxonomy authority; paths, counts, dimensional fields, and search records are derived projections that must reconcile to it.
- Existing assignments are never renamed, merged, deleted, or reinterpreted without an author-reviewed migration with affected-object counts and recovery evidence.
- The structured date field remains additive in storage rather than deleting the When taxonomy, while becoming the primary date presentation wherever it exists. An author-approved migration populated deterministic structured dates from existing When tags on 1,026 Media and 438 Cards while preserving every When assignment, inheritance rule, count, filter, sort field, and review state. Six conflicting multi-year assignments and 61 non-date When assignments remain intentionally unmigrated. Imports do not yet populate the field from embedded capture metadata.
- Known tags use direct entry; clicking Who, What, When, or Where opens only that dimension without changing the others; the complete selector is reserved for comprehensive, initial, or bulk classification.
- Tags and subjects save as one assignment decision. Removing an assigned subject clears that subject; focused dimension work preserves every hidden dimension and its subjects.
- Provisional assignments do not affect counts, filtering, or presentation.
- Gallery inheritance has independent Who, What, When, and Where controls. Onboarding explains them and requires an explicit author selection; no dimension is implicitly enabled.
- Delivered inheritance applies the deduplicated union of confirmed Gallery-media tags to enabled card dimensions.
- Existing card assignments begin as per-dimension overrides and do not change when inheritance is configured. Releasing an override re-inherits current Gallery-media truth.
- The target experience separates those meanings: direct Card tags state what the Card is about, while each Media item's tags state that item's visible contents and selected subject. The delivered inheritance controls remain current behavior until a separately approved migration replaces them; they do not define the target semantic model.
- Reader discovery distinguishes Cards directly about a selected subject from Cards where that subject appears in confirmed visible cover, Gallery, or body Media. It may offer either or both scopes, but it explains the match and never uses unrelated or private Media-library evidence.
- Confirmed visible-Media tags may prompt the author to add a direct Card tag. Declining that suggestion preserves the Media fact without changing Card meaning.
- Cards do not inherit tags from parent or child cards.
- Closed tiles show the exact tag for a single assignment, `Multiple` for several assignments without an explicit subject, the selected tag name for one explicit subject, `Subjects+` for multiple explicit subjects, or `-` when empty; tooltips disclose the assigned tags and selected subjects, and presentation labels are not tags.
- Prompt classification supports Prompt Library browse and curation. A Card owns its tags and copied prompt text; later Prompt Library edits never rewrite the Card.
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
- **Durable Collection authority** — Store a top-level Collection separately from Cards, with its own title, description, lifecycle, order, optional introduction Card, structure revision, and reversible authority revision.
- **Local Parts, Chapters, and Sections** — Organize an active Collection through explicit Collection-local placement roles while preserving the referenced Card as the only authored content object.
- **Reusable Card placements** — Place one canonical Card more than once with distinct placement identity, parent, role, order, and clicked-path context.
- **Placement-native Studio and Reader** — When a durable Collection is active, use its placements for structure editing and Reader navigation; retain the legacy hierarchy only as a compatibility and rollback path when no durable Collection is active.

✅ **Additional Collection creation** — An author can create an empty active draft Collection with a title and optional description from the Collections destination or Story Placement. Creation establishes durable authority but does not infer an audience, publish, create structural Cards, or place content automatically.

✅ **Explicit structural destination creation** — The Collections destination provides Add Part, Add Chapter, and Add Section actions. Each action creates one title-only draft Story Card through the ordinary Card owner, defaults it out of Feed, and places it at a role-compatible Collection location through the revision-checked structure owner. A Part begins at Collection level; a Chapter may begin at Collection level or beneath a Part; a Section requires a Chapter. The author may open the same Card later to add introductory content. If concurrent Collection work prevents the second placement step, the recoverable draft Card remains visible in Cards and the author is told to place it again rather than receiving a false success.

✅ **Promote structure** — From an existing Part, Chapter, or Section placement, create a new private draft Collection whose introduction references that structural Card and whose descendant arrangement receives new Collection-local placement identities while continuing to reference the same canonical Cards. A promoted Chapter's immediate Sections become legal top-level Chapters; other roles and order remain unchanged. The source is not modified, no audience or publication is inferred, and later structural edits remain independent.

⭕1 **Planned**

- **Book edition** — Export or print a stable edition of the Collection's selected structure, Card versions, Media, order, and presentation without freezing continued work on the living Collection.
- **Book playback** — Let the author choose original telling, final human narration, disclosed synthetic narration when separately available, or no playback for each included Card. Generate edition-owned QR destinations that remain stable after the living Card changes.

📋 **Contracts**

- Collections are ordered card relationships, not a content type.
- Root and sibling order are author-controlled.
- A multi-parent card appears once on each authored path but opens the same card document.
- Draft cards and subtrees remain hidden from readers.
- Collection relationships never imply tag assignments.
- `My Life` is the first active durable Collection authority. Its placement-native Studio and Reader paths are shipped, while the untouched root-Card and nested-Card fields remain a compatibility and rollback projection rather than the active structure owner for that Collection. This activation does not publish the Collection, assign an audience, or imply that general multi-Collection creation is complete.
- Collection is the reader- and author-facing durable work. Part, Chapter, and Section are placement roles owned by one Collection rather than globally shared content objects. The Card occupying a role may remain title-only or carry full optional introductory content.
- The author assigns Part, Chapter, Section, or Card role explicitly when creating or placing content. Role is local placement metadata and is not inferred from body content, Media, child count, or whether the Card also appears elsewhere. Migration may propose the shallowest legal role needed to preserve an existing path, but that proposal remains reviewable.
- Card placements own local order and context; the Card owns its durable content. Copying or promoting structure duplicates placement arrangement, not Card content.
- One Card may appear in multiple placements, but one Part, Chapter, or Section placement does not have multiple live Collection parents in the active architecture.
- One placement represents one occurrence and has exactly one Collection and at most one parent placement. Reusing a Card creates another placement; it never adds another parent to the same placement or copies the Card.
- Collection level accepts Part, Chapter, or Card placements. A Part accepts Chapter or Card placements. A Chapter accepts Section or Card placements. A Section accepts Card placements only, and an ordinary Card placement cannot have children. These are placement constraints, not deductions from the referenced Card's content or present child count.
- A Collection may reference one optional introduction Card. A Part, Chapter, or Section placement's referenced Card supplies its title and optional introduction through the same title-only or rich-content behavior already used in Reader.
- Empty and one-child Parts, Chapters, or Sections remain valid while drafting and when their authored introduction is meaningful. A title-only structural placement with one child may receive a flattening suggestion, but minimum-child counts do not block saving or publication by themselves.
- A Book is an edition of a Collection, not the live authoring object and not a competing content type.
- A Book QR code uses a durable application resolver rather than a direct Storage URL. The edition records the Card version and selected playback artifact represented at export time.
- Each Book edition explicitly chooses authenticated-audience playback or possession-based book-holder access. Possession-based access is limited to that edition's selected playback material and is disclosed as usable by anyone who obtains the code.
- The same parent Card title is not rendered both as the Collection context heading and as an immediate duplicate feed tile. Its optional content enriches the context introduction; its children remain the feed.
- A newly created structural parent defaults to Collection-only distribution. Substantial content may prompt the author to include that Card independently in Feed, while a pre-existing Feed Card retains its Feed status when placed as a Part, Chapter, or Section.
- An existing Card may be placed as a Part, Chapter, or Section without losing its content or changing its role in another Collection. Changing a placement role previews the effects on children, order, breadcrumbs, Reader presentation, and publication context before confirmation.
- A Section cannot receive another structural level. Converting a Part, Chapter, or Section placement into an ordinary Card placement requires moving or removing its local children first; children never move or disappear implicitly.
- Migration from the delivered hierarchy is author-reviewed and non-destructive. Existing Card content, IDs, publication state, Feed inclusion, tags, and Media references remain unchanged; no candidate Collection, placement role, audience, or publication decision becomes authoritative merely because a legacy path suggests it.

### Studio Questions and Prompt Library

*Intent* — Preserve the delivered Question workflow while evolving it into structured, reusable writing guidance that operates inside Card authoring rather than owning authored answers.

✅ **Complete**

- **Prompts** — Create new prompts explicitly; edit existing prompt text directly in place with quiet delayed saving, immediate blur saving, localized Saving/Saved/Retry status, and Escape-to-revert.
- **Filters** — Text, taxonomy, Assigned, Unassigned, Untagged, and descendant scope. The closed taxonomy filter uses the shared icon-and-word dimensional headings with the selected tags visible beneath them.
- **Existing linked answers** — Open the sole existing linked Question Card in Compose. New ordinary writing begins through Cards and copies Prompt guidance into that Card; the library no longer creates a linked answer Card.
- **Unlink** — Preserve the answer as a draft Story.
- **Integrity** — Reject conflicting links, protect linked prompts from deletion, and atomically unlink and convert answers.
- **Structured Prompt Library foundation** — Existing Question records may be organized additively as Category → Topic → Primary Question → Follow-up Questions without changing their IDs, tags, or linked Question Cards. Legacy records remain valid as unorganized primary prompts. Follow-ups must reference a primary question in the same Category and Topic, and a primary cannot be deleted or reorganized while follow-ups still depend on it.
- **Prompt hierarchy and ordering** — Topic results present each primary question with its own follow-ups. Authors can move primary questions within their Category and Topic or move follow-ups within their selected primary; each move is committed atomically through the Question authority and does not reorder another Topic or another primary's follow-ups.
- **Legacy organization review** — `Needs organization` lists every prompt missing a Category or Topic, including legacy records that normalize as unorganized primary prompts. The author uses the ordinary prompt editor to supply the missing placement; saving reconciles the queue immediately. Opening the queue never migrates, deduplicates, or rewrites a prompt.
- **Card-first copying** — From the Prompts pane, the author can copy one prompt or the currently filtered Topic into an already-open Compose Card. The copied questions become ordinary editable Card headings immediately and have no continuing dependency on the Prompt Library; later prompt edits never rewrite the Card.

📋 **Current contracts**

- A Question is a prompt; its Reader content lives in one linked Question card.
- A Question may have zero or one answer card; concurrent create requests resolve to that same card.
- The prompt supplies the initial title and tags; prompt and answer then evolve independently.
- Prompt-text autosave and `Question Tags` Apply are independent mutations; creating and deleting a Question remain explicit actions.
- A linked prompt cannot be deleted.
- Unlinking removes the relationship and converts the answer to a draft Story.

⭕1 **Planned**

- **Structured Prompt Library completion** — Resolve author-confirmed duplicate consolidation in the legacy question bank and the remaining publication-time prompt-block behavior below. Follow-ups continue to draw out incidents, relationships, sensory detail, consequences, and meaning that a broad question alone may not retrieve.
- **Flexible scope** — Insert one primary question, its useful follow-ups, or the useful prompts from a whole Topic. Any number of prompts may contribute to one Card, and the author explicitly starts another Card when the material warrants it.
- **Card-type presentation** — For a Question Card, the selected primary question proposes the title and follow-ups enter the body as guidance. For a Story Card, selected questions enter the body as editable writing prompts. The author may retain, rewrite, or remove copied question text.
- **Prompt blocks** — Editing-only prompt blocks live inside the Card document rather than in a separate answer store. Before publication, each remaining block is converted to ordinary reader-visible heading or question text, or removed; authored text beneath it remains ordinary Card body content.
- **Independent Cards** — Inserting a prompt copies its text and any selected classification into the Card's authoring context without a continuing content dependency. Later prompt edits or deletion do not alter existing Cards.
- **Existing-content migration** — Preserve every existing Question Card, its authored content, Media, tags, and Collection placement. Existing Question records seed an author-reviewed prompt-curation queue; organization and deduplication may change the Prompt Library but never merge or rewrite Cards that answered those questions.
- **Guidance instead of templates** — Organized Prompt Categories and Topics provide the guided path. Collection templates are not required by the active architecture; Collections, Chapters, Sections, and Cards remain flexibly authored.

📋 **Planned contracts**

- Every authored response is saved immediately in the open draft Card; no separate response or working-material entity is introduced.
- Prompt hierarchy guides memory retrieval but does not create or determine Collection, Part, Chapter, Section, or Card boundaries.
- A primary question and its follow-ups are optional guidance rather than required fields or publication completeness criteria.
- Intentional reader-facing Question Cards remain a Card type. Guided prompts are private authoring aids unless the author deliberately retains their text in the Card.
- Migration must validate preserved Card content and copied Prompt Library candidates before retiring any legacy Question link or record.

### Studio Media

*Intent* — Turn raw media into an organized, trustworthy archive ready for stories.

*Principles*

- **One bank** — Assets enter one canonical library and cards reference them.
- **Integrity** — Originals, metadata, identity, and relationships are preserved.
- **Unified library** — Import, search, filtering, grouping, codification, captioning, selection, and Card assignment operate on one canonical Media library rather than separate Organize and Tell views.
- **Confirmation** — Suggested organization remains provisional until accepted.
- **Adaptable intake** — Import and organization disclose what source evidence is available and provide a clear path when folders, metadata, dates, filenames, tags, captions, and duplicate quality vary.
- **Story progression** — The workflow leads from imported media through understanding and confirmation toward useful Galleries, Cards, captions, and stories rather than ending at a managed asset bank.

✅ **Complete**

- **Import** — Bank import, card-oriented folder tools, paste, and drop.
- **Browse** — Search, filters, grouping, batches, and population scopes. Library and Selected Card own separate filter contexts. Entering Selected Card begins unfiltered over that Card's assigned Media; its filters operate only within that population. Selecting another Card resets only the Selected Card context. Returning to Library restores the prior Library search, filters, dimensional rules, and sort state. Hidden-on-card messaging therefore appears only after the author deliberately filters the selected Card population.
- **Library workflow filters** — Server-backed Complete/Incomplete, unresolved dimension, import batch, source folder, metadata outcome, and dimensional-tag filters operate across the matching Library rather than only the loaded page. Grouping fully hydrates the matching result before presenting Folder, Batch, Metadata, or Day groups.
- **Editing** — Captions remain inline. One search-first `Media Tags` modal owns comprehensive single- and multi-Media assignment across Who, What, When, and Where. Search results show full breadcrumbs, participate in the modal layout instead of overlaying the trees, and support click, keyboard navigation, and Enter-to-select. Tag creation belongs only in the Tags pane; assignment and filter modals do not create taxonomy. A single Subjects band beneath the icon-labelled headings divides into four equal dimensional columns for selected short-name tags and aligned Subject checkboxes; the shared band height keeps all four taxonomy trees vertically aligned. Each dimension also carries an explicit Reviewed state independent of its current values, plus mutually exclusive Unknown and Not applicable resolutions. Imported or partially correct values therefore remain unreviewed until the author confirms them. Clear is available at the top of each dimension and stages removal of that dimension's tags, subjects, resolution, and review mark; no change is authoritative until Apply. The When column uses direct structured-date entry and does not expose the legacy When taxonomy. Saving a Known structured date removes legacy When subject designation because the structured date now owns the dimension's authored meaning, while retaining the legacy When tag assignment for migration safety. The Empty/Some/All checkbox legend and Cancel/Apply actions remain in the bottom margin. The general Media editor owns positioning, replace-in-place, relationships, and deletion without duplicating tag controls.
- **Assignment** — Cover, Gallery, and body relationships through drag or library selection.
- **Selection** — The same Tags-and-Subjects modal handles one or many selected Media records, including mixed-value add, remove, and preserve decisions, plus draft Gallery creation.
- **Protection** — Reference-aware deletion.
- **Renditions** — Optimized Reader and Studio images with originals retained.
- **Piles** — Retired from the active product journey. Historical provisional-cluster records and backend compatibility remain dormant pending a later cleanup gate.
- **Stacks** — Manual hero/member grouping without deleting assets.
- **Tag filtering** — The closed filter surface keeps four fixed-width, compact Who/What/When/Where summaries visible with the Reader-sidebar icons, each dimension's applied role/empty/review rule, and its selected tag names; a tag-icon action sits at their upper right. One modal begins with `Enter tags…`; its search matches push the four-dimensional workspace down rather than covering it. Who, What, and Where provide `Subjects only`, `Empty`, `Blank`, `Unknown`, and `Not applicable` alongside their complete taxonomy trees. When provides structured partial dates, inclusive From year / To year range, and its review/resolution states. A blank tree imposes no tag requirement; selected tags match any assignment unless that dimension is `Subjects only`; `Empty` disables that tree and finds no assignments, while `Subjects only` plus `Empty` finds no subject but allows ordinary tags. Unknown and Not applicable disable the corresponding taxonomy tree and match those explicit resolutions; review-state `Blank` matches records whose dimension has not been confirmed. The modal excludes tag creation, opens one level by default and through every selected path, exposes every taxonomy tag, gives each taxonomy tree its own full-height scroll region, and keeps `Cancel` and `Apply` in a fixed footer without requiring the outer dialog to scroll before applying the staged state as one server-backed Library query.
- **Assigned navigation** — The tile's Assigned chip is the Card-navigation control: one referenced Card opens directly in Compose; multiple references open the existing Card selector. No separate overlapping Card-link button is rendered.
- **Responsive synchronization** — A Media tag save updates the authoritative Media records, current Library results, shared tag counts, and filter behavior immediately. Gallery inheritance, affected-Card media signals, and Media/Card search projections run as one deduplicated durable reconciliation operation, reuse maintained Media-to-Card references during ordinary work, retry after interruption, and refresh an affected open Compose Card when complete. Studio does not run the expensive reconciliation processor merely because the workspace opened: the ordinary Media response reports whether durable work is pending, and only that positive signal starts recovery. Initial Questions, Media-stack, Collection-root, and Card-bank reads deduplicate an identical in-flight request so development Strict Mode and transient remounts do not double the server work.
- **Identity evidence** — New imports retain source-byte SHA-256 identity and source provenance; concurrent exact matches reuse one canonical media record. Existing accessible local originals have verified evidence and uncontested registry entries.
- **Exact-match filtering** — The Library can show all Media, only records that share exact source-byte evidence, or only records without such a match. The author uses ordinary Media selection and reference-aware deletion; prior duplicate-review evidence remains preserved but is not a separate author workflow.
- **Evidence classification** — Media without source-byte evidence can be explicitly classified as a missing local original or a source whose original bytes were not retained; stored renditions never substitute for original-byte evidence.
- **Readiness** — New imports durably report source, metadata, Studio rendition, Reader rendition, and search-index state; pending and failed work is visible without adding chrome to healthy media, and retry preserves the canonical asset.
- **Consistency** — Cards and Media share narrow search and empty-state recovery, consistent selection wording, and authoritative deletion-consequence disclosure where their bank operations overlap.
- **Derivatives** — Canonical sources produce orientation-correct Studio and Reader renditions with truthful readiness, retry, and surface-specific delivery across Administration and Reader.
- **Author-confirmed replacement core** — Selecting an edited file for an existing Media item opens a current-versus-proposed comparison before any mutation. The author must confirm that both represent the same underlying item; exact bytes already owned by another Media item fail as a duplicate conflict. A confirmed replacement preserves the canonical Media ID, caption, confirmed tags and subjects, dimensional review, and every Card relationship while refreshing source-byte identity, filename, format, dimensions, size, Studio/Reader renditions, readiness, and search projection. The new source becomes authoritative only after it is durable, incomplete downstream processing remains visible and retryable, and the prior source is retained until the replacement reaches Ready.
- **Presentation framing and rotation** — Cover and Gallery crop focus can be adjusted nondestructively for the Card presentation. Covers and individual Gallery slots can also turn left or right in quarter turns. Gallery overrides belong to that Gallery slot and otherwise inherit the canonical Media focal point; no framing or rotation path rewrites source bytes.

⭕1 **Planned**

- **Replacement metadata conflict review** — Extract useful embedded replacement metadata as source evidence and show material conflicts with confirmed date, place, identity, or other classification for author review without silently rewriting confirmed truth.

⭕2 **Future**

- **Assisted collection review** — Audit the archive for unresolved dimensions, conflicts, likely duplicate identities or vocabulary, questionable assignments, and high-leverage review opportunities. Present graphical member sets, evidence, confidence lanes, affected counts, and direct exception controls; acceptance states explicitly whether information will be added, replaced, merged, retained, ignored, or deferred.
- **Adaptive review** — Support bounded mobile acceptance, correction, and exception removal while reserving dense comparison, range selection, maps, taxonomy correction, and collection-scale bulk work for the desktop-primary stewardship surface. This does not authorize a mobile copy of the current multi-pane Studio.
- **Import vocabulary mapping** — Preserve embedded source keywords and paths as provenance without automatically adding them to the curated taxonomy. After import, present a dense two-sided reconciliation workspace with the independently scrollable curated Who/What/When/Where tree beside one-row imported-keyword records. Each row shows source path, affected-Media count and preview, a reason-labelled recommendation, and compact accept/correct/create/ignore/defer actions. Dragging an imported keyword onto a curated tag corrects its destination; dropping onto a curated parent offers the explicit choice to map to that parent or create the imported name beneath it. Previously approved and exact-path mappings may be applied automatically, accepted mappings are reused on later imports, and resolved or ignored keywords leave the queue while their original evidence remains dormant. Applying accepted mappings uses the authoritative Media tag path, then ordinary curated-tag completeness—not unresolved or ignored source metadata—determines which Media enters Incomplete for bulk tagging.
- **First-user workflow validation** — Observe a representative new archive owner using the implemented Import → Library → codify/caption → Card path without live instruction, then gate only the corrections supported by that evidence.
- **Duplicate reconciliation** — Recover evidence where original source bytes are unavailable and reconcile confirmed same-asset records with recovery evidence. Likely-match discovery remains low priority unless archive pain proves otherwise.
- **Compatibility retirement** — Remove dormant Pile, Person, Group, and old perspective compatibility only after zero-live-reference proof and a recoverable migration gate.
- **Bursts (parked)** — Suggest likely burst stacks only after reliable original capture time and source-sequence evidence is persisted; import timestamps and filenames alone are insufficient.
- **Video (parked)** — Import, browse, assign, preview, process, and play video only after the stable image-based authoring and reading baseline proves its value.
- **External library adapters (parked)** — Add provider-specific export guidance, explicit-selection import, or native companion access only after the core experience is proven. Apple Photos, Google Photos, OneDrive, and similar services are ingestion sources, not synchronized backing libraries.
- **Similarity** — Suggest non-burst visual stacks.
- **Motion pairs** — Preserve related still and motion assets.
- **Reader stacks** — Let readers explore intentionally exposed stack members.

📋 **Contracts**

- AI and imported evidence may propose organization, but proposals must disclose affected Media, supporting evidence, uncertainty, and the consequence of acceptance. The primary archive-scale interaction is visual and selection-based, with a direct exception path, rather than a sequence of opaque yes/no batch questions.
- PhotoPicker selects existing assets; folder import belongs to Studio Media.
- Assignment never removes media from the bank or alone controls Reader discovery.
- Card assignment is visible and intentional: cover, Gallery, and body references are the Media used by that Card. Related but unused items remain in the Media library rather than joining an author-only or archival Gallery.
- Story authoring may offer Media that matches the Card's confirmed Who, What, When, and Where plus relevant source or machine evidence. The author explicitly selects which results become Card references; the broader result set is not stored as hidden Story membership.
- Replacement versions, Stacks, and occasion results have different meanings. Replacement concerns the same underlying Media item; a Stack groups near-duplicate or closely interchangeable captures; an occasion result is reconstructed from classification and evidence across distinct Media items.
- No durable Event, saved Media context, or private Story-source relationship is part of the active architecture. Add one only if real archive use proves that confirmed classification, source evidence, search, and suggestions cannot reliably reconstruct an important set.
- Media `Status` means Card relationship status: Assigned or Unassigned. Codification completeness is a separate Complete or Incomplete filter, and selecting Incomplete adds unresolved-dimension criteria without hiding ordinary dimensional tag filters.
- Import adds Media to the Library; it does not create provisional story groups or Cards. The normal author journey is Import → Codify/caption → Select → Create or add to Card.
- Card-oriented Media selection defaults the existing codification filter to Complete. The same All Codification / Complete / Incomplete selector remains visible; All Codification includes both Complete and Incomplete when Card context will help finish codification. Complete accepts intentional Unknown or N/A dimensional answers.
- Automatic and manual Piles are not part of the target workflow. Filtering, grouping, search, and ordinary selection form working sets; a future saved-selection capability requires demonstrated user need rather than inheriting the provisional Pile model.
- New imports persist whether embedded metadata was requested and whether useful caption or keyword metadata was found, absent, or unreadable. Paste imports record that metadata was not requested; legacy records without this evidence remain Unknown.
- Future import vocabulary mapping must keep source metadata separate from confirmed assignments: imported keywords do not become curated tags merely because they were found in a file, and a mapping decision stops surfacing after it is accepted, ignored, or otherwise resolved.
- Media caption and tags are frame truth; card placement overrides are explicit and local.
- Future first-time guidance must explain source evidence, provisional versus confirmed truth, and the relationship between Media tags, Card tags, subjects, identities, and Gallery inheritance at the moment each distinction becomes relevant.
- A successful import is not the end of onboarding: the system must truthfully show what is ready, what requires review, and the most useful next action without forcing a novice through every advanced tool.
- Delete checks every authoritative card surface. Author-confirmed replacement preserves the canonical Media ID, confirmed tags, subjects, review state, captions, author notes, and Card relationships while updating source-byte identity, format, size, dimensions, extracted metadata, readiness, search evidence, and generated renditions.
- Replacement metadata is new source evidence, not automatic confirmed truth. A material conflict with confirmed date, place, identity, or other classification produces a review message rather than silently rewriting the author-confirmed value.
- Replacement remains recoverable until the selected source, required metadata, renditions, and projections are durable. The product may retain the prior bytes operationally for rollback without exposing a general version-management system.
- Filename, modified date, dimensions, file size, and visual similarity may warn that the selected replacement appears unrelated, but they do not establish identity or authorize replacement. The author confirms that the selected file represents the same underlying Media item.
- External editing and synchronization are outside the active product responsibility. My Stories does not choose an editor, manage a round-trip export package, watch external files, or propagate changes back to source libraries; the author returns an edited result by deliberately replacing the existing Media file.
- Source cropping, sharpening, focus restoration, and AI enhancement are not active My Stories editing capabilities. Nondestructive Story presentation framing and rotation may be provided without altering the canonical source.
- Exact source bytes or an exact provider asset identity may reuse one canonical asset. Filename, dates, dimensions, size, and visual similarity are review evidence only and never authorize automatic merging.
- Duplicate review decisions are Same asset, Keep both, or Defer. Keep-both decisions persist; same-asset reconciliation requires an explicit canonical asset and field-by-field conflict resolution before references move.
- A stack is author-confirmed, has one hero, can be dissolved without deleting members, and contributes one Gallery position during card creation unless explicitly expanded.
- External photo libraries do not remain live backing stores in v1. Exported, locally available, or explicitly selected assets enter the same canonical import pipeline, which preserves available source identity and metadata and stores durable application-owned media.
- Video follows image identity, tagging, assignment, reference, and deletion rules; it plays in Media, Compose placements, and Reader. Studio Cards may use a poster only. Video never autoplays with sound.

### User Management

*Intent* — Let the author control who can enter the private archive.

✅ **Complete**

- **Admin** — Initial administrator setup.
- **Readers** — Create individual reader accounts only after reviewing the exact legacy and all-enabled-reader Card and Collection access the new enabled account will inherit immediately.
- **Status** — List, enable, and disable accounts. Before a Reader status change is applied, show the exact currently published Cards and Reader-valid Collections whose access will be lost or restored through all-reader, individual, group, Feed, placement, and Collection-introduction routes.
- **Passwords** — Set a new temporary password.
- **Roles** — Enforce Reader and administrator boundaries.
- **Revocation** — Revalidate JWT-backed account truth and end existing authorization on the next server request when an account is disabled or missing.
- **Reusable audience groups** — The deployed implementation lets the author create, rename, populate, and delete Reader-account groups in User Management. Before a membership change can be saved, User Management shows the exact enabled readers who gain or lose access to each currently Reader-visible Collection and published Card, including access unions through Feed, placements, and Collection-introduction routes. A referenced group cannot be deleted until it is removed from every Card and Collection audience.
- **Audience completion** — The deployed Reader boundary has one legacy-compatible evaluator for standalone Feed Cards, Collection routes, and their referenced Media: missing audience data includes all enabled readers, while explicit individual and reusable-group IDs restrict access and Card access is the union of its active Feed and authorized Collection routes. A Collection contributes inherited Card access only when its complete required structure is reader-valid; an active/published marker with a missing or draft required Card fails closed just as the Collection route does. Story and Collection authoring provide explicit all-readers or selected-group/individual controls, validate stored references, and show exact enabled readers before Save. Saved Stories calculate their complete all-route union, and changing a published Card's Feed inclusion shows exact reader gains and losses before applying the route change. Collection authoring calculates the proposed consequence for every unique placed Card across that Collection, standalone Feed, and other reader-valid Collections, while identifying draft and missing Cards. New Card publication requires an explicit nonempty audience plus Feed inclusion or an active Collection placement. New Collection publication requires explicit audience confirmation, at least one Card, no missing or draft Cards, and the selected Card/Media classification plus inherent Media-reference/readiness contract. Published Collection placement structure and active/shadow authority are locked until deliberately returned to Draft.
- **Private Media delivery** — Author- and Reader-facing permanent object URLs are replaced with authenticated application delivery. Author responses retain authorized archive metadata; Reader responses contain only display data for Media actually referenced by accessible published content. Production Storage denies direct client reads; deployment readback proves anonymous stored-object denial and successful authenticated Author and Reader byte delivery.
- **Consistency** — Use the current Administration shell, theme, feedback, confirmation, validation, table, spacing, and action patterns.
- **Guest recipients** — The local release candidate lets the author create an enabled guest recipient only after reviewing the same exact legacy and all-enabled access inherited by a new Reader. It returns one private, seven-day, single-use link for manual delivery; replacement revokes older unused links. Redemption creates the ordinary Reader session for that stable recipient ID, so existing individual and group audiences apply without copying Cards, Collections, Media, or audience data. Disabling the recipient revokes the session on its next server request.
- **Shared Media Collections** — The author can select up to 250 existing Media items in Studio Media, create or add them to a bounded private photo-set draft, choose an explicit Reader audience, and publish that set without changing the Media items' Card uses or exposing any other archive Media. Reader Home lists only published sets authorized for the signed-in Reader, and their Media bytes use the same authenticated delivery boundary as Story Media. Published set content and audience are locked until the author returns the set to Draft. Reader-account, group-membership, group-deletion, and Media-deletion consequence paths include these sets.
- **Manual Reader links** — Published Cards, durable Collections, and Shared Media Collections expose a direct Reader-link action in their authoring owner. Copying a link performs no access mutation and explicitly states that only an already-authorized reader can open it; the author chooses how and to whom the link is delivered.

⭕1 **Planned**

- **Guest-account conversion** — Let a guest later establish a fuller password account without changing the stable recipient ID or authored audience decisions.
- **Identity linkage** — Optionally link one access identity to its corresponding Who identity. Relationship facts and Story subjects may suggest recipients or group membership but never add access without author confirmation.
- **Automated distribution** — Build on manual Reader links with an explicit selection of already-authorized recipients, delivery status, and optional notification transport. Making content available to a large audience does not imply notifying everyone after every change, and distribution never grants access implicitly.

⭕2 **Future**

- **Recovery** — Password setup and recovery for password accounts and optional guest-account conversion.

📋 **Contracts**

- One administrator; every other account is an individual reader.
- No public registration or reader promotion to administrator.
- Readers can access published Reader content but not Administration.
- Passwords are hashed, never retrievable, and never returned by APIs.
- v1 disables accounts rather than deleting them.
- Who identity, relationship graph, access identity, audience membership, publication, and notification remain separate authorities.
- Audience membership is explicit and reviewable. Editing a Who relationship or Card tag never grants or revokes Reader access.
- A Card's effective audience is the union of its own explicit audience and each authorized Collection placement that contains it. The author sees that consequence before confirming a placement or audience change.
- Media access derives from an authorized Card, Collection, or Shared Media Collection context. Media has no global `shared` boolean, and raw archive membership never implies reader access.
- Shared Media Collection membership is independent of Story and Collection placement. One canonical Media item may appear in multiple shared sets and Cards without copying the Media record; removing it from one set changes no other context. A set must have at least one deliverable Media item and an explicit nonempty audience before publication.
- Guest links are unguessable, revocable, bounded to their grant, and do not expose unrelated archive content.
- Raw guest tokens are never stored. A link carries its token in the URL fragment, can be redeemed once, expires after seven days, and is replaced rather than recovered.
- Commercial plan limits may bound authors, recipients, storage, processing, notifications, or AI use later, but authorization semantics do not depend on a particular pricing package.

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
- **Standardization** — Restore one path from approved values through roles and recipes to surfaces with visible inheritance and explicit overrides.
- **Enforcement** — Remove bypasses, competing aliases, duplicated variables, and local design systems.
- **Coverage** — Reconcile surfaces, editor, schema, generator, runtime, and components.
- **Foundations** — Provide centralized typography, palette, spacing, radius, shadow, and density decisions with understandable cascade impact.
- **Shared systems** — Expose coherent Primary action, secondary action, field, selected, destructive, feedback, dimensional-tag, Type-chip, caption, and image-control recipes.
- **Macro layout** — Expose meaningful layout controls such as Content Grid spacing without exposing responsive safety calculations as arbitrary styling.
- **Journal** — Journal Light and Dark meet the accepted v1 presentation and contrast level.
- **Editorial** — Editorial Light and Dark meet the accepted v1 presentation and contrast level.
- **Reader mode choice** — Each reader can select Light or Dark independently.
- **Reader mode persistence** — Each reader's Light/Dark choice persists in account-backed settings.
- **Administration** — Establish one coherent administrative presentation.
- **States** — Standardize success, warning, error, information, focus, disabled, selected, and destructive states.
- **Usability** — Improve the workbench after the contract is stable.

⭕1 **Planned**

- **Reader package choice** — Let each reader select Journal or Editorial rather than consuming the single globally materialized Reader package.
- **Reader package persistence** — Preserve each reader's package choice independently once both packages can be stored and compiled truthfully at runtime.

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
