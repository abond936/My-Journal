# PROJECT OVERVIEW

Legend:
✅`Implemented`
⭕`Planned (1/2/3)`
🔵`Parked`
❓`Open`
📐`Decision`
📘`Resource`

---

## Document Governance

- **Canonical Document** - `Project.md` is the canonical project document for author and AI.
- **AI Behavior** - AI process, approval, and execution rules live in `.cursor/rules/# AI_InteractionRules.mdc`.
- **Author** - Provides direction, constraints, and priorities. Does not specify implementation details.
- **AI/Engineering** - Proposes how to build, designs flows, and recommends technical approaches.

### Document Structure
- **Heading Lock** - All ATX headings are fixed. Do not add new headings.
- **Subheading Lock** - Subheadings are *Intent*, *Principles*, and *Features* only. Do not add new subheadings.
- **Formatting**
    - Headings are **bold**. Subheadings are *italic*.
    - Intent/Principles bullets start with a **bold** 1–2 word subject, then short descriptive text.
    - Features are preceded by ✅, ⭕, 📐, ❓, 📘, or 🔵, followed by a **bold** 1–2 word title + " - " + short descriptive text.

### Content Placement
- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under Tag Management, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **Planned & Open Summary** - ⭕Planned and ❓Open items are summarized in the Planned & Open Summary at the end of the document, aggregated by section. Body and summary must **match** (same wording, priority, and status). The summary is the **rolled-up mirror** of the body, not a separate backlog.
- **Summary Updates** - When a Planned or Open item is completed, answered, reworded, reprioritized, added, or removed, update **both** the body and the summary in the same pass. If only one side changes, the next editor reconciles so they match.

---

## **Product Vision**

*Intent*
- **Storytelling** - A private storytelling journal for family archives.
- **Comprehensive** - Media and authored narrative in one coherent experience.

*Principles*
- **Curated & Freeform** - Support both curated and freeform discovery.
- **Relational** - Organic discovery via dimensional, hierarchical tags.
- **Multi-Media** - Interactive text and media experience.
- **Unified Schema** - Flexible card model; one schema, multiple presentation behaviors.
- **Mobile-first** - Mobile and desktop operation, UX with predictable interactions across device sizes.
- **Scalable** - Scale toward large personal archives with operational practicality.
- **Narrative Control** - Curated collections of cards provide directed storytelling.
- **Organic Discovery** - Tag-based filtering, random presentation and suggestions enables exploration.
- **Content Flexibility** - Multiple forms of underlyingly structured content.
- **User Experience Consistency** - Cross-device navigation patterns
- **Scalability** - Performance optimization for large content libraries
- **Practical** - Deliver a coherent content consumption experience plus practical admin tooling.

The product concept is to combine one's photos and stories into an interactive 'journal'-- a storytelling platform that allows author-curated or freeform discovery. The idea was inspired by hardcopy journals and wanting to integrate images in a combination journal-album, and in a way that most efficiently leverages one's images and videos. 

Photo apps like Apple and Google are very efficient interfaces, and they have album creation and freeform tagging capability, but they are limited in integrating text and organizing the images and albums, and can quickly devolve into a disorganized mess.

This app seeks to leverage multiple photo repositories and provide a story-telling overlay, either curated or freeform, via a card and heirarchical tag system.

The market for this beyond the author's use would be journalers, memory keepers, families. Some import friction may be acceptable for curated storytelling.

The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but also on tablet and desktop.

## **TECHNICAL**

### **Backend**

*Intent*
- **Reliable** - Provide reliable core platform capability
- **Efficient** - Operational and cost awareness.
- **Practical** - Practical for solo-author throughput and family consumption.

*Principles*
- **Client/Server** - Clear separation of concerns; client/server boundaries and service-layer.
- **Validation & Authorization** - Server-side validation and authorization for data integrity.
- **Schema** - Type-safe contracts and explicit server-side schema validation.
- **Services** - Use managed services pragmatically (Firebase/Auth.js/Next.js).

*Features*
✅ **Next.js 15** - App Router, All API routes secured at the edge
✅ **React 19**
✅ **TypeScript**

✅ **`firebase-admin`** - SDK for server-side operations
✅ **Zod** - schema validation

📐 **Denormalized Read** - Keep denormalized read patterns where Firestore query limits demand it.
📐 **Script-Heavy** - Keep script-heavy maintenance available while admin UX matures.

⭕ **Code** - Comment code.
⭕ **ESLint** - Address ESLint violations.
⭕ **Quality** - QA app.
🔵 **Performance** -  (post-v1):** Possibilities captured from engineering review.
✅ **Directory Structure**
 `src/app/`  Next.js App Router
   `api/` API route handlers
   `admin/` content management interface
   `view/` content consumption interface
   `layout.tsx`  root layout, which includes global providers

 `src/components/` Reusable React components
   `common/` Generic components used across the app 
   `view/` Components specific to the content viewing experience
   `admin/` Components specific for the admin interface 

 `src/lib/` Core application logic, types, and utilities
   `services/` business logic
   `types/` Zod schemas and TypeScript type definitions
   `hooks/` Reusable client-side React hooks
   `utils/` General utility functions (e.g., date formatting, tag manipulation)
    ⭕2 **Directory** - Cleanup directory.

✅ **Data Models**
- `src/lib/types/` *read directly - fully commented*
- Zod schemas for all data types
- Server-side and client-side validation
- Type checking with TypeScript

⭕1 **Search Index (Typesense)** - Firestore has no full-text search; current client-side load-and-filter is already slow and will break at import scale (1000+ cards). Implement Typesense as a read-optimized search replica alongside Firestore. Create `searchService.ts` to index card data on create/update/delete. Replace client-side filtering with index queries for title search, tag filtering, and feed rendering. Provides: instant search-as-you-type, fuzzy matching, faceted filtering (type + tag + date simultaneously). Run one-time backfill script for existing cards. **Pre-import priority.**

✅ **Authorization** - Auth.js - with Firebase adapter
    - Role-based access control
    - Session persistence
    - Application wrapped in AuthProvider
    📐 **Auth in Buildout** - During build/content phase, keep using current env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
    📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
    📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
    📐 **One Admin** - One admin (author), all other accounts are viewers.
    📐 **Share Access** - Share access by sending site URL + username/password directly to each viewer.

📐 **Tenant ID (future)** - Not implemented for v1. If multi-tenancy is needed for commercial SaaS (Model C), `tenantId` would be added to cards, media, tags, questions, and journal_users. Every query and security rule would need a tenant filter. Document the scope now; implement only if demand justifies it. See `docs/06-Strategic-Direction.md`.
📐 **Storage Abstraction** - Firebase Storage APIs are currently called directly in multiple places (`imageImportService.ts`, upload functions, URL generation). Create a single `storageService.ts` module wrapping all storage operations (upload, delete, getUrl). Reduces future migration scope (Cloudflare R2, S3) to one file. Also enables cache-busting for replaced images (append version hash to URL).

### **Frontend**

*Intent*
- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*
- Align UI behavior with **validated server contracts** (types/schemas); the client does not override server authority on writes.
- Clear **presentation and client-state** boundaries; business rules stay in services/API layer.

*Features*
✅ **Theme** - CSS modules for styling, global `theme.css` and `fonts.css`
✅ **Rich Text Editing** - `@tiptap/react` rich text editing
✅ **Media Selection** - PhotoPicker for media selection (admin modal picker and simple upload)
✅ **Galleries** - GalleryManager and Swiper for galleries
✅ **Image Optimization** - `next/image` via `JournalImage` wrapper (`unoptimized` flag for Firebase Storage URLs)
✅ **DragnDrop** - `@dnd-kit/core` and `@dnd-kit/sortable`
✅ **Data Fetching** - `SWR` for client-side data fetching and caching (`CardProvider`, `TagProvider`, admin pages)

