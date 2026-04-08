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

⭕3 - **Optional search index:** External index (e.g. Meilisearch, Typesense, Algolia) or SQL full-text when Firestore browse/search patterns hit limits at scale. *??What does this provide??*

✅ **Authorization** - Auth.js - with Firebase adapter
    - Role-based access control
    - Session persistence
    - Application wrapped in AuthProvider
    📐 **Auth in Buildout** - During build/content phase, keep using current env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
    📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
    📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
    📐 **One Admin** - One admin (author), all other accounts are viewers.
    📐 **Share Access** - Share access by sending site URL + username/password directly to each viewer.

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
⭕2 **Search Tags Fix** - Fix Search tags — not working.
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
✅ **Default** - After login, the app defaults to the content page (`CardFeed.tsx`, `ContentCard.tsx`).
✅ **Grid View** - Responsive grid-based layout.
✅ **Card Types** - Story (navigate, cover/inline/gallery), Gallery (inline or navigate), Question (static short or navigate long), Quote (compact static), Callout (compact static).
📐 **Titling** - Keep current titling pattern (placement/overlay behavior) as implemented through v1.
🔵 **Card Face** - Reassess what appears on cards: Title, Subtitle, Excerpt, Tags, Kicker, Overlay.
✅ **Display Modes** - Static (display only), Inline (swipe left/right), Navigate (dedicated card view). On mobile, prefer horizontal swipe to open full content.
📐 **Horizontal Open** - Prefer horizontal card-open behavior on mobile for long-form cards to reduce open/close friction.
✅ **Main Feed** - Mixed content grid with header (menu/title/search), search row, and horizontal type chips for card-type filtering.
📘 **Feed Components** - `src/components/view/CardFeed.tsx`, `src/components/view/ContentCard.tsx`

⭕2 **Gallery Slider** - Implement horizontal image slider 1/5 for Gallery cards.
⭕2 **Question Content** - Get questions from Word doc, card games on Amazon.
⭕2 **Quote Format** - Devise Quote Card format (dark tile, decorative quote mark, script/display body, small caps attribution).
⭕2 **Quote Content** - Get quotes from Dad book, Notion quotes, Grandfather book.
⭕2 **Callout Format** - Devise Callout Card format (tinted panel, icon + all-caps kicker, bullet/list in hero).
⭕3 **Linkage** - In-content card and tag links with inline mention/typeahead insertion, ID-based routing, and graceful fallback for missing targets. Implementation detail to be generated when work begins.
⭕3 **Bundle / Images** - Route-level code splitting for heavy admin/editor paths; tune `next/image` loading/priority for feed performance.
## **Administration**

*Intent*
- **Administration** - Assembly and maintenance of all artifacts in app.

*Principles*
- **Bulk** - Easy bulk and individual edits.
- **Individual** - Easy individual edits.
- **Efficiency** - Keep admin workflows efficient under large import/edit workloads.
✅ **Open Card** - Clicking a navigate card opens `CardDetailPage.tsx` via server-side fetch (`getCardById`, `getCardsByIds` for children). Conditionally renders card components.
✅ **Conditional Render** - Render page components based on card data presence.
✅ **Title** - Render first.
✅ **Subtitle** - If present, render next.
✅ **Cover Image** - If present, render next.
✅ **Content** - If present, render using TipTapRenderer.
✅ **Gallery** - If present, render mosaic on view page. *(Feed/cards: horizontal swipe; see Content Page.)*
✅ **Children** - If present, render.
✅ **Related** - Display 3 random from filter. Reduced font.
✅ **Explore More** - Display 3 random outside filter. Reduced font.

❓ **Progressive Children** - Can the card display before fetching/rendering children? Currently server waits for both.
❓ **Excerpt Display** - Should excerpt render on the view page between subtitle and cover?
❓ **Related Count** - Reduce size/number of Related and Explore More cards?
⭕2 **View Mosaic** - Implement view-page gallery mosaic (replace swiper-only if needed).
⭕3 **Feed Hydration Tiers** - Optional cover-only first paint on `/view` (defer full gallery/content hydration until card open or below fold) to reduce payload.
🔵 **Social Features** - Like, comment, sharelink — out of scope until revisited.

Work in phase order unless a task is blocking daily authoring—then pull it forward.