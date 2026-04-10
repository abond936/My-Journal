# APPLICATION

**See also:** `01-Vision-Architecture.md` · `03-Implementation.md`

Legend:
✅`Implemented`
⭕1`Planned (next)`
⭕2`Future`
❓`Open`
📐`Decision`
📘`Resource`

---

### Document Structure (Application)

- Under each *Features* block, use plain status headings (no list bullet): `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open`.
- Items under each heading are bullets: `- **Title** - description`.
- Standalone `📐` and `📘` lines stay outside the status buckets (after the buckets).

---

## **Application**

*Intent*
- **Consumption** - Consumption of content. Primarily mobile, but also tablet and desktop
- **Administration** - Administration of content, primarily on desktop, but minor edits on mobile.

*Principles*
- **Ease of Use** - Obvious or intuitive operation.
- **Responsiveness** - Quick response in content consumption.
- **Bulk Authoring** - Support high-volume/bulk authoring operations in administration workflows.
- **On-the-Fly Authoring** - Support specific, low-friction edits while browsing content.

*Features*
✅ **Complete**
- **Structure** - App is separated into content and administration surfaces with shared providers/navigation patterns.
- **Layouts** - AppShell (navigation/structure), ViewLayout (content interface), AdminLayout (admin interface).
- **Providers** - AuthProvider, TagProvider, CardProvider.
- **Route Separation** - Reader and admin routes are distinct, preserving explicit editing context.

⭕2 **Future**
- **Split Validation** - Validate the current split model against author workflow friction in real use.
- **Edit on the Fly** - Add admin-only entry points from content surfaces (quick edits and/or deep-link to full editor).
- **Accessibility** - Elderly family members are a known audience. Body text minimum 16px (prefer 18px for narrative); WCAG AA contrast ratios (4.5:1) in light/dark modes; 44x44px minimum tap targets on mobile; wire media `caption` into `alt` attributes on `JournalImage`; keyboard navigation for all interactive elements; respect `prefers-reduced-motion` for animations. Run Lighthouse accessibility audit as baseline.
- **Print / Export to Book**

📐 **Initial Architecture** - Initial architecture decision: separate content consumption from administration to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
📐 **Future Architecture** - Current direction: keep separation, but add admin-only on-the-fly editing affordances from content pages for faster author workflow.

## **Navigation**

*Intent*
- **Intuitive** - Intuitive/obvious, fluid consumption.
- **Customizable** - Content filtering

*Principles*
- **Mobile-First, Desktop-Second** - Layout adapts automatically by screen size; touch-optimized on mobile.
- **Seamless Flow** - No jarring interruptions between content; smooth transitions and contextual progression.
- **Single Control Surface** - All filtering and discovery controls accessible from one panel.

---

### **Home Page**

*Intent*
- **Interesting Intro** - Present an intriguing introduction to the app with login.

*Principles*
- **Simple** - Simple login page with app title and a few graphics.

*Features*
✅ **Complete**
- **Login Page** - Application opens to home page with login form and SVG logo.
- **Home Layout**  - Login splash with logo; no nav bar. Redirects to /view after login.

---

### **Top Navigation**

*Intent*
- **App Badge** - Small app badge
- **Settings** - Access to settings
- **Back Button** - Place for Back button

*Principles*
- **Simple** - Clear, not distracting
- **Minimal** - Space saving

*Features*
✅ **Complete**
- **Header** - Centered logo, contextual Back button, hamburger menu (content/admin/theme/signout).
- **Logo** - Same title artwork as home; compact height in header (`Navigation.module.css`).
- **Hamburger** - Dropdown menu with content links (all users), admin links (admin only), and theme toggle.

---

### **Left Navigation**

*Intent*
- **Comprehensive** - Comprehensive content filtering

*Principles*
- **Slideout** - Available as needed, hideable
- **Compact** - Fits a lot of data readibly.