⭕2 **Unused Dependencies** - Remove unused packages from `package.json`: `react-markdown`, `@uiw/react-md-editor`, `@minoru/react-dnd-treeview`. Evaluate `react-photo-album` (photo grid/mosaic layouts) and `framer-motion` (animation/transitions) for potential use before removing.
⭕3 **Shell / session UX** - Replace blank `AppShell` while NextAuth `status === 'loading'` with a visible shell + skeleton/spinner so mobile does not see an empty screen.

### **Scripts**

*Intent*
- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*
- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Syntax** - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`
✅ **Firebase Setup** - Credentials live in `.env`:
    - `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`, 
    - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, 
    - `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, 
    - `FIREBASE_STORAGE_BUCKET_URL`
✅ **.env** - Scripts must load `.env` before importing Firebase. Use `-r dotenv/config` (and `DOTENV_CONFIG_PATH=.env` if needed) so env vars are available when `admin.ts` initializes
✅ **Maintenance Scripts** - Active operational scripts: `reconcile:media-cards`, `regenerate:storage-urls`, `cleanup:media`, `backup-database`, `backfill:media-metadata`, `seed:journal-users`.

⭕2 **Script Cleanup** - 86 script files under `src/lib/scripts/`; many are obsolete migration, debug, or test scripts not wired into `package.json`. Review and prune.
⭕1 **Broken Reference** - `diagnose:tag` in `package.json` points to `src/lib/scripts/dev/diagnose-single-tag.ts` which does not exist. Fix or remove.

📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Backup**

*Intent*
- **Protection** - Back up is required for the code repo and the database.

*Principles*
- **Automated** - Backups run without manual intervention.
- **Verified** - Backup integrity is confirmed after each run.

*Features*
✅ **Database** - Windows Scheduled Task at 2am daily, auto awake pc, cleared >5 days. Script files exist (`backup-database.ts`, `backup-firestore.ts`) but are not wired into `package.json`.
✅ **Repo** - Github - On every push, for 7 days
    - Commit directly to **`main`** and push to `origin/main`. Do not use feature branches or PR merge flow unless explicitly requested for a specific task.
⭕1 **Database Script** - Wire `backup-database.ts` or `backup-firestore.ts` into `package.json` as `backup:database` so the scheduled task can run it. Verify the Windows Scheduled Task references the correct command.
⭕2 **Operational** - Ensure both backups are operational and verified end-to-end.


## **APPLICATION**

*Intent*
- **Consumption** - Consumption of content. Primarily mobile, but also tablet and desktop
- **Administration** - Administration of content, primarily on desktop, but minor edits on mobile.

*Principles*
- **Ease of Use** - Obvious or intuitive operation.
- **Responsiveness** - Quick response in content consumption.
- **Bulk Authoring** - Support high-volume/bulk authoring operations in administration workflows.
- **On the Fly** - Support specific, low-friction edits on the fly while browsing content.

*Features*
✅ **Structure** - App is separated into content and administration surfaces with shared providers/navigation patterns.
✅ **Layouts** - AppShell (navigation/structure), ViewLayout (content interface), AdminLayout (admin interface).
✅ **Providers** - AuthProvider (NextAuth.js), TagProvider (tag data/operations), CardProvider (card data/filtering/pagination).
✅ **Route Separation** - Reader and admin routes are distinct, preserving explicit editing context.

⭕2 **Split Validation** - Validate the current split model against author workflow friction in real use.
⭕2 **Edit on the Fly** - Add admin-only entry points from content surfaces (quick edits and/or deep-link to full editor).
📐 **Initial Architecture** - Initial architecture decision: separate content consumption from administration to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
📐 **Future Architecture** - Current direction: keep separation, but add admin-only on-the-fly editing affordances from content pages for faster author workflow.
⭕2 **Accessibility** - Elderly family members are a known audience. Body text minimum 16px (prefer 18px for narrative); WCAG AA contrast ratios (4.5:1) in light/dark modes; 44x44px minimum tap targets on mobile; wire media `caption` into `alt` attributes on `JournalImage`; keyboard navigation for all interactive elements; respect `prefers-reduced-motion` for animations. Run Lighthouse accessibility audit as baseline.

## **Navigation**

*Intent*
- **Intuitive** - Intuitive/obvious, fluid consumption.
- **Customizable** - Content filtering

*Principles*
- **Mobile-First, Desktop-Second** - Layout adapts automatically by screen size; touch-optimized on mobile, sidebar/hover on desktop.
- **Seamless Flow** - No jarring interruptions between content; smooth transitions and contextual progression.
- **Single Control Surface** - All filtering and discovery controls accessible from one panel.

### **Home Page**

*Intent*
- **Interesting Intro** - The intent of the home page is to present an intriguing introduction to the app with login.

*Principles*
- **Simple** - Simple login page with app title and a few graphics.

*Features*
✅ **Login Page** - Application opens to home page with login form and SVG logo.

⭕2 **Home Layout** - Center title and login; hide upper-left logo until authorization completes and app enters the content page. Back button upper left, hamburger upper right.

### **Top Navigation**

*Intent*
- **App Badge** - Small app badge
- **Settings** - Access to settings
- **Back Button** - Place for Back button

*Principles*
- **Simple** - Clear, not distracting
- **Minimal** - Space saving

*Features*
✅ **Logo** - App logo displayed in top navigation.
✅ **Hamburger** - Dropdown menu with content links (all users), admin links (admin only), and theme toggle.
⭕2 **Redesign** - Center logo, add back button from View Page.

### **Left Navigation**

*Intent*
- **Comprehensive** - Comprehensive content filtering

*Principles*
- **Slideout** - Available as needed, hideable
- **Compact** - Fits a lot of data readibly.
- **All inclusive** - Contains all possible selections in one.

*Features*
✅ **Hierarchical Tag Tree** - `GlobalSidebar.tsx` and `TagTree.tsx`. Tag tree for filtering content by card type and active dimension.
✅ **Mobile** - Left sidebar/drawer pattern for filters on small screens; no bottom navigation bar.
✅ **Card Type** - Icon buttons: Story | Gallery | Question | Callout | Quote
✅ **Tag Dimension** - All | Who | What | When | Where
✅ **Persistence** - Remembers selections across page refreshes.
✅ **Mode** - FreeForm | Curated
✅ **Selected Tags** - Shows selected tags as chips.
✅ **Search Tags** - Search tags.
✅ **Sort by** - Random | Oldest | Newest on filtered card feed.

⭕2 **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
⭕1 **Search Tags Fix** - Fix Search tags — not working.
⭕2 **Sort / Group** - Add user-selectable sort/group by event, Who, What, When, Where so multi-constraint filters do not devolve into an incoherent mix across unrelated occasions.
⭕2 **Curated Completeness** - Fix 500-recent-cards scan in `getCollectionCards` so Curated mode lists all collection parents at scale, not a truncated subset.
⭕2 **Collection Metadata** - Implement collection metadata (child counts).
⭕2 **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
⭕1 **Sidebar Scroll** - Full left sidebar does not scroll; only the tag tree scrolls within it. On mobile (or narrow viewports) this leaves very little visible area for the tag tree. The entire sidebar panel should scroll so all content is reachable.
⭕3 **Mobile Filter UX** - Tune type/tag filter UX on mobile. Layout reference: `--header-height` 60px; mobile filter drawer `--sidebar-width-mobile` 250px (`theme.css`).

❓ **500-Card Limit** - `getCollectionCards` in `cardService` queries the 500 most recent cards by `createdAt` and filters in memory for parents/curated roots. Older collection parents are missed. Root cause is the query design, not a deliberate product limit. Fix tracked under ⭕2 **Curated Completeness**.
📐 **Collections DnD** - Yes, `/admin/collections` supports drag-and-drop of parent cards.

## **Content**

*Intent*
- **Interactive** - Immersive experience in stories and images.

*Principles*
- **Curated and Freeform** - Directed or non-directed exploration.
- **Single Structure** - One card schema with multiple presentation behaviors.
- **Multi-Presentation** - Card types have differentiated display behavior.

