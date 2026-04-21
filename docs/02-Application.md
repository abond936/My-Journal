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
- **`📐` vs `⭕`:** `📐` records **design stance, data shapes, and operational truth** (including known gaps between intent and enforcement). It is **not** the execution backlog. When a gap should be fixed in code, add an explicit **`⭕1` / `⭕2`** bullet—do not rely on `📐` alone to imply scheduled work.
- **`✅` wording:** Describe **what is implemented and wired today**. Avoid implying stronger guarantees than the code provides (e.g. treating a denormalized field as a proven invariant).

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
- **Hierarchical Tag Tree** - Tag tree for filtering content by card type and active dimension.
- **Mobile** - Left sidebar uses a **drawer** (overlay + backdrop) at `max-width: 768px`; **sidebar toggle (←/→) remains visible at all widths** so filters are always reachable; no bottom navigation bar. Details: `docs/04-Theme-Design-Contract.md` §9.
- **Card Type** - Select control: All Types | Story | Gallery | Q&A | Quote | Callout.
- **Tag Dimension** - All | Who | What | When | Where
- **Persistence** - Remembers selections across page refreshes.
- **Mode** - FreeForm | Curated
- **Selected Tags** - Shows selected tags as chips.
- **Search Tags** - Search input filters the visible tree (`Type to filter...`), while preserving selected chips.
- **Sort by** - Random | When (Desc/Asc) | Created (Desc/Asc) | Title (A-Z/Z-A) | Who (A-Z/Z-A) | What (A-Z/Z-A) | Where (A-Z/Z-A).
- **Group by** - None | When | Who | What | Where. Grouped sections render in the feed when enabled; collection-list mode does not group.
- **Mode quick toggle** - Freeform/Curated mode buttons are implemented directly in the sidebar control surface.
- **Tag tree target size** - Tag-tree selection checkboxes use larger tap targets for easier mobile interaction.

⭕1 **Planned**
- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.
- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.
- **Mobile-first filter redesign** - Sidebar freeform filters move to icon-led chip controls: rename **Card type** to **Cards** and replace single select with five toggle chips/buttons (`story`, `gallery`, `qa`, `quote`, `callout`) where “all” means all five active; Tags remove the `All` dimension tab and use only `Who/What/When/Where`; remove legacy copy/controls for **Show children after tag-filtered parents** from reader sidebar UX; simplify search control copy/presentation (`Search tags...` in-field prompt), reduce sidebar visual density, and keep tag tree collapsed by default (especially mobile) with per-dimension expansion on demand.
- **Sidebar roles** - **Today:** `/view` uses one left-sidebar layout and the same filter-first control surface for every authenticated user (see **✅ Complete**). **Planned:** differentiate layout and control **depth** by **session role** (viewer vs admin) while keeping drawer/toggle behavior per `docs/04-Theme-Design-Contract.md` §9. **Do not** restate tag taxonomy or API rules here—canonical **⭕1** scope for admin tag maintenance on `/view` and Studio rail: **Tag Management** → **Sidebar integration model**.

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

| Type | Display mode | Feed (default grid) | Feed (rail variant) | Open card (`/view/[id]`) | Excerpt behavior | Cover framing |
|------|--------------|---------------------|---------------------|---------------------------|------------------|---------------|
| story | navigate | Interactive tile opens detail; title visible; excerpt optional behind `Read more` | Optional curated horizontal sequence tile; opens detail | Full narrative page with title/subtitle/cover/content | Truncate in feed; optional `Read more` expansion in-place | Orientation-aware ratio bucket per variant (landscape/portrait/square) |
| story | inline | Non-interactive tile with title + excerpt/content preview | Optional only when explicitly curated; non-interactive by default | N/A (not used as open behavior) | Allow `Read more` for long preview text | Orientation-aware ratio bucket per variant |
| gallery | navigate | Interactive tile with cover-first media | Primary rail candidate; horizontal sequence of gallery tiles | Detail page with gallery and related blocks | No excerpt requirement; title-first | Orientation-aware ratio bucket per variant |
| gallery | inline | Non-interactive tile; inline gallery preview allowed | Optional curated rail for quick browse | N/A (not used as open behavior) | Not excerpt-driven | Orientation-aware ratio bucket per variant |
| qa | navigate | Interactive question tile opens detail answer page | Optional themed rail (for grouped Q&A runs) | Question + answer detail structure | Teaser optional; no `Read more` requirement in v1 | Orientation-aware ratio bucket per variant when cover exists |
| qa | inline | Non-interactive tile with question + answer preview | Optional curated rail | N/A (not used as open behavior) | Preview-first; no `Read more` requirement in v1 | Orientation-aware ratio bucket per variant when cover exists |
| quote | static | Non-interactive quote tile | Optional quote rail for themed runs | Render quote body + attribution when opened directly | Not excerpt-driven | No cover required; if cover exists, use orientation-aware ratio bucket |
| callout | static | Non-interactive callout tile | Optional callout rail | Render callout content when opened directly | Not excerpt-driven | No cover required; if cover exists, use orientation-aware ratio bucket |