*Features*
✅ **Complete**
- **Hierarchical Tag Tree** - Tag tree for filtering content by card type and active dimension.
- **Mobile** - Left sidebar/drawer pattern for filters on small screens; no bottom navigation bar.
- **Card Type** - Icon buttons: Story | Gallery | Question | Callout | Quote
- **Tag Dimension** - All | Who | What | When | Where
- **Persistence** - Remembers selections across page refreshes.
- **Mode** - FreeForm | Curated
- **Selected Tags** - Shows selected tags as chips.
- **Search Tags** - Search tags.
- **Sort by** - Random | Oldest | Newest on filtered card feed.

⭕1 **Planned**
- **Sort / Group** - Add user-selectable sort/group by event, Who, What, When, Where. Coherence.

⭕2 **Future**
- **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
- **Collection Metadata** - Implement collection metadata (child counts).
- **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
- **Mobile Filter UX** - Tune type/tag filter UX on mobile. Layout reference: `--header-height` 60px; mobile filter drawer `--sidebar-width-mobile` 250px (`theme.css`).
- **Tree UI** - Emulate mobile with buttons for who, what, when, where

---

## **Content**

*Intent*
- **Interactive** - Immersive experience in stories and images.

*Principles*
- **Curated and Freeform** - Directed or non-directed exploration.
- **Single Structure** - One card schema with multiple presentation behaviors.
- **Multi-Presentation** - Card types have differentiated display behavior.

*Features*
✅ **Complete**
- **Display Modes** - Inline (short text/few images) vs Navigate (long text/many images).
- **Manual Control** - All content mixing and display logic controlled by user.
- **Contextual Filtering** - Active dimension tab controls which tag subset filters the feed.
- **Main Feed** - Mixed content types with seamless transitions between related content.
- **Mobile-First** - Touch scrolling, responsive design, news feed feel.
- **Curated or FreeForm** - Author-ordered or user-explored.
- **Display types (enforced)** - Story → navigate; gallery → navigate or inline; Q&A → navigate or inline; callout → static; quote → static. Coerced in `createCard` / `updateCard` (`cardDisplayMode.ts`); admin pickers in `CardForm` / `EditableDisplayModeCell`. Reader feed linking: `V2ContentCard` (`navigate` + story | gallery | qa only).

⭕2 **Future**
- **Card Cues** - Show small type badge on compact cards (`Story`, `Q&A`, `Gallery`, `Callout`, `Quote`).

---

### **Content Page**

*Intent*
- **Immersive** - Immersive content consumption experience.
- **Engaging** - Presenting an engaging interface and fluidly scroll through the stories--up and down, left and right.

*Principles*
- **Dual-Path** - FreeForm or Curated

*Features*
✅ **Complete**
- **Feed** - `CardFeedV2` → `V2ContentCard` (`src/components/view/`). Responsive grid on `/view` after login.
- **Linking rule** - Feed tile links to `/view/[id]` only when `displayMode === 'navigate'` and `type` is `story`, `gallery`, or `qa`. Other types/modes render a non-link tile (`V2ContentCard.tsx` `isInteractive`).
- **Schema** - `type`: `story` | `gallery` | `qa` | `quote` | `callout`; `displayMode`: `static` | `inline` | `navigate` (`src/lib/types/card.ts`). Collection structure = `childrenIds` on any type, not a separate `type`.
- **Detail** - `CardDetailPage.tsx` and view components in `src/components/view/` (TipTap, gallery, discovery blocks).
- **Feed chrome** - Header, search row, type chips; `@` card mentions via `CardMention` / `TipTapRenderer`.
- **Suggestions (detail)** - Children from server; Similar / Explore via `/api/cards/random` (`count=3`, tag dimensions from current card). `DiscoverySection`: horizontal scroll rails, compact `V2ContentCard` (`small` + `fullWidth`).

📐 **Product vs code** - v1 intent: omit story excerpt on feed/detail; `StoryCardContent` still renders `excerpt` when the field is set—clear data or add a guard when enforcing.
📐 **Horizontal open** - Prefer horizontal open for long-form on mobile where the reader implements it.

⭕1 **Planned**
- **Card Content** - Assess Title, Subtitle, Excerpt, Content.
- **Questions / Quotes** - Source material (Word, books, Notion).
- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).

