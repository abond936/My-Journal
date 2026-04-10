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
- **Author** - Provides direction, constraints, and priorities--not implementation details.
- **AI/Engineering** - Proposes how to build, designs flows, and recommends technical approaches.

### Document Structure
- **Heading Lock** - All ATX headings are fixed. Do not add new headings.
- **Subheading Lock** - Subheadings are *Intent*, *Principles*, and *Features*. Do not add new subheadings.
- **Formatting**
    - Headings are **bold**. Subheadings are *italic*.
    - Intent/Principles bullets start with a **bold** 1–2 word subject, then short descriptive text.
    - Features are preceded by ✅, ⭕, 📐, ❓, 📘, or 🔵, followed by a **bold** 1–2 word title + " - " + short descriptive text.

### Content Placement
- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under Tag Management, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **Planned & Open Summary** - ⭕Planned and ❓Open items are summarized in the Planned & Open Summary at the end of the document, **mirroring the body** (same wording, priority, and status) and **grouped by function** (technical, tags & navigation, content & reader, administration, media, etc.) for scanning. The summary is not a separate backlog.
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

The product concept is to combine one's photos and stories into an interactive 'journal'-- a storytelling platform that allows author-curated or freeform discovery--combining hardcopy journals and images in a combination journal-album. 

Photo apps like Apple and Google are very efficient interfaces, and they have album creation and freeform tagging capability, but they are limited in integrating text and organizing the images and albums, and can quickly devolve into a disorganization.

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
🔵 **Performance** - Possibilities captured from engineering review.
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
✅ **Data Models** - `src/lib/types/` *read directly - fully commented*
✅ **Typesense** - Full-text search for cards and media. Auto-syncs on CRUD. Falls back to Firestore if unavailable.
✅ **Auth.js** - w/Firebase adapter, role-based access control, session persistence, app wrapper AuthProvider.
    📐 **Auth in Buildout** - During build/content phase, keep using current env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
    📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
    📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
    📐 **One Admin** - One admin (author), all other accounts are viewers.

🔵 **Tenant ID** - Not implemented for v1. If multi-tenancy is needed for commercial SaaS (Model C), `tenantId` would be added to cards, media, tags, questions, and journal_users. Every query and security rule would need a tenant filter. Document the scope now; implement only if demand justifies it. See `docs/06-Strategic-Direction.md`.
🔵 **Storage Abstraction** - Firebase Storage APIs are currently called directly in multiple places (`imageImportService.ts`, upload functions, URL generation). Create a single `storageService.ts` module wrapping all storage operations (upload, delete, getUrl). Reduces future migration scope (Cloudflare R2, S3) to one file. Also enables cache-busting for replaced images (append version hash to URL).

### **Frontend**

*Intent*
- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*
- **UI Alignment** - Align UI behavior with **validated server contracts** (types/schemas); the client does not override server authority on writes. Clear **presentation and client-state** boundaries; business rules stay in services/API layer.

*Features*
✅ **Theme** - CSS modules for styling, global `theme.css` and `fonts.css`
✅ **Rich Text Editing** - `@tiptap/react` rich text editing
✅ **Media Selection** - PhotoPicker for media selection (admin modal picker and simple upload)
✅ **Galleries** - GalleryManager and Swiper for galleries
✅ **Image Optimization** - `next/image` via `JournalImage` wrapper 
✅ **DragnDrop** - `@dnd-kit/core` and `@dnd-kit/sortable`
✅ **Data Fetching** - `SWR` for client-side data fetching and caching 
⭕2 **Unused Dependencies** - Remove unused packages from `package.json`: `react-markdown`, `@uiw/react-md-editor`, `@minoru/react-dnd-treeview`. Evaluate `react-photo-album` (photo grid/mosaic layouts) and `framer-motion` (animation/transitions) for potential use before removing.

### **Scripts**

