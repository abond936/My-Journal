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
- `**📐` vs `⭕`:** `📐` records **design stance, data shapes, and operational truth** (including known gaps between intent and enforcement). It is **not** the execution backlog. When a gap should be fixed in code, add an explicit `**⭕1` / `⭕2`** bullet—do not rely on `📐` alone to imply scheduled work.
- `**✅` wording:** Describe **what is implemented and wired today**. Avoid implying stronger guarantees than the code provides (e.g. treating a denormalized field as a proven invariant).

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
- **Few Primitives** - The product centers on a small set of primitives—cards, media, tags, and relationships—and should prefer tighter presentation of those primitives over multiplying surface types.

*Features*
✅ **Complete**

- **Structure** - App is separated into content and administration surfaces with shared providers/navigation patterns.
- **Layouts** - AppShell (navigation/structure), ViewLayout (content interface), AdminLayout (admin interface).
- **Providers** - Root app providers: AuthProvider, ThemeProvider, TagProvider, CardProvider. Admin layout adds MediaProvider.
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
- **Responsive contract** - Desktop vs narrow layout, breakpoints, sidebar toggle behavior, and main feed column rules are defined in `docs/04-Theme-Design-Contract.md` §9; implementation must match that section (literal `px` in `@media`, not `var(--breakpoint-*)` for layout breakpoints).

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
❓ **Open**
- **Left Upper Image** - The change in the logo and top nav lost the upper left image.

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

- **Hierarchical Tag Tree** - Tag tree for filtering content by **Cards** toggles and active dimension (per-dimension tree in **Freeform**).
- **Mobile** - Left sidebar uses a **drawer** (overlay + backdrop) at `max-width: 768px`; **sidebar toggle (←/→) remains visible at all widths** so filters are always reachable; no bottom navigation bar. Narrow Explore panel uses slightly tighter padding and scroll containment. Details: `docs/04-Theme-Design-Contract.md` §9.
- **Cards** - Five **toggle chips** (Story, Gallery, Q&A, Quote, Callout); all five active = no type filter. Subsets map to `types` on `GET /api/cards` (and discovery `/api/cards/random`). Admin card list applies the same inclusion set client-side.
- **Tag Dimension (Freeform)** - **Who | What | When | Where** only (no **All** tab); dimension switcher uses **icons** (torso, square, calendar, pin). Default dimension **Who** (stored `all` migrates to **Who**).
- **Tag Dimension (Curated)** - **All | Who | What | When | Where** for collection grouping (text labels).
- **Persistence** - Remembers selections across page refreshes (dimension, browse mode, tag library tab); **Cards** chip set resets to all five on full refresh unless extended later.
- **Mode** - **Curated | Freeform** (Curated on the left in the mode control).
- **Selected Tags** - Shows selected tags as chips.
- **Search Tags** - In-field prompt `Search tags…` filters the visible tree while preserving selected chips.
- **Sort by** - Random | When (Desc/Asc) | Created (Desc/Asc) | Title (A-Z/Z-A) | Who (A-Z/Z-A) | What (A-Z/Z-A) | Where (A-Z/Z-A).
- **Group by** - None | When | Who | What | Where. Grouped sections render in the feed when enabled; collection-list mode does not group.
- **Mode quick toggle** - Curated/Freeform mode buttons are implemented directly in the sidebar control surface.
- **Tag tree target size** - Expand control and row layout use larger tap targets and aligned checkbox column (base + desktop refinements in `TagTree.module.css`).
- **Sidebar roles** - On `/view` in **Freeform** mode, **admins** see **Filter** vs **Tag library** in the left sidebar (`GlobalSidebar`): **Tag library** is `ViewTagLibrarySidebarPane` (`**useTagManagement` + `TagAdminList`**, same stack as `/admin/tag-admin`); **viewers** use filter-first `**TagTree`** only. Drawer/toggle contract per `docs/04-Theme-Design-Contract.md` §9. Canonical product detail: **Tag Management** → **Sidebar integration model** (✅).
- **Freeform compact sidebar** - Freeform sidebar now uses compact horizontal card-type icon controls, tighter label/field spacing, denser tag-tree rows, and a smaller leading slot for expand/collapse affordances so filtering remains usable at narrower desktop widths as well as in the mobile drawer.
- **Curated sidebar model** - Curated no longer shares the Freeform filter controls. It now presents the actual Collections tree as a read-only navigable outline with expand/collapse arrows, while Freeform keeps `Clear filters`, card icons, tag-dimension icons, `Sort by`, `Group by`, and the tag tree.

⭕1 **Planned**

- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.
- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.
- **Mobile-first filter redesign** - Sidebar freeform filters move to icon-led chip controls: rename **Card type** to **Cards** and replace single select with five toggle chips/buttons (`story`, `gallery`, `qa`, `quote`, `callout`) where “all” means all five active; Tags remove the `All` dimension tab and use only `Who/What/When/Where`; remove legacy copy/controls for **Show children after tag-filtered parents** from reader sidebar UX; simplify search control copy/presentation (`Search tags...` in-field prompt), reduce sidebar visual density, and keep tag tree collapsed by default (especially mobile) with per-dimension expansion on demand.
⭕2 **Future**

- **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
- **Collection Metadata** - Implement collection metadata (child counts).
- **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.

❓ **Open**

- **Group by control** - Confirm whether reader sidebar should keep `Group by` as a primary control or move/remove it.
- **Created sort visibility** - Confirm whether `Created` sort options remain visible in reader sidebar or move behind an advanced mode.

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

- **Feed** - `CardFeedV2` → `V2ContentCard` (`src/components/view/`). Responsive grid on `/view` after login; **single column at `max-width: 768px`** per `docs/04-Theme-Design-Contract.md` §9.4.
- **Linking rule** - Feed tile links to `/view/[id]` only when `displayMode === 'navigate'` and `type` is `story`, `gallery`, or `qa`. Other types/modes render a non-link tile (`V2ContentCard.tsx` `isInteractive`).
- **Schema** - `type`: `story` | `gallery` | `qa` | `quote` | `callout`; `displayMode`: `static` | `inline` | `navigate` (`src/lib/types/card.ts`). Collection structure = `childrenIds` on any type, not a separate `type`.
- **Detail** - `CardDetailPage.tsx` and view components in `src/components/view/` (TipTap, gallery, discovery blocks).
- **Feed chrome** - Header, search row, type chips; `@` card mentions via `CardMention` / `TipTapRenderer`.
- **Suggestions (detail)** - Children from server; Similar / Explore via `/api/cards/random` (`count=3`, tag dimensions from current card). `DiscoverySection`: horizontal scroll rails, compact `V2ContentCard` (`small` + `fullWidth`).
- **Card Content** - Title, subtitle, excerpt, and main body (TipTap) roles set per card type and display mode; feed vs detail behavior matches the conventions in **Content Page** and **View Page** (assessment complete for v1).
- **Gallery UX (authoritative)** - **Inline** vs **navigate** behavior and **caption** options for gallery cards are specified in `docs/DESIGN.md` → **Gallery: `inline` vs `navigate` (authoritative)**; use that subsection plus the **V1 Matrix** below for implementation. External design tools are **guides**, not overrides.
- **Curated feed behavior** - Curated mode currently behaves like a TOC/outline flow: selecting a collection node shows the selected parent card first and then its direct children, while a sticky curated title bar keeps the current collection visible during scroll. Leaf nodes remain selectable and show themselves in the feed.
- **Feed edit/live update** - Feed edits now patch the visible card data in place through the feed state owner, so title, cover, and focal-point saves update immediately without reordering the current feed.
- **Cover focal alignment** - Feed-facing cover focal editing now previews against the same fixed closed-feed media frame used in the reader feed, so cover adjustments made in editing match feed-card framing more closely.

📐 **Product vs code** - v1 intent: omit story excerpt on feed/detail; `StoryCardContent` still renders `excerpt` when the field is set—clear data or add a guard when enforcing.
📐 **Horizontal open** - Prefer horizontal open for long-form on mobile where the reader implements it.

⭕1 **Planned**