📐 **Matrix Rules** - Keep the matrix as the source of truth for feed/detail behavior; new variants (for example `short`) must be added to this matrix before implementation.

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
- **Related Count** - Similar / Explore presentation tuned so rails stay visually light: compact tile width (`cardRailCell` clamp in `DiscoverySection.module.css`), secondary group title scale, `V2ContentCard` `small` on rails.

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
- **Domains** - Cards, Media, Tags, Questions, Users, Themes, and **Collections** (curated tree) are active. **Studio** (`/admin/studio`) is the **in-progress** combined surface for card + media + tag workflows; see `📐 **Studio unified shell contract**` and sequenced **⭕1** items across **Administration**, **Card Management**, **Media Management**, and **Tag Management**.
- **Card Management** - Core CRUD, card schema, edit flows, collection route.
- **Media Management** - Assigned/unassigned filtering, replace-in-place, card-reference-aware delete.
- **Collections Management** - Parent/unparent cards, reorder cards.
- **Tag Management** - Hierarchical admin, DnD/reparenting, inline edits.
- **Question Management** - CRUD and create-card linkage workflow.
- **User Management** - Users model and admin user workflow.
- **Theme Management** - Set parameters for colors, fonts, etc.
- **Scripts** - `package.json` scripts for migrations, reconciliation, one-off repairs, and emergencies. See `01-Vision-Architecture.md` → **TECHNICAL** → **Scripts** and `docs/NPM-SCRIPTS.md`.
- **Error contract rollout** - Domain-coded JSON errors (`ok: false`, `code`, `message`, `severity`, `retryable`) and structured client parsing on scoped admin and reader routes (media, cards/AI, tags, questions, users, theme, maintenance, import-preview); closeout 2026-04-20 per `docs/03-Implementation.md` evidence—residual opportunistic polish non-blocking.
- **Integrity gate (CI)** - Blocking integrity tests on PR/merge for card–media edges, `referencedByCardIds`, tag counts/derived fields; emulator-backed job non-blocking—definition of complete per `docs/03-Implementation.md` Phase 1.

⭕1 **Planned**
- **Studio desktop shell** - Desktop-only `/admin/studio` multi-pane layout and one session-scoped selection model (`cardId`, media selection); placeholder regions acceptable before pane fill (`📐 **Studio unified shell contract**`).
- **Studio IA demotion** - Execute navigation hygiene from `📐 **Studio unified shell contract**` (6): hide or demote primary admin IA for `/admin/collections`, Card Management **Collections** when redundant, and `/admin/media-triage`; routes may remain in repo.
- **Studio curated tree integration** - Curated tree pane in Studio with attach/detach/reorder using existing `updateCard` semantics, `fetchAdminCardSnapshot`, and optimistic rollback patterns (`📐 **Studio unified shell contract**` (2); technical baseline in `docs/03-Implementation.md` → `📐 **Studio program status (2026-04-21)**`).
- **Studio selected-context elimination** - Collapse **Selected card context** into **in-shell Card Edit**: register the same Studio **`@dnd-kit`** targets on cover, gallery, and children as today’s **`StudioCardRelationshipPanel`**, driven by **`handleStudioRelationshipDragEnd`** / **`patchSelectedCard`**; reconcile **`ChildCardManager`** / **`GalleryManager`** nested **`DndContext`** with the Studio outer **`CollectionsAdminClient`** context; keep **`CoverPhotoContainer`** paste and file-drop; use **Media admin** for bank→card drags; remove the duplicate relationship column when parity is reached (`📐 **Studio media & body (2026-04-22)**`).
- **Studio inline tags without modal** - In **Studio Card Edit**, surface **`CardDimensionalTagCommandBar`** (or equivalent) so dimensional tags are edited inline without requiring **Edit tags** for routine work.

