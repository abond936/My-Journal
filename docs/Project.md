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

✅ **Search Index (Typesense)** - Typesense Cloud integrated. Full-text search across title, subtitle, excerpt, content, and tag names. Weighted relevance ranking. Debounced search-as-you-type in admin card list. Falls back to Firestore prefix search if Typesense unavailable. Config: `src/lib/config/typesense.ts`. Service: `src/lib/services/typesenseService.ts`. Sync: `npm run sync:typesense` / `sync:typesense:fresh`.
✅ **Typesense Auto-Sync** - Automatic upsert/delete in `cardService.ts`. `createCard` and `updateCard` fire-and-forget sync to Typesense (resolves tag names, strips HTML). `deleteCard` removes from index post-transaction. No manual `sync:typesense` needed for card CRUD.
✅ **Typesense Media Index** - `typesenseMediaService.ts`; `GET /api/media` uses Typesense when `search` is non-empty, dimensional tag filters, or assignment is assigned/unassigned (if `TYPESENSE_*` set). Text search without Typesense returns **503 SEARCH_UNAVAILABLE**. Sync on media CRUD (`imageImportService`) and when cards add/remove media refs (`cardService`). Bulk backfill: `npm run sync:typesense:media` / `sync:typesense:media:fresh`. Typesense collection name **`media`** (same cluster as `cards`).

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
⭕2 **Sort / Group** - Add user-selectable sort/group by event, Who, What, When, Where so multi-constraint filters do not devolve into an incoherent mix across unrelated occasions.
⭕2 **Curated Completeness** - Fix 500-recent-cards scan in `getCollectionCards` so Curated mode lists all collection parents at scale, not a truncated subset.
⭕2 **Collection Metadata** - Implement collection metadata (child counts).
⭕2 **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
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
🔵 **Maintenance Management** - Admin UI over existing secured maintenance APIs (`POST /api/admin/maintenance/*`: reconcile, cleanup, backfill, diagnose-cover). A Maintenance tab existed previously and was removed; restore when in-app diagnose/fix outweighs CLI + manual HTTP. Today: `docs/NPM-SCRIPTS.md` and `npm run …` scripts.

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
✅ **Excerpt UI** - Auto-generate toggle on card form. When on, excerpt is computed from content (150 chars, word boundary). Manual override via toggle off. `excerptAuto` field on card schema; server recomputes on save when content changes.

✅ **Import Folder as Card** – `ImportFolderModal`, folder tree picker, **`__X`-marked files only**, in-memory WebP optimize + upload (no xNormalized on disk), duplicate detection (overwrite/cancel). Mass-import / digiKam prep: **Authoring pipeline — digiKam → mass import** (under Strategic Direction).
✅ **Caption and Focal** - Inherit from media by default; optional per-slot override in the gallery edit modal.
✅ **Children** - `childrenIds` attaches ordered child cards. Deep nesting allowed; cycles and self-parent blocked in `cardService`; single-parent constraint enforced on move.
✅ **Children Picker (edit UI)** - Card edit view: reorder/remove children and open child edit links; attach/reparent in Collections admin (`ChildCardManager` → link to `/admin/collections`). Structural assembly stays in TOC/collections work ⭕2.
⭕2 **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question→card linkage. Deferred until after import.
✅ **Actions** - Delete (remove tags/recalc, remove from parents, remove related media), Cancel (abandon edits, return to list), Save (save tags/recalc, add media).