*Intent*
- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*
- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Syntax** - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`
✅ **Firebase Setup** - Credentials live in `.env`:
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

---

## **APPLICATION**

*Intent*
- **Consumption** - Consumption of content. Primarily mobile, but also tablet and desktop
- **Administration** - Administration of content, primarily on desktop, but minor edits on mobile.

*Principles*
- **Ease of Use** - Obvious or intuitive operation.
- **Responsiveness** - Quick response in content consumption.
- **Bulk Authoring** - Support high-volume/bulk authoring operations in administration workflows.
- **On-the-Fly Authoring** - Support specific, low-friction edits while browsing content.

*Features*
✅ **Structure** - App is separated into content and administration surfaces with shared providers/navigation patterns.
✅ **Layouts** - AppShell (navigation/structure), ViewLayout (content interface), AdminLayout (admin interface).
✅ **Providers** - AuthProvider (NextAuth.js), TagProvider (tag data/operations), CardProvider (card data/filtering/pagination).
✅ **Route Separation** - Reader and admin routes are distinct, preserving explicit editing context.

⭕2 **Split Validation** - Validate the current split model against author workflow friction in real use.
⭕2 **Edit on the Fly** - Add admin-only entry points from content surfaces (quick edits and/or deep-link to full editor).
📐 **Initial Architecture** - Initial architecture decision: separate content consumption from administration to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
📐 **Future Architecture** - Current direction: keep separation, but add admin-only on-the-fly editing affordances from content pages for faster author workflow.
🔵 **Accessibility** - Elderly family members are a known audience. Body text minimum 16px (prefer 18px for narrative); WCAG AA contrast ratios (4.5:1) in light/dark modes; 44x44px minimum tap targets on mobile; wire media `caption` into `alt` attributes on `JournalImage`; keyboard navigation for all interactive elements; respect `prefers-reduced-motion` for animations. Run Lighthouse accessibility audit as baseline.

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
- **Interesting Intro** - Present an intriguing introduction to the app with login.

*Principles*
- **Simple** - Simple login page with app title and a few graphics.

*Features*
✅ **Login Page** - Application opens to home page with login form and SVG logo.
✅ **Home Layout**  - Login splash with logo; no nav bar. Redirects to /view after login.

### **Top Navigation**

*Intent*
- **App Badge** - Small app badge
- **Settings** - Access to settings
- **Back Button** - Place for Back button

*Principles*
- **Simple** - Clear, not distracting
- **Minimal** - Space saving

*Features*
✅ **Header** - Centered logo, contextual Back button, hamburger menu (content/admin/theme/signout).
✅ **Logo** - Same title artwork as home; compact height in header (`Navigation.module.css`).
✅ **Hamburger** - Dropdown menu with content links (all users), admin links (admin only), and theme toggle.
✅ **Redesign (shipped)** - Centered logo, contextual Back in header; duplicate in-page Back removed from card detail (`CardDetailPage.tsx` — use header only).

### **Left Navigation**

*Intent*
- **Comprehensive** - Comprehensive content filtering

*Principles*
- **Slideout** - Available as needed, hideable
- **Compact** - Fits a lot of data readibly.

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
✅ **Curated Completeness** - Curated sidebar lists collection parents via Firestore query on denormalized `curatedNavEligible` (maintained in `cardService` on create/update/delete), not a 500-recent scan. Composite indexes in `firestore.indexes.json`; one-time `npm run backfill:curated-nav-eligible` for legacy docs.
⭕2 **Collection Metadata** - Implement collection metadata (child counts).
⭕2 **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
⭕3 **Mobile Filter UX** - Tune type/tag filter UX on mobile. Layout reference: `--header-height` 60px; mobile filter drawer `--sidebar-width-mobile` 250px (`theme.css`).

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
✅ **Content Types** - Stories: Navigate. Galleries: Inline (≤5 images) or Navigate (>5). Questions: **Static** (question + excerpt on tile), **Inline** (question + optional cover + full TipTap answer on tile), or **Navigate** (teaser tile → `/view/[id]`). Quotes: typically inline/static. Callouts: typically **inline** or **static** (see Callout card); **Navigate** shows body on the tile but does not link (same as other non-story types). Collections: any card with children.

⭕2 **Coherence** - Multi-tag filter results need predictable grouping/sort, not unordered shuffle. Overlaps with Left Navigation ⭕2 Sort/Group; consolidate when that work begins.
⭕2 **Card Cues** - Show small type badge on compact cards (`Story`, `Q&A`, `Gallery`, `Callout`, `Quote`).

### **Content Page**

*Intent*
- **Immersive** - Immersive content consumption experience.
- **Engaging** - Presenting an engaging interface and fluidly scroll through the stories--up and down, left and right.

*Principles*
- **Dual-Path** - FreeForm or Curated

*Features*
✅ **Default** - After login, app defaults to content page `CardFeedV2.tsx` with `V2ContentCard.tsx` (main `/view` grid). `ContentCard.tsx` remains for `CardGrid` / tag-browser style layouts.
✅ **Grid View** - Responsive grid-based layout
✅ **Card Types** - 5 card types:
✅ 1. `Story Card` - Story with related images--cover, inline, and/or gallery.Title - Bottom overlay
        📐 Keep current titling pattern (placement/overlay behavior) as implemented through v1.
        📐 **v1 — Story excerpt** - Do not render excerpt on story cards in the feed or on the opened detail view (auto-generated excerpts usually duplicate the opening of the body). Field remains for Typesense, admin list, and future layouts.
✅ 2. `Gallery Card` - Images with limited text (captions)
        - Title - Top, Excerpt, Inline expansion
        - ✅ **Feed:** horizontal Swiper on the grid — **cover is first slide** when set; gallery slots with the same `mediaId` as the cover are **deduped** (`V2ContentCard`). Swipe/drag between slides.
✅ 3. `Question Card` - Questions as if from family (`V2ContentCard` + `CardDetailPage`).
        - **Navigate:** *Title* = question; *excerpt* = feed teaser when set (full answer only on detail). **No cover:** large centered `?` watermark + centered text. **With cover:** full-bleed hero + bottom gradient (story-like). **Detail:** kicker “Question”, title, section “Answer” + TipTap body.
        - **Inline:** not a link. Optional cover + overlay; **TipTap answer** on tile. No cover: watermark + left-aligned stack for long body.
        - **Static:** not a link. Question + **excerpt** only (no body on tile).
        - Short questions may still be embedded in other narrative content where appropriate (optional pattern; not limited to this type).
        ⭕2 - Get questions from Word doc, card games on Amazon
✅ 4. `Quote Card` - Favorite quotes (`V2ContentCard` + `CardDetailPage` + `formatQuoteAttribution` in `cardUtils.ts`).
        - **Model:** **Title** = short label (topic, source, or hook)—**not** the full quotation. **Content** (TipTap) = quote text. **Attribution** = **`subtitle` preferred**, else **`excerpt`**; rendered right-aligned with an em dash (`—`) prepended when the string does not already start with a dash character.
        - **Feed:** Large **opening** `\201C` watermark centered on the tile (CSS grid); shifted down ~⅓ in from vertical center for optical balance; `--text1-color` ~22% opacity; may sit behind title/body. Flat `layout-background1-color` (not `background2`); light hover (no heavy shadow). TipTap `surface="transparent"`. Title + blockquote + `<cite>`.
        - **Detail:** Title in header; **subtitle omitted under title** (reserved for attribution). Body in `<blockquote>`; attribution in `<footer><cite>` below.
        ⭕2 - Get quotes from Dad book, Notion quotes, Grandfather book  
✅ 5. `Callout Card` - Summary / emphasis on a topic (`V2ContentCard` + `CardDetailPage`).
        - **Feed:** **Pushpin** raster watermark (`public/images/pushpin.svg`) as a full-card overlay in `V2ContentCard` (`calloutPinOverlay` / `calloutPinWatermark`): centered on the tile, mirrored (`scaleX(-1)`), tilted **−30°**, raised ~¼ in from center, sized with a fluid `clamp` (~25% larger than the first shipped size). Same opacity tier as the `?` watermark (**0.3**). Theme token **`--card-watermark-raster-filter`** in `theme.css`: `none` in light mode, **`invert(1)`** in dark mode so the pin reads on dark tiles. Flat `layout-background1-color`; light hover. **TipTap** `surface="transparent"`. **Title**, **excerpt**, body for **inline** / **navigate**; **static** = title + excerpt when no body on tile.
        - **Detail:** Same shell as other types (title, optional subtitle, TipTap)—no separate callout chrome.
✅ **Display Modes** - 3 display modes/styles
    1. Static - Display only (Quote, Callout; Question when the answer is short)
    2. Inline - Swipes left/right (Gallery <5 images)
    3. Navigate - Dedicated card view (Story, Gallery, **Question**). On mobile, prefer horizontal swipe to open full content while the feed scrolls vertically (fewer open/close taps).
📐 **Horizontal Open** - Prefer horizontal card-open behavior on mobile for long-form cards to reduce open/close friction.
⭕3 **Bundle / images:** Route-level **code splitting** for heavy admin/editor paths; pass on `next/image` loading/priority for feed performance.
📘 `src/components/view/CardFeedV2.tsx`
📘 `src/components/view/V2ContentCard.tsx`
📘 `src/components/view/ContentCard.tsx` (CardGrid / legacy tag tiles)
✅ **Main feed / gallery**
✅ **Header:** menu (left), title (center), **search** (right).
✅ **Search row** directly under header. Mockup placeholder copy may suggest multimodal search—**aspirational**; near-term search stays what the product can index (e.g. title, tags, captions).
✅ **Horizontal type chips** (e.g. all media vs “film” / strips): maps to **card-type** (and later **video**) filtering; complements dense mobile UX without replacing the tag sidebar/drawer.
⭕2 **Gallery slider polish** — Optional feed pagination (e.g. 1/n dots), visible prev/next on desktop; horizontal “child card” rails (aggregated strips) — aligns with ⭕3 **Feed Types**.
⭕2 **Question Content** - Get questions from Word doc, card games on Amazon.
⭕2 **Quote Content** - Get quotes from Dad book, Notion quotes, Grandfather book.
✅ **In-content card links (@)** - TipTap `CardMention` + `CardMentionList`; type `@` in rich text to search cards (`/api/cards`); stored as `span[data-type="cardMention"][data-card-id]`; `TipTapRenderer` navigates to `/view/[id]` on click or keyboard when focused.
⭕3 **Bundle / Images** - Route-level code splitting for heavy admin/editor paths; tune `next/image` loading/priority for feed performance.
🔵 **Feed Types** - Devise different feed layouts: pane with teaser, related stories horizontal scroll, galleries horizontal scroll, small thumbnails horizontal scroll.
🔵 **Display Strategy** - **v1:** One presentation per card type in reader surfaces; for stories, the single style is as implemented today (e.g. title overlay on cover in feed) with **no excerpt** in feed or detail. **Post-v1:** Varied, selectable feed and view layouts per type and context (optional excerpt stacks, subtitle ordering, tags/kicker/overlay, gallery/story stacks like “YouTube-style” teasers). Component architecture should allow new variants without rewriting the feed/view core.

### **View Page** 

*Intent*
- **Seamless** - Seamless opening of cards to content.

*Principles*
- **Mobile** - Mobile-like behavior as possible.

*Features*
✅ **Open Card** - Clicking a navigate card opens `CardDetailPage.tsx` via server-side fetch (`getCardById`, `getCardsByIds` for children). Conditionally renders card components.
✅ **Conditional Render** - Render page components based on card data presence.
✅ **Q&A, Quote & Callout detail** - Question: kicker “Question”, “Answer” + TipTap. Quote: title; blockquote body; attribution footer from `subtitle`/`excerpt` via `formatQuoteAttribution`. Callout: standard title / subtitle / TipTap (no extra chrome).
⭕3 **Feed hydration tiers:** Optional **cover-only** first paint on `/view` (defer full gallery/content hydration until card open or below fold) to reduce payload and server work vs today’s full hydration for feed cards.
✅ **Title** - Render first.
✅ **Subtitle** - If present, render next.
✅ **Cover Image** - If present, render next.
✅ **Content** - If present, render using TipTapRenderer.
✅ **Gallery** - If present, render `mosaic` on view page (decision). (Feed/cards: horizontal swipe; see Content Page.)
✅ **Children** - If present, render.
✅ **Related** - Display 3 random from filter. Reduced font.
✅ **Explore More** - Display 3 random outside filter. Reduced font.

✅ **Progressive children (discover + child hydration)** - **Discover More:** structural **Related Content** renders from server props immediately; **Similar Topics** / 
**Explore More** load client-side after mount with per-group loaders (`DiscoverySection.tsx`). **`/view/[id]`:** child cards load via `getCardsByIds(..., { hydrationMode: 'cover-only' })` with first-gallery image when no cover—fewer Firestore reads than full hydration. The view page RSC still awaits parent + children in one round-trip; streaming parent-only first remains optional (⭕3 / future).
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

---

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
🔵 **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).

✅ **Grid View** - Click to edit, pagination (`/app/admin/card-admin/`).
✅ **Table View** - Pagination, load more.
✅ **Search by Title** - Filter by status and type via `CardProvider` `selectedFilterTagIds`. Bulk operations via `BulkEditTagsModal.tsx`.

✅ **Dimension tags in admin list** - Card table view shows core tags by Who/What/When/Where columns (`CardAdminList`, `getCoreTagsByDimension`); at-a-glance assignment without a separate overlay backlog.
✅ **Add Button** - `AdminFAB.tsx`. New (`/admin/card-admin/new`), Edit (`CardAdminClientPage.tsx`). `CardForm.tsx` wrapped in `CardFormProvider`.
✅ **Title, Subtitle, Excerpt** - All default empty.
✅ **Type** - `story`, `gallery`, `qa`, `quote`, `callout`, `collection`.
✅ **Status** - `draft`, `published`.
✅ **Display Mode** - `static`, `inline`, `navigate`.
✅ **Cover Image** - `CoverPhotoContainer` + `PhotoPicker`. Paste/drag supported. Stores references, adjusts/stores `objectPosition`. No caption.
✅ **Content** - Rich text editing via TipTap. Inline embedded images stored as `docId` array. Captions default to media object with override in card `figure`. **@ card links** in body: `CardMention` (see Content Page).
✅ **Tags** - `MacroTagSelector` modal. `Card.tags` stores user-assigned tags. On save, `cardService` derives `filterTags` from card-assigned tags and tag-tree ancestors (not from image tags).
✅ **Gallery** - `GalleryManager` + `PhotoPicker`, drag-and-drop order. `galleryMedia[]` stores `mediaId`, `order`, optional per-slot `caption`/`objectPosition`.
✅ **Excerpt** - Default empty.Auto-generate toggle on card form. When on, excerpt is computed from content (150 chars, word boundary). Manual override via toggle off. `excerptAuto` field on card schema; server recomputes on save when content changes.
✅ **Import Folder as Card** – `ImportFolderModal`, folder tree picker, **`__X`-marked files only**, in-memory WebP optimize + upload (no xNormalized on disk), duplicate detection (overwrite/cancel). Mass-import / digiKam prep: **Authoring pipeline — digiKam → mass import** (under Strategic Direction).
✅ **Caption and Focal** - Inherit from media by default; optional per-slot override in the gallery edit modal.
✅ **Children** - `childrenIds` attaches ordered child cards. Deep nesting allowed; cycles and self-parent blocked in `cardService`; single-parent constraint enforced on move.
✅ **Children Picker (edit UI)** - Card edit view: reorder/remove children and open child edit links; attach/reparent in Collections admin (`ChildCardManager` → link to `/admin/collections`). Structural assembly stays in TOC/collections work.
🔵 **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question→card linkage. Deferred until after import.
✅ **Actions** - Delete (remove tags/recalc, remove from parents, remove related media), Cancel (abandon edits, return to list), Save (save tags/recalc, add media).
✅ **Dirty State Tracking** - `persistableSnapshotsEqual` on `dehydrateCardForSave` output vs `lastSavedState`; RichTextEditor registers a content getter for TipTap buffer parity; `confirmLeaveIfDirty` on Back / Delete / Duplicate; `beforeunload` when dirty. Header actions in `CardEditPageChrome` (inside `CardFormProvider`).
✅ **Content Versioning (Phase 1)** - "Duplicate Card" action implemented. Creates a draft copy of any card (content, tags, media refs, gallery) via `POST /api/cards/[id]/duplicate`. Button on card edit page header. Next phase: pre-save snapshot to `card_versions` subcollection before mass content authoring.
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
📐 **Structural Model** - Listing eligibility matches `childrenIds.length > 0 OR curatedRoot === true`, stored as `curatedNavEligible` for querying. Sidebar `getCollectionCards` filters `curatedNavEligible == true` (and optional `status`), ordered by `createdAt`.
✅ **Curated Tree** - drag-and-drop—attach/detach children, promote to tree root (`curatedRoot`). Single-parent model; cycles blocked in `cardService`. Admin tree loads up to **1000** cards for the page.
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
  🔵 **Append to Gallery** - Bulk add selected banked media to another **existing** card's gallery from Media admin (parked). **Today** images still reach cards after import via **Create card from selection** (draft gallery + edit), **PhotoPicker** / gallery in card edit, **inline images** in rich text, and **replace-in-place** on media rows—no need to block on this bulk-append flow.

📐 **Assignment Model** - References only; hydrated from media at read time. No embeds.
  - **Cover** → `coverImageId`, `coverImageFocalPoint` (single image)
  - **Gallery** → `galleryMedia[]` — `{ mediaId, caption, order, objectPosition }`
  - **Inline (rich text)** → `contentMedia[]` — IDs extracted from HTML (`data-media-id`)

✅ **Media Data Model**
    - Collection - `media`. One doc per image
    - Schema  - `src/lib/types/photo.ts`
      🔵 Rename `src/lib/types/photo.ts` '...media.ts' throughout
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
⭕1 **No temporary/active.** Remove this status. No longer required. All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.

  **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).
  **Firebase Console → Storage → Rules** - (required for public URLs)
    Adjust `allow write` if you use different auth requirements. No `storage.rules` file in this repo—rules are managed in the Console.
✅ **OnDelete** - Removes card references before deleting media.

✅**Normalization**
  Organize, normalize, edit images pre-import
    - All versions of images in 1 directory 
    - Edit (GIMP - Crop, clean, Topaz - sharpen) as needed 
    - Rename final appending "__X"
    - Import files ending in "__X"
      - normalize to Firebase--sharpen, lighting, convert to webP
      - extract metadata to Firebase
  
✅ **Media Workflow** - [Source]→[Import]→[Firebase Storage+Firestore]→[API Hydration]→[Client Display]

✅ **Import Entry Points**
  - `imageImportService.ts` — central import (PhotoPicker, paste/drop, local drive)
  - Creates Media doc in Firestore, uploads to Firebase Storage
  - Folder Import - `importFolderAsCard()` — filter `*__X.*`, `importFromLocalDrive(..., { normalizeInMemory: true })`, build gallery + cover

✅ **Display**
  - `JournalImage` — next/image with unoptimized (avoids 403 from Firebase)
  - `getDisplayUrl(photo)` — storageUrl → url → transparent pixel fallback
  - **Cover aspect ratios:** Edit/view 4:3; feed thumbnail 1:1
  - **Focal point:** Pixel coords {x, y}; converted to object-position per aspect ratio

✅ **Pre-Import Scripts** (Local Filesystem)
  - `create-photo-folders.bat` — xNormalized, yEdited, zOriginals
  - `normalize-images.bat` / `npm run normalize:images` — optimize, extract metadata to JSON, convert to WebP. Optional: `--card-export-only` (after destination arg) to process only `__X`-marked filenames.
  - `extract-metadata-improved.bat` — metadata only
  - See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`

  ✅ **Media-Card Reconciliation**
  **Add / change / delete** for card–media edges is maintained by production paths (**Cross-entity sync** table in Media Management). When investigating **exceptional** drift (legacy data, manual DB edits): **CLI** — `npm run reconcile:media-cards -- --diagnose` (optional `--fix`, `--fix --dry-run`, `--card "Title"`); source `src/lib/scripts/firebase/reconcile-media-cards.ts`. **HTTP** (admin session) — `POST /api/admin/maintenance/reconcile` with JSON `action`: `diagnose` | `fix`, optional `dryRun`, `cardTitleFilter`, `checkStorage`. **Index** — `docs/NPM-SCRIPTS.md`.
  ⭕2 - **Import pipeline job:** **Async queue/worker** for large folder import (normalize + writes) complementing `IMPORT_FOLDER_MAX_IMAGES` and serverless timeouts.
  ⭕2 - **Import metadata precedence:** Prefer **embedded XMP/IPTC** read **at import** for captions/keywords; use **JSON sidecars** as optional/supplementary when files are authoritative on disk.

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