⭕2 **Future**
- **Maintenance Management** - Admin UI over existing secured maintenance APIs (`POST /api/admin/maintenance/*`: reconcile, cleanup, backfill, diagnose-cover). A Maintenance tab existed previously and was removed; restore when in-app diagnose/fix outweighs CLI + manual HTTP. Today: `docs/NPM-SCRIPTS.md` and `npm run …` scripts.
- **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin — restore bounded deduping to cut duplicate `/api/cards` requests where safe.

📐 **Studio unified shell contract** - **(1)** Admin **left rail** with **full Tag Admin** on canonical `TagProvider` (add/delete/edit/reorder/reparent—parity with `/admin/tag-admin`). **(2)** **Card** area with Card Management–grade capabilities plus **curated tree** pane (`childrenIds` / `curatedRoot`). **(3)** **Media** area with **`/admin/media`–grade** lists, filters, and actions. **(4)** **In-focus editing** — live **Card Edit** for selected card in-shell is the **primary** surface for cover, gallery, children, and (with incremental work) body media; relationship-style DnD and compact panels **converge here** instead of a parallel **Selected card context** column once **`Studio selected-context elimination`** ships; media caption/tags/import/bulk/delete stay in embedded media admin (no duplicate full-page Media Edit—`📐 **Studio media & body (2026-04-22)**` in **Card Management**). **(5)** Questions, Users, Themes **outside** Studio. **(6)** **Navigation hygiene** — demote routes per **Studio IA demotion**. **(7)** **DnD** — broaden contract only after shell layout validated; keep existing implementations where cost-effective (`📐 **Studio program status (2026-04-21)**` in `docs/03-Implementation.md`).
📐 **Data integrity (write paths & drift)** — Server behavior must match `docs/01-Vision-Architecture.md` → **TECHNICAL** → **Backend** (*Card–media integrity*, *Delete graph*, *Durability boundary*). Touchpoints and ownership live in **Media Management** → **Cross-entity sync** (card create/update/delete, media delete/cleanup, Typesense, counts). **Operational reality until code is fully aligned:** drift and orphan checks use **`npm run reconcile:media-cards`** and related scripts cataloged in **`docs/NPM-SCRIPTS.md`**.
📐 **Errors & operator messaging** — Use a shared backend error shape (domain code + user-safe message + optional actionable detail) and consistent UI channels (inline/banner/dialog/toast) so admin and reader flows communicate failures predictably. Card PATCH when stale `coverImageId` / missing `media` is the first known sharp edge; align route-by-route with `docs/04-Theme-Design-Contract.md` §10 instead of surfacing opaque Firestore/transport errors directly.

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
- **Writing Assist** - Admin-only AI suggestion endpoint is active (`POST /api/ai/suggest-card-drafts`) with suggestion-only outputs; no auto-apply.
- **Admin Ordering** - Admin lists support deterministic order controls (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with explicit tie-break behavior and no random ordering default.
- **Admin filter depth** - Card admin supports card-dimension missing filters (`Card Who/What/When/Where: No tags`) and page-level media-signal row filters (`Media Who/What/When/Where`) layered on the visible admin list.
- **Bulk tag mutation path** - `POST /api/cards/bulk-update-tags` add/remove mode now uses a dedicated batched service (`bulkApplyTagDelta`) that updates card tag-derived fields and tag counts in bulk transactions instead of per-card `updateCard` calls.
- **Card edit labels** - Card edit now uses concise section/button labels (`Gallery`, `Add`) and removes legacy child-card helper copy (`Add...`, `Current Children`).
- **Card edit control grouping** - `Status`, `Type`, and `Display Mode` controls are grouped in the top card-edit header section.
- **Studio card edit** - `/admin/studio` embeds **`CardForm`** + **`CardFormProvider`** for the session-selected card (`StudioShellContext`); **PhotoPicker** + TipTap **clipboard paste** unchanged today; delete/duplicate/full chrome via linked full-page Card admin (`StudioCardEditPane`). **Direction:** absorb **Selected card context** DnD and inline relationship editing into this column per **`Studio selected-context elimination`**; **PhotoPicker** superseded by **Media admin** + **`PhotoPicker convergence in Media admin`** over time.

⭕1 **Planned**
- **TipTap body media from bank (Studio)** - In **Studio** in-shell edit, support **drag** (and **paste** where aligned with editor behavior) from **Media admin** into **TipTap** **content** with correct inline node insertion—larger integration than cover/gallery drop slots (`📐 **Studio media & body (2026-04-22)**`).
- **Tree candidate filters** - Card admin list filters and sorts produce **curated-tree attach candidates** (e.g. no parent / not yet in tree) so a dedicated Studio **unparented** column stays optional (`📐 **Studio media & body (2026-04-22)**`).
- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.
- **Grid tag-chip layout** - In Card Management grid view, move dimensional tag chips to a left-side vertical stack and remove inline dimension-label text (`Who`, `What`, `When`, `Where`) so chips carry the signal without redundant labels.
- **Grid density reduction** - Reduce Card Management grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances.
- **Card edit layout polish** - Align card-edit page chrome and section hierarchy for a cleaner authoring flow: header/back/action alignment, consistent section heading scale, tighter spacing between Body/Tags/Gallery/Child Cards, and clearer section ordering.
- **Tag picker ergonomics** - Keep macro-tag editing compact and predictable in card edit: controlled expansion below the command bar, root-first dimensional presentation, and searchable keyboard-friendly result selection with path clarity.

⭕2 **Future**
- **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).
- **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question→card linkage. Deferred until after import.
- **Relationship DnD contract (cards ↔ media ↔ tags)** - Standardize direct-manipulation assignment/reorder flows so operators can drag and drop media to card targets (cover/gallery/children where applicable), reorder parent-child card structure, and add/remove relationship edges without modal-heavy seek/insert loops; require keyboard parity and clear drop semantics. **Sequencing:** resume only after **Studio desktop shell** and related Studio **⭕1** layout are validated (`📐 **Studio unified shell contract**` (7)); avoid DnD that assumes pre-shell layouts.
📐 **Card-first orchestration lens** - Primary admin workflow is card-centric orchestration; media and tags remain first-class domains but operate as relationship panels/actions around the active card context instead of independent form-first workflows.
📐 **Studio shell & navigation (2026-04-21)** - **Endgame** for `/admin/studio`: one shell for **all** content-based admin (cards, media, tags + relationships)—left-rail **full tag admin** for admins (same **⭕1** intent as **Tag Management** → **Sidebar integration model** for `/view`); **full card admin** plus **curated tree** pane; **`/admin/media`–grade** media pane; **Card Edit** in-shell for the selected card; **media** work in the **media admin** pane (see `📐 **Studio media & body (2026-04-22)**`); Questions/Users/Themes **outside** Studio. **Supersedes** `📐 **Studio orchestration decisions (2026-04-20)**` item (2) (deferring embedded `CardForm`)—persistent **Card Edit** in Studio is **in scope** once the shell fits. Item (3) from 2026-04-20 (**compact** `CollectionsMediaPanel` bank + drag to cover/gallery) remains a **building block** but is **not** the final media story; **full** media admin in-pane is required. **DnD:** program **paused** as the primary build track until shell feasibility is settled; curated-tree DnD shipped for Collections/Studio embedding remains code until reconciled with the new layout.
📐 **Studio media & body (2026-04-22)** - **Unparented list:** a dedicated Studio **unparented** column is **optional** if **Card Management** filter + sort can produce the **candidate card list** (e.g. no parent / not yet in tree) for attach into the curated tree—**today** the **Attach candidates** bank fulfills that role. **TipTap body images:** keep **clipboard paste**; add **Media admin → body** when **`TipTap body media from bank (Studio)`** lands. **Cover / gallery / children in Studio:** **Media admin** is the library surface—**drag** to targets registered on **in-shell Card Edit** (replacing the separate **Selected card context** column per **`Studio selected-context elimination`**). **PhotoPicker:** **retain** in full-page card edit until **`PhotoPicker convergence in Media admin`** supplies bank import + library pick parity; **end state** is **no parallel picker** for Studio and eventually card edit.
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
📐 **IA vs Studio** - Full-page `/admin/collections` remains the structural tree surface today; once Studio’s curated pane is the default workflow, **primary admin navigation** should not advertise this route separately (code may remain until removal is safe).

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