⭕2 **Dirty State Tracking** - Track form changes in `CardFormProvider` (initial vs. current state) so Back can warn on unsaved edits for existing cards too.
✅ **Content Versioning (Phase 1)** - "Duplicate Card" action implemented. Creates a draft copy of any card (content, tags, media refs, gallery) via `POST /api/cards/[id]/duplicate`. Button on card edit page header. Next phase: pre-save snapshot to `card_versions` subcollection before mass content authoring.
✅ **Remove Legacy Type** - Removed legacy `collection` type. Zero cards used it; removed from schema and all 8 code files.
✅ **Authoring Discovery (media in edit)** - PhotoPicker **Library** tab: same non-tag query filters as Media admin (`/api/media`: status, source, shape, caption, on-cards), debounced text search, **in-modal dimensional tag filter** (`MacroTagSelector`, independent of left sidebar; OR within dimension, AND across dimensions, merged with optional **Match card tags** from the current card). `filterTagIds` wired from `CardForm` → cover/gallery/content picker. Card discovery: admin card list + Collections for structure.

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
✅ **Media Search Index (Typesense)** - Typesense `media` collection: single searchable field (filename, caption, source path, tag names); facets for status, source, shape, has caption, **assigned**, dimensional tag ids (who/what/when/where). `listPage` pagination for TS-backed queries. **Operational:** run `npm run sync:typesense:media` after enabling Typesense or bulk-importing media outside API paths that auto-sync. **Verified:** sync completed successfully against current Firestore (e.g. 13 media indexed in dev—re-run after mass import).
  ✅ **Media assigned + Typesense on unlink** - `removeMediaReferenceFromCard` (`cardService.ts`): if the card actually references the media (structured refs or body HTML), updates the card, then **`referencedByCardIds` `arrayRemove(cardId)`** on the media doc, **`syncMediaToTypesenseById`**, and **`syncCardToTypesense`** for the affected card. Used by `deleteMediaWithCardCleanup` (admin media delete). Together with **createCard** / **updateCard**, this is the assumed **add / change / delete** behavior—see **Cross-entity sync**. For exceptional drift only, use **`reconcile:media-cards`** (diagnose/fix) or Typesense bulk sync scripts.
⭕2 **Browser Upload** - Replace or supplement server-side folder read (`ONEDRIVE_ROOT_FOLDER`) with browser-based upload flow. Required for hosted deployment where the server has no local filesystem access.
🔵 **Google Photos Adapter** - Import from Google Photos API. Most accessible cloud photo API. Requires OAuth consent, album/media listing, download-and-process flow.
🔵 **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API. Similar shape to Google Photos adapter.
🔵 **Apple iCloud** - Most restricted API access. May require workaround (export from Photos app, then local/browser upload). Lowest priority.

📐 **Authoring Pipeline (digiKam → mass import)** - Organize folders/tags in digiKam; one leaf folder → one card; tags follow dimensional branches (WHO, WHAT, etc.); phased import with verification; post-import refinement via GIMP/Topaz + replace-in-place. See `IMPORT_FOLDER_MAX_IMAGES` for folder size cap.

📐 **digiKam Tag Alignment** - **Decided:** digiKam is the source of truth for the tag tree. Process: (1) Finish tagging in digiKam. (2) Export digiKam's full tag tree (tab-indented). (3) Diff against app's Firestore tree — produce adds, removes, moves. (4) Update app tree to match digiKam. (5) Build XMP import: read `lr:hierarchicalSubject` from files, parse `WHO|Robert Bond` → dimension + path, look up tag ID in aligned tree, assign to media. (6) Log unmatched tags for review. Blocked until digiKam tagging is complete.
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
  ✅ **Post-import aggregation (create card)** - Media admin multi-select → **Create card from selection**: draft `gallery` card (`POST /api/cards`), `coverImageId` + ordered `galleryMedia`, navigate to edit (`MediaAdminContent`).
  ⭕2 **Append to existing card gallery** - Bulk add selected banked media to another card's gallery from Media admin (deferred).

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
✅ **referencedByCardIds:** Denormalized array of card IDs that reference this media. Maintained on **createCard**, **updateCard** (transaction), and **removeMediaReferenceFromCard** (media delete cleanup path). Used for delete (remove refs from cards, then delete) and unassigned filter. Lazy backfill for legacy media.

📐 **Cross-entity sync** — Firestore is authoritative; Typesense and denormalized fields follow these entry points:

