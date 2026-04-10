# APPLICATION

**See also:** `Vision-Architecture.md` · `Implementation.md`

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

⭕1 **Planned**
- **Display Types** - Verify behaviors. Stories: Navigate. Galleries: Navigate or Inline. Questions: Navigate or Static. Quotes: Static. Callouts: Static.
- **Suggestions** - Free form only--Children + 3 filtered + 3 random. 

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
- **Default** - After login, defaults to content page 
- **Grid View** - Responsive grid-based layout
- **Card Types** - 5 card types:
  - 1. `Story Card` - 
        **Feed:** - Title, cover, content, and/or gallery. Navigate to /view.
          📐 **Titling** - Bottom/overlay as implemented through v1.
          📐 **Excerpt** - Do not render excerpt on story cards in the feed.
  - 2. `Gallery Card`- Title, cover, content, and gallery. Limited story.
        - **Feed:** Navigate or Inline (horizontal Swiper on the grid) — **cover is first slide** when set; gallery slots with the same `mediaId` as the cover are **deduped** (`V2ContentCard`). Swipe/drag between slides.
  - 3. `Question Card` - Questions as if from family. No Cover, Title (question), Content (answer), Gallery. 
        - **Feed:** - Navigate or Inline
          - **Navigate:** *Title* = question; *excerpt* = feed teaser when set (full answer only on detail). - **No cover:** large centered `?` watermark + centered text. **With cover:** full-bleed hero + bottom gradient (story-like). 
          - **Detail:** kicker "Question", title, section "Answer" + TipTap body.
          - **Inline:** not a link. Optional cover + overlay; **TipTap answer** on tile. No cover: watermark + left-aligned stack for long body.
          - **Static:** not a link. Question + **excerpt** only (no body on tile).
          - Short questions may still be embedded in other narrative content where appropriate (optional pattern; not limited to this type).
  - 4. `Quote Card` - Topically related quotes. No Cover, Title, Content
        - **Title** = short label (topic, source, or hook)—**not** the full quotation. 
        - **Content** (TipTap) = quote text. 
        - **Attribution** = **`subtitle` preferred**, else **`excerpt`**; rendered right-aligned with an em dash (`—`) prepended when the string does not already start with a dash character.
        - **Feed:** Quote watermark centered on the tile, Title + blockquote + `<cite>`.
        - **Detail:** Title in header; **subtitle omitted under title** (reserved for attribution). Body in `<blockquote>`; attribution in `<footer><cite>` below.
  - 5. `Callout Card` - Summary / emphasis on a topic. No Cover, Title, Content (bullets)
        - **Feed:** **Pushpin** raster watermark (`public/images/pushpin.svg`) as a full-card overlay in `V2ContentCard` (`calloutPinOverlay` / `calloutPinWatermark`): centered on the tile, mirrored (`scaleX(-1)`), tilted **−30°**, raised ~¼ in from center, sized with a fluid `clamp` (~25% larger than the first shipped size). Same opacity tier as the `?` watermark (**0.3**). Theme token **`--card-watermark-raster-filter`** in `theme.css`: `none` in light mode, **`invert(1)`** in dark mode so the pin reads on dark tiles. Flat `layout-background1-color`; light hover. **TipTap** `surface="transparent"`. **Title**, **excerpt**, body for **inline** / **navigate**; **static** = title + excerpt when no body on tile.
        - **Detail:** Same shell as other types (title, optional subtitle, TipTap)—no separate callout chrome.
- **Display Modes** - 3 display modes/styles
    1. Static - Display only (Quote, Callout; Question when the answer is short)
    2. Inline - Swipes left/right (Gallery <5 images)
    3. Navigate - Dedicated card view (Story, Gallery, Question). 
      📐 **Horizontal Open** - Prefer horizontal card-open behavior on mobile for long-form cards to reduce open/close friction.
- **Main feed / gallery**
- **Header:** menu (left), title (center), **search** (right).
- **Search row** directly under header. Mockup placeholder copy may suggest multimodal search—**aspirational**; near-term search stays what the product can index (e.g. title, tags, captions).
- **Horizontal type chips** (e.g. all media vs "film" / strips): maps to **card-type** (and later **video**) filtering; complements dense mobile UX without replacing the tag sidebar/drawer.
- **In-content card links (@)** - TipTap `CardMention` + `CardMentionList`; type `@` in rich text to search cards (`/api/cards`); stored as `span[data-type="cardMention"][data-card-id]`; `TipTapRenderer` navigates to `/view/[id]` on click or keyboard when focused.