*Features*
✅ **Display Modes** - Inline (short text/few images) vs Navigate (long text/many images).
✅ **Manual Control** - All content mixing and display logic controlled by user.
✅ **Suggestions** - Children + 3 filtered + 3 random exploration. In Freeform, discover/related blocks are the main exploration mechanism. In Curated, prefer sequence continuity and section-level discovery breaks.
✅ **Contextual Filtering** - Active dimension tab (Who/What/When/Where) controls which tag subset filters the feed.
✅ **Main Feed** - Mixed content types with seamless transitions between related content.
✅ **Mobile-First** - Touch scrolling, responsive design, news feed feel.
✅ **Curated or FreeForm** - Author-ordered or user-explored.
✅ **Content Types** - Stories: Navigate. Galleries: Inline (≤5 images) or Navigate (>5). Questions: Static (short) or Navigate (long). Quotes: always inline. Callouts: always inline. Collections: any card with children.

⭕2 **Coherence** - Multi-tag filter results need predictable grouping/sort, not unordered shuffle. Overlaps with Left Navigation ⭕2 Sort/Group; consolidate when that work begins.
⭕2 **Card Cues** - Show small type badge on compact cards (`Story`, `Q&A`, `Gallery`, `Callout`, `Quote`).

### **Content Page**

*Intent*
- **Immersive** - Immersive content consumption experience.
- **Engaging** - Presenting an engaging interface and fluidly scroll through the stories--up and down, left and right.

*Principles*
- **Dual-Path** - FreeForm or Curated

*Features*
✅ **Default** - After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:
✅ **Grid View** - Responsive grid-based layout
✅ **Card Types** - 5 card types:
✅ 1. `Story Card` - Story with related images--cover, inline, and/or gallery.
        - Title - Bottom overlay
        📐 Keep current titling pattern (placement/overlay behavior) as implemented through v1.
        🔵 Need to reassess what appears on cards: Title, Subtitle, Excerpt, Tags, Kicker, Overlay.
✅ 2. `Gallery Card` - Images with limited text (captions)
        - Title - Top
        - Excerpt
        - Inline expansion
        ⭕2 - Implement Horizontal Image slider 1/5
✅ 3. `Question Card` - Questions as if from family.
        - No cover image - Large question-mark watermark as background; question text overlaid with readable contrast.
        - With cover image - Hero is the cover only — no watermark.
        - Style
          - Horizontal Slide if the answer is short; 
          - Navigate when the answer is long (story-like reading).
        - Short questions may still be embedded in other narrative content where appropriate (optional pattern; not limited to this type).
        ⭕2 - Get questions from Word doc, card games on Amazon
✅ 4. `Quote Card` - Favorite quotes
        - Compact static tile; do not place the quote in the normal title band (same header-slot rule as Callout).
        - Dark tile, large decorative quote mark, **script/display** for quote body, **small caps** footer for **attribution** (optional status line, e.g. “re-read”—decide later if decorative or real state).
        ⭕2 - Devise Quote Card format
        ⭕2 - Get quotes from Dad book, Notion quotes, Grandfather book  
✅ 5. `Callout Card`  - Summary bullet points on a topic.
        ⭕2 - Devise Callout Card format - Tinted panel, **icon + all-caps kicker**, bullet/list in hero.
✅ **Display Modes** - 3 display modes/styles
    1. Static - Display only (Quote, Callout; Question when the answer is short)
    2. Inline - Swipes left/right (Gallery <5 images)
    3. Navigate - Dedicated card view (Story, Gallery; longer Question answers). On mobile, prefer horizontal swipe to open full content while the feed scrolls vertically (fewer open/close taps).
📐 **Horizontal Open** - Prefer horizontal card-open behavior on mobile for long-form cards to reduce open/close friction.
⭕3 **Bundle / images:** Route-level **code splitting** for heavy admin/editor paths; pass on `next/image` loading/priority for feed performance.
📘 `src/components/view/CardFeed.tsx`
📘 `src/components/view/ContentCard.tsx`
✅ **Main feed / gallery**
✅ **Header:** menu (left), title (center), **search** (right).
✅ **Search row** directly under header. Mockup placeholder copy may suggest multimodal search—**aspirational**; near-term search stays what the product can index (e.g. title, tags, captions).
✅ **Horizontal type chips** (e.g. all media vs “film” / strips): maps to **card-type** (and later **video**) filtering; complements dense mobile UX without replacing the tag sidebar/drawer.

⭕2 **Gallery Slider** - Implement horizontal image slider 1/5 for Gallery cards.
⭕2 **Question Content** - Get questions from Word doc, card games on Amazon.
⭕2 **Quote Format** - Devise Quote Card format (dark tile, decorative quote mark, script/display body, small caps attribution).
⭕2 **Quote Content** - Get quotes from Dad book, Notion quotes, Grandfather book.
⭕2 **Callout Format** - Devise Callout Card format (tinted panel, icon + all-caps kicker, bullet/list in hero).
⭕3 **Linkage** - In-content card and tag links with inline mention/typeahead insertion, ID-based routing, and graceful fallback for missing targets. Implementation detail to be generated when work begins.
⭕3 **Bundle / Images** - Route-level code splitting for heavy admin/editor paths; tune `next/image` loading/priority for feed performance.
⭕3 **Feed Types** - Devise different feed layouts: pane with teaser, related stories horizontal scroll, galleries horizontal scroll, small thumbnails horizontal scroll.

### **View Page** 

*Intent*
- **Seamless** - Seamless opening of cards to content.

*Principles*
- **Mobile** - Mobile-like behavior as possible.

*Features*
✅ **Open Card** - Clicking a navigate card opens `CardDetailPage.tsx` via server-side fetch (`getCardById`, `getCardsByIds` for children). Conditionally renders card components.
✅ **Conditional Render** - Render page components based on card data presence.
⭕3 **Feed hydration tiers:** Optional **cover-only** first paint on `/view` (defer full gallery/content hydration until card open or below fold) to reduce payload and server work vs today’s full hydration for feed cards.
✅ **Title** - Render first.
✅ **Subtitle** - If present, render next.
✅ **Cover Image** - If present, render next.
✅ **Content** - If present, render using TipTapRenderer.
✅ **Gallery** - If present, render `mosaic` on view page (decision). *(Feed/cards: horizontal swipe; see Content Page.)*
✅ **Children** - If present, render.
✅ **Related** - Display 3 random from filter. Reduced font.
✅ **Explore More** - Display 3 random outside filter. Reduced font.

❓ **Progressive Children** - Can the card display before fetching/rendering children? Currently server waits for both.
❓ **Excerpt Display** - Should excerpt render on the view page between subtitle and cover?
❓ **Related Count** - Reduce size/number of Related and Explore More cards?
⭕2 **View Mosaic** - Implement view-page gallery mosaic (replace swiper-only if needed).
🔵 **Social Features** - Like, comment, sharelink — out of scope until revisited.

## **Administration**

*Intent*
- **Administration** - Assembly and maintenance of all artifacts in app.

*Principles*
- **Bulk & Individual** - Support both high-volume batch operations and individual edits.
- **Efficiency** - Keep admin workflows efficient under large import/edit workloads.
- **Server-side** - CRUD and data-integrity logic belongs server-side.

*Features*
✅ **Navigation** - Top hamburger navigation `Admin` button navigates to Administration (`src/app/admin/layout.tsx`).
✅ **Domains** - All admin domains active: Cards, Media, Collections, Tags, Questions, Users, Themes.
✅ **Card Management** - Core CRUD, card schema, edit flows, collection route.
✅ **Media Management** - Assigned/unassigned filtering, replace-in-place, card-reference-aware delete.
✅ **Collections Management** - Parent/unparent cards, reorder cards.
✅ **Tag Management** - Hierarchical admin, DnD/reparenting, inline edits.
✅ **Question Management** - CRUD and create-card linkage workflow.
✅ **User Management** - Users model and admin user workflow.
✅ **Theme Management** - Set parameters for colors, fonts, etc.

⭕3 **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin — restore bounded deduping to cut duplicate `/api/cards` requests where safe.
✅ **Scripts** - `package.json` scripts for migrations, reconciliation, one-off repairs, and emergencies. Detail in TECHNICAL > Scripts.

📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Card Management**