| Relationship | Primary maintenance |
|--------------|---------------------|
| Card ↔ media `referencedByCardIds` | `createCard` / `updateCard` (transaction `arrayUnion` / `arrayRemove`); `removeMediaReferenceFromCard` + `deleteMediaWithCardCleanup` |
| Card ↔ Typesense | `syncCardToTypesense` after create/update paths; `removeCardFromTypesense` on card delete |
| Media ↔ Typesense | `syncMediaToTypesenseById` / `syncMediaToTypesense` on media writes; `removeMediaFromTypesense` on media delete |
| Card ↔ tag `cardCount` (and ancestors) | `updateTagCountsForCard` inside card transactions (tag changes, publish state, `deleteCard`) |
| Card ↔ questions | `unlinkCardFromAllQuestions` after `deleteCard`; link/unlink APIs update `usedByCardIds` + `usageCount` |
| Drift / bulk repair | Ad hoc: `npm run sync:typesense` / `sync:typesense:media`; `npm run reconcile:media-cards`; other scripts under `src/lib/scripts/`. Not a separate product backlog item—normal CRUD paths above own day-to-day consistency. |
✅ **No temporary/active.** All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.

  **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).
  **Firebase Console → Storage → Rules** - (required for public URLs)
    Adjust `allow write` if you use different auth requirements. No `storage.rules` file in this repo—rules are managed in the Console.
✅ **Orphaned Media** - Deleted 136 orphaned media (95.7 MB). All were local-source with no card references. Source files remain on disk for re-import via digiKam pipeline with fresh normalization and tags.
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
  **Add / change / delete** for card–media edges is maintained by production paths (**Cross-entity sync** table in Media Management). When investigating **exceptional** drift (legacy data, manual DB edits): **CLI** — `npm run reconcile:media-cards -- --diagnose` (optional `--fix`, `--fix --dry-run`, `--card "Title"`); source `src/lib/scripts/firebase/reconcile-media-cards.ts`. **HTTP** (admin session) — `POST /api/admin/maintenance/reconcile` with JSON `action`: `diagnose` | `fix`, optional `dryRun`, `cardTitleFilter`, `checkStorage`. **Index** — `docs/NPM-SCRIPTS.md`.
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
✅ **Dimensional** - Who, What, When, Where (Reflection subtree lives under What as `what/Reflections/...`).
✅ **Consolidate Reflection** - Former `reflection` dimension removed from schema and UI. Tags reparented under a What root **Reflections**; cards/media no longer store a `reflection` field. One-time Firestore migration: `npm run tags:consolidate-reflection` (use `--dry-run` first).
✅ **N/A Sentinel Tags (`zNA`)** - One root per dimension named **`zNA`** (same display/stored string in who, what, when, where). Explicit “doesn’t apply” vs “not yet tagged.” **Uniqueness:** root tag names are unique **per dimension** only (four `zNA` roots allowed); child names are unique **among siblings** (case-insensitive after trim). Seed missing roots: `npm run tags:seed-zna`. Supports completeness: a card/media is complete when every dimension has at least one tag (including `zNA`).
✅ **Admin dimension at a glance (v1)** - **Direct tags only** (intersection of `tags` with each dimensional array), aligned across **card table** (existing four columns), **media table** (four Who/What/When/Where columns replacing a single Tags column), and **card + media grid** (four equal chips per row: first tag name truncated, `+n` for more in that dimension; native `title` / `aria-label` lists all direct tags per dimension). Card edit view keeps existing empty-dimension header emphasis. **Deferred:** green/amber completeness dots; stronger hover/popover typography (readability pass later). Implementation: `getCoreTagsByDimension`, `DirectDimensionChips` (`src/components/admin/common/`).
✅ **Hierarchical** - Parent/child nesting (e.g. Father → Mother; Son → Daughter).
✅ **Universal** - Media and cards use the same tagging mechanism.
📐 **Authoring Vocabulary** - Mirror the same dimensional paths in digiKam keywords and the app tag tree so import/mapping stays predictable. Four scene dimensions on media (Who, What, When, Where); card-level arc/theme tags for narrative framing. **N/A sentinel:** use root tag **`zNA`** in each dimension in the app (and align digiKam keywords to the same label per dimension path). Key conventions:
  - **When** — `when/date/…` chronological, sortable (`yyyymmdd`, `00` for unknown). No `when/stage` (stage is who-dependent; infer from who + date). Season out of scope.
  - **What** — Includes `what/Reflections/…` for reflective / journal-style themes (card-centric; not used for media scene tags). Other buckets: `what/event/…` (occasions/milestones), `what/activity/…` (what people are doing), plus long-running domains under What as needed. Overlap: milestones → event; school defaults to theme; add event for specific ceremonies.
  - **Who** — People as stable tag identities (display names). Groups optional (`who/group/…`). Subject vs also-present encoding TBD. Kinship graph is ⭕3 under Relationship Tagging.
  - **Where** — Administrative nesting (country → state → county → city), skip levels when irrelevant. Venues, domestic labels, natural settings as children. GPS/EXIF may seed on import; author refines in Tag admin.