⭕1 **Planned**
- **Card Content** - Assess need for Title, Subtitle, Excerpt and Content
- **Questions** - Get questions from Word doc, card games on Amazon
- **Quotes** - Get quotes from Dad book, Notion quotes, Grandfather book
- **Quote Card** - Use Content for both quote and attribution. 

⭕2 **Future**
- **Bundle / images:** Route-level **code splitting** for heavy admin/editor paths; pass on `next/image` loading/priority for feed performance.
- **Gallery slider polish** — Optional feed pagination (e.g. 1/n dots), visible prev/next on desktop; horizontal "child card" rails (aggregated strips) — aligns with **Feed Types**.
- **Question Content** - Get questions from Word doc, card games on Amazon.
- **Quote Content** - Get quotes from Dad book, Notion quotes, Grandfather book.
- **Bundle / Images** - Route-level code splitting for heavy admin/editor paths; tune `next/image` loading/priority for feed performance.
- **Feed Types** - Devise different feed layouts: pane with teaser, related stories horizontal scroll, galleries horizontal scroll, small thumbnails horizontal scroll.
- **Display Strategy** - **v1:** One presentation per card type in reader surfaces; for stories, the single style is as implemented today (e.g. title overlay on cover in feed) with **no excerpt** in feed or detail. **Post-v1:** Varied, selectable feed and view layouts per type and context (optional excerpt stacks, subtitle ordering, tags/kicker/overlay, gallery/story stacks like "YouTube-style" teasers). Component architecture should allow new variants without rewriting the feed/view core.

📘 `src/components/view/CardFeedV2.tsx`
📘 `src/components/view/V2ContentCard.tsx`
📘 `src/components/view/ContentCard.tsx` (CardGrid / legacy tag tiles)

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
- **Quote Management** - ??

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
- **Server-side** - All business logic on the server-side (`cardService`) 
- **Denormalized** - The data model is denormalized to support complex filtering
- **Card Data Model** - Firestore `cards` collection. Schema: `src/lib/types/card.ts` (`cardSchema` / `Card`).
- **Grid View** - Click to edit, pagination (`/app/admin/card-admin/`).
- **Table View** - Pagination, load more.
- **Search by Title** - Filter by status and type via `CardProvider` `selectedFilterTagIds`. Bulk operations via `BulkEditTagsModal.tsx`.
- **Add Button** - `AdminFAB.tsx`. New (`/admin/card-admin/new`), Edit (`CardAdminClientPage.tsx`). `CardForm.tsx` wrapped in `CardFormProvider`.
- **Title, Subtitle, Excerpt** - All default empty.
- **Type** - `story`, `gallery`, `qa`, `quote`, `callout`.
- **Status** - `draft`, `published`.
- **Display Mode** - `static`, `inline`, `navigate`.
- **Cover Image** - `CoverPhotoContainer` + `PhotoPicker`. Paste/drag, `objectPosition`. No caption.
- **Content** - Rich text editing, Inline embedded images, Captions default to media object with override, @ card links** (see Content Page).
- **Tags** - `MacroTagSelector` modal. `Card.tags` stores user-assigned tags. On save, `cardService` derives `filterTags` from card-assigned tags and tag-tree ancestors (not from image tags).
- **Gallery** - `GalleryManager` + `PhotoPicker`, drag-and-drop order. `galleryMedia[]` stores `mediaId`, `order`, optional per-slot `caption`/`objectPosition`.
- **Excerpt** - Default empty.Auto-generate toggle on card form. When on, excerpt is computed from content (150 chars, word boundary). Manual override via toggle off. `excerptAuto` field on card schema; server recomputes on save when content changes.
- **Import Folder as Card** – `ImportFolderModal`, folder tree picker, **`__X`-marked files only**, in-memory WebP optimize + upload (no xNormalized on disk), duplicate detection (overwrite/cancel). Mass-import / digiKam prep: **Authoring pipeline — digiKam → mass import** (under Strategic Direction).
- **Caption and Focal** - Inherit from media by default; optional per-slot override in the gallery edit modal.
- **Children** - `childrenIds` attaches ordered child cards. Deep nesting allowed; cycles and self-parent blocked in `cardService`; single-parent constraint enforced on move.
- **Children Picker (edit UI)** - Card edit view: reorder/remove children and open child edit links; attach/reparent in Collections admin (`ChildCardManager` → link to `/admin/collections`). Structural assembly stays in TOC/collections work.
- **Actions** - Delete (remove tags/recalc, remove from parents, remove related media), Cancel (abandon edits, return to list), Save (save tags/recalc, add media).
- **Dirty State Tracking** -
- **Versioning** - Manual "Duplicate Card" action implemented. Creates a draft copy of any card (content, tags, media refs, gallery) via `POST /api/cards/[id]/duplicate`. Button on card edit page header. Next phase: pre-save snapshot to `card_versions` subcollection before mass content authoring.
- **Authoring Discovery** - PhotoPicker **Library** tab: same non-tag query filters as Media admin (`/api/media`: status, source, shape, caption, on-cards), debounced text search, **in-modal dimensional tag filter** (`MacroTagSelector`, independent of left sidebar; OR within dimension, AND across dimensions, merged with optional **Match card tags** from the current card). `filterTagIds` wired from `CardForm` → cover/gallery/content picker. Card discovery: admin card list + Collections for structure.

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
- **Media Search Index** - Typesense `media` collection: single searchable field (filename, caption, source path, tag names); facets for status, source, shape, has caption, **assigned**, dimensional tag ids (who/what/when/where). 
- **Local Drive** - Current implementation sources from *local drive* (mirrored from OneDrive)
- **Import Folder as Card**
    - Requires `ONEDRIVE_ROOT_FOLDER` in `.env` (server filesystem path)
    - `IMPORT_FOLDER_MAX_IMAGES` (default 50): max **marked** images **per folder import** to reduce **serverless timeout** risk—override via env or longer-running/self-hosted contexts. **Not** a hard product limit on how many images a card may hold in the abstract. **Authoring:** if leaf folders often **hit** this cap, **split folders** further (see **Authoring pipeline — digiKam → mass import**).
    - **Card export marker:** Only files whose basename ends with **`__X`** immediately before the extension are imported (e.g. `IMG_0001__X.jpg`). Two underscores and **uppercase X**—not `__x`.
    - **No local xNormalized write:** Folder import reads source files, **WebP-optimizes in memory** (`normalizeBufferToWebp` → `importFromLocalDrive` with `normalizeInMemory`), uploads to Firebase Storage. Legacy folders may still use `yEdited` or `xNormalized` **as read paths**; disk is **not** used for a new normalized output tree.