*Intent*
- Manage card population

*Principles*
- **Ease of Use** - Ease of bulk and individual admin.

*Features*
✅ **Server-side** - All business logic on the server-side (`cardService`) 
✅ **Denormalized** - The data model is denormalized to support complex filtering
✅ **Card Data Model** - Firestore `cards` collection. Schema: `src/lib/types/card.ts` (`cardSchema` / `Card`).
📐 **Structural Collections** - Collection parent = any card with `childrenIds`. `type: 'collection'` is legacy/presentation only. `curatedRoot` marks top-level curated entries. Full structural detail in Collections Management.
⭕2 **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).

✅ **Grid View** - Click to edit, pagination (`/app/admin/card-admin/`).
✅ **Table View** - Pagination, load more.
✅ **Search by Title** - Filter by status and type via `CardProvider` `selectedFilterTagIds`. Bulk operations via `BulkEditTagsModal.tsx`.

⭕2 **Live Search** - Can Search by Title work as typed without 'enter'? Move to right of "All Types" filter.
⭕2 **Tag Overlay** - Show tags as overlay on cards in admin grid view?
✅ **Add Button** - `AdminFAB.tsx`. New (`/admin/card-admin/new`), Edit (`CardAdminClientPage.tsx`). `CardForm.tsx` wrapped in `CardFormProvider`.
✅ **Title, Subtitle, Excerpt** - All default empty.
✅ **Type** - `story`, `gallery`, `qa`, `quote`, `callout`, `collection`.
✅ **Status** - `draft`, `published`.
✅ **Display Mode** - `static`, `inline`, `navigate`.
✅ **Cover Image** - `CoverPhotoContainer` + `PhotoPicker`. Paste/drag supported. Stores references, adjusts/stores `objectPosition`. No caption.
✅ **Content** - Rich text editing via TipTap. Inline embedded images stored as `docId` array. Captions default to media object with override in card `figure`.
✅ **Tags** - `MacroTagSelector` modal. `Card.tags` stores user-assigned tags. On save, `cardService` derives `filterTags` from card-assigned tags and tag-tree ancestors (not from image tags).
✅ **Gallery** - `GalleryManager` + `PhotoPicker`, drag-and-drop order. `galleryMedia[]` stores `mediaId`, `order`, optional per-slot `caption`/`objectPosition`.

📐 **Excerpt Default** - Default empty.
⭕2 **Excerpt UI** - Implement auto excerpt UI/logic (empty default, checkbox + N characters, override).

✅ **Import Folder as Card** – `ImportFolderModal`, folder tree picker, **`__X`-marked files only**, in-memory WebP optimize + upload (no xNormalized on disk), duplicate detection (overwrite/cancel). Mass-import / digiKam prep: **Authoring pipeline — digiKam → mass import** (under Strategic Direction).
✅ **Caption and Focal** - Inherit from media by default; optional per-slot override in the gallery edit modal.
✅ **Children** - `childrenIds` attaches ordered child cards. Deep nesting allowed; cycles and self-parent blocked in `cardService`; single-parent constraint enforced on move.
⭕2 **Children Picker** - Replace search-only UX with query-driven picker (tags, type, title, date range) for attaching children at corpus scale (1000+ cards). Reconcile with TOC / collections ⭕2.
✅ **Actions** - Delete (remove tags/recalc, remove from parents, remove related media), Cancel (abandon edits, return to list), Save (save tags/recalc, add media).

⭕1 **Exit Edit** - Fix exit edit page — pressing Cancel to leave is awkward; use Back.
⭕2 **Content Versioning** - Firestore overwrites on save; no previous version to revert to. For a curated archive where content is irreplaceable narrative, accidental destructive edits = permanent loss. Options: (a) pre-save snapshot to `card_versions` subcollection, (b) soft delete with 30-day trash recovery, (c) "duplicate card" action for manual safety copy before risky edits. Start with (c) as near-term mitigation; implement (a) before mass content authoring.
⭕2 **Remove Legacy Type** - Remove legacy `collection` type before first import.
⭕2 **Authoring Discovery** - Filter-based discovery of both cards and media when editing; scalable child-card picker (replace search-only) for 1000+ cards — tags, type, title, date, etc. Aligned with TOC/collections work.

---

### **Collections Management**

*Intent*
- Organize cards into curated hierarchies with explicit parent/child ordering for narrative sequencing.

*Principles*
- **Structural, not type-based** - Parent/child via `childrenIds`, not `type: 'collection'`.
- **Manual ordering** - Author controls sequence through TOC; no automatic sorting.

*Features*
✅ **Data Model** - `/admin/collections` (`src/app/admin/collections/page.tsx`).
📐 **Structural Model** - Source of truth is `childrenIds.length > 0 OR curatedRoot === true`, not `type === 'collection'`. Sidebar `getCollectionCards` loads 500 most recent by `createdAt` then filters in memory — older collection parents may be missing.
✅ **Curated Tree** - drag-and-drop—attach/detach children, promote to tree root (`curatedRoot`). Single-parent model; cycles blocked in `cardService`. Loads up to **1000** cards for the page (separate from sidebar **500-recent** caveat).
⭕2 **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC (primary mechanism for curated narrative). One tree UI for reparenting and ordering. Reconcile parent/child model after TOC exists. No cascade on parent delete — children simply lose that parent.

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
🔵 **Video** - Support on **cover**, **inline (body)**, and **gallery** like stills—as far as product parity allows. **Size / “normalization”** (typical approach): **server-side transcoding** (e.g. FFmpeg) to a max resolution/bitrate and web-friendly format—same *class* of work as image normalization; not automatic in-app today.
📐 **Entry Paths** - Two import paths: (1) **Import → Card** — import from source as card + images concurrently, assign tags from folder/metadata, edit after. (2) **Import → Bank → Card** — bulk import images with tags into the bank unassigned, then create cards and assign from the bank.
📐 **Source Adapter Architecture** - The existing service layer (import, process, return mediaId) is the right shape for multiple source adapters. Current: local filesystem (hard drives / OneDrive mirror). Future adapters add alongside, not replacing, the local drive path.
⭕2 **Browser Upload** - Replace or supplement server-side folder read (`ONEDRIVE_ROOT_FOLDER`) with browser-based upload flow. Required for hosted deployment where the server has no local filesystem access.
🔵 **Google Photos Adapter** - Import from Google Photos API. Most accessible cloud photo API. Requires OAuth consent, album/media listing, download-and-process flow.
🔵 **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API. Similar shape to Google Photos adapter.
🔵 **Apple iCloud** - Most restricted API access. May require workaround (export from Photos app, then local/browser upload). Lowest priority.

📐 **Authoring Pipeline (digiKam → mass import)** - Organize folders/tags in digiKam; one leaf folder → one card; tags follow dimensional branches (WHO, WHAT, etc.); phased import with verification; post-import refinement via GIMP/Topaz + replace-in-place. See `IMPORT_FOLDER_MAX_IMAGES` for folder size cap.

❓ **digiKam Tag Alignment** - How to align the in-app tag tree with digiKam's structure?
⭕2 **Post-Import Maintenance** - Cropping, cleanup, sharpening in GIMP/Topaz after import. Use replace-in-place in Media admin to preserve media IDs and card references.

🔵 **Multi-Author** 
    - More than one author (e.g. parent and child) each maintains a voice, 
    - **Shared/Overlapping** - Image pool shared across authors.
    - **Intertwined** - Intertwined reader experiences.
    - **Cross-author Comments** on each other’s cards/images.
    - **Contrast with today:** The app is optimized for **one authoring admin** and **family readers**; a second author currently implies a **separate instance** (duplicate media, separate cards/captions/tags).
    - **Architectural challenges** 
        - Identity and roles; **author-scoped** card documents vs shared **media** library and **deduplication**; **tag namespaces** or “lens” so the same pixels do not force one global meaning (e.g. childhood/parents/grandparents are **viewer-relative**); permissions; **merged vs parallel** feeds; **comment** threads, notifications, and moderation.
    - **Comparison to large social products:** Overlapping primitives (multi-user, comments, feeds) exist elsewhere; this product remains **private**, **curated**, and **archival/narrative**—not a goal to replicate public-scale engagement mechanics.
   