📐 **Life-Arc Tree vs What and Reflection** - **Decided:** Merge Reflection into What as `what/Reflections/...` subtree. Remove `reflection` dimension. Reflective tags are inherently card-centric (poor fit for media scene tags) — self-enforcing by content. Four dimensions remain: Who, What, When, Where.

✅ **Tag Administration** - `/app/admin/tag-admin/page.tsx`.
✅ **Hierarchical View** - The page renders all tags in a 4-column tree structure using `TagAdminList`
✅ **Drag-and-Drop** -  Reordering/Reparenting - `SortableTag.tsx`
✅ **Inline Editing** - `TagAdminRow.tsx`
✅ **OnDelete** - User choice of children being promoted or cascade deleted
✅ **OnMove** - Updates parent and order and recalcs tag card counts
✅ **Real-time** Edit tag and bulk tag modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). 
✅ **Tag Typeahead Search** - Search input added to tag assignment modals (MacroTagSelector expanded view and BulkEditTagsModal). Filters all dimension columns as typed using `filterTreesBySearch`. Matching branches auto-expand. Works in card edit, gallery edit, bulk media, and bulk card tag flows.

📐 **Card Tags vs Media Tags**
✅ **Same mechanism:** Assign tags to a card and assign tags to a media document using the same flow and data shape as cards (shared tag-assignment modal, e.g. `MacroTagSelector` pattern). Use the same dimensional/hierarchical tag library; no special-case fields in the product model unless legacy migration requires it temporarily.
✅ **No inheritance:** Tags do not copy from card to image or from image to card. Each record’s tags stand alone. Discovery: filter cards by the card’s tags; filter media (e.g. in the media bank or a future image browser) by each media's tags.
✅ **v1 Authoring** Building and curating content cards must support **tag/query-based discovery of both cards and media** in admin (not one surface only)—pick gallery images, body embeds, and **related or child cards** from **filtered** sets, not only flat lists.
✅ **Human Authoring** You may still choose a **story-level** tag set on the card (what the post is about) and **frame-level** tags on images (who/what/when/where for that photo)—but nothing syncs unless you tag it yourself.
✅ **Bulk** Bulk tagging in Media admin is a high priority (multi-select + apply tags)—more day-to-day value than bulk on cards.
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
❓ **Pre-Tag Questions** - Pre-tag questions for use on card? WHO/Father, WHAT/Reflections, Childhood, etc.
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
- ✅ **Search Index (Typesense)** - Implemented. Full-text search across all card fields.
- ✅ **Typesense Auto-Sync** - Auto-upsert/delete on card save via `cardService`.

### Frontend
- ⭕2 **Unused Dependencies** - Remove unused packages; evaluate `react-photo-album` and `framer-motion` before removing.
- ⭕3 **Shell / Session UX** - Replace blank `AppShell` while NextAuth loading with visible shell + skeleton/spinner.

### Scripts
- ⭕2 **Script Cleanup** - 86 script files under `src/lib/scripts/`; many obsolete. Review and prune.