- **Optimization** - Optimize performance through `next/image`, caching, auto-sizing and lazy loading.
- **References** - Images served to content via Firebase ID/URLs
- **Filter** - Multi-dimensional filter.
- **Replace** - File edited from source and replaced. After editing, upload the new file via **Media admin** replace on that row. **API:** `POST /api/images/{id}/replace` → `replaceMediaAssetContent` in `imageImportService.ts`. Same Firestore **media** doc id and **storage path**; **width/height/size** refresh; **cover**, **gallery**, and **content** references on cards **unchanged** (no re-linking). *Caveat:* Same public URL shape can mean **browser or CDN caching**—if a thumbnail looks stale after replace, treat cache-bust or URL strategy as a follow-up.
- **Tagging** - Same assignment mechanism** as cards (**shared modal**); **bulk** tagging in Media admin is the primary day-to-day workflow. **Today:** cards — `BulkEditTagsModal`; media — `PATCH /api/images/{id}` (tags / `whoTagIds`, caption, focal) and Media admin **bulk** modes (add / replace / remove). 
- **Post-import aggregation (create card)** - Media admin multi-select → **Create card from selection**: draft `gallery` card (`POST /api/cards`), `coverImageId` + ordered `galleryMedia`, navigate to edit (`MediaAdminContent`).

- **Media Data Model**
    - Collection - `media`. One doc per image
    - Schema  - `src/lib/types/photo.ts`
- **referencedByCardIds:** Denormalized array of card IDs that reference this media. Maintained on **createCard**, **updateCard** (transaction), and **removeMediaReferenceFromCard** (media delete cleanup path). Used for delete (remove refs from cards, then delete) and unassigned filter. Lazy backfill for legacy media.
- **Normalization**
  Organize, normalize, edit images pre-import
    - All versions of images in 1 directory 
    - Edit (GIMP - Crop, clean, Topaz - sharpen) as needed 
    - Rename final appending "__X"
    - Import files ending in "__X"
      - normalize to Firebase--sharpen, lighting, convert to webP
      - extract metadata to Firebase
  