✅ **Local Drive** - Current implementation sources from *local drive* (mirrored from OneDrive)
    - Media are imported (picker or paste/drop) and assigned to fields in cards
    - The *generic service layer* to external sources provides:
    - Connection
    - Import and *sharp* process the media to firebase
    - Prepare *metadata* 
    - return `mediaId` to card for storage and object for immediate display
✅ **Import Folder as Card**
    - Requires `ONEDRIVE_ROOT_FOLDER` in `.env` (server filesystem path)
    - `IMPORT_FOLDER_MAX_IMAGES` (default 50): max **marked** images **per folder import** to reduce **serverless timeout** risk—override via env or longer-running/self-hosted contexts. **Not** a hard product limit on how many images a card may hold in the abstract. **Authoring:** if leaf folders often **hit** this cap, **split folders** further (see **Authoring pipeline — digiKam → mass import**).
    - **Card export marker:** Only files whose basename ends with **`__X`** immediately before the extension are imported (e.g. `IMG_0001__X.jpg`). Two underscores and **uppercase X**—not `__x`.
    - **No local xNormalized write:** Folder import reads source files, **WebP-optimizes in memory** (`normalizeBufferToWebp` → `importFromLocalDrive` with `normalizeInMemory`), uploads to Firebase Storage. Legacy folders may still use `yEdited` or `xNormalized` **as read paths**; disk is **not** used for a new normalized output tree.
✅ **Optimization** - Optimize performance through `next/image`, caching, auto-sizing and lazy loading.
✅ **References** - Images served to content via Firebase ID/URLs
✅ **Filter** - Multi-dimensional filter.
✅ **OnDelete** - On media delete, card references are checked and cleaned up as part of media deletion flow.
✅ **Replace** - File edited from source and replaced. After editing, upload the new file via **Media admin** replace on that row. **API:** `POST /api/images/{id}/replace` → `replaceMediaAssetContent` in `imageImportService.ts`. Same Firestore **media** doc id and **storage path**; **width/height/size** refresh; **cover**, **gallery**, and **content** references on cards **unchanged** (no re-linking). *Caveat:* Same public URL shape can mean **browser or CDN caching**—if a thumbnail looks stale after replace, treat cache-bust or URL strategy as a follow-up.
✅ **Tagging** - Aim for the **same assignment mechanism** as cards (**shared modal**) where practical; **bulk** tagging in Media admin is the primary day-to-day workflow. **Today:** cards — `BulkEditTagsModal`; media — `PATCH /api/images/{id}` (tags / `whoTagIds`, caption, focal) and Media admin **bulk** modes (add / replace / remove). 
✅ **Direction:** no inheritance between card and media tags; separate card `filterTags` from image-level tags and retire merge-on-save—**Tag Management** 
  ⭕2 - Post-import aggregation UX: bulk add selected banked media to a card gallery and/or create new card from multi-select in Media admin (beyond per-card PhotoPicker alone).

📐 **Assignment Model** - References only; hydrated from media at read time. No embedded media objects.
  - **Cover** → `coverImageId`, `coverImageFocalPoint` (single image)
  - **Gallery** → `galleryMedia[]` — `{ mediaId, caption, order, objectPosition }`
  - **Inline (rich text)** → `contentMedia[]` — IDs extracted from HTML (`data-media-id`)

✅ **Media Data Model**
    - Collection - `media`. One doc per image
    - Schema  - `src/lib/types/photo.ts`
      ⭕3 Rename `src/lib/types/photo.ts` '...media.ts' throughout