✅ **Tag Administration** - `/app/admin/tag-admin/page.tsx`.
✅ **Hierarchical View** - Page renders all tags in a 4-column tree structure using `TagAdminList`
✅ **Drag-and-Drop** -  Reordering/Reparenting - `SortableTag.tsx`
✅ **Inline Editing** - `TagAdminRow.tsx`
✅ **OnDelete** - User choice of children being promoted or cascade deleted
✅ **OnMove** - Updates parent and order and recalcs tag card counts
✅ **Real-time** Edit tag and bulk tag modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). 
✅ **Tag Typeahead Search** - Search input added to tag assignment modals (MacroTagSelector expanded view and BulkEditTagsModal). Filters all dimension columns as typed using `filterTreesBySearch`. Matching branches auto-expand. Works in card edit, gallery edit, bulk media, and bulk card tag flows.
✅ **Card Tags vs Media Tags** - Same mechanism. Assign tags to a card and assign tags to a media document using the same flow and data shape as cards (shared tag-assignment modal, e.g. `MacroTagSelector` pattern). Use the same dimensional/hierarchical tag library; no special-case fields in the product model unless legacy migration requires it temporarily.
✅ **v1 Authoring** Building and curating content cards must support **tag/query-based discovery of both cards and media** in admin (not one surface only)—pick gallery images, body embeds, and **related or child cards** from **filtered** sets, not only flat lists.
✅ **Human Authoring** You may still choose a **story-level** tag set on the card (what the post is about) and **frame-level** tags on images (who/what/when/where for that photo)—but nothing syncs unless you tag it yourself.
✅ **Bulk** Bulk tagging in Media admin is a high priority (multi-select + apply tags)—more day-to-day value than bulk on cards.
⭕3 **Single TagProvider:** Remove nested `TagProvider` under admin so one tag tree fetch serves GlobalSidebar + admin (avoid duplicate `/api/tags` work).
⭕3 **Tag Tree Counts (model/UI)** - Add `mediaCount` on tag docs + UI `(x/y)` (cards vs media); align maintenance with recalc/jobs so counts stay trustworthy alongside incremental `cardCount` fixes.
⭕3 **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are “unique per subtree.”
🔵 **Unified tag edges (conceptual):** Treat assignments as **(subjectType, subjectId, tagId)** even if denormalized on `Card` / `Media` for reads—eases counts, digiKam mapping, migrations. (??)
🔵 **Face Recognition** - Options:
    - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
    - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
    - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.