*Features*
✅ **Complete**
- **Core** - Firestore `media` collection; types in `src/lib/types/photo.ts`; import/process/`replace` in `src/lib/services/images/imageImportService.ts` (and related APIs). Display: `JournalImage`, `getDisplayUrl` (`src/lib/utils/photoUtils.ts`).
- **Search** - With Typesense configured (`TYPESENSE_HOST`, `TYPESENSE_API_KEY`): `media` index, facets, and `searchMediaTypesense` drive non-empty text search plus several filtered list paths (including `assignment=assigned|unassigned` when Typesense is used). **Without Typesense, non-empty text search on `GET /api/media` returns HTTP 503** (`SEARCH_UNAVAILABLE`); Firestore seek/pagination still serves unfiltered lists and legacy tag-dimension seek. Sync scripts: `docs/NPM-SCRIPTS.md`.
- **Import paths** - Local drive / PhotoPicker / paste-drop via `src/lib/services/images/imageImportService.ts`; folder-as-card (`__X` marker, `IMPORT_FOLDER_MAX_IMAGES`, `ONEDRIVE_ROOT_FOLDER`) — full rules in `docs/IMPORT-REFERENCE.md` and `normalize-images-README.md`.
- **Card edges** - `referencedByCardIds` is **denormalized**: updated on the primary `createCard` / `updateCard` and media-delete cleanup paths, but **not a verified invariant**—drift is possible. Unassigned/assigned UX uses `referencedByCardIds` plus `mediaAssignmentSeek.ts` (and Typesense when that path is active). Diagnosis/repair: `npm run reconcile:media-cards`, other scripts and maintenance HTTP — `docs/NPM-SCRIPTS.md`.
- **Admin** - Multi-dimensional filter, replace-in-place (`POST /api/images/{id}/replace`), per-row metadata/tags (`PATCH /api/images/{id}`), **bulk tag edits** (`POST /api/admin/media/tags` — add/replace/remove across many `mediaIds`), bulk modes, multi-select → draft gallery card (`MediaAdminContent`).
- **Bulk media tag mutation path** - `POST /api/admin/media/tags` now applies add/replace/remove through a dedicated batched service (`bulkApplyMediaTags`) that updates media tag-derived fields and tag counts in bulk transactions, then recomputes affected card media signals once per request.
- **Media delete/referrer resolution** - media delete now resolves referrers from authoritative card surfaces (cover, gallery, `contentMedia`, inline `data-media-id`) instead of trusting `referencedByCardIds` alone, removes references across all card surfaces in one pass, and blocks delete if references remain.
- **Media delete guard contract** - `DELETE /api/images/{id}` now returns `409` with code `MEDIA_DELETE_BLOCKED_REFERENCES` when authoritative referrer cleanup cannot fully detach the media from cards.
- **Media API error contract (initial standardization slice)** - `GET /api/media`, `PATCH /api/images/{id}`, `DELETE /api/images/{id}`, `POST /api/admin/media/tags`, `POST /api/images/{id}/replace`, `POST /api/images/browser`, `POST /api/images/local/import`, `POST /api/import/folder`, and `POST /api/import/batch` now return domain-coded JSON errors (`code`, `message`, `severity`, `retryable`) instead of raw/opaque response text; Media admin/triage rendering now distinguishes warning vs error severity in list-level feedback.
- **Media identity signals in admin UI** - Media admin now exposes canonical identity in-list (`media.docId` column in table mode) and on grid cards (`id` and `sourcePath` lines) so operators can triage duplicates without relying on filename uniqueness.
- **Unassigned duplicate triage sort mode** - In Media admin, when `On cards = Unassigned`, operators can switch to `Source-path first` ordering to cluster likely duplicates for faster keep/delete decisions.
- **Per-dimension media filters** - Media admin now supports per-dimension filter modes for Who/What/When/Where (`Any`, `Has any`, `Is empty`, `Matches tag`) in both table and grid views.
- **Grid tag editing UX** - Media grid cards now provide inline `Edit tags…` with the existing searchable tag selector (select/remove + save) so operators can retag media without leaving grid mode.
- **Grid tag save feedback** - Inline media retagging now surfaces per-card save confirmation and keeps the editor open with actionable error text when save fails.
- **Admin pagination consistency** - Media Admin and Media Triage now use consistent Previous/Next pagination messaging for seek/indexed lists, including the same seek-mode hint and total-items phrasing.
- **Media table header attachment** - Media table headers now stay attached to the top edge of their active scroll container in both full Media Admin and compact embedded media tables.
- **Triage** - Admin route `/admin/media-triage`: three-pane workspace (queue · preview/caption · media tags) over the same `MediaProvider` / `GET /api/media` list as Media admin; **target:** superseded by Studio media workflows—demote from primary admin IA per **Studio IA demotion** and `📐 **Studio unified shell contract**` (6).
- **Studio** - Admin route `/admin/studio`: **prototype** combined shell—tag admin tree (`useTagManagement` + `TagAdminList`), embedded `CollectionsAdminClient` (`embedded`) (curated tree · unparented · selected card context), **`MediaAdminContent`** (`embedded` + `studioSourceDraggable`) for `/admin/media`–grade bank, in-shell **`CardForm`** column, and Collections-style DnD (cover/gallery, child reorder/attach where enabled). **Endgame** in **Card Management** → `📐 **Studio shell & navigation (2026-04-21)**` and `📐 **Studio unified shell contract**`; execution order in `docs/03-Implementation.md` Phase 2.
- **Studio embedded media admin** - `MediaAdminContent` in Studio uses the same `MediaProvider` + filters/table/grid/bulk/import/delete as full `/admin/media-admin`; **table** and **grid** cells expose a drag handle registering `source:{mediaId}` when `studioSourceDraggable` is on (requires `CollectionsAdminClient` `DndContext`).
- **Studio media assignment** - Drag `source:*` from the embedded media bank onto **Cover** or **Gallery** (**today:** **`StudioCardRelationshipPanel`** / **`handleStudioRelationshipDragEnd`**; **target:** same drop ids on **in-shell Card Edit** per **`Studio selected-context elimination`**); **PhotoPicker** and TipTap **clipboard paste** remain until **`PhotoPicker convergence in Media admin`** and body-bank work per `📐 **Studio media & body (2026-04-22)**`.
- **Bank-only** - No temporary or active status; imported media is in the bank. Assignment and unassigned filtering use `referencedByCardIds` and `GET /api/media?assignment=unassigned|assigned` (`mediaAssignmentSeek.ts`).
- **Import Metadata** - Import reads embedded metadata (caption + keyword paths from XMP/IPTC/EXIF via ExifTool) and resolves keywords to app tag IDs in the import path.
- **Import metadata policy** - For scoped import paths, embedded captions/keywords are the app contract; JSON sidecars are out of scope (decision closeout 2026-04-20; regression via `readMetadataCaption` in integrity tests).