⭕2 **Future**
- **Bundle / `next/image`** - Code-split heavy routes; tuning feed image priority.
- **Gallery slider polish** — Dots, desktop arrows, child rails (see **Feed Types**).
- **Feed Types** / **Display Strategy** - Alternate layouts post-v1.

📘 `src/components/view/CardFeedV2.tsx` · `V2ContentCard.tsx` · `ContentCard.tsx` (legacy / CardGrid)

---

### **View Page** 

*Intent*
- **Seamless** - Seamless opening of cards to content.

*Principles*
- **Mobile** - Mobile-like behavior as possible.

*Features*
✅ **Complete**
- **Open Card** - Clicking a navigate card opens `CardDetailPage.tsx` via server-side fetch (`getCardById`, `getCardsByIds` for children). Conditionally renders card components.
- **Conditional Render** - Render page components based on card data presence.
- **Q&A, Quote & Callout detail** - Question: kicker "Question", "Answer" + TipTap. Quote: title; blockquote body; attribution footer from `subtitle`/`excerpt` via `formatQuoteAttribution`. Callout: standard title / subtitle / TipTap (no extra chrome).
- **Title** - Render first.
- **Subtitle** - If present, render next.
- **Cover Image** - If present, render next.
- **Content** - If present, render using TipTapRenderer.
- **Gallery** - If present, render `mosaic` on view page (decision). (Feed/cards: horizontal swipe; see Content Page.)
- **Children** - If present, render.
- **Related** - Display 3 random from filter. Reduced font.
- **Explore More** - Display 3 random outside filter. Reduced font.
- **Progressive children (discover + child hydration)** - **Discover More:** structural **Related Content** renders from server props immediately; **Similar Topics** / **Explore More** load client-side after mount with per-group loaders (`DiscoverySection.tsx`). **`/view/[id]`:** child cards load via `getCardsByIds(..., { hydrationMode: 'cover-only' })` with first-gallery image when no cover—fewer Firestore reads than full hydration. The view page RSC still awaits parent + children in one round-trip; streaming parent-only first remains optional (🔵 / future).

⭕1 **Planned**
- **Related Count** - Reduce size/number of Related and Explore More cards?

⭕2 **Future**
- **Feed hydration tiers:** Optional **cover-only** first paint on `/view` (defer full gallery/content hydration until card open or below fold) to reduce payload and server work vs today's full hydration for feed cards.
- **View Mosaic** - Implement view-page gallery mosaic (replace swiper-only if needed).
- **Social Features** - Like, comment, sharelink — out of scope until revisited.

---

## **Administration**

*Intent*
- **Administration** - Assembly and maintenance of all artifacts in app.

*Principles*
- **Bulk & Individual** - Support both high-volume batch operations and individual edits.
- **Efficiency** - Keep admin workflows efficient under large import/edit workloads.
- **Server-side** - CRUD and data-integrity logic belongs server-side.

*Features*
✅ **Complete**
- **Navigation** - Top hamburger navigation `Admin` button navigates to Administration (`src/app/admin/layout.tsx`).
- **Domains** - All admin domains active: Cards, Media, Collections, Tags, Questions, Users, Themes.
- **Card Management** - Core CRUD, card schema, edit flows, collection route.
- **Media Management** - Assigned/unassigned filtering, replace-in-place, card-reference-aware delete.
- **Collections Management** - Parent/unparent cards, reorder cards.
- **Tag Management** - Hierarchical admin, DnD/reparenting, inline edits.
- **Question Management** - CRUD and create-card linkage workflow.
- **User Management** - Users model and admin user workflow.
- **Theme Management** - Set parameters for colors, fonts, etc.
- **Scripts** - `package.json` scripts for migrations, reconciliation, one-off repairs, and emergencies. Detail in TECHNICAL > Scripts.

⭕2 **Future**
- **Maintenance Management** - Admin UI over existing secured maintenance APIs (`POST /api/admin/maintenance/*`: reconcile, cleanup, backfill, diagnose-cover). A Maintenance tab existed previously and was removed; restore when in-app diagnose/fix outweighs CLI + manual HTTP. Today: `docs/NPM-SCRIPTS.md` and `npm run …` scripts.
- **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin — restore bounded deduping to cut duplicate `/api/cards` requests where safe.

📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

---

### **Card Management**

*Intent*
- **Administration** - Manage card population

*Principles*
- **Ease of Use** - Ease of bulk and individual admin.

*Features*
✅ **Complete**
- **Service & schema** - Firestore `cards`; `src/lib/services/cardService.ts`; `src/lib/types/card.ts` (`cardSchema`). Denormalized fields for filtering; business rules server-side.
- **Admin surfaces** - `src/app/admin/card-admin/` (grid/table, `CardForm` + `CardFormProvider`, `AdminFAB`, search/filter via `CardProvider`, `BulkEditTagsModal`).
- **Fields** - Types `story|gallery|qa|quote|callout`; status; `displayMode`; cover + `PhotoPicker` / `CoverPhotoContainer`; `galleryMedia`; TipTap `content` + embedded media + `@` mentions (see Content Page); `MacroTagSelector`; excerpt + auto (`excerptAuto`); `childrenIds` + picker UI; dirty leave/duplicate flows (`persistableSnapshotsEqual`, `confirmLeaveIfDirty`, `POST /api/cards/[id]/duplicate`).
- **Import** - Folder-as-card (`ImportFolderModal`, `__X` files, caps) — details in `docs/IMPORT-REFERENCE.md`.
- **Discovery in edit** - PhotoPicker Library tab mirrors Media list filters + in-modal tag dimensions (`filterTagIds` from `CardForm`).

⭕2 **Future**
- **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).
- **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question→card linkage. Deferred until after import.
📐 **Structural Collections** - Collection parent = any card with `childrenIds`. `type: 'collection'` is legacy/presentation only. `curatedRoot` marks top-level curated entries. Full structural detail in Collections Management.

---

### **Collections Management**

*Intent*
- Organize cards into curated hierarchies with explicit parent/child ordering for narrative sequencing.

*Principles*
- **Structural, not type-based** - Parent/child via `childrenIds`, not `type: 'collection'`.
- **Manual ordering** - Author controls sequence through TOC; no automatic sorting.

*Features*
✅ **Complete**
- **Data Model** - `/admin/collections` (`src/app/admin/collections/page.tsx`).
- **Curated Tree** - drag-and-drop—attach/detach children, promote to tree root (`curatedRoot`). Single-parent model; cycles blocked in `cardService`. Admin tree loads up to **1000** cards for the page.

⭕2 **Future**
- **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC (primary mechanism for curated narrative). One tree UI for reparenting and ordering. Reconcile parent/child model after TOC exists. No cascade on parent delete — children simply lose that parent.

📐 **Structural Model** - Listing eligibility matches `childrenIds.length > 0 OR curatedRoot === true`, stored as `curatedNavEligible` for querying. Sidebar `getCollectionCards` filters `curatedNavEligible == true` (and optional `status`), ordered by `createdAt`.

---

### **Media Management**

*Intent*
- **Multi-source** - Access images from various *external sources* — local, OneDrive, Google, Apple, etc.

*Principles*
- **Imported** - Imported to db for stability
- **Processed** - Image processed and metadata extracted. 
- **Referenced** - Referenced in cards by id, hydrated on demand
- **Replacement** - Facilitate simple edit and replacement of media.

*Features*
✅ **Complete**
- **Core** - Firestore `media` collection; types in `src/lib/types/photo.ts`; import/process/`replace` in `src/lib/services/imageImportService.ts` (and related APIs). Display: `JournalImage`, `getDisplayUrl` (`src/lib/utils/photoUtils.ts`).
- **Search** - Typesense `media` index + facets (sync scripts in `docs/NPM-SCRIPTS.md`).
- **Import paths** - Local drive / PhotoPicker / paste-drop via `imageImportService.ts`; folder-as-card (`__X` marker, `IMPORT_FOLDER_MAX_IMAGES`, `ONEDRIVE_ROOT_FOLDER`) — full rules in `docs/IMPORT-REFERENCE.md` and `normalize-images-README.md`.
- **Card edges** - `referencedByCardIds` maintained on create/update/delete paths; unassigned filter + `mediaAssignmentSeek.ts`. Drift repair: `npm run reconcile:media-cards`, maintenance HTTP — see `docs/NPM-SCRIPTS.md`.
- **Admin** - Multi-dimensional filter, replace-in-place (`POST /api/images/{id}/replace`), tagging (`PATCH /api/images/{id}`), bulk modes, multi-select → draft gallery card (`MediaAdminContent`).