### Backup
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
- ⭕2 **Sort / Group** - Sort/group results by event, Who, What, When, Where for multi-constraint filters.
- ⭕2 **Curated Completeness** - Fix 500-recent-cards scan so Curated mode lists all collection parents at scale.
- ⭕2 **Collection Metadata** - Implement collection metadata (child counts).
- ⭕2 **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
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
- 🔵 **Maintenance Management** - Admin UI for maintenance APIs (parked); use `docs/NPM-SCRIPTS.md` and CLI today.

### Card Management
- ⭕2 **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit.
- ⭕2 **Tag Overlay** - Show tags as overlay on cards in admin grid view.
- ✅ **Excerpt UI** - Auto-generate toggle; manual override. `excerptAuto` field on card schema.
- ✅ **Children Picker (edit UI)** - Reorder/remove + Collections link; attach in Collections admin.
- ⭕2 **Card Linkage** - `linkedCardIds` "See Also"; deferred until after import.
- ✅ **Remove Legacy Type** - Removed. Zero cards used it; cleaned from schema + 8 code files.
- ✅ **Authoring Discovery (media in edit)** - PhotoPicker Library: `/api/media` filters, in-modal tag filter (sidebar-independent) + optional match card tags, debounced search.
- ⭕2 **Dirty State Tracking** - Warn on unsaved edits for existing cards.
- ✅ **Content Versioning (Phase 1)** - "Duplicate Card" action implemented. Next: pre-save snapshots.

### Collections Management
- ⭕2 **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC. One tree UI for reparenting and ordering.

### Media Management
- ✅ **Orphaned Media** - Deleted 136 orphaned media. Source files on disk for re-import.
- ⭕2 **Post-Import Maintenance** - Cropping, cleanup, sharpening via replace-in-place.
- ✅ **Post-Import Aggregation (create card)** - Media admin multi-select creates draft gallery card and opens edit.
- ⭕2 **Append to existing card gallery** - Bulk add selection to another card's gallery (deferred).
- ⭕3 **Rename photo.ts** - Rename `src/lib/types/photo.ts` to `media.ts` throughout.
- ⭕3 **Import Pipeline Job** - Async queue/worker for large folder import.
- ⭕3 **Import Metadata Precedence** - Prefer embedded XMP/IPTC at import; JSON sidecars as supplementary.
- ✅ **Media Search Index (Typesense)** - Implemented; `npm run sync:typesense:media` for backfill. Dev sync verified OK.
- ✅ **Media assigned on unlink** - `removeMediaReferenceFromCard` updates `referencedByCardIds`, media Typesense, and card Typesense (see Cross-entity sync).
- ⭕2 **Browser Upload** - Replace/supplement server-side folder read with browser-based upload for hosted deployment.
- 🔵 **Google Photos Adapter** - Import from Google Photos API.
- 🔵 **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API.
- 📐 **digiKam Tag Alignment** - Decided: digiKam is source of truth. Diff + sync app tree, then import XMP tags. Blocked until tagging complete.

### Tag Management
- ✅ **Tag Typeahead Search** - Search input in tag assignment modals. Filters all dimension columns as typed.
- ✅ **Consolidate Reflection** - Reflection subtree under What (`what/Reflections/...`); `reflection` dimension removed from product and schema.
- ✅ **N/A Sentinel (`zNA`)** - Root `zNA` per dimension; `npm run tags:seed-zna`; per-dimension root uniqueness (see Tag Management).
- ✅ **Admin dimension at a glance** - Four columns (media table) + four chips (card/media grids); direct-only + `+n`; hover titles for full per-dimension lists. (Green/amber badges + font polish later.)
- ⭕3 **Single TagProvider** - Remove nested `TagProvider` under admin.
- ⭕3 **Tag Tree Counts** - Add `mediaCount` on tag docs + UI `(x/y)`.
- ⭕3 **Tag Recomp** - Schedule or queue recomputation for hierarchical counts.
- ⭕3 **Unified Tag Edges** - Treat assignments as `(subjectType, subjectId, tagId)`.
- ⭕3 **Face Recognition** - Add face recognition (cloud APIs, client-side, or native photos integration).
- 📐 **Life-Arc Tree vs What and Reflection** - **Decided:** Merge into What as Reflections subtree. Four dimensions: Who, What, When, Where.

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
- ❓ **Pre-Tag Questions** - Pre-tag questions for use on card?
- ❓ **Credential Delivery** - How to send user credentials to new users?
- 🔵 **Multi-Author** - Shared media, author-scoped cards, tag namespaces, cross-author comments. Parked until single-author and tagging are stable.
- 🔵 **Relationship Tagging** - Kinship imputation from primitives. Parked until parallel media tagging and bulk UX are in place.
- 🔵 **Video** - Support on cover, inline, and gallery like stills. Server-side transcoding.