⭕1 **Planned**
- **PhotoPicker convergence in Media admin** - Add operator flows in **`/admin/media`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (`📐 **Studio media & body (2026-04-22)**`).
- **Media identity & duplicate signals** - In admin lists, treat `media.docId` as canonical identity; `filename` is display metadata and may collide (`image.webp`, etc.). Add optional canonical columns/signals (for example `docId`, normalized `sourcePath`, checksum/hash/size where available) so duplicate triage and operator actions do not depend on filename uniqueness.
- **Unassigned duplicate triage** - Add explicit triage flow for `assignment=unassigned` items that appear duplicated by source-derived/content-derived signals, with sortable/groupable views (starting with `sourcePath`) to quickly confirm, keep, merge intent, or remove.
- **Grid admin ergonomics** - In Media **grid** view, remove filename text from the card body, increase bulk-select checkbox target sizes (row and select-all) for reliable admin use, and keep visual focus/checked states obvious.
- **Grid tagging UX + empty-dimension filter** - Replace truncated/illegible grid tag display with an admin-usable layout (readable removable chips and inline add/search affordance on each item), align interaction model with card-management tagging (`search → selectable results → chips with remove X`), and support per-dimension filter modes (`has any`, `is empty`, `matches tag`) for Who/What/When/Where.

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