🔵 **Relationship Tagging** - Derive family relationships from minimal primitives (`parent_of`, `spouse_of`); compute uncle, cousin, step-parent, etc. via inference rules. Maps to WHO dimension. Large surface (graph storage, validation, remarriage/step edges). Park until parallel media tagging and bulk Media-admin UX are in place. Detail regenerable.

---

### **Question Management**

*Intent*
- **Journal-like** - Grandfather/Father journal-like questions

*Principles*
- **Prompts** - Use questions as prompts for stories.
- **Flexible** - Accommodate short and long answers.

*Features*
✅ **Data Model** - Firestore `questions` collection. Schema: `src/lib/types/question.ts`. Service: `questionService.ts`.
✅ **UI** - `/admin/question-admin`.
✅ **APIs** - Admin-only CRUD (`/api/admin/questions`, `/api/admin/questions/[id]`), link/unlink card, create-card from prompt.
✅ **Filter** - List/filter in UI: text, tags (substring), used vs unused.
✅ **Create Card** - Create card from question prompt (default type `qa` or `story`). Adds card ID to `usedByCardIds` and updates `usageCount`.
✅ **Link/Unlink** - Manual link/unlink between question and existing card IDs. A question may map to zero, one, or many cards.
⭕2 **Pre-Tag Questions** - Pre-tag questions for use on card. WHO/Father, WHAT/Reflections, Childhood, etc.
⭕2 **Assigned** - Mark questions "Assigned/Unassigned" (only doable if assigned to card, not if inline) `usedByCardIds.length > 0`.
🔵 **Answer Workflow** - Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping.
🔵 **Auto-Clustering** - Auto-clustering/grouping of short questions.