---

## Execution Plan

*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting.*

**Open Questions to resolve before starting:**
- ✅ **Life-Arc Tree vs What and Reflection** — Decided: merge Reflection into What as Reflections subtree. Four dimensions.
- ✅ **digiKam Tag Alignment** — Decided: digiKam is source of truth. Blocked until tagging complete.
- ❓ **Excerpt Display** — Decide before Phase 3 (affects reader view).
- ❓ **Progressive Children** — Investigate in Phase 0 if causing visible lag.

### Phase 1 — Pre-Import
*Must complete before mass import from digiKam. Clean data model + search that scales.*

- ✅ **Search Index (Typesense)** — Technical. Implemented.
- ✅ **Typesense Auto-Sync** — Technical. Auto-upsert/delete wired into `cardService`.
- ✅ **Tag Typeahead** — Tags. Search input filters dimension columns as typed in all tag modals.
- ✅ **Consolidate Reflection** — Tags. Reflections under What; `reflection` dimension removed (`npm run tags:consolidate-reflection`).
- ✅ **N/A Sentinel (`zNA`)** — Tags. Root `zNA` per dimension; seed script before import if missing.
- ✅ **Orphaned Media** — Media. Deleted 136 orphaned; source files remain for re-import.
- ✅ **Remove Legacy Type** — Card Mgmt. Removed. Zero cards used it; cleaned from schema + 8 code files.

### Phase 2 — Admin Productivity
*After import, you'll edit hundreds of cards. Make bulk authoring viable.*

- ✅ **Content Versioning (Phase 1)** — Card Mgmt. "Duplicate Card" action. Next: pre-save snapshots.
- ✅ **Excerpt UI** — Card Mgmt. Auto-generate toggle with manual override.
- ✅ **Children Picker (edit UI)** — Card Mgmt. Reorder/remove + Collections link; attach in Collections admin.
- ⭕2 **Card Linkage** — Card Mgmt. `linkedCardIds` "See Also"; deferred until after import.
- ✅ **Authoring Discovery (media in edit)** — Card Mgmt. PhotoPicker Library aligned with `/api/media`; in-modal tag filter + optional match card tags.
- ✅ **Post-Import Aggregation (create card)** — Media. Multi-select → new draft gallery card; opens edit.
- ⭕2 **Append to existing card gallery** — Media. Add selection to an existing card's gallery (deferred).
- ✅ **Media–card relationship maintenance** — Assumed: `createCard` / `updateCard` / `removeMediaReferenceFromCard` / delete paths + **Cross-entity sync**; `reconcile:media-cards` for exceptional drift only (not backlog).
- ✅ **Media Search Index (Typesense)** — Media. Implemented; bulk `npm run sync:typesense:media` (verified).
- ✅ **Media assigned on unlink** — Media. `removeMediaReferenceFromCard` + Typesense for card and media (see Media Management / Cross-entity sync).
- ✅ **Admin dimension at a glance** — Tags/Media/Card admin. Four dimension columns (media list) + matching grid chips; direct-only + `+n`; tooltips for lists. (Amber/green badges + typography TBD.)

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
- 🔵 **Maintenance Management** — Administration. In-app maintenance UI (parked).