📐 **`referencedByCardIds` (referrer list)** — Denormalized convenience for assignment filters and delete orchestration. `cardService.getCardsReferencingMedia` now performs an authoritative scan across cover, gallery, `contentMedia`, and inline HTML references, then reconciles `referencedByCardIds` to that result; delete uses this same scan and fails safe when references remain.

📐 **Display identity vs canonical identity** — `filename` is presentation metadata and is not unique. Canonical identity is `media.docId`; duplicate detection/triage should rely on stable source/content signals (`sourcePath`, hash/checksum, dimensions/size), not filename alone.

📐 **Cross-entity sync** — Firestore is authoritative; Typesense and denormalized fields follow these entry points:

| Relationship | Primary maintenance |
|--------------|---------------------|
| Card ↔ media `referencedByCardIds` | `createCard` / `updateCard` (transaction `arrayUnion` / `arrayRemove`); `removeMediaReferenceFromCard` + `deleteMediaWithCardCleanup` |
| Card ↔ Typesense | `syncCardToTypesense` after create/update paths; `removeCardFromTypesense` on card delete |
| Media ↔ Typesense | `syncMediaToTypesenseById` / `syncMediaToTypesense` on media writes; `removeMediaFromTypesense` on media delete |
| Card ↔ tag `cardCount` (and ancestors) | `updateTagCountsForCard` inside card transactions (tag changes, publish state, `deleteCard`) |
| Card ↔ questions | `unlinkCardFromAllQuestions` after `deleteCard`; link/unlink APIs update `usedByCardIds` + `usageCount` |
| Drift / bulk repair | Ad hoc: `npm run sync:typesense` / `sync:typesense:media`; `npm run reconcile:media-cards`; other scripts under `src/lib/scripts/`. CRUD paths are the **happy path** for consistency, not a formal proof—use scripts when drift is suspected or after bulk imports. |

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
- **Studio tag rail** - Full Tag Admin workflows in Studio **left rail** on `TagProvider` per `📐 **Studio unified shell contract**` (1); coordinates with **Sidebar integration model** for `/view`.
- **Sidebar integration model** - **Today:** canonical `TagProvider` tree powers **filter-only** `/view` left-sidebar controls for **all** signed-in users and full tag create/edit/reorder/reparent (including DnD) on `/admin/tag-admin` and in the Studio tag column prototype—**not** a second taxonomy. **Planned:** **role-dependent** views on that same tree—**admins** on `/view` get **full tag-library maintenance** in the left sidebar (parity with `/admin/tag-admin`: add/delete/edit/reorder/reparent); **viewers** unchanged. `/admin/tag-admin` stays until **Studio tag rail** + `/view` admin sidebar fully replace those workflows (`📐 **Studio unified shell contract**` (1)).
- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."
- **Node Strategy** - Raw tag overlay to created aggregations.