⭕1 **Planned**
- **Temporary/Active.** Remove this status. No longer required. All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.
- **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).

⭕2 **Future**
- **Rename types module** - `src/lib/types/photo.ts` → `media.ts` (throughout)
- **Append to Gallery** - Bulk add selected banked media to another **existing** card's gallery from Media admin (parked). **Today** images still reach cards after import via **Create card from selection** (draft gallery + edit), **PhotoPicker** / gallery in card edit, **inline images** in rich text, and **replace-in-place** on media rows—no need to block on this bulk-append flow.
- **Video** - Support on **cover**, **inline (body)**, and **gallery** like stills—as far as product parity allows. **Size / "normalization"** (typical approach): **server-side transcoding** (e.g. FFmpeg) to a max resolution/bitrate and web-friendly format—same *class* of work as image normalization; not automatic in-app today.
- **Browser Upload** - Replace or supplement server-side folder read (`ONEDRIVE_ROOT_FOLDER`) with browser-based upload flow. Required for hosted deployment where the server has no local filesystem access.
- **Google Photos Adapter** - Import from Google Photos API. Most accessible cloud photo API. Requires OAuth consent, album/media listing, download-and-process flow.
- **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API. Similar shape to Google Photos adapter.
- **Apple iCloud** - Most restricted API access. May require workaround (export from Photos app, then local/browser upload). Lowest priority.
- **Post-Import Maintenance** - Cropping, cleanup, sharpening in GIMP/Topaz after import. Use replace-in-place in Media admin to preserve media IDs and card references.
- **Import pipeline job** - **Async queue/worker** for large folder import (normalize + writes) complementing `IMPORT_FOLDER_MAX_IMAGES` and serverless timeouts.
- **Import metadata precedence** - Prefer **embedded XMP/IPTC** read **at import** for captions/keywords; use **JSON sidecars** as optional/supplementary when files are authoritative on disk.
- **Multi-Author** — Second author voice, shared media pool, intertwined feeds, cross-author comments. **Today:** one admin author + family readers; another author ⇒ separate instance. **Hard problems:** identity/roles, author-scoped cards vs shared media/dedup, tag “lens,” merged vs parallel feeds, moderation. Stays **private / curated / archival**—not public social scale.
   
📐 **Entry Paths** - Two import paths: (1) **Import → Card** — import from source as card + images concurrently, assign tags from folder/metadata, edit after. (2) **Import → Bank → Card** — bulk import images with tags into the bank unassigned, then create cards and assign from the bank.
📐 **Source Adapter Architecture** - The existing service layer (import, process, return mediaId) is the right shape for multiple source adapters. Current: local filesystem (hard drives / OneDrive mirror). Future adapters add alongside, not replacing, the local drive path.
📐 **Authoring Pipeline (digiKam → mass import)** - Organize folders/tags in digiKam; one leaf folder → one card; tags follow dimensional branches (WHO, WHAT, etc.); phased import with verification; post-import refinement via GIMP/Topaz + replace-in-place. See `IMPORT_FOLDER_MAX_IMAGES` for folder size cap.

📐 **Assignment Model** - References only; hydrated from media at read time. No embeds.
  - **Cover** → `coverImageId`, `coverImageFocalPoint` (single image)
  - **Gallery** → `galleryMedia[]` — `{ mediaId, caption, order, objectPosition }`
  - **Inline (rich text)** → `contentMedia[]` — IDs extracted from HTML (`data-media-id`)

📐 **Cross-entity sync** — Firestore is authoritative; Typesense and denormalized fields follow these entry points:

| Relationship | Primary maintenance |
|--------------|---------------------|
| Card ↔ media `referencedByCardIds` | `createCard` / `updateCard` (transaction `arrayUnion` / `arrayRemove`); `removeMediaReferenceFromCard` + `deleteMediaWithCardCleanup` |
| Card ↔ Typesense | `syncCardToTypesense` after create/update paths; `removeCardFromTypesense` on card delete |
| Media ↔ Typesense | `syncMediaToTypesenseById` / `syncMediaToTypesense` on media writes; `removeMediaFromTypesense` on media delete |
| Card ↔ tag `cardCount` (and ancestors) | `updateTagCountsForCard` inside card transactions (tag changes, publish state, `deleteCard`) |
| Card ↔ questions | `unlinkCardFromAllQuestions` after `deleteCard`; link/unlink APIs update `usedByCardIds` + `usageCount` |
| Drift / bulk repair | Ad hoc: `npm run sync:typesense` / `sync:typesense:media`; `npm run reconcile:media-cards`; other scripts under `src/lib/scripts/`. Not a separate product backlog item—normal CRUD paths above own day-to-day consistency. |

📘 `normalize-images-README.md`
📘 `METADATA_EXTRACTION_README.md`
📘 `docs/IMPORT-REFERENCE.md`

---

### **Tag Management**

*Intent*
- **Multi-Dimensional** - Who, What, When, Where
- **Hierarchical** - USA/Illinois/Chicago

*Principles*
- **Server-side** - All business logic on the server-side (`tagService`).
- **Universal tagging** - All media and cards tagged for filtering using the same dimensional/hierarchical library.

*Features*
✅ **Complete**
- **Model & service** - Firestore `tags`; `src/lib/types/tag.ts`; `tagService`. Dimensions Who / What / When / Where; Reflections under What; `zNA` sentinels per dimension; migrations `tags:consolidate-reflection`, `tags:seed-zna`.
- **Admin UI** - `/admin/tag-admin`, `TagAdminList`, DnD (`SortableTag`), inline rows, delete/move with count recalc, modals + `POST /api/tags`, typeahead in pickers (`filterTreesBySearch`).
- **Usage** - Same assignment UX on cards and media (`MacroTagSelector` pattern). Card `filterTags` derived on save in `cardService` (not from image tags). At-a-glance: `getCoreTagsByDimension`, `DirectDimensionChips` on card/media tables and grids.
- **Authoring stance** - Card-level vs frame-level tags are independent; bulk media tagging is primary day-to-day.
- **Single TagProvider** - One root `TagProvider` in `src/app/layout.tsx`; admin no longer nests extra providers (`admin/layout.tsx`, `tag-admin/page.tsx`).
- **Tag tree counts (cards/media)** - `cardCount` + `mediaCount` on tag docs; UI `(cards/media)` in `TagAdminRow` and sidebar `TagTree`. Incremental: `updateTagCountsForCard`, `updateTagCountsForMedia` (media PATCH + delete + `deleteTag` strips tags from affected media). Full recompute: `updateAllTagCardCounts` + `updateAllTagMediaCounts` via `npm run update:tag-counts -- --apply`.

⭕1 **Planned**
- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."

⭕2 **Future**
- **Unified tag edges (conceptual):** Treat assignments as **(subjectType, subjectId, tagId)** even if denormalized on `Card` / `Media` for reads—eases counts, digiKam mapping, migrations. (??)
- **Face Recognition** - Options:
    - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
    - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
    - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.