✅ **Local Drive** - Integration 
✅ **Photopicker** -  Integration
✅ **`imageImportService.ts`**
✅ **Image Processing** - Sharp image processing  
✅ **Metadata** - Metadata extraction
✅ **Errors** - Error handling
✅ **Optimization** - `next/image`
✅ **Firebase Storage:** `images/{docId}-{filename}`
✅ **storageUrl:** Permanent public URL (format: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media`). Set from `storagePath` at card hydration and in Media API. No expiration or refresh. Requires Firebase Storage rules for public read (see below).
✅ **referencedByCardIds:** Denormalized array of card IDs that reference this media. Maintained on createCard, updateCard. Used for delete (remove refs from cards, then delete) and unassigned filter. Lazy backfill for legacy media.
✅ **No temporary/active.** All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.

  **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).
  **Firebase Console → Storage → Rules** - (required for public URLs)
    Adjust `allow write` if you use different auth requirements. No `storage.rules` file in this repo—rules are managed in the Console.
⭕1 **Orphaned Media** - Clean up orphaned media (100+). Can leave them if normalized. Else, delete and re-import normalized.
✅ **Delete checks card refs** - Yes; OnDelete flow removes card references before deleting media.

**Normalization**
  Organize, normalize, edit images pre-import
    - All versions of images in 1 directory 
    - Edit (GIMP - Crop, clean, Topaz - sharpen) as needed 
    - Rename final appending "__X"
    - Import files ending in "__X"
      - normalize to Firebase--sharpen, lighting, convert to webP
      - extract metadata to Firebase
  

  **Media Workflow**

  [Source] → [Import] → [Firebase Storage + Firestore] → [API Hydration] → [Client Display]

  **Import Entry Points**
  - `imageImportService.ts` — central import (PhotoPicker, paste/drop, local drive)
  - Creates Media doc in Firestore, uploads to Firebase Storage
  - Folder Import - `importFolderAsCard()` — filter `*__X.*`, `importFromLocalDrive(..., { normalizeInMemory: true })`, build gallery + cover

  **Display**
  - `JournalImage` — next/image with unoptimized (avoids 403 from Firebase)
  - `getDisplayUrl(photo)` — storageUrl → url → transparent pixel fallback
  - **Cover aspect ratios:** Edit/view 4:3; feed thumbnail 1:1
  - **Focal point:** Pixel coords {x, y}; converted to object-position per aspect ratio

  **Pre-Import Scripts** (Local Filesystem)
  - `create-photo-folders.bat` — xNormalized, yEdited, zOriginals
  - `normalize-images.bat` / `npm run normalize:images` — optimize, extract metadata to JSON, convert to WebP. Optional: `--card-export-only` (after destination arg) to process only `__X`-marked filenames.
  - `extract-metadata-improved.bat` — metadata only
  - See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`

  **Media-Card Reconciliation**
  When cards and media get out of sync, use reconciliation scripts. See MediaCardReconciliation.md. Run `npm run reconcile:media-cards -- --diagnose`.
  ⭕2 - Design media-card flow so they don't get out of sync.
  ⭕2 - Reconcile/Update Image/Card relationships/data integrity.
  ✅ **No temporary/active status** - Resolved. Everything imported is in the bank.
  ⭕3 - **Import pipeline job:** **Async queue/worker** for large folder import (normalize + writes) complementing `IMPORT_FOLDER_MAX_IMAGES` and serverless timeouts.
  ⭕3 - **Import metadata precedence:** Prefer **embedded XMP/IPTC** read **at import** for captions/keywords; use **JSON sidecars** as optional/supplementary when files are authoritative on disk.

📘 `normalize-images-README.md`
📘 `METADATA_EXTRACTION_README.md`
📘 `docs/IMPORT-REFERENCE.md`

### **Tag Management**

*Intent*
- **Multi-Dimensional** - Who, What, When, Where
- **Hierarchical** - USA/Illinois/Chicago

*Principles*
- **Server-side** - All business logic on the server-side (`tagService`).
- **Universal tagging** - All media and cards tagged for filtering using the same dimensional/hierarchical library.

✅ **Tag Data Model** - Firestore `tags` collection. Schema: `src/lib/types/tag.ts`. Service: `tagService`.
✅ **Dimensional** - Who, What, When, Where, Reflection.
⭕1 **Consolidate Reflection** - Merge Reflection dimension into What.
✅ **Hierarchical** - Parent/child nesting (e.g. Father → Mother; Son → Daughter).
✅ **Universal** - Media and cards use the same tagging mechanism.
⭕1 **Remove Tag Inheritance** - Tags do not copy between card and media; each record's tags stand alone.

📐 **Authoring Vocabulary** - Mirror the same dimensional paths in digiKam keywords and the app tag tree so import/mapping stays predictable. Four scene dimensions on media (Who, What, When, Where); card-level arc/theme tags for narrative framing. Key conventions:
  - **When** — `when/date/…` chronological, sortable (`yyyymmdd`, `00` for unknown). No `when/stage` (stage is who-dependent; infer from who + date). Season out of scope.
  - **What** — Three buckets: `what/event/…` (occasions/milestones), `what/activity/…` (what people are doing), `what/theme/…` (long-running domains). Overlap: milestones → event; school defaults to theme; add event for specific ceremonies.
  - **Who** — People as stable tag identities (display names). Groups optional (`who/group/…`). Subject vs also-present encoding TBD. Kinship graph is ⭕3 under Relationship Tagging.
  - **Where** — Administrative nesting (country → state → county → city), skip levels when irrelevant. Venues, domestic labels, natural settings as children. GPS/EXIF may seed on import; author refines in Tag admin.
❓ **Life-Arc Tree vs What and Reflection** - Card-level life themes (ancestry, childhood, education, career) need a dedicated tree. Should Reflection be renamed/expanded (e.g. Themes / Arc / Life & meaning), or add a new dimension? Relationship to `what/theme/…`: replacement, parent/child, or orthogonal?

✅ **Tag Administration** - `/app/admin/tag-admin/page.tsx`.
✅ **Hierarchical View** - The page renders all tags in a 5-column tree structure using `TagAdminList`
✅ **Drag-and-Drop** -  Reordering/Reparenting - `SortableTag.tsx`
✅ **Inline Editing** - `TagAdminRow.tsx`
✅ **OnDelete** - User choice of children being promoted or cascade deleted
✅ **OnMove** - Updates parent and order and recalcs tag card counts
✅ **Real-time** Edit tag and bulk tag modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). 
⭕1 **Tag Typeahead Search** - Add type-to-search for tag assignment (like digiKam's tag search). Far faster than navigating a large tree when the user knows the tag name. Autocomplete against the full tag library, filtering as typed. Apply to both card and media tag assignment modals.

📐 **Card Tags vs Media Tags**
✅ **Same mechanism:** Assign tags to a card and assign tags to a media document using the same flow and data shape as cards (shared tag-assignment modal, e.g. `MacroTagSelector` pattern). Use the same dimensional/hierarchical tag library; no special-case fields in the product model unless legacy migration requires it temporarily.
✅ **No inheritance:** Tags do not copy from card to image or from image to card. Each record’s tags stand alone. Discovery: filter cards by the card’s tags; filter media (e.g. in the media bank or a future image browser) by each media's tags.
✅ **v1 Authoring** Building and curating content cards must support **tag/query-based discovery of both cards and media** in admin (not one surface only)—pick gallery images, body embeds, and **related or child cards** from **filtered** sets, not only flat lists.
✅ **Human Authoring** You may still choose a **story-level** tag set on the card (what the post is about) and **frame-level** tags on images (who/what/when/where for that photo)—but nothing syncs unless you tag it yourself.
✅ **Bulk** Bulk tagging in Media admin is a high priority (multi-select + apply tags)—more day-to-day value than bulk on cards.
⭕1 **Tag Merging** - Today, gallery editing can persist `whoTagIds` on media and server logic can merge image WHO into **card** derived tags; that contradicts this model and should be **removed once media uses full parallel tagging**.
⭕3 **Single TagProvider:** Remove nested `TagProvider` under admin so one tag tree fetch serves GlobalSidebar + admin (avoid duplicate `/api/tags` work).
⭕3 **Tag Tree Counts** - Add `mediaCount` on tag docs + UI `(x/y)` (cards vs media); align maintenance with recalc/jobs so counts stay trustworthy alongside incremental `cardCount` fixes.
⭕3 **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are “unique per subtree.”
⭕3 **Unified tag edges (conceptual):** Treat assignments as **(subjectType, subjectId, tagId)** even if denormalized on `Card` / `Media` for reads—eases counts, digiKam mapping, migrations. (??)
⭕3 - Add Face Recognition - Options:
    - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
    - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
    - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.

🔵 **Relationship Tagging** - Derive family relationships from minimal primitives (`parent_of`, `spouse_of`); compute uncle, cousin, step-parent, etc. via inference rules. Maps to WHO dimension. Large surface (graph storage, validation, remarriage/step edges). Park until parallel media tagging and bulk Media-admin UX are in place. Detail regenerable.

### **Question Management**

*Intent*
- Grandfather/Father journal-like questions

*Principles*
- Use questions as prompts for stories.
- Accommodate short and long answers.
- Only if app commercialized extend admin to analysis.

*Features*
✅ **Data Model** - Firestore `questions` collection. Schema: `src/lib/types/question.ts`. Service: `questionService.ts`.
✅ **UI** - `/admin/question-admin`.
✅ **APIs** - Admin-only CRUD (`/api/admin/questions`, `/api/admin/questions/[id]`), link/unlink card, create-card from prompt.
✅ **Filter** - List/filter in UI: text, tags (substring), used vs unused.
✅ **OnDelete** - Card delete removes its ID from every question's usedByCardIdsand refreshesusageCountvia cardService.
✅ **Create Card** - Create card from question prompt (default type `qa` or `story`). Adds card ID to `usedByCardIds` and updates `usageCount`.
✅ **Link/Unlink** - Manual link/unlink between question and existing card IDs. A question may map to zero, one, or many cards.
❓ **Pre-Tag Questions** - Pre-tag questions for use on card? WHO/Father, WHAT/Reflection, Childhood, etc.
⭕2 **Assigned** - Mark questions "Assigned/Unassigned" (only doable if assigned to card, not if inline) `usedByCardIds.length > 0`.
🔵 **Answer Workflow** - Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping.
🔵 **Auto-Clustering** - Auto-clustering/grouping of short questions.

### **User Management**

*Intent*
- Offer access to users with credentials.

*Principles*
- **Credential-based** - Password entry via NextAuth Credentials provider.
- **Manual onboarding** - Send link with username and password to new users.

*Features*
✅ **Data Model** - Firestore `journal_users` collection. Schema: `src/lib/auth/journalUsersFirestore.ts`.
⭕1 **Rename Collection** - Rename all uses of `journal_users` to `users`.
✅ **Authentication** - `authorize` in `authOptions.ts` (DB first, legacy env fallback when no row for that username). Bcrypt passwords.
✅ **Admin View** - Users tab at `/admin/journal-users`. APIs: `/api/admin/journal-users`, `/api/admin/journal-users/[id]`.
✅ **Roles** - Viewers only from UI/API; single admin rule. Seed script: `npm run seed:journal-users`.
✅ **Login Redirect** - `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense`).
❓ **Credential Delivery** - How to send user credentials to new users?

### **Theme Management**

*Intent*
- Allow customizable light and dark modes

*Principles*
- Provide detailed control.

*Features*
✅ **Light/Dark Toggle** - Theme toggle in top navigation.
✅ **Admin Page** - Theme admin for color and font parameters.
⭕2 **CSS Tokenization** - Ensure all CSS in app is tokenized via `theme.css` variables.


### **Gallery Management**

*Intent*
- Allow customizable gallery styles

*Principles*
- Provide tokenizable styles for gallery layouts

*Features*
🔵 **Gallery Styles** - Devise preconfigured card styles for selection — masonry, mosaic, etc.

---

## **IMPLEMENTATION**

*App Status*
- **Architecture** - Core architecture (cards, media, tags) in place.
- **v1 Refinements** - Lock and solidify v1.
- **Content** - Prepare content for import.

### **Planned & Open Summary**
*(Mirrors inline ⭕ and ❓ in the body — same text and priority. Grouped by source section.)*