⭕2 **Future**
- **DnD interaction contract** - Before expanding drag-and-drop to additional admin flows (card assignment, gallery/media assignment, broader tree operations), standardize one interaction contract across admin DnD surfaces: drop semantics (on vs between), sensors/activation thresholds, visual drop indicators, drag handles, and keyboard parity. Expansion is gated on this consistency pass. **Sequencing:** resume with **Relationship DnD contract (cards ↔ media ↔ tags)** in **Card Management** after **Studio desktop shell** and related Studio **⭕1** layout are validated (`📐 **Studio unified shell contract**` (7)).
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
- **Custom Themes** - Allow customizable light and dark modes and, over time, **whole design packages** the author can switch between.

*Principles*
- **User-Controllable** - The author can adjust parameters; the implementation should converge on **presets** that stay coherent together.
- **Reader vs admin** - Polish targets the **reader** experience first; admin uses the **same token set** where parity helps (previews, shared components), without blocking dense authoring layouts.
- **Professional + journal** - Aim for a UI that reads as **well-crafted and mobile-centric** while still allowing a **warm, journal/history** personality—usually via tokens (color, type roles, spacing), not ad hoc CSS.

*Features*
✅ **Complete**
- **Light/Dark Toggle** - Theme toggle in top navigation.
- **Admin Page** - Theme admin for color and font parameters (`src/app/theme.css` as the runtime token sheet; admin persists into the theme model the app applies).

⭕1 **Planned**
- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.
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