### **User Management**

*Intent*
- **Access Control** - Control access to the app.

*Principles*
- **Credential-based** - Password entry via NextAuth Credentials provider.
- **Manual onboarding** - Send link with username and password to new users.

*Features*
✅ **Data Model** - Firestore `journal_users` collection. Schema: `src/lib/auth/journalUsersFirestore.ts`.
✅ **Authentication** - `authorize` in `authOptions.ts` (DB first, legacy env fallback when no row for that username). Bcrypt passwords.
✅ **Admin View** - Users tab at `/admin/journal-users`. APIs: `/api/admin/journal-users`, `/api/admin/journal-users/[id]`.
✅ **Roles** - Viewers only from UI/API; single admin rule. Seed script: `npm run seed:journal-users`.
✅ **Login Redirect** - `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense`).
⭕2 **Credential Delivery** - Send username and password to new users?
🔵 **Rename Collection** - Rename all uses of `journal_users` to `users`.
---

### **Theme Management**

*Intent*
- **Custom Themes** - Allow customizable light and dark modes

*Principles*
- **User-Controllable** - Provide detailed control.

*Features*
✅ **Light/Dark Toggle** - Theme toggle in top navigation.
✅ **Admin Page** - Theme admin for color and font parameters.
⭕2 **CSS Tokenization** - Ensure all CSS in app is tokenized via `theme.css` variables.