- **Layout `@media` hardening** - Replace `var(--breakpoint-*)` inside `@media` where it affects layout (`V2ContentCard`, `Navigation`, `ViewLayout`, `ContentCard`, `ThemeAdmin`, `TagTree`, etc.) so breakpoints match `docs/04-Theme-Design-Contract.md` §9.2 (literal `px`).
- **Feed Presentation Matrix** - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.
- **Rail Variant** - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.
- **In-Feed Expansion** - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.
- **Orientation-aware Framing** - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.
- **Questions / Quotes** - Source material (Word, books, Notion).
- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).

📐 **V1 Matrix** - Initial presentation contract for `type` + `displayMode` behavior by context:


| Type    | Display mode | Feed (default grid)                                                               | Feed (rail variant)                                               | Open card (`/view/[id]`)                              | Excerpt behavior                                          | Cover framing                                                          |
| ------- | ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| story   | navigate     | Interactive tile opens detail; title visible; excerpt optional behind `Read more` | Optional curated horizontal sequence tile; opens detail           | Full narrative page with title/subtitle/cover/content | Truncate in feed; optional `Read more` expansion in-place | Orientation-aware ratio bucket per variant (landscape/portrait/square) |
| story   | inline       | Non-interactive tile with title + excerpt/content preview                         | Optional only when explicitly curated; non-interactive by default | N/A (not used as open behavior)                       | Allow `Read more` for long preview text                   | Orientation-aware ratio bucket per variant                             |
| gallery | navigate     | Interactive tile with cover-first media                                           | Primary rail candidate; horizontal sequence of gallery tiles      | Detail page with gallery and related blocks           | No excerpt requirement; title-first                       | Orientation-aware ratio bucket per variant                             |
| gallery | inline       | Non-interactive tile; inline gallery preview allowed                              | Optional curated rail for quick browse                            | N/A (not used as open behavior)                       | Not excerpt-driven                                        | Orientation-aware ratio bucket per variant                             |
| qa      | navigate     | Interactive question tile opens detail answer page                                | Optional themed rail (for grouped Q&A runs)                       | Question + answer detail structure                    | Teaser optional; no `Read more` requirement in v1         | Orientation-aware ratio bucket per variant when cover exists           |
| qa      | inline       | Non-interactive tile with question + answer preview                               | Optional curated rail                                             | N/A (not used as open behavior)                       | Preview-first; no `Read more` requirement in v1           | Orientation-aware ratio bucket per variant when cover exists           |
| quote   | static       | Non-interactive quote tile                                                        | Optional quote rail for themed runs                               | Render quote body + attribution when opened directly  | Not excerpt-driven                                        | No cover required; if cover exists, use orientation-aware ratio bucket |
| callout | static       | Non-interactive callout tile                                                      | Optional callout rail                                             | Render callout content when opened directly           | Not excerpt-driven                                        | No cover required; if cover exists, use orientation-aware ratio bucket |


📐 **Matrix Rules** - Keep the matrix as the source of truth for feed/detail behavior; new variants (for example `short`) must be added to this matrix before implementation.

⭕2 **Future**

- **Bundle / `next/image`** - Code-split heavy routes; tuning feed image priority.
- **Gallery slider polish** — Dots, desktop arrows, child rails (see **Feed Types**).
- **Feed Types** / **Display Strategy** - Alternate layouts post-v1.

❓ **Open**

- **Narrow curated feed card sizing** - In smaller viewport desktop/mobile-like states, feed cards can still overgrow after initial render in curated mode. The sticky curated title placement is corrected, but the responsive card-sizing regression is not fully resolved yet.

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
- **Progressive children (discover + child hydration)** - **Discover More:** structural **Related Content** renders from server props immediately; **Similar Topics** / **Explore More** load client-side after mount with per-group loaders (`DiscoverySection.tsx`). `**/view/[id]`:** child cards load via `getCardsByIds(..., { hydrationMode: 'cover-only' })` with first-gallery image when no cover—fewer Firestore reads than full hydration. The view page RSC still awaits parent + children in one round-trip; streaming parent-only first remains optional (🔵 / future).
- **Related Count** - Similar / Explore presentation tuned so rails stay visually light: compact tile width (`cardRailCell` clamp in `DiscoverySection.module.css`), secondary group title scale, `V2ContentCard` `small` on rails.
- **Detail discovery spacing** - **Explore More** / `DiscoverySection` on `/view/[id]` uses increased **margin above** the block, **padding below** the rails, and **larger article bottom padding** so the section is not tight to the story body or the scroll end (`DiscoverySection.module.css`, `CardDetail.module.css`). Further reader polish (typography, rails, kickers): `docs/DESIGN.md` → **Reader polish backlog (decisions, 2026)**.

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
- **Interaction economy** - Prefer one strong interaction model per job (tag, relate, edit) over parallel table/grid/modal variants when capability can be preserved.

*Features*
✅ **Complete**