### TECHNICAL
- ⭕ **Code** - Comment code.
- ⭕ **ESLint** - Address ESLint violations.
- ⭕ **Quality** - QA app.
- ⭕2 **Directory** - Cleanup directory.
- ⭕1 **Search Index (Typesense)** - Implement Typesense as read-optimized search replica. Pre-import priority.

### Frontend
- ⭕2 **Unused Dependencies** - Remove unused packages; evaluate `react-photo-album` and `framer-motion` before removing.
- ⭕3 **Shell / Session UX** - Replace blank `AppShell` while NextAuth loading with visible shell + skeleton/spinner.

### Scripts
- ⭕2 **Script Cleanup** - 86 script files under `src/lib/scripts/`; many obsolete. Review and prune.
- ⭕1 **Broken Reference** - `diagnose:tag` in `package.json` points to non-existent file. Fix or remove.

### Backup
- ⭕1 **Database Script** - Wire backup script into `package.json` as `backup:database`.
- ⭕2 **Operational** - Ensure both backups are operational and verified end-to-end.

### Application
- ⭕2 **Split Validation** - Validate current split model against author workflow friction.
- ⭕2 **Edit on the Fly** - Add admin-only entry points from content surfaces.
- ⭕2 **Accessibility** - Elderly audience: font size, contrast, tap targets, alt text, keyboard nav, reduced motion.

### Home Page
- ⭕2 **Home Layout** - Center title and login; hide upper-left logo until auth completes.

### Top Navigation
- ⭕2 **Redesign** - Center logo, add back button from View Page.

### Left Navigation
- ⭕2 **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
- ⭕1 **Search Tags Fix** - Fix Search tags — not working.
- ⭕2 **Sort / Group** - Sort/group results by event, Who, What, When, Where for multi-constraint filters.
- ⭕2 **Curated Completeness** - Fix 500-recent-cards scan so Curated mode lists all collection parents at scale.
- ⭕2 **Collection Metadata** - Implement collection metadata (child counts).
- ⭕2 **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
- ⭕1 **Sidebar Scroll** - Full sidebar doesn't scroll; only tag tree scrolls within it. Very little visible area on mobile.
- ⭕3 **Mobile Filter UX** - Tune type/tag filter UX on mobile.

### Content
- ⭕2 **Coherence** - Multi-tag filter results need predictable grouping/sort.
- ⭕2 **Card Cues** - Show small type badge on compact cards.

### Content Page
- ⭕2 **Gallery Slider** - Implement horizontal image slider 1/5 for Gallery cards.
- ⭕2 **Question Content** - Get questions from Word doc, card games on Amazon.
- ⭕2 **Quote Format** - Devise Quote Card format.
- ⭕2 **Quote Content** - Get quotes from Dad book, Notion quotes, Grandfather book.
- ⭕2 **Callout Format** - Devise Callout Card format.
- ⭕3 **Linkage** - In-content card and tag links with inline mention/typeahead insertion.
- ⭕3 **Bundle / Images** - Route-level code splitting; tune `next/image` loading/priority for feed.
- ⭕3 **Feed Types** - Devise different feed layouts.
- ⭕3 **Feed Hydration Tiers** - Optional cover-only first paint on `/view`.

### View Page
- ⭕2 **View Mosaic** - Implement view-page gallery mosaic.
- ❓ **Progressive Children** - Can the card display before fetching/rendering children?
- ❓ **Excerpt Display** - Should excerpt render on the view page between subtitle and cover?
- ❓ **Related Count** - Reduce size/number of Related and Explore More cards?

### Administration
- ⭕3 **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin.

### Card Management
- ⭕2 **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit.
- ⭕2 **Live Search** - Search by Title as typed without 'enter'.
- ⭕2 **Tag Overlay** - Show tags as overlay on cards in admin grid view.
- ⭕2 **Excerpt UI** - Implement auto excerpt UI/logic (empty default, checkbox + N, override).
- ⭕2 **Children Picker** - Query-driven picker for attaching children at corpus scale (1000+ cards).
- ⭕2 **Remove Legacy Type** - Remove legacy `collection` type before first import.
- ⭕2 **Authoring Discovery** - Filter-based discovery of cards and media when editing.
- ⭕1 **Exit Edit** - Fix exit edit page — use Back instead of Cancel.
- ⭕2 **Content Versioning** - Pre-save snapshots to `card_versions` subcollection. Near-term: "duplicate card" action.

### Collections Management
- ⭕2 **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC. One tree UI for reparenting and ordering.

### Media Management
- ⭕1 **Orphaned Media** - Clean up orphaned media (100+).
- ⭕2 **Post-Import Maintenance** - Cropping, cleanup, sharpening via replace-in-place.
- ⭕2 **Post-Import Aggregation** - Bulk add selected banked media to a card gallery or create new card from multi-select.
- ⭕2 **Media-Card Flow** - Design media-card flow so they don't get out of sync.
- ⭕2 **Reconcile Integrity** - Reconcile/update image/card relationships/data integrity.
- ⭕3 **Rename photo.ts** - Rename `src/lib/types/photo.ts` to `media.ts` throughout.
- ⭕3 **Import Pipeline Job** - Async queue/worker for large folder import.
- ⭕3 **Import Metadata Precedence** - Prefer embedded XMP/IPTC at import; JSON sidecars as supplementary.
- ⭕2 **Browser Upload** - Replace/supplement server-side folder read with browser-based upload for hosted deployment.
- 🔵 **Google Photos Adapter** - Import from Google Photos API.
- 🔵 **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API.
- ❓ **digiKam Tag Alignment** - How to align the in-app tag tree with digiKam's structure?

### Tag Management
- ⭕1 **Tag Typeahead Search** - Type-to-search for tag assignment (like digiKam). Autocomplete against full tag library.
- ⭕1 **Consolidate Reflection** - Merge Reflection dimension into What.
- ⭕1 **Remove Tag Inheritance** - Tags do not copy between card and media.
- ⭕1 **Tag Merging** - Remove `whoTagIds` merge into card derived tags.
- ⭕3 **Single TagProvider** - Remove nested `TagProvider` under admin.
- ⭕3 **Tag Tree Counts** - Add `mediaCount` on tag docs + UI `(x/y)`.
- ⭕3 **Tag Recomp** - Schedule or queue recomputation for hierarchical counts.
- ⭕3 **Unified Tag Edges** - Treat assignments as `(subjectType, subjectId, tagId)`.
- ⭕3 **Face Recognition** - Add face recognition (cloud APIs, client-side, or native photos integration).
- ❓ **Life-Arc Tree vs What and Reflection** - Dedicated tree for card-level life themes? Rename Reflection or new dimension?

### Question Management
- ⭕2 **Assigned** - Mark questions "Assigned/Unassigned" based on `usedByCardIds.length > 0`.
- ❓ **Pre-Tag Questions** - Pre-tag questions for use on card?
- 🔵 **Answer Workflow** - Answer workflow beyond cards, analytics, templates.
- 🔵 **Auto-Clustering** - Auto-clustering/grouping of short questions.

### User Management
- ⭕1 **Rename Collection** - Rename all uses of `journal_users` to `users`.
- ❓ **Credential Delivery** - How to send user credentials to new users?

### Theme Management
- ⭕2 **CSS Tokenization** - Ensure all CSS in app is tokenized via `theme.css` variables.

### Gallery Management
- 🔵 **Gallery Styles** - Devise preconfigured card styles for selection.

## Open Questions (summary list)
*(Mirrors inline ❓ in the body.)*

- ❓ **Progressive Children** - Can the card display before fetching/rendering children?
- ❓ **Excerpt Display** - Should excerpt render on the view page between subtitle and cover?
- ❓ **Related Count** - Reduce size/number of Related and Explore More cards?
- ❓ **digiKam Tag Alignment** - How to align the in-app tag tree with digiKam's structure?
- ❓ **Life-Arc Tree vs What and Reflection** - Dedicated tree for card-level life themes? Rename Reflection or new dimension?
- ❓ **Pre-Tag Questions** - Pre-tag questions for use on card?
- ❓ **Credential Delivery** - How to send user credentials to new users?
- 🔵 **Multi-Author** - Shared media, author-scoped cards, tag namespaces, cross-author comments. Parked until single-author and tagging are stable.
- 🔵 **Relationship Tagging** - Kinship imputation from primitives. Parked until parallel media tagging and bulk UX are in place.
- 🔵 **Video** - Support on cover, inline, and gallery like stills. Server-side transcoding.