---

### **Gallery Management**

*Intent*
- **Custom Styles** -  Allow customizable gallery styles

*Principles*
- **Tokenizable** - Provide tokenizable styles for gallery layouts

*Features*
🔵 **Gallery Styles** - Devise preconfigured card styles for selection — masonry, mosaic, etc.

---

## **IMPLEMENTATION**

*App Status*
- **Architecture** - Core architecture (cards, media, tags) in place.
- **v1 Refinements** - Lock and solidify v1.
- **Content** - Prepare content for import.

---

## Execution Plan

*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. **Completed** Phase 1 and Phase 2 items are recorded in the feature sections above; they are not listed again below.*

**Open questions to resolve before starting:**
*(None blocking curated sidebar listing; legacy data needs index deploy + backfill once per environment.)*

### Phase 1 — Pre-Import
*Complete*

### Phase 2 — Admin Productivity
*Complete*

### Phase 3 — Reader experience
*Complete*

*Content & reader*
- ⭕2 **View Mosaic** — View Page. Gallery mosaic for readers.
- ⭕2 **Quote Content** — Content Page. Source material into quotes.
- ❓ **Related Count** — View Page. Size/count of Related / Explore More.

*Tags & navigation*
- ⭕2 **Sort / Group** — Left Nav. Coherent multi-filter ordering.
- ⭕2 **Coherence** — Content. Grouping/sort with Sort/Group.