- **Navigation** - Top hamburger navigation `Admin` button navigates to Administration (`src/app/admin/layout.tsx`).
- **Domains** - Cards, Media, Tags, Questions, Users, Themes, and **Collections** are active. **Studio** is shipped at `**/admin/studio`** (`StudioWorkspace` → `**CollectionsAdminClient` with `embedded**`): **Organize** (**Studio tag rail** + Collections tree), **Cards** (full card admin with collection-relationship actions), **Compose** (in-shell `CardForm`), and **Media** (full embedded `MediaAdminContent`). **Primary IA:** standalone `**/admin/collections`**, `**/admin/media-triage`**, `**/admin/card-admin`**, `**/admin/media-admin`**, and `**/admin/tag-admin`** are demoted from normal workflow (redirect to **Studio** or the reader modal / Studio path); admin top nav **Also** strip removed. **Studio inline tags (v1)** ✅—see **Administration** ✅ **Studio inline tags (v1 closeout 2026-04-23)**. Canonical contracts: `📐 **Studio unified shell contract`**, `📐 **Studio media & body (2026-04-22)**`.
- **Studio compactness pass** - Studio chrome is now denser and more workspace-oriented: tighter top admin controls, smaller pane toggles, restored pane titles, reduced filter block sprawl, and a stronger emphasis on keeping the underlying working surface visible while editing.
- **Studio card/media tile density** - Card and media tiles now carry their operational badges directly on the image (`type` / `status` on Cards; `source` / assignment status on Media), with parent metadata on Cards also moved onto the image edge. Tag chips are back to tight rectangular treatment rather than broader pills.
- **Unified Studio tag filters** - Cards and Media now share one tag-filter block per pane: quick selected-tag filtering plus `Edit tags...`, with optional per-dimension rule filtering (`Any`, `Has any`, `Is empty`, `Matches tag`) inside the same expanded area instead of a separate second filter system.
- **Card Management** - Core CRUD, card schema, edit flows, collection route.
- **Media Management** - Assigned/unassigned filtering, replace-in-place, card-reference-aware delete.
- **Collections Management** - Parent/unparent cards, reorder cards.
- **Tag Management** - Hierarchical admin, DnD/reparenting, inline edits.
- **Question Management** - Studio prompt-bank pane with CRUD, untagged cleanup, and Q&A card linkage workflow.
- **User Management** - Users model and admin user workflow.
- **Theme Management** - Set parameters for colors, fonts, etc.
- **Scripts** - `package.json` scripts for migrations, reconciliation, one-off repairs, and emergencies. See `01-Vision-Architecture.md` → **TECHNICAL** → **Scripts** and `docs/NPM-SCRIPTS.md`.
- **Off-repo backup (operator)** - **Code** = Git remote. **Data** = `npm run backup:database` → OneDrive (see `01` → **Backup** → **Database**). **Env / service-account files** = local `npm run backup-codebase` (repo-root `.env*`, `service-account.json`, `*-firebase-adminsdk-*.json` only) → default `C:\Users\alanb\CodeBase Backups\` or `CODEBASE_SECRETS_BACKUP_DIR`. Full reference: `docs/01-Vision-Architecture.md` → **Backup**; script index: `docs/NPM-SCRIPTS.md`.
- **Error contract rollout** - Domain-coded JSON errors (`ok: false`, `code`, `message`, `severity`, `retryable`) and structured client parsing on scoped admin and reader routes (media, cards/AI, tags, questions, users, theme, maintenance, import-preview); closeout 2026-04-20 per `docs/03-Implementation.md` evidence—residual opportunistic polish non-blocking.
- **Integrity gate (CI)** - Blocking integrity tests on PR/merge for card–media edges, `referencedByCardIds`, tag counts/derived fields; emulator-backed job non-blocking—definition of complete per `docs/03-Implementation.md` Phase 1.
- **Studio desktop shell (v1)** - `**/admin/studio`** (`StudioWorkspace`): embedded Collections Studio—multi-pane layout (**Organize** · Cards · Compose · Media), one session-scoped selection model (`cardId`, media multiselect), app sidebar closed by default, and per-pane collapse/restore with persisted widths per `📐 **Studio unified shell contract**`.
- **Studio curated tree integration** - Curated tree pane in embedded Studio with attach/detach/reorder using existing `updateCard` semantics, `fetchAdminCardSnapshot`, and optimistic rollback patterns (`📐 **Studio unified shell contract`** (2); technical baseline in `docs/03-Implementation.md` → `📐 **Studio program status**`).
- **Studio selected-context elimination (v1)** - Relationship-only column removed; Studio `**@dnd-kit`** cover, gallery, child, and **TipTap body** (`drop:body`) targets live on **in-shell Card Edit** with `**handleStudioRelationshipDragEnd`** / `**patchSelectedCard**` (body: `**insertImage**` + bank page resolve); outer `CollectionsAdminClient` `**DndContext**` coordinates with nested card-form DnD; `**CoverPhotoContainer**` paste/file-drop retained; media bank → card via embedded **Media admin** (`📐 **Studio media & body (2026-04-22)`**). Residual: keyboard/indicator polish per **DnD interaction contract**.
- **Studio cards pane tag filter (v1)** - **Cards** pane: search title, **card type**, **display mode**, status, sort, **Clear** (resets all including `MacroTagSelector`), plus a **single** `MacroTagSelector` for **on-card** dimensional tags only (OR within a dimension, AND across dimensions). The prior **on-card** vs **media-derived** per-dimension matrix was removed; use **full-page card admin** for **media-derived tag suggestions** and apply from gallery metadata until tagging is complete (`CardAdminList` suggestion rows).
- **Studio embedded media tag filter (v1)** - Media column: a **single** `MacroTagSelector` drives **who/what/when/where** on `**GET /api/media`** (with Typesense when configured). **No** merge of compose-card form tags in Studio; full-page or PhotoPicker use card-context + overlay as before.
- **Studio IA demotion** - **Shipped:** removed admin **Also** strip (**Collections**, **Triage**); removed standalone `**/admin/collections`** and `**/admin/media-triage**` pages (**redirect** to `**/admin/studio`**); retired standalone **Card**, **Media**, and **Tag** admin routes from normal workflow in favor of **Studio** (reader-side card edit now uses the reader modal / Studio path); deleted **Media Triage**–only UI; removed Card Management **Collections** full-page view (`CollectionsManagerPanel` deleted)—curated tree + attach workflows live in **Studio** (`📐 **Studio unified shell contract`** (6)).
- **Studio performance hardening (2026-04-24)** - Studio now prefers local post-mutation reconciliation over broad reloads where integrity allows: selected-card saves reuse returned card payloads instead of immediate re-fetch, routine Cards pane edits use local catalog overrides instead of a full 2500-card refresh, Media bulk tag / most delete flows stay local unless paging underflows, and card/media grids plus tree rows are memoized to reduce unnecessary rerender churn. Firestore remains truth; Typesense remains the search projection.
- **Studio inline tags (v1 closeout 2026-04-23)** - **Compose (in-shell `CardForm`):** tags via `**CardDimensionalTagCommandBar`** (`compact`) only—no `**MacroTagSelector**` expand in Studio shell. **Admin grids/tables:** `**DimensionalTagVerticalChips`** rail + `**CardDimensionalTagCommandBar**` `searchOnly` on card and media grid tiles; media **table** uses the dimensional bar per row—routine add/remove/search without a tile-level tag modal. **Full-page card edit** (`/admin/card-admin/.../edit`) intentionally keeps **Edit tags…** plus expandable `**MacroTagSelector`** for deep tag work. **Cards pane** bulk **Edit tags…** remains a modal for multi-card apply. Optional polish: **Media Management** ⭕1 **Grid tagging UX** (per-tile parity, table alignment) and keyboard/focus under **DnD interaction contract**.

⭕2 **Future**

- **Maintenance Management** - Admin UI over existing secured maintenance APIs (`POST /api/admin/maintenance/*`: reconcile, cleanup, backfill, diagnose-cover). A Maintenance tab existed previously and was removed; restore when in-app diagnose/fix outweighs CLI + manual HTTP. Today: `docs/NPM-SCRIPTS.md` and `npm run …` scripts.
- **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin — restore bounded deduping to cut duplicate `/api/cards` requests where safe.

📐 **Studio unified shell contract** - **(1)** **Tag rail (shipped):** Studio **Organize** column (`TagAdminStudioPane`) plus `/view` admin **Tag library** (`ViewTagLibrarySidebarPane`) deliver **full Tag Admin** on canonical `TagProvider` (add/delete/edit/reorder/reparent); legacy `**/admin/tag-admin`** now redirects to **Studio**. Tag reorder/reparent uses optimistic local cache updates so rows do not snap back while Firestore confirms; reparent still uses Shift-drag in the current UI. **(2)** **Card** area with Card Management–grade capabilities plus the **Collections** pane; top-level Studio collection entries are explicit **root cards** (`isCollectionRoot`) ordered by `collectionRootOrder`, not by a hidden Master Parent. Cards may be roots, children, or both; `childrenIds` remain the canonical relationship store. **(3)** **Media** area with Studio-grade lists, filters, and actions; legacy `**/admin/media-admin`** now redirects to **Studio**. **(4)** **In-focus editing** — live **Card Edit** for selected card in-shell is the **primary** surface for cover, gallery, children, metadata, and body media; the reader-side edit entry is the modal from `/view`, and legacy `**/admin/card-admin`** routes now redirect into **Studio**. **(5)** **Questions** pane lives in Studio for dimensional prompt browsing, **Untagged** cleanup, included/not-included tracking, and QA answer flow; Users and Themes remain outside Studio. **(6)** **Navigation hygiene** — redundant standalone admin routes are demoted; curated assembly, tagging, card work, media work, and question-driven QA authoring live in **Studio**. **(7)** **DnD** — use **one authoring drag framework** (`@dnd-kit`) with **bounded drag domains** instead of one free-form cross-pane drag space: **Tags** (tag reorder/reparent only), **Collections** (card tree/root operations), **Compose** (children/gallery reorder), **Media** (bank → cover/gallery/body). Shared drag-domain contracts, overlays, target states, and optimistic local commits are now the baseline for Studio.
📐 **Admin surface simplification** - Long-term admin direction is **grid-first** and **studio-first** where capability is preserved: reduce parallel views and duplicate edit surfaces, but keep tagging speed and card↔media relationship editing first-class.
📐 **Data integrity (write paths & drift)** — Server behavior must match `docs/01-Vision-Architecture.md` → **TECHNICAL** → **Backend** (*Card–media integrity*, *Delete graph*, *Durability boundary*). Touchpoints and ownership live in **Media Management** → **Cross-entity sync** (card create/update/delete, media delete/cleanup, Typesense, counts). **Operational reality until code is fully aligned:** drift and orphan checks use `**npm run reconcile:media-cards`** and related scripts cataloged in `**docs/NPM-SCRIPTS.md**`.
📐 **Errors & operator messaging** — Use a shared backend error shape (domain code + user-safe message + optional actionable detail) and consistent UI channels (inline/banner/dialog/toast) so admin and reader flows communicate failures predictably. Card PATCH when stale `coverImageId` / missing `media` is the first known sharp edge; align route-by-route with `docs/04-Theme-Design-Contract.md` §10 instead of surfacing opaque Firestore/transport errors directly.
Current implementation note (2026-04-27): shared `--state-*` success / warning / error / info styling is already live broadly, but the broader app-level messaging behavior is still mixed across local banners, state treatments, and partial feedback-panel adoption. Reader general/error feedback surfaces are now wired; reader success/warning/info panel variants remain future-facing until matching UI surfaces exist.

📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

---

### **Card Management**

*Intent*

- **Administration** - Manage card population

*Principles*

- **Ease of Use** - Ease of bulk and individual admin.
- **Tagging first** - Card management should optimize for easy tag assignment and quick relationship editing; those two actions create the structure everything else depends on.

📐 **List filtering & pagination (cards + media)** - Filters apply to the **entire** population the active server query represents; list UI (infinite-style, Load more, or paged Prev/Next) must only show **contiguous slices** of **one** stable-sorted result for that query. **Typesense** `per_page` is capped at **250 hits per request** (see `docs/01-Vision-Architecture.md` → **Typesense list limits**); larger filtered sets use **multiple chunks** along the same order, not a widened single page. **Seek-style** media lists (assignment / dimension seek) are **documented exceptions**—forward chain semantics, not arbitrary page jumps over a fixed total. Canonical framing: `docs/01-Vision-Architecture.md` → 📐 **Filtered population & stable ordering**.

*Features*
✅ **Complete**

- **Service & schema** - Firestore `cards`; `src/lib/services/cardService.ts`; `src/lib/types/card.ts` (`cardSchema`). Denormalized fields for filtering; business rules server-side.
- **Admin surfaces** - `src/app/admin/card-admin/` (grid/table, `CardForm` + `CardFormProvider`, `AdminFAB`, search/filter via `CardProvider`, `BulkEditTagsModal`).
- **Fields** - Types `story|gallery|qa|quote|callout`; status; `displayMode`; cover + `PhotoPicker` / `CoverPhotoContainer`; `galleryMedia`; TipTap `content` + embedded media + `@` mentions (see Content Page); `MacroTagSelector`; excerpt + auto (`excerptAuto`); `childrenIds` + picker UI; dirty leave/duplicate flows (`persistableSnapshotsEqual`, `confirmLeaveIfDirty`, `POST /api/cards/[id]/duplicate`).
- **Import** - Folder-as-card (`ImportFolderModal`, `__X` files, caps) — details in `docs/IMPORT-REFERENCE.md`.
- **Discovery in edit** - PhotoPicker Library tab mirrors Media list filters + in-modal tag dimensions (`filterTagIds` from `CardForm`).
- **Writing Assist** - Admin-only AI suggestion endpoint is active (`POST /api/ai/suggest-card-drafts`) with suggestion-only outputs; no auto-apply.
- **Admin Ordering** - Admin lists support deterministic order controls (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with explicit tie-break behavior and no random ordering default.
- **Admin filter depth** - Card admin supports card-dimension missing filters (`Card Who/What/When/Where: No tags`) and page-level media-signal row filters (`Media Who/What/When/Where`) layered on the visible admin list.
- **Media-derived tag suggestions (full-page)** - Full-page card admin **grid/table** shows per-dimension **suggestions** from gallery/media tags with **apply** (`getMediaSuggestionTags` / `applyDimensionSuggestions` in `CardAdminList`)—the primary v1 path to fix tags on cards when metadata lived on media first. **Studio** attach bank does not duplicate this UI; use full-page **Card Management** for that workflow until a future parity pass.
- **Bulk tag mutation path** - `POST /api/cards/bulk-update-tags` add/remove mode now uses a dedicated batched service (`bulkApplyTagDelta`) that updates card tag-derived fields and tag counts in bulk transactions instead of per-card `updateCard` calls.
- **Bulk bar & list/grid multiselect** - The bulk actions strip is a **single** `bulkActions` bar (fixed min height, count on the **left**, actions on the **right**—same pattern as **Media admin**). **List** and **grid** (and the **Studio Cards** pane) support **Shift+click** (range from the last anchor), **Ctrl/Cmd+click** (toggle membership), and **Shift+Ctrl** / **Shift+Cmd** (add a range) via shared `applyModifierSelection` in `src/lib/utils/adminListSelection.ts`. **Select all on page** applies to the **visible** page list. **Grid:** checkbox and modifier semantics match the list; in **Studio**, a **plain** cell/keyboard primary may **focus** the card for compose while **modifier+click** still participates in multiselect.
- **Card edit labels** - Card edit now uses concise section/button labels (`Gallery`, `Add`) and removes legacy child-card helper copy (`Add...`, `Current Children`).
- **Card edit control grouping** - `Status`, `Type`, and `Display Mode` controls are grouped in the top card-edit header section.
- **Studio card edit** - `**/admin/studio`** **Compose** column embeds `**CardForm`** + `**CardFormProvider**` for the session-selected card (`StudioShellContext`); **PhotoPicker** + TipTap **clipboard paste** unchanged; delete/duplicate/full chrome via linked full-page Card admin (`StudioCardEditPane`). **Tags in Compose:** `**CardDimensionalTagCommandBar`** only (no `**MacroTagSelector**` expand); **full-page** card edit keeps **Edit tags…** + `**MacroTagSelector`** (see **Administration** ✅ **Studio inline tags (v1 closeout 2026-04-23)**). **DnD:** cover, gallery, children, and **TipTap body** (`drop:body`) accept drops from the embedded media bank on the same `**CollectionsAdminClient`** `DndContext` (`**Studio selected-context elimination (v1)**` in **Administration**); body insert uses `**RichTextEditor.insertImage`** + current bank page row for hydration (see ✅ **TipTap body media from bank (Studio)**). **PhotoPicker** superseded over time by **Media admin** + `**PhotoPicker convergence in Media admin`**.
- **Admin card grid layout** - Card admin **grid** (including Studio attach bank) uses shared `**AdminGridCellChrome`** (`src/components/admin/common/AdminGridCellChrome.*`): **natural-aspect** cover (`aspect-ratio` from stored dimensions; `**object-fit: cover`**); **left vertical rail** for dimensional tags (Who→What→When→Where; **one clipped preview per dimension**—`text-overflow: clip`, no ellipsis—plus a `**+`** when more tags exist; **only the `×` control** removes the **first** tag in that dimension; tag name and `**+` are not clickable** for remove; full lists on **native `title`** on the rail, each row, and the **cover**); **narrow left-aligned** tag search row under the tile (`CardDimensionalTagCommandBar` **search-only**); bottom overlay for **type** + **status** (draft/published: **semi-transparent** fills, **white** label text, **no** chip border); top row for checkbox, delete, Studio drag handle when present; **excerpt/subtitle** caption under the image where applicable (Studio compact grid may clamp title—full metadata on **cell** + **cover** `title`).
- **Admin list (table) layout** - **List** view uses **stacked** compact cells (e.g. type + display + status; content + gallery + children; edit + delete), **resizable** cover and tag-bar columns, and a **dimensional tag** toolbar with **Who/What/When/Where** in the **table header** (`CardDimensionalTagCommandBar` with row labels suppressed in favor of the header row). The older **per-row** **Tags** entry that opened a bulk tag modal is **not** in the list—use the tag bar and per-dimension chips. **Studio Cards** reuses the same `CardAdminList` **table** with `**hideDimensionMediaSuggestions`** so **media-suggestion** columns are **full-page** only.
- **Card list SWR + Studio cards refresh** - After a successful card `**PATCH`**, full-page card admin **merges the request body over** the SWR list entry (after server JSON) so `tags` and other inline edits reflect immediately. Studio **Cards** **increments a catalog refresh** after in-list card updates so its **filters and card set** see fresh card data.
- **TipTap body media from bank (Studio)** ✅ (2026-04-23) - **Studio Compose** only: drag `**source:{mediaId}`** from embedded **Media admin** onto the **Content** drop zone (`drop:body`) wraps `**RichTextEditor`**; `**handleStudioRelationshipDragEnd**` resolves `**Media**` from the **current bank page** and calls the registered `**insertImage`** so `**content` / `contentMedia**` stay consistent with existing TipTap `**figureWithImage**` behavior. **Clipboard image paste** into the body remains unchanged (`**RichTextEditor`** file upload path). **Gap:** media not loaded on the active bank page cannot be resolved until paged in (or a future single-media fetch).

⭕1 **Planned**

- **Grid-first admin convergence** - Reduce dependence on table views where the grid can support identity, tagging, selection, and relationship work without loss of operator clarity.
- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.
- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances—incremental follow-up now that aspect-accurate thumbnails ship.
- **Card edit layout polish** - Align card-edit page chrome and section hierarchy for a cleaner authoring flow: header/back/action alignment, consistent section heading scale, tighter spacing between Body/Tags/Gallery/Child Cards, and clearer section ordering.
- **Tag picker ergonomics** - Keep macro-tag editing compact and predictable in card edit: controlled expansion below the command bar, root-first dimensional presentation, and searchable keyboard-friendly result selection with path clarity.

⭕2 **Future**

- **Studio cards bulk row actions** - Parity with full-page card admin bulk select/actions when the Studio card list needs the same at-scale operations (deferred; does not block Studio tag filter simplification).
- **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).
- **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question→card linkage. Deferred until after import.
- **Relationship DnD contract (cards ↔ media ↔ tags)** - Standardize direct-manipulation assignment/reorder flows so operators can drag and drop media to card targets (cover/gallery/children where applicable), reorder parent-child card structure, and add/remove relationship edges without modal-heavy seek/insert loops; require keyboard parity and clear drop semantics. **Sequencing:** resume after **Collections Studio** shell and **in-shell** DnD are validated in real use (`📐 **Studio unified shell contract`** (7)); **v1** Studio ship is not a substitute for this consistency pass.
📐 **Card-first orchestration lens** - Primary admin workflow is card-centric orchestration; media and tags remain first-class domains but operate as relationship panels/actions around the active card context instead of independent form-first workflows.
📐 **Studio shell & navigation (2026-04-21)** - **Endgame** (same intent as **Administration** → **Domains**): one shell for **all** content-based admin (cards, media, tags + relationships)—**today** delivered as **Studio** at `**/admin/studio`** (`StudioWorkspace` → `CollectionsAdminClient` `embedded`): **Organize** column (**Tags** + **Collections**), **Cards**, **Compose**, **Questions**, and **Media**; app sidebar closed by default; panes independently collapsible/resizable with persisted widths. Users/Themes remain outside Studio. **Supersedes** deferring embedded `CardForm`—**Card Edit** in Studio is **live**. **DnD:** Studio now uses the shared bounded-domain `@dnd-kit` model for authored relationships; broader keyboard/focus polish remains **⭕2** / gated work.
📐 **Studio media & body (2026-04-22)** - **Cards / orphaned filtering:** the **Cards** column (title/status/sort + **one** on-card `MacroTagSelector` for tag filtering) is the full card-admin surface inside Studio; orphaned cards are a filter/view of that catalog, not a separate identity for the pane. **TipTap body images:** **clipboard paste** unchanged; **Media admin → body** via bank drag ships with **Card Management** ✅ **TipTap body media from bank (Studio)** (Compose `drop:body`). **Cover / gallery / children in Studio:** **Media admin** is the library surface—**drag** to targets on **in-shell Card Edit** (`**Studio selected-context elimination (v1)`**). **PhotoPicker:** **retain** in full-page card edit until `**PhotoPicker convergence in Media admin`** supplies bank import + library pick parity; **end state** is **no parallel picker** for Studio and eventually card edit.
📐 **Structural Collections** - Collection parent = any card with `childrenIds`. `type: 'collection'` is legacy/presentation only. Top-level collection entries are explicit root cards (`isCollectionRoot`) ordered by `collectionRootOrder`; a card may be both a root and a child elsewhere. Full structural detail in Collections Management.

---

### **Collections Management**

*Intent*

- Organize cards into curated hierarchies with explicit parent/child ordering for narrative sequencing.

*Principles*

- **Structural, not type-based** - Parent/child via `childrenIds`, not `type: 'collection'`.
- **Manual ordering** - Author controls sequence through TOC; no automatic sorting.

*Features*
✅ **Complete**

- **Data Model** - Curated tree lives in **Studio** (`/admin/studio`, `**CollectionsAdminClient` `embedded`**). Standalone `**/admin/collections**` page removed (**redirect** to Studio); shared styles remain at `src/app/admin/collections/page.module.css` for `CollectionsAdminClient` / card-admin panels.
- **Curated Tree** - drag-and-drop—attach/detach parent→child edges and promote cards to explicit top-level roots. Multi-parent model; cycles blocked in `cardService`. Admin tree loads up to **1000** cards for the page.

⭕2 **Future**

- **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC (primary mechanism for curated narrative). One tree UI for reparenting and ordering. Reconcile parent/child model after TOC exists. No cascade on parent delete — children simply lose that parent.

📐 **Structural Model** - Studio structure is parent-driven and multi-parent capable: `childrenIds` store ordered parent→child edges; `isCollectionRoot` marks intentional top-level roots; `collectionRootOrder` defines root order. Reader/admin collection listing should follow explicit roots, not a hidden Master Parent.
📐 **IA vs Studio** - `**/admin/studio`** is the **Studio** shell (embedded `CollectionsAdminClient` + media + compose). **Primary admin navigation** no longer advertises standalone `**/admin/collections`** or `**/admin/media-triage**` (those URLs **redirect** to Studio).

❓ **Open**

- **Multi-parent** - Deferred product decision.

---

### **Media Management**

*Intent*

- **Multi-source** - Access images from various *external sources* — local, OneDrive, Google, Apple, etc.

*Principles*

- **Imported** - Imported to db for stability
- **Processed** - Image processed and metadata extracted. 
- **Referenced** - Referenced in cards by id, hydrated on demand
- **Replacement** - Facilitate simple edit and replacement of media.
- **Relationship readiness** - Media management should make it easy to move from random banked assets to structured card relationships (cover, inline, gallery, children) without unnecessary mode switching.

📐 **List filtering & pagination** - Same contract as **Card Management** → 📐 **List filtering & pagination (cards + media)**; media additionally uses **cursor / Typesense `listPage` / seek** paths on `GET /api/media`—chunking must stay consistent with the active mode; see `docs/01-Vision-Architecture.md` → 📐 **Filtered population & stable ordering**.

*Features*
✅ **Complete**

- **Core** - Firestore `media` collection; types in `src/lib/types/photo.ts`; import/process/`replace` in `src/lib/services/images/imageImportService.ts` (and related APIs). Display: `JournalImage`, `getDisplayUrl` (`src/lib/utils/photoUtils.ts`).
- **Search** - With Typesense configured (`TYPESENSE_HOST`, `TYPESENSE_API_KEY`): `media` index, facets, and `searchMediaTypesense` drive non-empty text search plus several filtered list paths (including `assignment=assigned|unassigned` when Typesense is used). **Without Typesense, non-empty text search on `GET /api/media` returns HTTP 503** (`SEARCH_UNAVAILABLE`); Firestore seek/pagination still serves unfiltered lists and legacy tag-dimension seek. Sync scripts: `docs/NPM-SCRIPTS.md`.
- **Import paths** - Local drive / PhotoPicker / paste-drop via `src/lib/services/images/imageImportService.ts`; folder-as-card (`__X` marker, `IMPORT_FOLDER_MAX_IMAGES`, `ONEDRIVE_ROOT_FOLDER`) — full rules in `docs/IMPORT-REFERENCE.md` and `normalize-images-README.md`.
- **Card edges** - `referencedByCardIds` is **denormalized**: updated on the primary `createCard` / `updateCard` and media-delete cleanup paths, but **not a verified invariant**—drift is possible. Unassigned/assigned UX uses `referencedByCardIds` plus `mediaAssignmentSeek.ts` (and Typesense when that path is active). Diagnosis/repair: `npm run reconcile:media-cards`, other scripts and maintenance HTTP — `docs/NPM-SCRIPTS.md`.
- **Admin** - Multi-dimensional filter, replace-in-place (`POST /api/images/{id}/replace`), per-row metadata/tags (`PATCH /api/images/{id}`), **bulk tag edits** (`POST /api/admin/media/tags` — add/replace/remove across many `mediaIds`), bulk modes, multi-select → draft gallery card (`MediaAdminContent`).
- **Bulk bar & list/grid multiselect** - The bulk actions strip uses the **same** single-`bulkActions` layout and min height as **card admin** (not a nested outer toolbar). Count copy: **"No media selected"** / **"N media selected"**. **Table** and **grid** use the same `**applyModifierSelection`** rules as cards (**Shift** / **Ctrl**/**Cmd** / combined); **Select all on page** applies to **visible** media on the current page.
- **Media admin list (table) row actions** - **List** view stacks **Focal** (when a dedicated **objectPosition** column is off), **Replace**, and **Delete** in the row **actions** column for a narrower table.
- **Bulk media tag mutation path** - `POST /api/admin/media/tags` now applies add/replace/remove through a dedicated batched service (`bulkApplyMediaTags`) that updates media tag-derived fields and tag counts in bulk transactions, then recomputes affected card media signals once per request.
- **Media delete/referrer resolution** - media delete now resolves referrers from authoritative card surfaces (cover, gallery, `contentMedia`, inline `data-media-id`) instead of trusting `referencedByCardIds` alone, removes references across all card surfaces in one pass, and blocks delete if references remain.
- **Media delete guard contract** - `DELETE /api/images/{id}` now returns `409` with code `MEDIA_DELETE_BLOCKED_REFERENCES` when authoritative referrer cleanup cannot fully detach the media from cards.
- **Media API error contract (initial standardization slice)** - `GET /api/media`, `PATCH /api/images/{id}`, `DELETE /api/images/{id}`, `POST /api/admin/media/tags`, `POST /api/images/{id}/replace`, `POST /api/images/browser`, `POST /api/images/local/import`, `POST /api/import/folder`, and `POST /api/import/batch` now return domain-coded JSON errors (`code`, `message`, `severity`, `retryable`) instead of raw/opaque response text; Media admin/triage rendering now distinguishes warning vs error severity in list-level feedback.
- **Media identity signals in admin UI** - Media admin **table** exposes canonical identity in-list (`media.docId` column and related fields). **Grid:** filename / id / source are **not** inline on the tile—hover **title** on the image shows them; triage still relies on `docId` as canonical identity.
- **Unassigned duplicate triage sort mode** - In Media admin, when `On cards = Unassigned`, operators can switch to `Source-path first` ordering to cluster likely duplicates for faster keep/delete decisions.
- **Per-dimension media filters** - Media admin now supports per-dimension filter modes for Who/What/When/Where (`Any`, `Has any`, `Is empty`, `Matches tag`) in both table and grid views.
- **Grid tag editing UX** - Media grid tiles use the same `**DimensionalTagVerticalChips`** left rail as **card** grid (Who→What→When→Where; per-dimension first tag + `**+`** when more exist in that dimension; `**×` removes the first** tag in that dimension; **native `title`** on rail, rows, **cell**, and **thumbnail**) plus a `**CardDimensionalTagCommandBar`** `**searchOnly**` row under the caption (placeholder **Edit tags…**, dense suggestions, inline save)—no separate per-tile tag modal for routine edits.
- **Admin media grid layout** - Same `**AdminGridCellChrome`** shell as card grid: **natural-aspect** thumbnails (`aspect-ratio`, `**object-fit: cover`**); **grid column** `minmax`/`gap` aligned with card admin for consistent tile width; bottom overlay for **source** + **Assigned/Unassigned** (same **overlay typography** + **white** text / **no** border on assignment badges as card status); **caption** under the image; **checkbox + Studio drag handle** on the top row when Studio registers `source:{mediaId}` drops.
- **Grid tag save feedback** - Inline media retagging now surfaces per-card save confirmation and keeps the editor open with actionable error text when save fails.
- **Admin pagination consistency** - Media Admin and Media Triage now use consistent Previous/Next pagination messaging for seek/indexed lists, including the same seek-mode hint and total-items phrasing.
- **Media table header attachment** - Media table headers now stay attached to the top edge of their active scroll container in both full Media Admin and compact embedded media tables.
- **Triage** - **Removed (2026-04-22):** former `**/admin/media-triage`** page and triage-only UI; URL **redirects** to `**/admin/studio`** (embedded **Media admin**). Use **Studio** or `**/admin/media-admin`** for bank workflows.
- **Studio** - **Primary entry:** `**/admin/studio`** (`StudioWorkspace` → `CollectionsAdminClient` `embedded`): tag admin tree (`useTagManagement` + `TagAdminList`), collections tree + **Cards** pane + embedded `**MediaAdminContent`** (`studioSourceDraggable`) + in-shell `**CardForm**` **Compose** column, and Collections-style DnD (cover/gallery/children). Product truth is this **embedded** shell (`📐 **Studio unified shell contract`**).
- **Studio embedded media admin** - `MediaAdminContent` in Studio uses the same `MediaProvider` + filters/table/grid/bulk/import/delete as full `/admin/media-admin`; **table** and **grid** cells expose a drag handle registering `source:{mediaId}` when `studioSourceDraggable` is on (requires `CollectionsAdminClient` `DndContext`).
- **Studio media assignment** - Drag `source:*` from the embedded media bank onto **Cover**, **Gallery**, **child** slots, or **TipTap body** (`drop:body`) on **in-shell Card Edit**—relationship targets use `**handleStudioRelationshipDragEnd`** / `**patchSelectedCard**`; body uses `**insertImage**` on the compose editor (`**TipTap body media from bank (Studio)**` ✅). **PhotoPicker** and TipTap **clipboard paste** remain until `**PhotoPicker convergence in Media admin`** per `📐 **Studio media & body (2026-04-22)**`.
- **Bank-only** - No temporary or active status; imported media is in the bank. Assignment and unassigned filtering use `referencedByCardIds` and `GET /api/media?assignment=unassigned|assigned` (`mediaAssignmentSeek.ts`).
- **Studio media route status** - `**/admin/media-admin`** now redirects to **Studio**. Embedded Studio media is the real working surface for media administration; the legacy route remains only as a redirect.
- **Import Metadata** - Import reads embedded metadata (caption + keyword paths from XMP/IPTC/EXIF via ExifTool) and resolves keywords to app tag IDs in the import path.
- **Import metadata policy** - For scoped import paths, embedded captions/keywords are the app contract; JSON sidecars are out of scope (decision closeout 2026-04-20; regression via `readMetadataCaption` in integrity tests).

⭕1 **Planned**

- **PhotoPicker convergence in Media admin** - Add operator flows in `**/admin/media-admin`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (`📐 **Studio media & body (2026-04-22)`**).
- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.
- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.
- **Grid admin ergonomics** - **Remaining:** larger bulk-select checkbox hit targets (row + select-all) and any further focus/checked-state polish. **Done:** filename removed from grid tile body; identity strings on image hover.
- **Grid tagging UX + empty-dimension filter** - **Pane-level** per-dimension modes (`Any` / `Has any` / `Is empty` / `Matches tag`) ship in Media admin and Studio-embedded media. **Remaining:** optional **per-tile** inline add/search (without modal) for parity with card-grid search foot; table view alignment with the new grid rail pattern if desired.
- **Spike** - End-to-end on a fixed folder: ingest → embeddings → candidate clusters → simple review UI → export JSON of confirmed groups and proposed tags (no production auth required) (`docs/05-Guided-Archive-Assistance.md`).
- **Evaluation set** - Curated subset with human-labeled "true events" to score precision/recall of clustering variants (`docs/05-Guided-Archive-Assistance.md`).
- **Heuristic pre-clustering** - Cheap, explainable first pass: time windows, folder boundaries, burst detection, optional GPS buckets—outputs **candidate segments** for ML refinement (`docs/05-Guided-Archive-Assistance.md`).
- **Review UI** - Grid of **candidate stacks** with merge/split, keyboard-friendly for large sets (`docs/05-Guided-Archive-Assistance.md`).

⭕2 **Future**

- **Search without Typesense** - Today non-empty text search returns 503 when Typesense is unset; consider degraded search (capped Firestore scan / clearer admin affordance) for small corpora or dev machines.
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

📐 `**referencedByCardIds` (referrer list)** — Denormalized convenience for assignment filters and delete orchestration. `cardService.getCardsReferencingMedia` now performs an authoritative scan across cover, gallery, `contentMedia`, and inline HTML references, then reconciles `referencedByCardIds` to that result; delete uses this same scan and fails safe when references remain.

📐 **Display identity vs canonical identity** — `filename` is presentation metadata and is not unique. Canonical identity is `media.docId`; duplicate detection/triage should rely on stable source/content signals (`sourcePath`, hash/checksum, dimensions/size), not filename alone.

📐 **Cross-entity sync** — Firestore is authoritative; Typesense and denormalized fields follow these entry points:


| Relationship                           | Primary maintenance                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card ↔ media `referencedByCardIds`     | `createCard` / `updateCard` (transaction `arrayUnion` / `arrayRemove`); `removeMediaReferenceFromCard` + `deleteMediaWithCardCleanup`                                                                                                                                |
| Card ↔ Typesense                       | `syncCardToTypesense` after create/update paths; `removeCardFromTypesense` on card delete                                                                                                                                                                            |
| Media ↔ Typesense                      | `syncMediaToTypesenseById` / `syncMediaToTypesense` on media writes; `removeMediaFromTypesense` on media delete                                                                                                                                                      |
| Card ↔ tag `cardCount` (and ancestors) | `updateTagCountsForCard` inside card transactions (tag changes, publish state, `deleteCard`)                                                                                                                                                                         |
| Card ↔ questions                       | `unlinkCardFromAllQuestions` after `deleteCard`; link/unlink APIs update `usedByCardIds` + `usageCount`                                                                                                                                                              |
| Drift / bulk repair                    | Ad hoc: `npm run sync:typesense` / `sync:typesense:media`; `npm run reconcile:media-cards`; other scripts under `src/lib/scripts/`. CRUD paths are the **happy path** for consistency, not a formal proof—use scripts when drift is suspected or after bulk imports. |


📘 `normalize-images-README.md`
📘 `METADATA_EXTRACTION_README.md`
📘 `docs/IMPORT-REFERENCE.md`
📘 `docs/05-Guided-Archive-Assistance.md` - Guided archive assistance (dual intake, clustering, review stacks, promotion); sequencing in `docs/03-Implementation.md` → 📐 **Guided archive program (2026-04-24)** and **§ Guided archive assistance**.

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
- **Usage** - Same assignment UX on cards and media (`MacroTagSelector` pattern). Card `filterTags` derived on save in `cardService` (not from image tags). At-a-glance: `getCoreTagsByDimension`, `DirectDimensionChips` on card/media **tables**; admin **grids** use shared `**DimensionalTagVerticalChips`** (cards and media) for readable vertical stacks and inline per-dimension remove.
- **Authoring stance** - Card-level vs frame-level tags are independent; bulk media tagging is primary day-to-day.
- **Single TagProvider** - One root `TagProvider` in `src/app/layout.tsx`; admin no longer nests extra providers (`admin/layout.tsx`, `tag-admin/page.tsx`).
- **Tag tree counts (cards/media)** - `cardCount` + `mediaCount` on tag docs; UI `(cards/media)` in `TagAdminRow` and sidebar `TagTree`. Incremental: `updateTagCountsForCard`, `updateTagCountsForMedia` (media PATCH + delete + `deleteTag` strips tags from affected media). Full recompute: `updateAllTagCardCounts` + `updateAllTagMediaCounts` via `npm run update:tag-counts -- --apply`.
- **Tag admin route status** - `**/admin/tag-admin`** now redirects to **Studio**. Tag administration lives in Studio **Organize** and in the `/view` admin **Tag library** pane; there is no separate tag-admin working surface.
- **Studio tag rail** - **Shipped:** `**TagAdminStudioPane`** in Studio **Organize** at `**/admin/studio`** (`CollectionsAdminClient` `embedded`)—full add/delete/edit/reorder/reparent on canonical `TagProvider` (`**useTagManagement` + `TagAdminList**`). **Tags | Tree** tab model; reorder/reparent apply optimistic local cache updates, then reconcile with Firestore.
- **Sidebar integration model** - **Shipped:** one `TagProvider` tree—**viewers** on `/view` use filter-first `**TagTree`**; **admins** on `/view` (Freeform) get **Filter** vs **Tag library** tabs, with **Tag library** = `ViewTagLibrarySidebarPane` (same tag-admin stack as Studio). Not a second taxonomy (`📐 **Studio unified shell contract**` (1); **Left Navigation** → **Sidebar roles**).

⭕1 **Planned**

- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."
- **Node Strategy** - Raw tag overlay to created aggregations.

⭕2 **Future**

- **DnD interaction contract** - Before expanding drag-and-drop to additional admin flows (card assignment, gallery/media assignment, broader tree operations), standardize one interaction contract across admin DnD surfaces: **single framework** for authored relationships/reorder (`@dnd-kit`), **bounded drag domains** (Tags / Collections / Compose / Media), drop semantics (on vs between), sensors/activation thresholds, visual drop indicators, drag handles, overlays, and keyboard parity. Keep **`react-dropzone`** only for file upload drop; retire `react-dnd` from `CardForm` over staged migration. Expansion is gated on this consistency pass. **Sequencing:** resume with **Relationship DnD contract (cards ↔ media ↔ tags)** in **Card Management** after **Studio desktop shell** and related Studio **⭕1** layout are validated (`📐 **Studio unified shell contract`** (7)).
- **Unified tag edges (conceptual):** Treat assignments as **(subjectType, subjectId, tagId)** even if denormalized on `Card` / `Media` for reads—eases counts, digiKam mapping, migrations. (??)
- **Face Recognition** - Options:
  - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
  - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
  - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.
- **Relationship Tagging** - Derive family relationships from minimal primitives (`parent_of`, `spouse_of`); compute uncle, cousin, step-parent, etc. via inference rules. Maps to WHO dimension. Large surface (graph storage, validation, remarriage/step edges). Park until parallel media tagging and bulk Media-admin UX are in place. Detail regenerable.
📐 **Authoring Vocabulary** - Mirror the same dimensional paths in digiKam keywords and the app tag tree so import/mapping stays predictable. Four scene dimensions on media (Who, What, When, Where); card-level arc/theme tags for narrative framing. **N/A sentinel:** use root tag `**zNA`** in each dimension in the app (and align digiKam keywords to the same label per dimension path). Key conventions:
  - **When** — `when/date/…` chronological, sortable (`yyyymmdd`, `00` for unknown). No `when/stage` (stage is who-dependent; infer from who + date). Season out of scope.
  - **What** — Includes `what/Reflections/…` for reflective / journal-style themes (card-centric; not used for media scene tags). Other buckets: `what/event/…` (occasions/milestones), `what/activity/…` (what people are doing), plus long-running domains under What as needed. Overlap: milestones → event; school defaults to theme; add event for specific ceremonies.
  - **Who** — People as stable tag identities (display names). Groups optional (`who/group/…`). Subject vs also-present encoding TBD. Kinship graph is **Relationship Tagging** (future).
  - **Where** — Administrative nesting (country → state → county → city), skip levels when irrelevant. Venues, domestic labels, natural settings as children. GPS/EXIF may seed on import; author refines in Tag admin.

---

### **Question Management**

*Intent*

- **Journal-like** - Grandfather/Father journal-like questions

*Principles*

- **Prompts** - Use questions as prompts for Q&A cards.
- **Flexible** - Accommodate short and long answers.
- **Dimensional** - Group questions through the existing Who / What / When / Where tag tree rather than a separate prompt taxonomy. Questions may be temporarily untagged during QA-card migration/cleanup and should surface in an explicit **Untagged** view until the author assigns generic prompt tags.
- **Prompt tags vs answer tags** - Question tags classify the **prompt** and should generally be generic (for example `Father`, `Mother`). Card tags classify the **answer** and may be specific (for example `Robert`, `Sandra`). Question tags seed a newly created Q&A card only at creation time; after that, question and card tags are independent.

*Features*
✅ **Complete**

- **Data Model** - Firestore `questions` collection. Schema: `src/lib/types/question.ts`. Service: `questionService.ts`. Questions carry optional dimensional `tagIds` and `usedByCardIds`; Q&A cards carry `questionId`.
- **UI** - `/admin/question-admin`.
- **Studio Pane** - Studio includes a collapsible Questions pane between Compose and Media for dimensional tree browsing, **Untagged** cleanup filtering, included/not-included filtering, add/edit, and opening or creating the linked Q&A card in Compose.
- **APIs** - Admin-only CRUD (`/api/admin/questions`, `/api/admin/questions/[id]`), link/unlink Q&A card, create Q&A card from prompt.
- **Filter** - List/filter in UI: text, tags (substring), used vs unused.
- **Create Card** - Create Q&A card from question prompt. Adds `questionId` to the card, copies current question dimensional tags to the card as a starting point, adds card ID to `usedByCardIds`, and updates `usageCount`. General card creation does not create new Q&A cards; Q&A authoring is question-backed.
- **Link/Unlink** - Manual link/unlink between question and card IDs. Unlink converts the linked Q&A card to draft Story and removes `questionId`; do not leave orphan Q&A cards.
- **Bootstrap** - `npm run bootstrap:questions-from-qa` dry-runs creation of question-bank prompts from existing unlinked Q&A cards; `-- --apply` writes linked question records and card `questionId` values. **Run 2026-04-25:** after backup `C:\Users\alanb\OneDrive\Firebase Backups\run-2026-04-25T01-36-00-057Z`, applied 158 untagged question records; final dry run reported 202/202 QA cards linked.

⭕2 **Future**

- **Grouping Level** - Designate which dimensional tag levels are eligible for question grouping so prompts use the shared tree without collapsing to one-off events.
- **Answer Workflow** - Workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping.
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

- **Custom Themes** - Allow customizable light and dark modes and, over time, **whole design packages** the author can switch between.

*Principles*

- **User-Controllable** - The author can adjust parameters; the implementation should converge on **presets** that stay coherent together.
- **Reader vs admin** - Polish targets the **reader** experience first; admin uses the **same token set** where parity helps (previews, shared components), without blocking dense authoring layouts.
- **Professional + journal** - Aim for a UI that reads as **well-crafted and mobile-centric** while still allowing a **warm, journal/history** personality—usually via tokens (color, type roles, spacing), not ad hoc CSS.
- **Reader immersion** - Theme work exists primarily to make long-form family stories readable, aesthetically pleasing, and worth staying with—not merely to expose more admin controls.

*Features*
✅ **Complete**

- **Theme mode + preset controls** - `Light` / `Dark` and `Journal` / `Editorial` now live in the Theme Management toolbar above the Values pane rather than in top navigation; switching theme or mode checks for unsaved draft changes first.
- **Theme plumbing** - Runtime theme tokens are generated from the theme model (`theme-data.json` fallback / Firestore-backed theme document) and injected into the app; static `src/app/theme.css` remains the emergency fallback and global shell stylesheet.
- **Theme workspace** - Theme Management now functions as a live-draft editing workspace: Journal / Editorial reader preset selection, reader/admin recipe editing, and atomic token editing produce a theme document that applies to the app immediately in-session but is not permanent until **Save**. The workspace now opens as a **floating, draggable, resizable window** so the author can keep the real reader surface visible while tuning the live draft. The current workbench is still transitional, but the active structure is now clearer: the **left side** is the component-and-attribute editor, while the **right side** is the values panel organized around **Colors**, **Typography**, and **Structure**. The target author-facing model remains **Component -> Attribute -> Value** so the author edits app pieces (Foundation, Chrome, Controls, Story, Gallery, Lightbox, etc.), the attributes they need (background color, width, padding, border, text), and the valid values for those attributes rather than storage-bucket names. In that model, `Padding`, `Spacing`, `Sizing`, `Radius`, and `Border Width` remain separate concepts rather than collapsing into one generic layout bucket.
- **Theme scope split** - Theme Management now has an explicit `Reader` / `Workbench` target toggle. Reader edits write to the saved reader scope; Workbench edits write to the saved admin scope. The live app also consumes the saved admin-scoped CSS outside the editor, so workbench surfaces can diverge meaningfully from the reader even when Theme Management is closed.
- **Workbench component coverage** - Workbench `Header`, `Sidebar`, `Shell`, `Tabs`, `Controls`, and `Feedback` are now direct editor targets so dense admin/tooling surfaces no longer have to be styled indirectly through nearby reader-oriented buckets.
- **Values coordination** - The Values pane now stays fully visible but is more truthful: it highlights relevant value groups for the selected attribute, shows the current binding directly, and includes stronger coverage for named colors, state colors, shadows, and layout metrics.
- **Theme save workflow** - Theme Management now presents one active draft with straightforward document-style controls: **Save** is enabled only when the current draft differs from the saved theme, **Discard** restores the last saved theme, and **Save As** is reserved for theme-variant creation rather than exposing implementation-heavy status concepts in the primary UI.
- **Reader live-surface coverage** - Theme work should now be judged against the actual reader surface through live draft application: closed card types, open story/gallery/question detail, sidebar/filter chrome, discovery and child rails, lightbox/state samples, and compact cards should all be reachable in the real app while Theme Management remains open.
- **Runtime theme wiring (substantially reconciled)** - The live generator path is now largely reconciled with the editor for foundations, chrome, controls, cards, overlays, discovery, and media/lightbox surfaces. Earlier runtime bypasses and bridge-only outputs have been reduced so the editor is much closer to being the real source of truth for what the app renders.
- **Closed-card surface controls** - Theme Management now keeps `General` as the shared closed-card baseline while also allowing per-card closed backgrounds (`Story`, `Gallery`, `Question`, `Quote`, `Callout`) to choose either `Use General` or a curated surface value. Runtime wiring now honors those card-family closed surfaces directly.
- **Reader semantic layer (narrowed)** - Reader-facing CSS still uses a smaller semantic family (`--reader-page-*`, `--reader-chrome-*`, `--reader-solid-*`, `--reader-card-*`, `--reader-detail-*`, `--reader-body/title-*`, `--reader-meta/caption-*`, `--reader-media/lightbox-*`, `--reader-discovery-*`), but much of the earlier bridge-only layer has been collapsed in favor of concrete app-consumed variables. The remaining semantic layer exists to keep role-backed recipe resolution understandable rather than to hide actual styling decisions from the editor.
- **Component recipe direction** - The current editing model is moving from flat role names toward **component + variant + element** recipes so Story, Gallery, Q&A, Quote, Callout, sidebar, discovery rails, and lightbox surfaces can diverge cleanly while still using the shared atomic token set underneath. The next editor redesign step is to expose that to the author as **Component -> Attribute -> Value** rather than mixed recipe names plus token-bucket terminology.
- **Three-tier theme model (direction)** - Theme work is now grounded in three explicit layers: **atomic tokens** (palette, type scale, spacing, radii, shadows, raw component primitives), **semantic token classes** (tonal surface/text, contrast-on-fill, overlay/media contrast, borders, accent, focus, state families), and **recipes** (UI-job assignments such as story title, gallery lightbox caption, sidebar active tab, admin notice). App surfaces should consume recipes through semantic classes rather than binding directly to raw atomic token refs.
- **Live draft application (direction)** - The intended loop is now **tokens -> semantic classes -> recipes -> live draft app -> Save -> applied app**. Unsaved theme edits should apply immediately to the real app for the current session, with explicit Save to persist and explicit discard/reset to restore the last saved theme.
- **Primitives remain the base layer** - The underlying token and recipe system remains the exact value source/reference layer. The current right-side values panel is beginning to expose that layer more honestly by showing the named value behind the selected attribute and, where resolvable, the actual underlying value; broader direct system-value editing is still a later refinement rather than the current primary interaction.
- **Reader feedback theming (partial consumer coverage)** - Reader **general feedback** and **error feedback** are now wired to real reader surfaces. Reader **success / warning / info** feedback-panel values still exist in the theme contract, but the current reader UI does not yet render matching message surfaces for them.
📐 **Theme role** - Theme is part of the reader value proposition: clarity, tone, and immersion for family storytelling.
📐 **AI assist role** - AI help is editorial and voice-preserving: improve clarity, pacing, and reader interest without inventing facts or replacing author voice.

⭕1 **Planned**

- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.
- **Theme contract inventory** - Complete an inventory-driven semantic theme contract before treating Journal / Editorial as finished themes: enumerate reader/admin surfaces, visible elements, current token use, required semantic token families, and migration status.
- **Theme schema** - Define the structured Firestore theme document shape that stores atomic tokens, semantic token-class assignments, and reader/admin recipe assignments for live draft application and saved runtime themes, with Theme Management as the editing interface; do not expose raw Firestore editing as the product workflow.
- **Preset completion** - Expand Journal / Editorial from partial preset bundles into coherent light/dark design packages only after the semantic surface inventory and schema are defined.
❓ **Italic** - Is there a way to right lean the ink font?

📘 **Design contract** - Semantic roles, preset intent (Journal vs Editorial), and reconciliation order: `docs/04-Theme-Design-Contract.md`.

---

### **Gallery Management**

*Intent*

- **Custom Styles** -  Allow customizable gallery styles

*Principles*

- **Tokenizable** - Provide tokenizable styles for gallery layouts

*Features*
⭕2 **Future**

- **Gallery Styles Management** - Devise preconfigured card styles for selection — masonry, mosaic, etc.
📐 **Improvement intake** - Capture new improvement needs as concise, structured feature bullets in the owning section (`⭕1`, `⭕2`, or `❓`) with clear title + one-line description, instead of long prose blocks.