- **Media Workflow** - [Source]→[Import]→[Firebase Storage+Firestore]→[API Hydration]→[Client Display]

- **Import Entry Points**
  - `imageImportService.ts` — central import (PhotoPicker, paste/drop, local drive)
  - Creates Media doc in Firestore, uploads to Firebase Storage
  - Folder Import - `importFolderAsCard()` — filter `*__X.*`, `importFromLocalDrive(..., { normalizeInMemory: true })`, build gallery + cover

- **Display**
  - `JournalImage` — next/image with unoptimized (avoids 403 from Firebase)
  - `getDisplayUrl(photo)` — storageUrl → url → transparent pixel fallback
  - **Cover aspect ratios:** Edit/view 4:3; feed thumbnail 1:1
  - **Focal point:** Pixel coords {x, y}; converted to object-position per aspect ratio

- **Pre-Import Scripts** (Local Filesystem)
  - `create-photo-folders.bat` — xNormalized, yEdited, zOriginals
  - `normalize-images.bat` / `npm run normalize:images` — optimize, extract metadata to JSON, convert to WebP. Optional: `--card-export-only` (after destination arg) to process only `__X`-marked filenames.
  - `extract-metadata-improved.bat` — metadata only
  - See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`

  - **Media-Card Reconciliation**
  **Add / change / delete** for card–media edges is maintained by production paths (**Cross-entity sync** table in Media Management). When investigating **exceptional** drift (legacy data, manual DB edits): **CLI** — `npm run reconcile:media-cards -- --diagnose` (optional `--fix`, `--fix --dry-run`, `--card "Title"`); source `src/lib/scripts/firebase/reconcile-media-cards.ts`. **HTTP** (admin session) — `POST /api/admin/maintenance/reconcile` with JSON `action`: `diagnose` | `fix`, optional `dryRun`, `cardTitleFilter`, `checkStorage`. **Index** — `docs/NPM-SCRIPTS.md`.

⭕1 **Planned**
- **Temporary/Active.** Remove this status. No longer required. All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.
- **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).

⭕2 **Future**
- ****Rename**" - `src/lib/types/photo.ts` → `media.ts` throughout
- **Append to Gallery** - Bulk add selected banked media to another **existing** card's gallery from Media admin (parked). **Today** images still reach cards after import via **Create card from selection** (draft gallery + edit), **PhotoPicker** / gallery in card edit, **inline images** in rich text, and **replace-in-place** on media rows—no need to block on this bulk-append flow.
- **Video** - Support on **cover**, **inline (body)**, and **gallery** like stills—as far as product parity allows. **Size / "normalization"** (typical approach): **server-side transcoding** (e.g. FFmpeg) to a max resolution/bitrate and web-friendly format—same *class* of work as image normalization; not automatic in-app today.
- **Browser Upload** - Replace or supplement server-side folder read (`ONEDRIVE_ROOT_FOLDER`) with browser-based upload flow. Required for hosted deployment where the server has no local filesystem access.
- **Google Photos Adapter** - Import from Google Photos API. Most accessible cloud photo API. Requires OAuth consent, album/media listing, download-and-process flow.
- **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API. Similar shape to Google Photos adapter.
- **Apple iCloud** - Most restricted API access. May require workaround (export from Photos app, then local/browser upload). Lowest priority.
- **Post-Import Maintenance** - Cropping, cleanup, sharpening in GIMP/Topaz after import. Use replace-in-place in Media admin to preserve media IDs and card references.
- **Import pipeline job** - **Async queue/worker** for large folder import (normalize + writes) complementing `IMPORT_FOLDER_MAX_IMAGES` and serverless timeouts.
- **Import metadata precedence** - Prefer **embedded XMP/IPTC** read **at import** for captions/keywords; use **JSON sidecars** as optional/supplementary when files are authoritative on disk.
- **Multi-Author** 
    - More than one author (e.g. parent and child) each maintains a voice, 
    - **Shared/Overlapping** - Image pool shared across authors.
    - **Intertwined** - Intertwined reader experiences.
    - **Cross-author Comments** on each other's cards/images.
    - **Contrast with today:** The app is optimized for **one authoring admin** and **family readers**; a second author currently implies a **separate instance** (duplicate media, separate cards/captions/tags).
    - **Architectural challenges** 
        - Identity and roles; **author-scoped** card documents vs shared **media** library and **deduplication**; **tag namespaces** or "lens" so the same pixels do not force one global meaning (e.g. childhood/parents/grandparents are **viewer-relative**); permissions; **merged vs parallel** feeds; **comment** threads, notifications, and moderation.
    - **Comparison to large social products:** Overlapping primitives (multi-user, comments, feeds) exist elsewhere; this product remains **private**, **curated**, and **archival/narrative**—not a goal to replicate public-scale engagement mechanics.
   
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
- **Tag Data Model** - Firestore `tags` collection. Schema: `src/lib/types/tag.ts`. Service: `tagService`.
- **Dimensional** - Who, What, When, Where (Reflection subtree lives under What as `what/Reflections/...`).
- **Consolidate Reflection** - Former `reflection` dimension removed from schema and UI. Tags reparented under a What root **Reflections**; cards/media no longer store a `reflection` field. One-time Firestore migration: `npm run tags:consolidate-reflection` (use `--dry-run` first).
- **N/A Sentinel Tags (`zNA`)** - One root per dimension named **`zNA`** (same display/stored string in who, what, when, where). Explicit "doesn't apply" vs "not yet tagged." **Uniqueness:** root tag names are unique **per dimension** only (four `zNA` roots allowed); child names are unique **among siblings** (case-insensitive after trim). Seed missing roots: `npm run tags:seed-zna`. Supports completeness: a card/media is complete when every dimension has at least one tag (including `zNA`).
- **Admin dimension at a glance (v1)** - **Direct tags only** (intersection of `tags` with each dimensional array), aligned across **card table** (existing four columns), **media table** (four Who/What/When/Where columns replacing a single Tags column), and **card + media grid** (four equal chips per row: first tag name truncated, `+n` for more in that dimension; native `title` / `aria-label` lists all direct tags per dimension). Card edit view keeps existing empty-dimension header emphasis. **Deferred:** green/amber completeness dots; stronger hover/popover typography (readability pass later). Implementation: `getCoreTagsByDimension`, `DirectDimensionChips` (`src/components/admin/common/`).
- **Hierarchical** - Parent/child nesting (e.g. Father → Mother; Son → Daughter).
- **Universal** - Media and cards use the same tagging mechanism.
- **Tag Administration** - `/app/admin/tag-admin/page.tsx`.
- **Hierarchical View** - Page renders all tags in a 4-column tree structure using `TagAdminList`
- **Drag-and-Drop** -  Reordering/Reparenting - `SortableTag.tsx`
- **Inline Editing** - `TagAdminRow.tsx`
- **OnDelete** - User choice of children being promoted or cascade deleted
- **OnMove** - Updates parent and order and recalcs tag card counts
- **Real-time** Edit tag and bulk tag modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). 
- **Tag Typeahead Search** - Search input added to tag assignment modals (MacroTagSelector expanded view and BulkEditTagsModal). Filters all dimension columns as typed using `filterTreesBySearch`. Matching branches auto-expand. Works in card edit, gallery edit, bulk media, and bulk card tag flows.
- **Card Tags vs Media Tags** - Same mechanism. Assign tags to a card and assign tags to a media document using the same flow and data shape as cards (shared tag-assignment modal, e.g. `MacroTagSelector` pattern). Use the same dimensional/hierarchical tag library; no special-case fields in the product model unless legacy migration requires it temporarily.
- **v1 Authoring** Building and curating content cards must support **tag/query-based discovery of both cards and media** in admin (not one surface only)—pick gallery images, body embeds, and **related or child cards** from **filtered** sets, not only flat lists.
- **Human Authoring** You may still choose a **story-level** tag set on the card (what the post is about) and **frame-level** tags on images (who/what/when/where for that photo)—but nothing syncs unless you tag it yourself.
- **Bulk** Bulk tagging in Media admin is a high priority (multi-select + apply tags)—more day-to-day value than bulk on cards.

⭕2 **Future**
- **Single TagProvider:** Remove nested `TagProvider` under admin so one tag tree fetch serves GlobalSidebar + admin (avoid duplicate `/api/tags` work).
- **Tag Tree Counts (model/UI)** - Add `mediaCount` on tag docs + UI `(x/y)` (cards vs media); align maintenance with recalc/jobs so counts stay trustworthy alongside incremental `cardCount` fixes.
- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."
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