*Theme & media (hosting enablers)*
- ⭕2 **CSS Tokenization** — Theme. Full token coverage for reader polish.
- ⭕2 **Browser Upload** — Media. Hosted deployment without server folder read.

### Phase 4 — Scale & polish
*After hosting; does not block v1. Grouped by function.*

*Tags & navigation*
- ⭕2 **Tag Tree Counts** — Left Nav. Correct counts + `(x/y)` media.
- ⭕2 **Collection Metadata** — Left Nav. Child counts.
- ⭕2 **Chron Tree** — Left Nav. Year / Month / What browsing.

*Content & reader*
- ⭕2 **Card Cues** — Content. Type badge on compact cards.

*Administration & authoring*
- ⭕2 **Card Edit Mosaic** — Card Mgmt. Mosaic in edit.
- ⭕2 **Edit on the Fly** — Application. Admin entry points from content.
- ⭕2 **Split Validation** — Application. Validate split vs author friction.
- ⭕2 **TOC & Ordering** — Collections. DnD TOC; reparent + order.

*Technical & platform*
- ⭕2 **Script Cleanup** — Scripts. Prune obsolete scripts.
- ⭕2 **Unused Dependencies** — Frontend. Package audit per body list.
- ⭕2 **Operational** — Backup. Verify end-to-end.
- ⭕2 **Directory** — Technical. Repo cleanup.
- ⭕ **Code / ESLint / QA** — Technical. Comments, lint, QA pass.