- **Relationship Tagging** - Derive family relationships from minimal primitives (`parent_of`, `spouse_of`); compute uncle, cousin, step-parent, etc. via inference rules. Maps to WHO dimension. Large surface (graph storage, validation, remarriage/step edges). Park until parallel media tagging and bulk Media-admin UX are in place. Detail regenerable.
📐 **Authoring Vocabulary** - Mirror the same dimensional paths in digiKam keywords and the app tag tree so import/mapping stays predictable. Four scene dimensions on media (Who, What, When, Where); card-level arc/theme tags for narrative framing. **N/A sentinel:** use root tag **`zNA`** in each dimension in the app (and align digiKam keywords to the same label per dimension path). Key conventions:
  - **When** — `when/date/…` chronological, sortable (`yyyymmdd`, `00` for unknown). No `when/stage` (stage is who-dependent; infer from who + date). Season out of scope.
  - **What** — Includes `what/Reflections/…` for reflective / journal-style themes (card-centric; not used for media scene tags). Other buckets: `what/event/…` (occasions/milestones), `what/activity/…` (what people are doing), plus long-running domains under What as needed. Overlap: milestones → event; school defaults to theme; add event for specific ceremonies.
  - **Who** — People as stable tag identities (display names). Groups optional (`who/group/…`). Subject vs also-present encoding TBD. Kinship graph is **Relationship Tagging** (future).
  - **Where** — Administrative nesting (country → state → county → city), skip levels when irrelevant. Venues, domestic labels, natural settings as children. GPS/EXIF may seed on import; author refines in Tag admin.

---

### **Question Management**

*Intent*
- **Journal-like** - Grandfather/Father journal-like questions

*Principles*
- **Prompts** - Use questions as prompts for stories.
- **Flexible** - Accommodate short and long answers.

*Features*
✅ **Complete**
- **Data Model** - Firestore `questions` collection. Schema: `src/lib/types/question.ts`. Service: `questionService.ts`.
- **UI** - `/admin/question-admin`.
- **APIs** - Admin-only CRUD (`/api/admin/questions`, `/api/admin/questions/[id]`), link/unlink card, create-card from prompt.
- **Filter** - List/filter in UI: text, tags (substring), used vs unused.
- **Create Card** - Create card from question prompt (default type `qa` or `story`). Adds card ID to `usedByCardIds` and updates `usageCount`.
- **Link/Unlink** - Manual link/unlink between question and existing card IDs. A question may map to zero, one, or many cards.

⭕2 **Future**
- **Pre-Tag Questions** - Pre-tag questions for use on card. WHO/Father, WHAT/Reflections, Childhood, etc.
- **Assigned** - Mark questions "Assigned/Unassigned" (only doable if assigned to card, not if inline) `usedByCardIds.length > 0`.
- **Answer Workflow** - Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping.
- **Auto-Clustering** - Auto-clustering/grouping of short questions.

---

### **User Management**

*Intent*
- **Access Control** - Control access to the app.

*Principles*
- **Credential-based** - Password entry via NextAuth Credentials provider.
- **Manual onboarding** - Send link with username and password to new users.

*Features*
✅ **Complete**
- **Data Model** - Firestore `journal_users` collection. Schema: `src/lib/auth/journalUsersFirestore.ts`.
- **Authentication** - `authorize` in `authOptions.ts` (DB first, legacy env fallback when no row for that username). Bcrypt passwords.
- **Admin View** - Users tab at `/admin/journal-users`. APIs: `/api/admin/journal-users`, `/api/admin/journal-users/[id]`.
- **Roles** - Viewers only from UI/API; single admin rule. Seed script: `npm run seed:journal-users`.
- **Login Redirect** - `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense`).

⭕2 **Future**
- **Credential Delivery** - Send username and password to new users?
- **Rename Collection** - Rename all uses of `journal_users` to `users`.

---

### **Theme Management**

*Intent*
- **Custom Themes** - Allow customizable light and dark modes

*Principles*
- **User-Controllable** - Provide detailed control.

*Features*
✅ **Complete**
- **Light/Dark Toggle** - Theme toggle in top navigation.
- **Admin Page** - Theme admin for color and font parameters.

⭕1 **Planned**
- **CSS Tokenization** - Ensure all CSS in app is tokenized via `theme.css` variables.

---

### **Gallery Management**

*Intent*
- **Custom Styles** -  Allow customizable gallery styles

*Principles*
- **Tokenizable** - Provide tokenizable styles for gallery layouts

*Features*
⭕2 **Future**
- **Gallery Styles Management** - Devise preconfigured card styles for selection — masonry, mosaic, etc.