---

## Execution Plan

*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting.*

**Open Questions to resolve before starting:**
- ❓ **Life-Arc Tree vs What and Reflection** — Decide before Phase 1 (impacts tag dimension structure for digiKam import).
- ❓ **digiKam Tag Alignment** — Decide before Phase 1 (same reason).
- ❓ **Excerpt Display** — Decide before Phase 3 (affects reader view).
- ❓ **Progressive Children** — Investigate in Phase 0 if causing visible lag.

### Phase 0 — Bugs & Breakage
*Small, broken things. Fix before active use.*

- ⭕1 **Sidebar Scroll** — Left Nav. Full sidebar doesn't scroll; tag tree area too small on mobile.
- ⭕1 **Search Tags Fix** — Left Nav. Tag search not working.
- ⭕1 **Broken Reference** — Scripts. `diagnose:tag` in `package.json` points to non-existent file.
- ⭕1 **Exit Edit** — Card Mgmt. Cancel-to-leave is awkward; use Back.
- ⭕1 **Database Script** — Backup. Wire backup script into `package.json`. Need working backups before mass editing.

### Phase 1 — Pre-Import
*Must complete before mass import from digiKam. Clean data model + search that scales.*

- ⭕1 **Search Index (Typesense)** — Technical. Current search breaks at scale. Implement before importing 1000+ cards.
- ⭕1 **Tag Typeahead** — Tags. Type-to-search for tag assignment. Tree navigation unworkable at scale.
- ⭕1 **Remove Tag Inheritance** — Tags. Clean tag model before import.
- ⭕1 **Tag Merging** — Tags. Remove `whoTagIds` merge before import pollutes data.
- ⭕1 **Consolidate Reflection** — Tags. Settle dimension structure before building digiKam tag tree.
- ⭕1 **Orphaned Media** — Media. Clean up existing media before adding 1000+ more.
- ⭕2 **Remove Legacy Type** — Card Mgmt. Clean up `collection` type before import creates cards with it.

### Phase 2 — Admin Productivity
*After import, you'll edit hundreds of cards. Make bulk authoring viable.*

- ⭕2 **Content Versioning** — Card Mgmt. Safety net before mass editing. Start with "duplicate card" action.
- ⭕2 **Live Search** — Card Mgmt. Find cards by title as typed.
- ⭕2 **Excerpt UI** — Card Mgmt. Needed for feed display of imported cards.
- ⭕2 **Children Picker** — Card Mgmt. Query-driven picker for 1000+ cards.
- ⭕2 **Authoring Discovery** — Card Mgmt. Filter-based discovery of cards and media when editing.
- ⭕2 **Post-Import Aggregation** — Media. Bulk add banked media to cards.
- ⭕2 **Reconcile Integrity** — Media. Fix relationships after import.
- ⭕2 **Media-Card Flow** — Media. Design flow so they don't get out of sync.

### Phase 3 — Reader Experience
*Prepare for family hosting. Make the app ready for non-admin users.*

- ⭕2 **Accessibility** — Application. Font size, contrast, tap targets, alt text, keyboard nav.
- ⭕2 **Home Layout** — Home Page. First thing visitors see.
- ⭕2 **Redesign** — Top Nav. Back button, centered logo.
- ⭕2 **View Mosaic** — View Page. Gallery display for readers.
- ⭕2 **Gallery Slider** — Content Page. Horizontal image browsing.
- ⭕2 **Sort / Group** — Left Nav. Meaningful filter results.
- ⭕2 **Coherence** — Content. Predictable filtered feeds.
- ⭕2 **Quote Format** — Content Page. Card type readers will see.
- ⭕2 **Callout Format** — Content Page. Card type readers will see.
- ⭕2 **CSS Tokenization** — Theme. Consistent theming for readers.
- ⭕2 **Browser Upload** — Media. Required for hosted deployment (no local filesystem on server).
- ❓ **Related Count** — View Page. Decide size/number of Related and Explore More cards.

### Phase 4 — Scale & Polish
*Post-hosting, pre-commercial. Improve quality, doesn't block v1.*

- ⭕2 **TOC & Ordering** — Collections. Manual sibling reordering via drag-and-drop TOC.
- ⭕2 **Curated Completeness** — Left Nav. Fix 500-card scan for Curated mode.
- ⭕2 **Tag Tree Counts** — Left Nav. Fix numbering and add media counts.
- ⭕2 **Collection Metadata** — Left Nav. Child counts.
- ⭕2 **Chron Tree** — Left Nav. Chronological browsing tree.
- ⭕2 **Card Cues** — Content. Type badge on compact cards.
- ⭕2 **Card Edit Mosaic** — Card Mgmt. Mosaic layout for gallery manager in edit.
- ⭕2 **Tag Overlay** — Card Mgmt. Tags on cards in admin grid.
- ⭕2 **Edit on the Fly** — Application. Admin-only entry points from content surfaces.
- ⭕2 **Split Validation** — Application. Validate split model against author workflow.
- ⭕2 **Script Cleanup** — Scripts. Prune 86 script files.
- ⭕2 **Unused Dependencies** — Frontend. Remove/evaluate unused packages.
- ⭕2 **Operational** — Backup. Verify end-to-end.
- ⭕2 **Assigned** — Questions. Mark questions assigned/unassigned.
- ⭕2 **Question Content** — Content Page. Get questions from Word doc.
- ⭕2 **Quote Content** — Content Page. Get quotes from sources.
- ⭕2 **Post-Import Maintenance** — Media. Cropping, cleanup via replace-in-place.
- ⭕1 **Rename Collection** — Users. Rename `journal_users` to `users`.
- ⭕ **Code / ESLint / QA** — Technical. Comment code, lint cleanup, QA.

### Phase 5 — Future
*⭕3 and 🔵 items. Revisit after family is using the app and you have real feedback.*

- ⭕3 **Shell / Session UX** — Frontend. Loading skeleton.
- ⭕3 **Mobile Filter UX** — Left Nav. Mobile filter tuning.
- ⭕3 **Linkage** — Content Page. In-content card/tag links.
- ⭕3 **Bundle / Images** — Content Page. Code splitting, image optimization.
- ⭕3 **Feed Types** — Content Page. Different feed layouts.
- ⭕3 **Feed Hydration Tiers** — View Page. Cover-only first paint.
- ⭕3 **Admin SWR Deduping** — Administration. Restore bounded deduping.
- ⭕3 **Single TagProvider** — Tags. Remove nested provider.
- ⭕3 **Tag Tree Counts (media)** — Tags. Add `mediaCount` on tag docs.
- ⭕3 **Tag Recomp** — Tags. Queue recomputation for hierarchical counts.
- ⭕3 **Unified Tag Edges** — Tags. Conceptual: `(subjectType, subjectId, tagId)`.
- ⭕3 **Face Recognition** — Tags. Cloud/client-side face detection.
- ⭕3 **Rename photo.ts** — Media. Rename to `media.ts` throughout.
- ⭕3 **Import Pipeline Job** — Media. Async queue/worker for large imports.
- ⭕3 **Import Metadata Precedence** — Media. Prefer embedded XMP/IPTC.
- 🔵 **Gallery Styles** — Gallery. Preconfigured card styles.
- 🔵 **Answer Workflow** — Questions. Beyond cards, analytics, templates.
- 🔵 **Auto-Clustering** — Questions. Grouping of short questions.
- 🔵 **Google Photos Adapter** — Media. Import from Google Photos API.
- 🔵 **OneDrive Adapter** — Media. Import from OneDrive API.
- 🔵 **Multi-Author** — Strategic. Parked.
- 🔵 **Relationship Tagging** — Tags. Parked.
- 🔵 **Video** — Media. Parked.