*Questions & media hygiene*
- ⭕2 **Assigned** — Questions. Assigned/Unassigned when linked to cards.
- ⭕2 **Question Content** — Content Page. Word doc / prompts into app.
- ⭕2 **Post-Import Maintenance** — Media. GIMP/Topaz + replace-in-place.
- ⭕1 **No temporary/active.** — Media. Remove status; assignment-based filtering only.

*Users*
- ⭕1 **Rename Collection** — Users. `journal_users` → `users`.

### Phase 5 — Future
*⭕3 and 🔵. Revisit after real family use. Grouped by function.*

*Tags & navigation*
- ⭕3 **Mobile Filter UX** — Left Nav. Mobile filter/drawer polish.
- ⭕3 **Single TagProvider** — Tags. One tree fetch for sidebar + admin.
- ⭕3 **Tag Tree Counts (model/UI)** — Tags. `mediaCount` + trustworthy recalc.
- ⭕3 **Tag Recomp** — Tags. Queued hierarchical recompute.
- ⭕3 **Unified tag edges (conceptual)** — Tags. `(subjectType, subjectId, tagId)` model.

*Content & reader*
- ⭕3 **Bundle / Images** — Content Page. Code splitting; `next/image` tuning.
- ⭕3 **Feed Types** — Content Page. Alternate feed layouts.
- ⭕3 **Feed hydration tiers** — View Page. Cover-only first paint option.

*Administration*
- ⭕3 **Admin SWR Deduping** — Administration. Bounded deduping for admin fetches.

*Media & imports*
- ⭕3 **Rename photo.ts** — Media. `photo.ts` → `media.ts` sweep.
- ⭕3 **Import pipeline job** — Media. Async worker for large imports.
- ⭕3 **Import metadata precedence** — Media. XMP/IPTC first; sidecars optional.

*Parked (🔵)*
- 🔵 **Gallery Styles** — Gallery. Masonry, mosaic, etc.
- 🔵 **Answer Workflow** — Questions. Analytics, templates, beyond cards.
- 🔵 **Auto-Clustering** — Questions. Short-question grouping.
- 🔵 **Google Photos Adapter** — Media.
- 🔵 **OneDrive Adapter** — Media.
- 🔵 **Apple iCloud** — Media. Lowest priority.
- 🔵 **Face Recognition** — Tags. Cloud, client, or native paths.
- 🔵 **Multi-Author** — Strategic. Parked.
- 🔵 **Relationship Tagging** — Tags. Parked.
- 🔵 **Video** — Media. Parked.
- 🔵 **Performance** — Backend. Post-v1 engineering review items.
- 🔵 **Tenant ID** — Backend. Multi-tenant SaaS scope only if needed.
- 🔵 **Storage Abstraction** — Backend. Unified storage module.
- 🔵 **Maintenance Management** — Administration. In-app maintenance UI.
- 🔵 **Social Features** — View Page. Like, comment, share — parked.
- 🔵 **Append to Gallery** — Media. Bulk append to an existing card's gallery (parked); create-from-selection + card edit + replace cover today.
- 🔵 **Accessibility** — Application. 16px/18px, WCAG AA, tap targets, caption→alt, keyboard, reduced motion, Lighthouse.