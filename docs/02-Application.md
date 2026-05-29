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
- Keep `📐` and `📘` outside the status buckets. Use standalone `📐` / `📘` lines when the items are few or should remain individually referenceable; use a single `📐 Decisions` or `📘 Resources` label with bullets underneath when a section has a cohesive local cluster.
- `**📐` vs `⭕`:** `📐` records **design stance, data shapes, and operational truth** (including known gaps between intent and enforcement). It is **not** the execution backlog. When a gap should be fixed in code, add an explicit `**⭕1` / `⭕2`** bullet—do not rely on `📐` alone to imply scheduled work.
- `**✅` wording:** Describe **what is implemented and wired today**. Avoid implying stronger guarantees than the code provides (e.g. treating a denormalized field as a proven invariant).
- This document is the **canonical application/product behavior spec by surface**. It should state what the user can do, how the surface is expected to behave, and what quality/trust bar applies.
- Keep migration notes, dated stabilization history, and execution sequencing out of `02` unless they materially define current product behavior. Put sequencing in `03`.

---

## **Application**

*Intent*

- **Content Consumption** - Private, read-oriented browsing of stories, images, and related content; optimized primarily for mobile, with tablet and desktop support.
- **Content Administration** - Authoring and organization of cards, media, tags, and relationships; optimized primarily for desktop, with only minor or supporting mobile edits.

*Principles*

- **Ease of Use** - Core reader and admin flows should feel obvious and low-friction.
- **Responsiveness** - Reader and admin surfaces should respond quickly enough to preserve trust and flow.
- **Bulk Authoring** - Administration should support efficient high-volume organization and editing.
- **Low-friction Editing** - Small corrective edits should be possible without forcing a full workflow transition.
- **Few Primitives** - The product centers on cards, media, tags, and relationships rather than multiplying surface types.
- **Mode Clarity** - Consumption and administration should stay distinct even when linked by quick-edit affordances.
- **Trust by Default** - Privacy, data ownership, recoverability, and author control are product behavior.
- **Quality Bar** - Reader and admin surfaces should feel deliberate, stable, and credible in real use.

*Features*
✅ **Complete**

- **Surface Split** - The application has distinct reader and admin surfaces with separate routes and explicit editing context.
- **Role Boundary** - Reader use and admin authoring stay separated by session and route boundaries; admin-only operational routes remain restricted to administrators.
- **Reader Shell Stability** - Protected reader routes keep their shell chrome and navigation context stable during client session hydration.

⭕2 **Future**

- **Reader-to-Admin Entry Points** - Add admin-only quick-edit or deep-link affordances from reader surfaces.
- **Accessibility Hardening** - Strengthen typography, contrast, tap-target, keyboard, alt-text, and reduced-motion support for the family-reader audience.
- **Print / Export to Book**

📐 **Decisions**

- **Architecture Split** - Keep content consumption and content administration as separate top-level surfaces to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
- **Future Editing Path** - Keep the top-level split, but add admin-only on-the-fly editing affordances from reader surfaces as a later optimization.
- **Mobile v1 Scope** - Mobile first launch is reader-only; Studio/admin are not a mobile target in v1.
- **Product Shape** - v1 is a private hosted journal focused on turning large personal photo libraries into smoother structured story consumption for family readers.

## **Navigation**

*Intent*

- **Discovery** - Help readers move through content, collections, and filters without losing context.
- **Control Surface** - Keep primary navigation and filtering reachable across mobile and desktop.

*Principles*

- **Continuity** - Navigation should preserve reading flow rather than interrupt it.
- **Single Filter Surface** - Filtering and discovery controls should live in one canonical left-side surface.
- **Platform Clarity** - Mobile and desktop may differ in presentation, but the task model should stay recognizable.
- **Responsive Contract** - Desktop vs narrow layout, breakpoints, sidebar toggle behavior, and main feed column rules are defined in `docs/04-Theme-Design-Contract.md` Section 9; implementation must match that section.

---

### **Home Page**

*Intent*

- **Entry Point** - Provide the authenticated entry into the application.
- **Brand Framing** - Introduce the journal visually without competing with login.

*Principles*

- **Simple** - Keep login obvious and low-friction.
- **Lightweight** - Preserve branding without turning the page into a dense landing experience.

*Features*
✅ **Complete**

- **Login Page** - Application opens to home page with login form and SVG logo.
- **Home Layout**  - Login splash with the current `Title-light2` / `Title-dark2` artwork, added spacing between logo and form, and no nav bar. Redirects to /view after login.

---

### **Top Navigation**

*Intent*

- **Orientation** - Keep the current app context visible without dominating the reading surface.
- **Global Controls** - Provide access to navigation, theme, account actions, and contextual return.

*Principles*

- **Compact** - Preserve vertical space for reader and admin content.
- **Clear Actions** - Back, menu, and theme controls should be immediately legible.

*Features*
✅ **Complete**

- **Header** - Centered logo, contextual Back button, hamburger menu (content/admin/theme/signout).
- **Logo** - Same `Title-light2` / `Title-dark2` title artwork as home; compact height in header (`Navigation.module.css`).
- **Hamburger** - Dropdown menu with content links (all users), admin links (admin only), theme toggle, and sign out; this is now the primary admin-entry surface as well.
- **Theme toggle iconography** - Light/dark switching now uses compact sun/moon icon treatment instead of reader-facing text labels.
- **Density** - Header height and hamburger spacing are reduced to preserve more vertical space for reader and admin content.

⭕1 **Planned**

- **Top-nav refinement**
  - Tighten logo prominence, back-button clarity, hamburger contents, and chrome density so the header feels deliberate without reclaiming excess vertical space.
  - In reader-only mode, the preferred direction is a minimal control surface unless another named reader theme becomes a real product option.

❓ **Open**

- **Top-nav refinement scope** - Confirm the long-term header contract for logo prominence, back-button emphasis, hamburger contents, and overall chrome density before another round of piecemeal changes.

---

### **Left Navigation**

*Intent*

- **Primary Doorway** - Serve as the main doorway into the reader experience: the place readers enter guided structure, freeform discovery, and filter-driven exploration.
- **Discovery Filters** - Support content discovery through one consistent filter and browse surface.
- **Mode Navigation** - Make Guided and Freeform browsing reachable without losing context.

*Principles*

- **Core Surface** - The left navigation is a primary product surface, not a secondary utility panel. Its architecture and interaction model must feel fluid, easy, capable, and trustworthy in real use.
- **Reachable** - Filter and browse controls should stay accessible across desktop and mobile.
- **Compact** - The sidebar should carry dense controls without becoming hard to scan or tap.
- **Mode-aware** - Guided and Freeform may differ in controls, but each should expose a coherent model.

*Features*
✅ **Complete**

- **Drawer vs Sidebar** - At narrow widths, the left navigation becomes a drawer with overlay/backdrop behavior; at wider widths it remains a sidebar. Filter access remains visible across widths per `docs/04-Theme-Design-Contract.md` Section 9.
- **Guided and Freeform** - Reader navigation supports distinct Guided and Freeform browse modes, with Guided as the default on open and local persistence of the selected mode.
- **Guided Navigation Model**
  - Guided presents the curated collections tree as a read-only navigable outline with expand/collapse controls rather than reusing Freeform filter controls.
  - Guided collection roots come from the real curated structure rather than a shallow recent-card scan.
  - Draft collection roots stay hidden from non-admin readers; admins see them styled as warning-state entries in the same tree.
- **Freeform Filtering Model**
  - Freeform filtering is scoped to `Who | What | When | Where`, with `Who` as the default dimension.
  - Freeform supports five card-type toggles: Story, Gallery, Question, Quote, and Callout. All five active means no type filter.
  - The checkbox applies selected tags plus descendants when enabled, and exact selected tags only when disabled.
  - Tag search narrows the visible tree without dropping selections, and selected tags remain visible as chips grouped by dimension.
  - Clearing filters in Freeform stays on the Freeform feed path instead of switching back to collection-style results.
- **Freeform Controls**
  - Freeform exposes a `Cards | Media` browse-target toggle so the reader sets content scope before filtering.
  - Freeform supports `Sort by` and `Group by` controls, with grouped sections rendered in-feed when enabled. Guided follows curated tree order instead of these controls.
  - Freeform keeps `Sort by` and `Group by` behind a compact disclosure rather than always occupying primary sidebar space.
- **Freeform Layout**
  - In Freeform, the control stack stays pinned while only the tree region scrolls.
  - Freeform sidebar controls, spacing, and tree rows are intentionally denser so filtering remains usable on narrower desktop widths and in the mobile drawer.
  - Desktop sidebar placement keeps the Explore header and primary controls higher in the working area.
- **Reader Ordering**
  - Freeform supports archive-wide seeded `Random` plus deterministic `When`, `Created`, `Title`, `Who`, `What`, and `Where` ordering.
  - Guided follows curated tree order, and text search remains relevance-first.
- **Local Tree Controls** - Reader and admin tag trees provide local `Expand all` / `Collapse all` controls backed by browser-persisted expansion state rather than shared defaults.
- **Admin Sidebar Variant** - On `/view` in Freeform mode, admins can switch between `Filter` and `Tag library`; viewers remain filter-first only. Canonical tag-library behavior is owned by **Tag Management**.

📐 **Decisions**

- **One Filter Surface** - The left sidebar/drawer remains the canonical discovery and filtering surface; narrow widths use a drawer rather than a competing bottom-navigation pattern.
- **Primary reader control surface** - The left sidebar/drawer is the reader's main control surface and entry into the archive's structure, filters, and browse modes. Refinements to this area should prioritize clarity, flow, and confidence over decorative variation or secondary chrome concerns.
- **Guided vs Freeform Contract** - Guided and Freeform are intentionally different navigation models: Guided follows curated structure, while Freeform exposes taxonomy, target, and ordering controls.
- **Admin Reader Variant** - Admins may get additional reader-side library/edit affordances where useful, but viewer navigation remains filter-first and read-oriented.

⭕1 **Planned**

- **Left-nav refinement**
  - Continue simplifying control order, browse-target clarity, and mobile ergonomics so Guided and Freeform remain easy to understand across widths.
  - Current preferred direction: keep `Cards | Media` visibly above taxonomy browsing and make the Freeform header row feel more intuitive without adding competing controls.

⭕2 **Future**

- **Guided tree mobile ergonomics** - Increase practical finger usability of the guided/tag tree rows and controls beyond the current desktop-acceptable baseline where needed in real mobile use.
- **Drawer gesture refinement** - Keep improving narrow-width drawer-open and drawer-close behavior so in-app navigation wins cleanly over browser-history gestures without changing the core drawer model.
- **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
- **Collection Metadata** - Implement collection metadata (child counts).
- **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.

❓ **Open**

- **Group by control** - Confirm whether reader sidebar should keep `Group by` as a primary control or move/remove it.
- **Created sort visibility** - Confirm whether `Created` sort options remain visible in reader sidebar or move behind an advanced mode.
- **Guided tree responsiveness** - Guided tree can feel slow to load in hosted reader use; confirm whether the issue is first-load latency, delayed selection feedback, or both before changing the reader interaction contract.

---

## **Content**

*Intent*

- **Story Consumption** - Present stories, images, and related content as a coherent reading experience.
- **Mixed Media** - Support narrative, gallery, question, quote, and callout content within one reader surface.

*Principles*

- **Curated and Freeform** - Support both directed and exploratory reading.
- **Single Structure** - One card schema should support multiple content families and presentation behaviors.
- **Differentiated Presentation** - Card families should feel distinct without requiring separate content systems.
- **Author Control** - Mixing, ordering, and display behavior should remain author-controlled rather than inferred opaquely.

*Features*
✅ **Complete**

- **Guided or Freeform** - Content can be consumed through authored structure or exploratory browsing.
- **Mixed Feed** - The reader surface supports mixed card families within one continuous feed.
- **Display Modes** - Cards use `static`, `inline`, or `navigate` presentation depending on card family and reader context.
- **Author-controlled Presentation** - Content mixing, ordering, and display behavior are controlled by the author.
- **Contextual Filtering** - Active navigation/filter state controls which subset of content appears in the feed.
- **Mobile-first Reading** - Reader content is optimized for touch scrolling and responsive consumption.
- **Display-type Enforcement** - Card family and display-mode combinations are constrained so reader behavior stays intentional rather than arbitrary.

---

### **Content Page**

*Intent*

- **Immersive** - Immersive content consumption experience.
- **Engaging** - Presenting an engaging interface and fluidly scroll through the stories--up and down, left and right.

*Principles*

- **Dual-Path** - FreeForm or Curated
- **Reader-first trust** - Reader behavior should feel stable and intentional: no accidental admin leakage, no confusing dead ends, and no interaction model that appears broken or random to family readers.

*Features*
✅ **Complete**

- **Feed Structure**
  - The reader feed uses `CardFeedV2` -> `V2ContentCard` (`src/components/view/`) on `/view`.
  - The feed is a responsive grid and becomes a **single column at `max-width: 768px`** per `docs/04-Theme-Design-Contract.md` Section 9.4.
  - Feed chrome includes the header, search row, type chips, and `@` card mentions via `CardMention` / `TipTapRenderer`.
  - Feed edits patch visible card data in place through the feed state owner, so title, cover, and focal-point saves update immediately without reordering the current feed.
- **Card Interaction Model**
  - Feed tiles link to `/view/[id]` only when `displayMode === 'navigate'` and `type` is `story`, `gallery`, or `qa`. Other types/modes render as non-link tiles (`V2ContentCard.tsx` `isInteractive`).
  - Card schema uses `type`: `story` | `gallery` | `qa` | `quote` | `callout` and `displayMode`: `static` | `inline` | `navigate` (`src/lib/types/card.ts`).
  - Collection structure is carried by `childrenIds` on any type rather than a separate collection-only card type.
  - `CardDetailPage.tsx` and the reader view components under `src/components/view/` render the open-card experience.
- **Card Content Presentation**
  - Title, subtitle, excerpt, and main body (TipTap) roles vary by card type and display mode.
  - Feed and detail behavior follow the conventions in **Content Page** and **View Page**.
  - Closed reader `Story` and `Gallery` cards show a type badge plus up to four derived context chips (`Who`, `What`, `When`, `Where`) based on direct card tags and ancestry; `Question` cards participate in the same context system where appropriate.
  - Open reader cards render the same badge/context-chip language above the title so feed and detail share one orienting metadata treatment.
- **Gallery Card Presentation**
  - Gallery-card **inline** vs **navigate** behavior and **caption** options are governed by the **V1 Matrix** below and the implemented reader/card components.
  - Closed gallery cards expose a visible swipe affordance plus slide count in the feed when multiple inline images are present.
  - Closed gallery cards render the active inline image caption as a bottom overlay while swiping through feed-card images.
  - Compose cover focal editing currently previews against the fixed closed-feed `6:5` media frame used by closed reader feed cards; other reader/admin surfaces still use different image-frame contracts.
- **Discovery and Suggestions**
  - Detail pages render structural children from the server plus discovery suggestions through `DiscoverySection`.
  - Similar / Explore suggestions come from `/api/cards/random` (`count=3`, tag dimensions from the current card).
  - Discovery rails use compact `V2ContentCard` treatment (`small` + `fullWidth`).
  - The structural child rail uses the reader-facing label `More...` rather than `In this story`.
- **Guided Reading Behavior**
  - Guided mode behaves like a TOC/outline flow: selecting a collection node shows that node's direct children rather than the parent card itself.
  - A sticky guided title bar keeps the current collection visible during scroll.
  - Leaf nodes remain selectable and show themselves in the feed.
  - Guided detail pages show authored structural children only; generic `Explore More`, random `Related`, and `Unrelated` discovery suggestions are suppressed whenever the effective reader mode is **Guided**. Freeform detail pages still render generic discovery.
  - Reader-facing guided context chrome no longer surfaces the internal word `Collection`; the selected guided title stands on its own.
  - Guided collection loading applies status visibility consistently for readers vs admins.
  - Guided parent selection clears stale return-position state, suppresses the prior collection snapshot while the next section loads, and shows an explicit guided transition state so collection changes do not appear to leave the previous cards open.
  - Guided feed grids use capped, container-aware card columns and explicit shrink constraints on card/media containers so cards do not overgrow in sidebar-constrained or mobile-like widths.
- **Reader Continuity**
  - Feed position and focused-card restoration are implemented when returning from a card-detail/edit flow to `/view`.
  - Reader feed loading waits for auth resolution before first fetch.
  - Layout-affecting CSS media queries use literal pixel breakpoints instead of `var(--breakpoint-*)`, matching the responsive contract in `docs/04-Theme-Design-Contract.md` Section 9.2.

📐 **Product vs code** - v1 intent: omit story excerpt on feed/detail; `StoryCardContent` still renders `excerpt` when the field is set-clear data or add a guard when enforcing.
📐 **Horizontal open** - Prefer horizontal open for long-form on mobile where the reader implements it.

⭕1 **Planned**

📐 **Reader priority (canonical)** - For demo and early product validation, Guided and Freeform should be treated as **equal-priority** consumption modes; neither is a secondary fallback.

- **Feed presentation refinement**
  - Define and enforce a single presentation contract across feed/detail/rail contexts for each `type` + `displayMode` pair, including interaction model (open vs expand), title/excerpt behavior, and media framing rules.
  - Reconcile closed-card sizing on wider desktop feeds so cover-mode changes do not leave mixed tile heights and awkward rhythm across adjacent cards while preserving the better mobile behavior.
  - Use cover media orientation metadata to choose from a bounded ratio set (landscape/portrait/square) per approved layout variant so best-fit rendering improves without degrading feed rhythm.
  - Strengthen overlay icon/button readability on card media without drifting into heavy-handed chrome; cues should remain quiet but clear against varied imagery.
- **Rail refinement**
  - Add a curated horizontal rail variant for qualifying sequences (for example, school/college story runs) with explicit eligibility, ordering, and card-size behavior separate from the default feed grid.
  - On smaller rail tiles, omit excerpts, tags, and content/gallery type icons so compact discovery cards stay clean and readable.
- **Story expansion refinement**
  - Add optional `Read more` progressive disclosure for story excerpts in feed cards, with deterministic truncation and explicit collapse/expand behavior that does not break feed scroll continuity.
- **Question-card visual cue** - Evaluate a question-card cover treatment (for example a question-mark overlay/cover treatment) so Question cards keep more visual interest in card views without pretending to be a different type.
- **Trivia card flip treatment** - Evaluate a `Trivia` card family for short prompt/answer content with a tap/click flip interaction (front = prompt, back = answer) so lightweight Q&A can feel distinct from full Question cards without forcing a detail-page open.
- **Questions / Quotes** - Source material (Word, books, Notion).
- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).

📐 **V1 Matrix** - Initial presentation contract for `type` + `displayMode` behavior by context:


| Type    | Display mode | Feed (default grid)                                                               | Feed (rail variant)                                               | Open card (`/view/[id]`)                              | Excerpt behavior                                          | Cover framing                                                          |
| ------- | ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| story   | navigate     | Interactive tile opens detail; title visible; excerpt optional behind `Read more` | Optional curated horizontal sequence tile; opens detail           | Full narrative page with title/subtitle/cover/content | Truncate in feed; optional `Read more` expansion in-place | Orientation-aware ratio bucket per variant (landscape/portrait/square) |
| story   | inline       | Non-interactive tile with title + excerpt/content preview                         | Optional only when explicitly curated; non-interactive by default | N/A (not used as open behavior)                       | Allow `Read more` for long preview text                   | Orientation-aware ratio bucket per variant                             |
| gallery | navigate     | Interactive tile with cover-first media                                           | Primary rail candidate; horizontal sequence of gallery tiles      | Detail page with gallery and related blocks           | No excerpt requirement; title-first                       | Orientation-aware ratio bucket per variant                             |
| gallery | inline       | Non-interactive tile; inline gallery preview allowed                              | Optional curated rail for quick browse                            | N/A (not used as open behavior)                       | Not excerpt-driven                                        | Orientation-aware ratio bucket per variant                             |
| qa      | navigate     | Interactive question tile opens detail answer page                                | Optional themed rail (for grouped Question runs)                  | Question + answer detail structure                    | Teaser optional; no `Read more` requirement in v1         | Orientation-aware ratio bucket per variant when cover exists           |
| qa      | inline       | Non-interactive tile with question + answer preview                               | Optional curated rail                                             | N/A (not used as open behavior)                       | Preview-first; no `Read more` requirement in v1           | Orientation-aware ratio bucket per variant when cover exists           |
| quote   | static       | Non-interactive quote tile                                                        | Optional quote rail for themed runs                               | Render quote body + attribution when opened directly  | Not excerpt-driven                                        | No cover required; if cover exists, use orientation-aware ratio bucket |
| callout | static       | Non-interactive callout tile                                                      | Optional callout rail                                             | Render callout content when opened directly           | Not excerpt-driven                                        | No cover required; if cover exists, use orientation-aware ratio bucket |


📐 **Matrix Rules** - Keep the matrix as the source of truth for feed/detail behavior; new variants (for example `short`) must be added to this matrix before implementation.

⭕2 **Future**

- **Bundle / `next/image`** - Code-split heavy routes; tuning feed image priority.
- **Gallery slider polish** - Dots, desktop arrows, child rails (see **Feed Types**).
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

- **Open Card Flow**
  - Clicking a navigate card opens `CardDetailPage.tsx` via server-side fetch (`getCardById`, `getCardsByIds` for children).
  - Detail components render conditionally based on card data presence.
- **Detail Content Structure**
  - Detail pages render title first, then subtitle, then cover image, then body content when those fields are present.
  - Body content renders through `TipTapRenderer`.
  - Galleries render on the view page per the current view-detail contract; feed-card gallery behavior remains governed by **Content Page**.
  - Structural children render on the detail page when present.
  - Question detail uses kicker `Question` plus `Answer` with TipTap content; Quote detail uses title, blockquote body, and attribution footer from `subtitle` / `excerpt` via `formatQuoteAttribution`; Callout detail uses standard title / subtitle / TipTap with no extra chrome.
- **Discovery Rails**
  - Structural child content renders as the reader-facing `More...` rail.
  - Similar / Explore suggestions each display three compact cards with lighter hierarchy.
  - Guided detail suppresses generic `Explore More`; Freeform retains generic discovery.
  - Structural child content renders from server props immediately, while `Similar Topics` and `Explore More` hydrate client-side after mount with per-group loaders in `DiscoverySection.tsx`.
  - Child-card hydration uses `getCardsByIds(..., { hydrationMode: 'cover-only' })` with first-gallery fallback when no cover exists, reducing read cost relative to full hydration.
  - Discovery rails use compact tile sizing, lighter section-title hierarchy, and increased surrounding spacing so the discovery block stays visually secondary to the article body.
- **Reader Access Boundary**
  - Reader routes (`/view`, `/view/*`, `/search`) require an authenticated session, and reader APIs require a session.
  - Viewers can read only published cards and published child cards; admins retain draft visibility.
  - Protected reader routes keep their shell chrome during client session hydration so visible navigation does not drift from auth truth.
  - Hosted verification matches that contract for anonymous access: `/view`, `/search`, and `/admin` redirect to login, while reader APIs reject anonymous access.
  - Root `/view` and `/search` enforce the boundary server-side rather than relying on middleware alone.
  - Admin-only local import helpers and other admin operational APIs stay outside the reader surface.
- **Embedded Media Presentation**
  - Read-only embedded figures collapse empty caption chrome while preserving real captions and editable caption affordances.

⭕1 **Planned**

- **Reader-detail presentation refinement**
  - Define a consistent optional kicker/subhead treatment for reader cards, detail pages, and discovery surfaces so card families gain lightweight narrative context without overcrowding titles or overloading raw tags.
  - Improve section typography, compact-card sizing, and overall hierarchy for `Related`, `Explore More`, and similar detail-page discovery blocks.
- **Drop cap treatment** - Evaluate a reader/TipTap drop-cap treatment for long-form story openings where it strengthens the editorial/journal feel without becoming decorative noise.

⭕2 **Future**

- **Audience-based reader access** - Potential future feature for adult/child or collection-specific sharing. Likely requires viewer audience/group membership, audience rules on collection roots or cards, direct URL/search/discovery enforcement, and an explicit media visibility rule.
- **Feed hydration tiers:** Optional **cover-only** first paint on `/view` (defer full gallery/content hydration until card open or below fold) to reduce payload and server work vs today's full hydration for feed cards.
- **View Mosaic** - Implement view-page gallery mosaic (replace swiper-only if needed).
- **Social Features** - Like, comment, sharelink - out of scope until revisited.

---

## **Administration**

*Intent*

- **Archive Administration** - Author, organize, and maintain cards, media, tags, relationships, and supporting admin settings.
- **Desktop-primary Workflow** - Optimize administration for desktop use, with mobile limited to narrow supporting actions where explicitly allowed.

*Principles*

- **Bulk & Individual** - Support both high-volume batch operations and individual edits.
- **Efficiency** - Keep admin workflows efficient under large import/edit workloads.
- **Integrity-owned Mutations** - Data-integrity and mutation rules should be enforced at the service/API layer rather than entrusted to UI behavior alone.
- **Studio-first Workflow** - Day-to-day content administration should converge on Studio as the primary shell rather than parallel legacy routes.
- **Interaction Economy** - Prefer one strong interaction model per job over parallel table/grid/modal variants when capability can be preserved.
- **Single-author First** - v1 administration is optimized for one primary author/operator rather than collaborative authoring.
- **No Operator Traps** - Routine admin actions should preserve data integrity and make destructive or irreversible actions explicit.

*Features*
✅ **Complete**

- **Admin Navigation** - The shared hamburger keeps reader destinations for all authenticated users, while admin-only entries appear only for admin sessions; viewers do not see admin navigation affordances on reader surfaces.
- **Active Domains** - Studio-aligned content administration now centers on `Studio Organize`, `Studio Cards`, `Studio Compose`, `Studio Questions`, and `Studio Media`, while Users and Themes remain specialist admin surfaces outside Studio.
- **Studio-first Administration** - `**/admin/studio`** is the primary day-to-day content-admin workspace for structure, cards, compose, questions, and embedded media, with detailed behavior owned by the Studio-aligned subsections below.
- **Legacy Route Demotion** - Standalone legacy admin routes are no longer the intended primary workflow surfaces; day-to-day content administration converges on Studio plus the surviving specialist routes that still remain intentionally outside Studio, such as Users and Themes.
- **Shared Feedback Model** - Migrated admin surfaces use the shared dialog/loading/toast contract rather than browser-native `alert` / `confirm`.
- **Compact Studio Shell** - Studio now favors a denser, workspace-oriented shell with persisted pane sizing, preview-first handoff, and local reconciliation where integrity allows.
- **Operator Tooling** - Scripts, backup, and recovery helpers remain part of the administration lifecycle while first-class admin UX continues to mature. Canonical operational detail lives in `01-Vision-Architecture.md` and `docs/NPM-SCRIPTS.md`.
- **Integrity Gate** - Integrity-sensitive admin changes are guarded by project-level verification for card-media edges, denormalized references, and derived tag/count correctness.
- **Studio Inline Tags (v1)** - Studio Compose uses compact inline tag editing, while fuller tag-management surfaces remain available where broader editing depth is still needed.
- **Studio desktop shell (v1)** - `**/admin/studio`** (`StudioWorkspace`): embedded Collections Studio-multi-pane layout (**Organize**  -  Cards  -  Compose  -  Questions  -  Media), one shell-owned active-card selection model plus media multiselect, app sidebar closed by default, and per-pane collapse/restore with persisted widths per `📐 **Studio unified shell contract`**.
- **Studio preview-first handoff** - Compose now keeps local context visible during card changes: cards-pane, tree, and Questions selection should seed the shell from the best locally known preview, keep the prior card visible until the next preview/detail is ready when necessary, and hydrate fuller selected-card context in the background instead of blanking Compose first.
- **Studio curated tree integration** - Curated tree pane in embedded Studio with attach/detach/reorder using existing `updateCard` semantics, `fetchAdminCardSnapshot`, and optimistic rollback patterns (`📐 **Studio unified shell contract`** (2); technical baseline in `docs/03-Implementation.md` -> `📐 **Studio program status`**).
- **Studio selected-context elimination (v1)** - Relationship-only column removed; Studio `**@dnd-kit`** cover, gallery, child, and **TipTap body** (`drop:body`) targets live on **in-shell Card Edit** with `**handleStudioRelationshipDragEnd`** / `**patchSelectedCard`** (body: `**insertImage`** + bank page resolve); outer `CollectionsAdminClient` `**DndContext**` coordinates with nested card-form DnD; `**CoverPhotoContainer**` paste/file-drop retained; media bank -> card via embedded **Media admin** (`📐 **Studio media & body (2026-04-22)`**). Residual: keyboard/indicator polish per **DnD interaction contract**.
- **Studio cards pane tag filter (v1)** - **Cards** pane: search title, **card type**, **display mode**, status, sort, **Clear** (resets all including `MacroTagSelector`), plus a **single** `MacroTagSelector` for **on-card** dimensional tags only (OR within a dimension, AND across dimensions). This filter defines the pane-local **card base** for the current Cards workspace rather than the global Studio shell. The prior **on-card** vs **media-derived** per-dimension matrix was removed; use **full-page card admin** for **media-derived tag suggestions** and apply from gallery metadata until tagging is complete (`CardAdminList` suggestion rows).
- **Studio embedded media tag filter (v1)** - Media column: a **single** `MacroTagSelector` drives **who/what/when/where** on `**GET /api/media`** (with Typesense when configured). This filter defines the pane-local **media base** for the current Media workspace. **No** merge of compose-card form tags in Studio; full-page or PhotoPicker use card-context + overlay as before.
- **Studio IA demotion** - **Shipped:** removed admin **Also** strip (**Collections**, **Triage**); retired standalone **Card**, **Media**, and **Tag** admin routes from normal workflow in favor of **Studio** (reader-side card edit now uses the reader modal / Studio path); deleted **Media Triage**-only UI; removed Studio Cards **Collections** full-page view (`CollectionsManagerPanel` deleted) - curated tree + attach workflows live in **Studio** (`📐 **Studio unified shell contract`** (6)). Collections and Questions should be understood as Studio-owned capabilities even if legacy route artifacts still exist in code.
- **Studio performance hardening (2026-04-24)** - Studio now prefers local post-mutation reconciliation over broad reloads where integrity allows: selected-card saves reuse returned card payloads instead of immediate re-fetch, routine Cards pane edits use local catalog overrides instead of a full 2500-card refresh, Media bulk tag / most delete flows stay local unless paging underflows, and card/media grids plus tree rows are memoized to reduce unnecessary rerender churn. Firestore remains truth; Typesense remains the search projection.
- **Studio stabilization (2026-04-30)** - Substrate-level performance pass on top of the 2026-04-24 hardening: (a) **ExifTool isolation** - `exiftool-vendored` is `serverExternalPackages` and the storage helpers used by `cardService` were extracted to `mediaStorage.ts`, so non-import card/media routes no longer compile-time pull the ExifTool worker (cold compile ~13s -> ~2-4s on touched routes). (b) **Typesense dispatch gate** - `GET /api/cards` (and `/api/media`) now dispatches to Typesense only when a text query or dimensional filter is present; plain catalog listings go straight to Firestore, ending the 422-and-fallback round-trip. `per_page` is also defensively capped at 250 in the service layer. (c) **Studio bank / tree streaming** - `StudioTreeCandidateCardBank` and `CollectionsAdminClient.load` replaced their fixed-cap one-shot fetches (2500 / 1000 cards) with `?limit=250&page=0` first-paint plus background `lastDocId`-cursored streaming under stable `created desc`, dropping first useful Studio paint from ~5-9s to ~2s; a small "Loading more cards..." indicator next to the Cards-pane Clear button covers the streaming window. (d) **Card detail child skip** - Studio card click, `fetchAdminCardSnapshot`, and the reader edit modal now pass `?children=skip` to `GET /api/cards/[id]` (see `docs/01-Vision-Architecture.md` -> Backend ✅ **Card detail child hydration**), eliminating up to 100 unread Firestore child reads + media hydrations per click.
- **Studio workspace responsiveness (2026-04-30)** - Follow-on shell/workspace pass: broad Studio card and root loaders now continue chunking until the server reports completion instead of stopping at fixed client caps; tree fallback no longer overwrites a valid shell-selected card simply because it has not streamed in yet; Compose keeps the current card visible during cross-card and question-card handoff until the next preview/detail is ready; Studio media now uses debounced search, cancellable stale-request protection, short-lived query caching, `mediaById` caching, and next-page prefetch; embedded Studio media may return page data before totals when the pane only needs the working set first.
- **Studio inline tags (v1 closeout 2026-04-23)** - **Compose (in-shell `CardForm`):** tags via `**CardDimensionalTagCommandBar`** (`compact`) only-no `**MacroTagSelector**` expand in Studio shell. **Admin grids/tables:** `**DimensionalTagVerticalChips`** rail + `**CardDimensionalTagCommandBar`** `searchOnly` on card and media grid tiles; media **table** uses the dimensional bar per row-routine add/remove/search without a tile-level tag modal. **Full-page card edit** (`/admin/card-admin/.../edit`) intentionally keeps **Edit tags...** plus expandable `**MacroTagSelector`** for deep tag work. **Cards pane** bulk **Edit tags...** remains a modal for multi-card apply. Optional polish: **Studio Media** ⭕1 **Grid tagging UX** (per-tile parity, table alignment) and keyboard/focus under **DnD interaction contract**.
- **Studio search focus parity (2026-05-24)** - Studio search fields now share a visible theme-based focus treatment: Cards and Media avoid clipped browser outlines, and Questions uses the same blue active-state ring instead of a white default outline.

⭕1 **Planned**

- **Shared action button contract (2026-05-24)** - The surviving Studio/grid-first admin surfaces, Organize support flows, tag-library rows, and media editor now use one much more consistent compact button language for primary, secondary, destructive, and icon-first actions. This is no longer treated as a broad active project; future button changes should be opportunistic and tied to specific surviving surfaces rather than a separate normalization pass.
- **DnD hardening pass (status 2026-05-27)** - The narrowed Studio/admin DnD contract is still the right target, but this area is not closed shipped truth yet. Structural and relationship paths were re-audited after a top-to-bottom ownership review found that the live shell/runtime split and the root-card PATCH contract were not fully aligned with the documented model. Treat the current state as actively repaired/reopened until browser verification reconfirms the exact author-facing behaviors.
- **Hosted Admin Responsiveness Pass** - Diagnose and remove the interaction stalls that make hosted admin feel broken in real use, starting with search-field focus latency, delayed typing feedback, and other visible input/pane delays on Studio and the surviving admin surfaces. Treat this as measured browser-verified performance work, not cleanup-by-assumption.
- **Code Path Simplification Pass** - Audit Studio and the surviving admin/card/media paths for deprecated surfaces, duplicated interaction models, stale providers/loaders, and dead compatibility code, then retire what no longer supports the current workflow without weakening shipped behavior or canon contracts.
- **Studio naming cleanup** - Rename the remaining `Content Management` surface/chrome language to `Content Studio` so the product vocabulary matches the shipped `Studio` IA.
- **Bulk bar idle collapse + selection semantics** - Hide the bulk-actions bar entirely when nothing is selected, and reconcile selection copy/behavior with the current growing-list model so surfaces do not imply a paged `Select all on page` contract where the UI now behaves as `Select visible`.
- **Operator message pruning** - Remove low-value shell messages such as `working in...` where they add noise without helping the author make a decision.

⭕2 **Future**

- **Maintenance Management** - Admin UI over existing secured maintenance APIs (`POST /api/admin/maintenance/*`: reconcile, cleanup, backfill, diagnose-cover). A Maintenance tab existed previously and was removed; restore when in-app diagnose/fix outweighs CLI + manual HTTP. Today: `docs/NPM-SCRIPTS.md` and `npm run ...` scripts.
- **Admin SWR Deduping** - Revisit `CardProvider` `dedupingInterval: 0` for admin - restore bounded deduping to cut duplicate `/api/cards` requests where safe.
- **Legacy list-surface retirement audit** - Audit old card/media list-only components and route remnants, and remove them where they no longer support a real workflow and can be retired without weakening the current Studio/grid model.

📐 **Studio unified shell contract** - **(1)** **Tag rail (shipped):** Studio **Organize** column (`TagAdminStudioPane`) plus `/view` admin **Tag library** (`ViewTagLibrarySidebarPane`) deliver **full Tag Admin** on canonical `TagProvider` (add/delete/edit/reorder/reparent); legacy `**/admin/tag-admin`** now redirects to **Studio**. Tag reorder/reparent uses optimistic local cache updates so rows do not snap back while Firestore confirms; reparent still uses Shift-drag in the current UI. **(2)** **Card** area with Studio Cards-grade capabilities plus the **Collections** pane; top-level Studio collection entries are explicit **root cards** (`isCollectionRoot`) ordered by `collectionRootOrder`, not by a hidden Master Parent. Cards may be roots, children, or both; `childrenIds` remain the canonical relationship store. Collections are administered as part of Studio **Organize**, not as a separate product-surface route commitment. **(3)** **Media** area with Studio-grade lists, filters, and actions; legacy `**/admin/media-admin`** now redirects to **Studio**. **(4)** **In-focus editing** - live **Card Edit** for selected card in-shell is the **primary** surface for cover, gallery, children, metadata, and body media; the reader-side edit entry is the modal from `/view`, and legacy `**/admin/card-admin`** routes now redirect into **Studio**. **(5)** **Questions** pane lives in Studio for dimensional prompt browsing, **Untagged** cleanup, assigned/unassigned tracking, and QA answer flow. Studio Questions is the intended question-admin surface; any surviving standalone `**/admin/question-admin`** code path is legacy technical residue, not a product commitment. Users and Themes remain outside Studio. **(6)** **Navigation hygiene** - redundant standalone admin routes are demoted; curated assembly, tagging, card work, media work, collection-tree maintenance, and question-driven QA authoring live in **Studio**. **(7)** **DnD** - use **one authoring drag framework** (`@dnd-kit`) with **bounded drag domains**, but do not run Studio as one free-form cross-pane collision space. Current shell contract is **split by responsibility**: **Collections + Cards bank** own the structural tree/root drag context, while **Compose + Media** own the relationship/reorder drag context. Within those boundaries, keep drop targets **registered continuously**, resolve overlap through explicit **domain-specific collision priority**, and prefer **optimistic local commits + reconcile** over save-first snapback behavior. **Tags** remain their own reorder/reparent domain. **Cross-pane simplification contract:** `Cards -> Children` appends to the end of the selected card's children list, with later reordering owned by the **Children** surface itself. `Media -> Content` appends to the end of the current body/content-media set, with later positioning owned by the **TipTap editor** itself. `Media -> Cover` and `Media -> Gallery` remain direct assignment targets, and structural tree drag keeps separate **on-row** (`nest/attach`) versus **between-row** (`insert/reorder`) semantics. Cross-pane drag should classify the drag class first and then limit participation to targets in that class rather than asking unrelated panes to compete for the same drop. **Reviewer map for current Studio DnD:** `Structural` = source `Cards bank` or `Collections tree`, live targets `tree-root`, `parent:*`, `insertBefore:*`, and `studio-parent:*`, mutation owner `Collections/structure services`; `Media assignment` = source `Media bank`, live targets `drop:cover`, `drop:gallery`, `drop:body`, mutation owner `selected-card patch` or `Compose editor bridge`; `Local reorder` = source existing `gallery:*` or `studioChild:*`, live targets only within that same destination surface, mutation owner `selected-card patch`; `Taxonomy` = source `TagAdminList`, live targets `tag reorder/reparent`, mutation owner `tag management`; `Editor-integrated` = source existing body figures, targets and insertion precision owned by `TipTap/ProseMirror`, not by shell collision helpers. **Fallback policy:** explicit cross-pane append/assignment targets count only when the pointer is inside a live target; do not reuse stale hover state and do not let unrelated panes compete for commit. Small geometric tolerance is acceptable only for local reorder inside the destination surface that already owns that interaction. **Verification expectation:** no DnD path is considered closed from code/tests alone; the exact author-facing path must be browser-proven for target activation, drop result, and post-drop editing continuity. **(8)** **State domains** - Studio is a **shell coordinating multiple domains**, not one giant shared list: **taxonomy** (full tag tree), **structure** (full collections tree), **cards workspace** (filtered/sorted card working set), **media workspace** (filtered/sorted media bank), **active card** (selected card editing context), and **questions** (prompt bank). Pane-local filtering must not silently redefine global structural truth. **(9)** **Selection & hydration** - Studio owns one shell-selected active card. Selection should populate Compose from the best available **preview** immediately, then enrich from background **hydration**. Hydration failure should surface an error without blanking the active card context. **(10)** **Cross-domain actions** - drag/drop, attach/detach, tag assignment, media-to-card relationship edits, and question-to-card flows should be modeled as explicit actions between domains rather than accidental side effects of shared pane state.
📐 **Admin surface simplification** - Long-term admin direction is **grid-first** and **studio-first** where capability is preserved: reduce parallel views and duplicate edit surfaces, but keep tagging speed and card–media relationship editing first-class.
📐 **Data integrity (write paths & drift)** - Server behavior must match `docs/01-Vision-Architecture.md` -> **TECHNICAL** -> **Backend** (*Card-media integrity*, *Delete graph*, *Durability boundary*). Touchpoints and ownership live in **Studio Media** -> **Cross-entity sync** (card create/update/delete, media delete/cleanup, Typesense, counts). **Operational reality until code is fully aligned:** drift and orphan checks use `**npm run reconcile:media-cards`** and related scripts cataloged in `**docs/NPM-SCRIPTS.md**`.
📐 **Errors & operator messaging** - Use a shared backend error shape (domain code + user-safe message + optional actionable detail) and consistent UI channels (inline/banner/dialog/toast) so admin and reader flows communicate failures predictably. Card PATCH when stale `coverImageId` / missing `media` is the first known sharp edge; align route-by-route with `docs/04-Theme-Design-Contract.md` Section 10 instead of surfacing opaque Firestore/transport errors directly.
Current implementation note (2026-04-27): shared `--state-*` success / warning / error / info styling is already live broadly, but the broader app-level messaging behavior is still mixed across local banners, state treatments, and partial feedback-panel adoption. Reader general/error feedback surfaces are now wired; reader success/warning/info panel variants remain future-facing until matching UI surfaces exist.

📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

---

### **Studio Cards**

*Intent*

- **Administration** - Manage card population

*Principles*

- **Ease of Use** - Ease of bulk and individual admin.
- **Tagging first** - Card management should optimize for easy tag assignment and quick relationship editing; those two actions create the structure everything else depends on.

📐 **List filtering & pagination (cards + media)** - Filters apply to the **entire** population the active server query represents; list UI (infinite-style, Load more, or paged Prev/Next) must only show **contiguous slices** of **one** stable-sorted result for that query. **Typesense** `per_page` is capped at **250 hits per request** (see `docs/01-Vision-Architecture.md` -> **Typesense list limits**); larger filtered sets use **multiple chunks** along the same order, not a widened single page. **Seek-style** media lists (assignment / dimension seek) are **documented exceptions**-forward chain semantics, not arbitrary page jumps over a fixed total. Canonical framing: `docs/01-Vision-Architecture.md` -> 📐 **Filtered population & stable ordering**.

*Features*
✅ **Complete**

- **Service & schema** - Firestore `cards`; `src/lib/services/cardService.ts`; `src/lib/types/card.ts` (`cardSchema`). Denormalized fields for filtering; business rules server-side.
- **Admin surfaces** - `src/app/admin/card-admin/` (grid/table, `CardForm` + `CardFormProvider`, `AdminFAB`, search/filter via `CardProvider`, `BulkEditTagsModal`).
- **Fields** - Types `story|gallery|qa|quote|callout`; status; `displayMode`; cover + `PhotoPicker` / `CoverPhotoContainer`; `galleryMedia`; TipTap `content` + embedded media + `@` mentions (see Content Page); `MacroTagSelector`; excerpt + auto (`excerptAuto`); `childrenIds` + picker UI; dirty leave/duplicate flows (`persistableSnapshotsEqual`, `confirmLeaveIfDirty`, `POST /api/cards/[id]/duplicate`).
- **Import** - Folder-as-card (`ImportFolderModal`, `__X` files, caps) - details in `docs/IMPORT-REFERENCE.md`.
- **Discovery in edit** - PhotoPicker Library tab mirrors Media list filters + in-modal tag dimensions (`filterTagIds` from `CardForm`).
- **AI Story Assist** - Admin-only AI suggestion endpoint is active (`POST /api/ai/suggest-card-drafts`) with suggestion-only outputs; no auto-apply. The current editor surface exposes `AI Story Assist` with a selectable named guide, `Bob` or `Sandra`, and the choice should shape tone/presentation rather than factual behavior. The first expanded mode set now includes `Draft from notes`, `Tighten wording`, `Expand this memory`, `Retitle this story`, and `Make this story stronger`.
- **Question-linked card type recovery** - Card edit no longer traps a question-linked card in `Story` when a valid `questionId` still exists. The `Type` selector should continue to expose `Question` whenever the card is actually question-backed.
- **Admin Ordering** - Admin lists support deterministic order controls (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with explicit tie-break behavior and no random ordering default.
- **Admin filter depth** - Card admin supports card-dimension missing filters (`Card Who/What/When/Where: No tags`) and page-level media-signal row filters (`Media Who/What/When/Where`) layered on the visible admin list.
- **Media-derived tag suggestions (full-page)** - Full-page card admin **grid/table** shows per-dimension **suggestions** from gallery/media tags with **apply** (`getMediaSuggestionTags` / `applyDimensionSuggestions` in `CardAdminList`)-the primary v1 path to fix tags on cards when metadata lived on media first. **Studio** attach bank does not duplicate this UI; use full-page **Studio Cards** for that workflow until a future parity pass.
- **Bulk tag mutation path** - `POST /api/cards/bulk-update-tags` add/remove mode now uses a dedicated batched service (`bulkApplyTagDelta`) that updates card tag-derived fields and tag counts in bulk transactions instead of per-card `updateCard` calls.
- **Narrow card PATCH routing** - `PATCH /api/cards/[id]` now routes bounded edits through dedicated handlers instead of always falling through the wide `updateCard` path: cover-only, gallery-only, children-only, collection-root-only, tag-only, status-only, content-only, and metadata-only updates each use their narrower service function.
- **Bulk bar & list/grid multiselect** - The bulk actions strip is a **single** `bulkActions` bar (fixed min height, count on the **left**, actions on the **right**-same pattern as **Media admin**). **List** and **grid** (and the **Studio Cards** pane) support **Shift+click** (range from the last anchor), **Ctrl/Cmd+click** (toggle membership), and **Shift+Ctrl** / **Shift+Cmd** (add a range) via shared `applyModifierSelection` in `src/lib/utils/adminListSelection.ts`. **Select all on page** applies to the **visible** page list. **Grid:** checkbox and modifier semantics match the list; in **Studio**, a **plain** cell/keyboard primary may **focus** the card for compose while **modifier+click** still participates in multiselect.
- **Card edit labels** - Card edit now uses concise section/button labels (`Gallery`, `Add`) and removes legacy child-card helper copy (`Add...`, `Current Children`).
- **Card edit control grouping** - `Status`, `Type`, and `Display Mode` controls are grouped in the top card-edit header section.
- **Admin card grid layout** - Card admin **grid** (including Studio attach bank) uses shared `**AdminGridCellChrome`** (`src/components/admin/common/AdminGridCellChrome.*`): **natural-aspect** cover (`aspect-ratio` from stored dimensions; `**object-fit: cover`**); left vertical rail for dimensional tags (Who->What->When->Where; one clipped preview per dimension-`text-overflow: clip`, no ellipsis-plus a `**+**` when more tags exist; only the `x` control removes the first tag in that dimension; tag name and `**+` are not clickable** for remove; full lists on **native `title**` on the rail, each row, and the **cover**); **narrow left-aligned** tag search row under the tile (`CardDimensionalTagCommandBar` **search-only**); bottom overlay for **type** + **status** (draft/published: **semi-transparent** fills, **white** label text, **no** chip border); top row for checkbox, delete, Studio drag handle when present; **excerpt/subtitle** caption under the image where applicable (Studio compact grid may clamp title-full metadata on **cell** + **cover** `title`).
- **Admin list (table) layout** - **List** view uses **stacked** compact cells (e.g. type + display + status; content + gallery + children; edit + delete), **resizable** cover and tag-bar columns, and a **dimensional tag** toolbar with **Who/What/When/Where** in the **table header** (`CardDimensionalTagCommandBar` with row labels suppressed in favor of the header row). The older **per-row** **Tags** entry that opened a bulk tag modal is **not** in the list-use the tag bar and per-dimension chips. **Studio Cards** reuses the same `CardAdminList` **table** with `**hideDimensionMediaSuggestions`** so **media-suggestion** columns are **full-page** only.
- **Card list SWR + Studio cards refresh** - After a successful card `**PATCH`**, full-page card admin **merges the request body over** the SWR list entry (after server JSON) so `tags` and other inline edits reflect immediately. Studio **Cards** **increments a catalog refresh** after in-list card updates so its **filters and card set** see fresh card data.
- **Cards search-field focus treatment (2026-05-24)** - The Studio Cards search box now uses an explicit theme-based focus ring rather than the clipped browser default, so the full active-field state remains visible inside the compact filter row.
- **Relationship counts in cards (2026-05-24)** - Studio Cards rows and tiles now surface compact structural counts in their secondary meta, using a concise `x/y` parent/child readout so structure is visible without opening the card.

⭕1 **Planned**

- **Grid-first admin convergence** - Reduce dependence on table views where the grid can support identity, tagging, selection, and relationship work without loss of operator clarity.
- **Context Assist** - Keep historical/background context as a distinct output contract from writing rewrites (even when requested together), so context remains separately reviewable/accept-dismiss and does not couple to rewrite acceptance.
- **Grid density reduction** - Reduce Studio Cards grid card footprint by ~25% (thumbnail/card block dimensions and spacing) while preserving legibility, click targets, and selection affordances-incremental follow-up now that aspect-accurate thumbnails ship.
- **Tag picker ergonomics** - Broad ergonomics work is effectively in place: full card edit now uses a compact trigger plus controlled `MacroTagSelector` expansion, root-first `Who / What / When / Where` columns, searchable trees, compact in-line creation, and author-facing suppression of legacy `z-*` utility tags. Remaining work, if needed, is polish-level only: stronger keyboard-first tree interaction and clearer search/path disambiguation for similarly named tags.
- **Narrative development backlog** - Continue author-facing story buildout inside the current card system: consolidate multi-page story runs where needed, complete year-based story coverage, finish question-backed story coverage, and expand planned callout / quote content.

⭕2 **Future**

- **Studio cards bulk row actions** - Parity with full-page card admin bulk select/actions when the Studio card list needs the same at-scale operations (deferred; does not block Studio tag filter simplification).
- **Card Edit Mosaic** - Mosaic layout for gallery manager in card edit (align with Apple/Google Photos-style browsing).
- **Card Linkage** - Non-hierarchical "See Also" cross-references via `linkedCardIds: string[]` (many-to-many, unordered). Surfaces in reader view alongside tag-affinity related cards. Distinct from parent-child (`childrenIds`) and question->card linkage. Deferred until after import.
- **Relationship DnD contract (cards ↔ media ↔ tags)** - Standardize direct-manipulation assignment/reorder flows so operators can drag and drop media to card targets (cover/gallery/children where applicable), reorder parent-child card structure, and add/remove relationship edges without modal-heavy seek/insert loops; require keyboard parity and clear drop semantics. **Sequencing:** resume after **Collections Studio** shell and **in-shell** DnD are validated in real use (`📐 **Studio unified shell contract`** (7)); **v1** Studio ship is not a substitute for this consistency pass.
📐 **Card-first orchestration lens** - Primary admin workflow is card-centric orchestration; media and tags remain first-class domains but operate as relationship panels/actions around the active card context instead of independent form-first workflows.
📐 **Studio shell & navigation (2026-04-21)** - **Endgame** (same intent as **Administration** -> **Domains**): one shell for **all** content-based admin (cards, media, tags + relationships)-**today** delivered as **Studio** at `**/admin/studio`** (`StudioWorkspace` -> `CollectionsAdminClient` `embedded`): **Organize** column (**Tags** + **Collections**), **Cards**, **Compose**, **Questions**, and **Media**; app sidebar closed by default; panes independently collapsible/resizable with persisted widths. Users/Themes remain outside Studio. **Supersedes** deferring embedded `CardForm`-**Card Edit** in Studio is **live**. Treat Studio as a **multi-domain shell**: collections and taxonomy remain globally addressable, while cards/media panes are operator workspaces and Compose is the active-card context. **DnD:** Studio now uses the shared bounded-domain `@dnd-kit` model for authored relationships; broader keyboard/focus polish remains **2 future** / gated work.
📐 **Studio media & body (2026-04-22)** - **Cards / orphaned filtering:** the **Cards** column (title/status/sort + **one** on-card `MacroTagSelector` for tag filtering) is the full card-admin surface inside Studio; orphaned cards are a filter/view of that catalog, not a separate identity for the pane. **TipTap body images:** **clipboard paste** unchanged; **Media admin -> body** via bank drag ships with **Studio Compose** ✅ **Compose editor behavior** (Compose `drop:body`). **Cover / gallery / children in Studio:** **Media admin** is the library surface-**drag** to targets on **in-shell Card Edit** (`**Studio selected-context elimination (v1)`**). PhotoPicker: retain in full-page card edit until `**PhotoPicker convergence in Media admin**` supplies bank import + library pick parity; **end state** is **no parallel picker** for Studio and eventually card edit.
📐 **Structural Collections** - Collection parent = any card with `childrenIds`. `type: 'collection'` is legacy/presentation only. Top-level collection entries are explicit root cards (`isCollectionRoot`) ordered by `collectionRootOrder`; a card may be both a root and a child elsewhere. Full structural detail in Studio Organize.

---

### **Studio Compose**

*Intent*

- **Active Authoring Context** - Edit the currently selected card in a stable in-shell workspace for narrative, media, structure, and metadata work.

*Principles*

- **Selection continuity** - Keep the active card context visible and understandable through card changes, deletes, and cross-pane handoffs.
- **Relationship-ready editing** - Compose should be the working destination for cover, gallery, children, and body-media relationship edits without forcing the author into disconnected routes.
- **Focused authoring** - Compose should preserve working space and control clarity while still exposing the editing power needed for real story development.

*Features*
✅ **Complete**

- **In-shell card editing**
  - `**/admin/studio`** **Compose** embeds `**CardForm`** + `**CardFormProvider**` for the shell-selected card (`StudioShellContext`).
  - Delete, duplicate, and fuller chrome remain available through the linked full-page card-admin surface (`StudioCardEditPane`) where needed.
  - `Status`, `Type`, and `Display Mode` controls are grouped in the top card-edit header section.
  - Card edit now uses concise section/button labels such as `Gallery` and `Add`, removing older helper-copy clutter.
- **Compose selection and continuity**
  - Compose keeps local context visible during card changes and hydrates fuller selected-card detail in the background rather than blanking first.
  - Deleting a card from Studio Cards clears stale Compose state immediately and, when possible, hands Compose to the next sensible card from the current Cards view instead of leaving the deleted card visible.
  - Compose now keeps its action cluster in a stable upper-right header position beside the pane title; in Studio, the new-card affordance also lives in that header, so the floating add button is no longer shown on the Studio route.
- **Compose media and relationship editing**
  - Compose supports an in-app Delete path for existing cards, and `Set Cover` persists both the chosen cover and gallery reorder instead of only changing local form state.
  - `Cover` and `Gallery` expose direct jump-to-media controls that open the assigned image in the Studio media editor without taking over the main Media pane filters.
  - Cover, gallery, children, and `TipTap` body targets accept bounded cross-pane drops from the embedded media bank under the shared Studio shell contract.
  - `Media -> Cover` assigns cover, `Media -> Gallery` appends to gallery, and `Media -> Content` appends to the end of body/content-media rather than targeting precise insertion during cross-pane drag.
  - Gallery reorder remains local to gallery rows, and later body-level repositioning remains editor-owned after insertion.
- **Compose editor behavior**
  - `Studio Compose` uses `**CardDimensionalTagCommandBar`** for compact inline tag editing; deeper tag editing remains available in broader editing surfaces where needed.
  - `TipTap` clipboard image paste remains unchanged.
  - Dragging `**source:{mediaId}`** from embedded Studio Media onto the `Content` drop zone (`drop:body`) appends media at the end of the current body/content-media set.
  - Current known gap to keep honest until re-verified: media not loaded on the active bank page still cannot be resolved until paged in or fetched directly, and the editor still needs reliable trailing-caret behavior after image-heavy content.
- **Compose authoring assist**
  - `AI Story Assist` is active as a suggestion-only admin tool (`POST /api/ai/suggest-card-drafts`) with named guides such as `Bob` and `Sandra`.
  - Supported assist modes currently include `Draft from notes`, `Tighten wording`, `Expand this memory`, `Retitle this story`, and `Make this story stronger`.
  - Story Assist starts collapsed by default and expands automatically once it is actively working or already has suggestions/results, preserving Compose working space when idle.

⭕1 **Planned**

- **Compose authoring refinement**
  - Let excerpt guidance/update react as the story body changes instead of requiring a separate stale pass.
  - Support an author flow that can read narrative content and edit it without an awkward mode break where practical, with admin reader editing styled and structured as a Compose-grade editing surface rather than a second weaker editor.
- **Compose framing refinement**
  - Define one authoritative cover-framing target for authoring and reconcile Compose, reader feed, reader detail, and admin/Studio preview surfaces so focal adjustments do not look correct in one surface and wrong in another. Current diagnosed mismatch: Compose uses a fixed `6:5` crop preview, reader detail/rails use orientation-aware frames, and admin preview tiles use additional thumbnail ratios.
  - Covers now support a persisted per-card framing mode in the main authoring/reader path: `Fill` keeps crop-plus-focal positioning, while `Fit` preserves the full image inside the bounded orientation-aware frame for unusually wide, unusually tall, or text-centric covers. Compose exposes that control in the cover editor, and the main reader surfaces honor it in closed cards, detail view, and child-card rails. Zoom-like adjustment remains future scope if `Fill` vs `Fit` is still not sufficient for some images.
- **Editor presentation refinement**
  - Add optional drop-cap styling support to the rich-text editor.

⭕2 **Future**

- **Compose relationship hardening** - Keep the `Compose + Media` relationship drag boundary narrow and browser-verified until right-side target activation and post-drop behavior are fully reconfirmed in live use.

---

### **Studio Organize**

📐**Admin DnD architecture contract (2026-05-22)** - Treat admin drag-and-drop as **one platform with six bounded classes**: **Structural** (collections/tree/root/parent-child), **Assignment** (media/card relationship placement such as cover/gallery/body), **Local reorder** (same-pane ordering such as gallery/children), **Taxonomy** (tag reorder/reparent), **Upload drop** (file ingestion only), and **Editor-integrated** (rich-text body insertion/movement). **Ownership:** the **shell** owns cross-pane routing, sensors, overlays, and collision policy; each **pane** owns visible targets and hover/empty states; the **service/action layer** owns mutations and rollback/reconcile; the **editor subsystem** owns body insertion precision and in-body moves. **Rules:** use `@dnd-kit` for authored DnD, keep `react-dropzone` only for upload drop, do not run duplicate local + shared DnD paths for the same surface, do not put editor placement logic in shell helpers, and use one shared feedback system on migrated admin surfaces. **Execution stance:** converge **Assignment** first, then **Editor-integrated**, then **Local reorder**, then remaining **Taxonomy/Structural** polish; do not expand admin DnD breadth on a hybrid interaction model.

*Intent*

- Organize the archive through two distinct management surfaces in the same Studio workspace: **Tag Management** for taxonomy and **Collections Management** for curated structure.

*Principles*

- **Taxonomy separate from structure** - Tags and Collections share the Organize workspace, but they are separate systems with different responsibilities and should be documented separately.
- **One workspace, distinct subsections** - Studio Organize is the umbrella workspace; **Tag Management** owns taxonomy behavior and **Collections Management** owns curated structure behavior.

*Features*
✅ **Complete**

- **Organize workspace split** - Studio Organize includes both the tag-management rail and the collections tree in the same workspace while keeping taxonomy operations separate from curated structure editing.
- **Subsection ownership** - **Tag Management** below owns taxonomy behavior, and **Collections Management** below owns collection tree, structural DnD, and curated ordering behavior.

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
- **Studio tag rail** - **Shipped:** `**TagAdminStudioPane`** in Studio **Organize** at `**/admin/studio`** (`CollectionsAdminClient` `embedded`)-full add/delete/edit/reorder/reparent on canonical `TagProvider` (`**useTagManagement` + `TagAdminList**`). **Tags | Tree** tab model; reorder/reparent apply optimistic local cache updates, then reconcile with Firestore.
- **Sidebar integration model** - **Shipped:** one `TagProvider` tree-**viewers** on `/view` use filter-first `**TagTree`**; **admins** on `/view` (Freeform) get **Filter** vs **Tag library** tabs, with **Tag library** = `ViewTagLibrarySidebarPane` (same tag-admin stack as Studio). Not a second taxonomy (`📐 **Studio unified shell contract**` (1); **Left Navigation** -> **Sidebar roles**).
- **Compact tag editor contract (2026-05-22)** - Full tag editing now aims for one compact-first pattern across card/media/question surfaces: immediate `Edit tags...` search, one selected-state presentation rather than duplicate summaries, four active dimensions sized for the current taxonomy, one-line `New tag` creation controls, and author-facing suppression of legacy `z-*` utility branches in the selector UI. Shared path formatting also now de-duplicates repeated stored ancestors so suggestion labels stay readable.

⭕1 **Planned**

- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."
- **Node Strategy** - Raw tag overlay to created aggregations.
- **Dimension shortcut buttons in Organize** - Add direct `Who` / `What` / `When` / `Where` shortcuts in Studio Organize so the author can jump to the relevant part of the tag tree quickly.
- **Tag tree density follow-up** - Reduce vertical spacing in the Organize tree where possible without weakening drag/drop hit targets or reorder clarity.
- **Tag-edit iconography** - Replace the generic pencil affordance in tag-edit entry points with tag-specific iconography so the action reads as taxonomy editing rather than generic row edit.

⭕2 **Future**

- **DnD interaction contract** - Before expanding drag-and-drop to additional admin flows (card assignment, gallery/media assignment, broader tree operations), standardize one interaction contract across admin DnD surfaces: **single framework** for authored relationships/reorder (`@dnd-kit`), **bounded drag domains** (Tags / Collections / Compose / Media), drop semantics (on vs between), sensors/activation thresholds, visual drop indicators, drag handles, overlays, and keyboard parity. Keep `**react-dropzone**` only for file upload drop; retire `react-dnd` from `CardForm` over staged migration. Expansion is gated on this consistency pass. **Sequencing:** resume with **Relationship DnD contract (cards ↔ media ↔ tags)** in **Studio Cards** after **Studio desktop shell** and related Studio **⭕1** layout are validated (`📐 **Studio unified shell contract`** (7)).
- **Unified tag edges (conceptual):** Treat assignments as **(subjectType, subjectId, tagId)** even if denormalized on `Card` / `Media` for reads—eases counts, digiKam mapping, migrations. (??)
- **Face Recognition** - Options:
  - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
  - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
  - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.
- **Relationship Tagging** - Derive family relationships from minimal primitives (`parent_of`, `spouse_of`); compute uncle, cousin, step-parent, etc. via inference rules. Maps to WHO dimension. Large surface (graph storage, validation, remarriage/step edges). Park until parallel media tagging and bulk Media-admin UX are in place. Detail regenerable.
📐 **Authoring Vocabulary** - Mirror the same dimensional paths in digiKam keywords and the app tag tree so import/mapping stays predictable. Four scene dimensions on media (Who, What, When, Where); card-level arc/theme tags for narrative framing. **N/A sentinel:** use root tag `**zNA`** in each dimension in the app (and align digiKam keywords to the same label per dimension path). Key conventions:
  - **When** - `when/date/...` chronological, sortable (`yyyymmdd`, `00` for unknown). No `when/stage` (stage is who-dependent; infer from who + date). Season out of scope.
  - **What** - Includes `what/Reflections/...` for reflective / journal-style themes (card-centric; not used for media scene tags). Other buckets: `what/event/...` (occasions/milestones), `what/activity/...` (what people are doing), plus long-running domains under What as needed. Overlap: milestones -> event; school defaults to theme; add event for specific ceremonies.
  - **Who** - People as stable tag identities (display names). Groups optional (`who/group/...`). Subject vs also-present encoding TBD. Kinship graph is **Relationship Tagging** (future).
  - **Where** - Administrative nesting (country -> state -> county -> city), skip levels when irrelevant. Venues, domestic labels, natural settings as children. GPS/EXIF may seed on import; author refines in Tag admin.

❓ **Open**

- **Subject tag model** - Decide whether `Subject` should become an explicit tagging concept or continue to be expressed through existing `Who` and relationship patterns.

---

### **Collections Management**

*Intent*

- **Curated structure** - Shape cards into intentional structural trees and ordered collections for reader-facing narrative paths.

*Principles*

- **Structural, not type-based** - Parent/child via `childrenIds`, not `type: 'collection'`.
- **Manual ordering** - Author controls curated sequence explicitly; no automatic sorting should replace intentional structure.
- **Shared structural runtime** - Collections structure is the structural drag-and-drop backbone that other Studio domains can attach to, but structural truth still belongs here.

*Features*
✅ **Complete**

- **Data Model** - Curated tree lives in **Studio** (`/admin/studio`, `**CollectionsAdminClient` `embedded`**). Collections are managed from the Studio **Organize** pane/tree; shared styles remain at `src/app/admin/collections/page.module.css` for `CollectionsAdminClient` / card-admin panels.
- **Curated Tree**
  - Drag-and-drop attaches/detaches parent->child edges and promotes cards to explicit top-level roots.
  - Multi-parent model; cycles blocked in `cardService`.
  - Admin tree loads up to **1000** cards for the page.
  - **Tree expandability truth** - Collection-tree expand/collapse now keys off the structural `childrenIds` relationship rather than only currently resolved child objects, so parents with real children still expand correctly while the broader catalog is streaming.
  - **Collection row count placement (2026-05-24)** - In the Organize tree, collection child/card counts now sit at the end of the title line as plain inline text with no badge/background treatment, so the tree reads more like content than status chrome.
- **Collections drag-state signaling (2026-05-24)** - Active structural drags in the Organize tree now use explicit per-target cues instead of generic pane glow: row-body nest targets label **Nest inside**, between-row reorder targets label **Insert before**, and root/unparent zones surface their exact pending action while dragging. The drag ghost remains intentionally simple.
- **Collections DnD hardening (2026-05-25)** - Embedded Studio now treats Collections as the shared structural drag runtime for `Cards`, `Compose`, and embedded `Media`, with bounded routing per drag domain instead of a separate right-column runtime. Structural paths keep root/parent/reorder targets registered continuously and apply structural moves optimistically before reconciliation so root add/remove, parent attach, detach, and reorder no longer depend on save-first snapback behavior.
  - Current shipped paths: `Cards -> root`, `Cards -> existing parent`, top-level reorder, in-parent reorder, detach via `x`, and `Cards -> Compose/Children` attach while keeping the parent card selected in Compose.

⭕2 **Future**

- **TOC & Ordering** - Manual sibling reordering via drag-and-drop TOC (primary mechanism for curated narrative). One tree UI for reparenting and ordering. Reconcile parent/child model after TOC exists. No cascade on parent delete - children simply lose that parent.

📐 **Structural Model** - Studio structure is parent-driven and multi-parent capable: `childrenIds` store ordered parent->child edges; `isCollectionRoot` marks intentional top-level roots; `collectionRootOrder` defines root order. Reader/admin collection listing should follow explicit roots, not a hidden Master Parent.
📐 **IA vs Studio** - `**/admin/studio`** is the **Studio** shell (embedded `CollectionsAdminClient` + media + compose). Collections Management is the curated-structure subsection inside Studio **Organize**, not a separate day-to-day product surface; primary admin navigation no longer advertises standalone collections or media-triage flows.

❓ **Open**

- **Multi-parent** - Deferred product decision.

---

### **Studio Questions**

*Intent*

- **Journal-like** - Grandfather/Father journal-like questions

*Principles*

- **Prompts** - Use questions as prompts for Question cards.
- **Flexible** - Accommodate short and long answers.
- **Dimensional** - Group questions through the existing Who / What / When / Where tag tree rather than a separate prompt taxonomy. Questions may be temporarily untagged during QA-card migration/cleanup and should surface in an explicit **Untagged** view until the author assigns generic prompt tags.
- **Prompt tags vs answer tags** - Question tags classify the **prompt** and should generally be generic (for example `Father`, `Mother`). Card tags classify the **answer** and may be specific (for example `Robert`, `Sandra`). Question tags seed a newly created Question card only at creation time; after that, question and card tags are independent.

*Features*
✅ **Complete**

- **Data Model** - Firestore `questions` collection. Schema: `src/lib/types/question.ts`. Service: `questionService.ts`. Questions carry optional dimensional `tagIds` and `usedByCardIds`; Question cards carry `questionId`.
- **UI** - Studio **Questions** pane is the intended question-admin surface. Any surviving standalone `/admin/question-admin` page is legacy technical residue until removed and should not be treated as product truth.
- **Studio Pane** - Studio includes a collapsible Questions pane between Compose and Media for dimensional tree browsing, **Untagged** cleanup filtering, included/not-included filtering, add/edit, and opening or creating the linked Question card in Compose.
- **Studio authoring parity** - Studio Questions is now the practical day-to-day question-admin surface: quick-entry tag editing first, rectangular chips, explicit Save/Cancel on add/edit, in-pane Delete, and app-native confirmation/loading treatment on the migrated destructive flows.
- **Studio Questions compact filter row** - Questions now uses the same compact filter-row vocabulary as Cards and Media: Search + inclusion mode + inline `Clear`, icon-first row actions, and the same compact tag action/button sizing used elsewhere in Studio.
- **Questions tree + assignment terminology (2026-05-24)** - The Questions pane now defaults its tag tree to closed and uses `Assigned / Unassigned` language in place of `Included / Not included`, keeping the default view tighter and matching the broader media/relationship vocabulary.
- **Questions tree scope toggle (2026-05-24)** - The Questions pane now includes an `Include children` toggle for the tag tree. It defaults on to preserve the existing descendant-inclusive view, and tree counts switch with the toggle so the displayed scope always matches the active filter behavior.
- **Questions edit interaction decision (2026-05-24)** - Inline prompt editing and open-on-select were explored, then rejected for this surface. Questions keeps its earlier explicit row behavior: opening the linked Question card and editing the prompt remain separate actions, while the small tag-edit affordance stays beside `Edit tags...`.
- **APIs** - Admin-only CRUD (`/api/admin/questions`, `/api/admin/questions/[id]`), link/unlink Question card, create Question card from prompt.
- **Filter** - List/filter in UI: text, tags (substring), used vs unused.
- **Create Card** - Create Question card from question prompt. Adds `questionId` to the card, copies current question dimensional tags to the card as a starting point, adds card ID to `usedByCardIds`, and updates `usageCount`. General card creation does not create new Question cards; Question-card authoring is question-backed.
- **Link/Unlink** - Manual link/unlink between question and card IDs. Unlink converts the linked Question card to draft Story and removes `questionId`; do not leave orphan Question cards. If that card is already open in Studio Compose, the active form should reflect the conversion immediately rather than waiting for the next card selection.
- **Bootstrap** - `npm run bootstrap:questions-from-qa` dry-runs creation of question-bank prompts from existing unlinked Question cards; `-- --apply` writes linked question records and card `questionId` values. **Run 2026-04-25:** after backup `C:\Users\alanb\OneDrive\Firebase Backups\run-2026-04-25T01-36-00-057Z`, applied 158 untagged question records; final dry run reported 202/202 Question cards linked.
- **Story-question migration script** - `npm run bootstrap:questions-from-story-titles` converts tagged Story cards whose titles are questions into linked Question records/cards without deduping against existing prompts: creates Question-bank entries, copies direct `what` tags to the Question, links the card, changes card type to `qa`, and forces status to `draft`. **Run 2026-05-05:** after backup `C:\Users\alanb\OneDrive\Firebase Backups\run-2026-05-05T20-04-32-102Z`, applied 63 conversions; verification after the run reported `remainingStoryQuestions = 0`.

⭕2 **Future**

- **Grouping Level** - Designate which dimensional tag levels are eligible for question grouping so prompts use the shared tree without collapsing to one-off events.
- **Answer Workflow** - Workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping.
- **Auto-Clustering** - Auto-clustering/grouping of short questions.

⭕1 **Planned**

---

### **Studio Media**

*Intent*

- **Multi-source** - Access images from various *external sources* - local, OneDrive, Google, Apple, etc.

*Principles*

- **Imported** - Imported to db for stability
- **Processed** - Image processed and metadata extracted. 
- **Referenced** - Referenced in cards by id, hydrated on demand
- **Replacement** - Facilitate simple edit and replacement of media.
- **Relationship readiness** - Media management should make it easy to move from random banked assets to structured card relationships (cover, inline, gallery, children) without unnecessary mode switching.
- **Import trust** - Import must preserve source meaning and metadata carefully enough that the author can trust the resulting bank rather than fear hidden corruption, silent duplication, or broken references.
- **Recoverable workflows** - Replace, delete, and assignment operations should be safe enough for a hosted product handling irreplaceable family media.
- **Reader media discovery** - Assignment is not a visibility boundary: unassigned media can be intentionally discoverable by readers through the media browse surface.

📐 **List filtering & pagination** - Same contract as **Studio Cards** -> 📐 **List filtering & pagination (cards + media)**; media additionally uses **cursor / Typesense `listPage` / seek** paths on `GET /api/media`-chunking must stay consistent with the active mode; see `docs/01-Vision-Architecture.md` -> 📐 **Filtered population & stable ordering**.

*Features*
✅ **Complete**

- **Core** - Firestore `media` collection; types in `src/lib/types/photo.ts`; import/process/`replace` in `src/lib/services/images/imageImportService.ts` (and related APIs). Display: `JournalImage`, `getDisplayUrl` (`src/lib/utils/photoUtils.ts`).
- **Search** - With Typesense configured (`TYPESENSE_HOST`, `TYPESENSE_API_KEY`): `media` index, facets, and `searchMediaTypesense` drive non-empty text search plus several filtered list paths (including `assignment=assigned|unassigned` when Typesense is used). **Without Typesense, non-empty text search on `GET /api/media` returns HTTP 503** (`SEARCH_UNAVAILABLE`); Firestore seek/pagination still serves unfiltered lists and legacy tag-dimension seek. Sync scripts: `docs/NPM-SCRIPTS.md`.
- **Import paths** - Local drive / PhotoPicker / paste-drop via `src/lib/services/images/imageImportService.ts`; folder-as-card (`__X` marker, `IMPORT_FOLDER_MAX_IMAGES`, `ONEDRIVE_ROOT_FOLDER`) - full rules in `docs/IMPORT-REFERENCE.md` and `normalize-images-README.md`.
- **Pre-import local workflow** - The current local-author workflow remains: organize originals/edits outside the app, mark import-ready files with `__X`, then let import normalize/upload those selected files and extract metadata into the media records.
- **Restore-safe local-source re-import helper** - The current missing-media restore helper for local-source `__X` folders is now preflight-first: it resolves the same canonical `importSourcePath` used by the original importer before deciding `create` vs `merge`, defaults to plan-only output, writes per-folder JSONL checkpoints, requires full-folder success before mutating a card, and preserves existing gallery membership on merge unless a later explicit replace mode is introduced. Current run status (2026-05-28): the approved apply run restored `158/159` planned folders (`153` create, `5` merge). The only non-success folder was `zMomDadPics/BobSandra/Portraits/3`, where one corrupt JPEG blocked a complete-folder merge; after confirming the other four images were already imported and attached to the existing card, that bad source file was intentionally removed from the restore set, so no rerun is currently required for that folder.
- **Card edges** - `referencedByCardIds` is **denormalized**: updated on the primary `createCard` / `updateCard` and media-delete cleanup paths, but **not a verified invariant**-drift is possible. Unassigned/assigned UX uses `referencedByCardIds` plus `mediaAssignmentSeek.ts` (and Typesense when that path is active). Diagnosis/repair: `npm run reconcile:media-cards`, other scripts and maintenance HTTP - `docs/NPM-SCRIPTS.md`.
- **Admin** - Multi-dimensional filter, replace-in-place (`POST /api/images/{id}/replace`), per-row metadata/tags (`PATCH /api/images/{id}`), **bulk tag edits** (`POST /api/admin/media/tags` - add/replace/remove across many `mediaIds`), bulk modes, multi-select -> draft gallery card (`MediaAdminContent`).
- **Bulk bar & list/grid multiselect** - The bulk actions strip uses the **same** single-`bulkActions` layout and min height as **card admin** (not a nested outer toolbar). Count copy: **"No media selected"** / **"N media selected"**. **Table** and **grid** use the same `**applyModifierSelection`** rules as cards (**Shift** / **Ctrl**/**Cmd** / combined); **Select all on page** applies to **visible** media on the current page.
- **Media admin list (table) row actions** - **List** view stacks **Focal** (when a dedicated **objectPosition** column is off), **Replace**, and **Delete** in the row **actions** column for a narrower table.
- **Bulk media tag mutation path** - `POST /api/admin/media/tags` now applies add/replace/remove through a dedicated batched service (`bulkApplyMediaTags`) that updates media tag-derived fields and tag counts in bulk transactions, then recomputes affected card media signals once per request.
- **Media delete/referrer resolution** - media delete now resolves referrers from authoritative card surfaces (cover, gallery, `contentMedia`, inline `data-media-id`) instead of trusting `referencedByCardIds` alone, removes references across all card surfaces in one pass, and blocks delete if references remain.
- **Media delete guard contract** - `DELETE /api/images/{id}` now returns `409` with code `MEDIA_DELETE_BLOCKED_REFERENCES` when authoritative referrer cleanup cannot fully detach the media from cards.
- **Media API error contract (initial standardization slice)** - `GET /api/media`, `PATCH /api/images/{id}`, `DELETE /api/images/{id}`, `POST /api/admin/media/tags`, `POST /api/images/{id}/replace`, `POST /api/images/browser`, `POST /api/images/local/import`, `POST /api/import/folder`, and `POST /api/import/batch` now return domain-coded JSON errors (`code`, `message`, `severity`, `retryable`) instead of raw/opaque response text; Media admin/triage rendering now distinguishes warning vs error severity in list-level feedback.
- **Media identity signals in admin UI** - Media admin **table** exposes canonical identity in-list (`media.docId` column and related fields). **Grid:** filename / id / source are **not** inline on the tile-hover **title** on the image shows them; triage still relies on `docId` as canonical identity.
- **Unassigned duplicate triage sort mode** - In Media admin, when `On cards = Unassigned`, operators can switch to `Source-path first` ordering to cluster likely duplicates for faster keep/delete decisions.
- **Per-dimension media filters** - Media admin now supports per-dimension filter modes for Who/What/When/Where (`Any`, `Has any`, `Is empty`, `Matches tag`) in both table and grid views.
- **Grid tag editing UX** - Media grid tiles use the same `**DimensionalTagVerticalChips`** left rail as **card** grid (Who->What->When->Where; per-dimension first tag + `**+`** when more exist in that dimension; `**x` removes the first** tag in that dimension; **native `title**` on rail, rows, cell, and thumbnail) plus a `**CardDimensionalTagCommandBar**` `**searchOnly**` row under the caption (placeholder **Edit tags...**, dense suggestions, inline save)-no separate per-tile tag modal for routine edits.
- **Admin media grid layout** - Same `**AdminGridCellChrome`** shell as card grid: **natural-aspect** thumbnails (`aspect-ratio`, `**object-fit: cover`**); **grid column** `minmax`/`gap` aligned with card admin for the same tile width and resize behavior in Studio; bottom overlay for **source** + assignment state plus the linked-card jump on the lower-right image edge; **caption** under the image; **checkbox + Studio drag handle** on the top row when Studio registers `source:{mediaId}` drops; direct tile-level delete now mirrors Cards without requiring the edit modal first.
- **Grid tag save feedback** - Inline media retagging now surfaces per-card save confirmation and keeps the editor open with actionable error text when save fails.
- **Admin media browsing model (2026-05-22)** - Admin Media now favors one growing working set instead of explicit Previous/Next paging: the visible list appends more results as the operator scrolls, retains a `Load more` fallback, and uses `Select visible` semantics rather than `Select all on page`. Under the hood the provider still respects the existing cursor / seek / Typesense list constraints from `GET /api/media`.
- **Media table header attachment** - Media table headers now stay attached to the top edge of their active scroll container in both full Media Admin and compact embedded media tables.
- **Triage** - **Removed (2026-04-22):** former `**/admin/media-triage`** page and triage-only UI; URL **redirects** to `**/admin/studio`** (embedded **Media admin**). Use **Studio** or `**/admin/media-admin`** for bank workflows.
- **Studio** - **Primary entry:** `**/admin/studio`** (`StudioWorkspace` -> `CollectionsAdminClient` `embedded`): tag admin tree (`useTagManagement` + `TagAdminList`), collections tree + **Cards** pane + embedded `**MediaAdminContent`** (`studioSourceDraggable`) + in-shell `**CardForm**` **Compose** column, and Collections-style DnD (cover/gallery/children). Product truth is this **embedded** shell (`📐 **Studio unified shell contract`**).
- **Studio embedded media admin** - `MediaAdminContent` in Studio uses the same `MediaProvider` + filters/table/grid/bulk/import/delete as full `/admin/media-admin`; **table** and **grid** cells expose a drag handle registering `source:{mediaId}` when `studioSourceDraggable` is on (requires `CollectionsAdminClient` `DndContext`).
- **Studio embedded media responsiveness** - Embedded Studio media favors operator-first responsiveness over blocking totals: search/filter changes are debounced and stale requests are cancelled, recent query results and media records are cached briefly in-provider, nearby pages may prefetch opportunistically, and cross-pane media actions may resolve recent records from cache even after the visible bank page changes.
- **Studio media assignment** - Drag `source:*` from the embedded media bank onto **Cover**, **Gallery**, or **TipTap body** (`drop:body`) on **in-shell Card Edit`**; relationship targets use` **handleStudioRelationshipDragEnd`** /` **patchSelectedCard`**; body uses` **insertImage** `on the compose editor (`**TipTap body media from bank (Studio)`**✅). **PhotoPicker** and TipTap **clipboard paste** remain until`**PhotoPicker convergence in Media admin`** per` 📐 **Studio media & body (2026-04-22)`**.
- **Studio relationship DnD status (repaired/reopened 2026-05-27)** - The intended day-to-day contract remains: `Cards -> Compose/Children` persists structural attach and keeps the parent open in Compose, `Compose/Children` reorder/remove stay local to the selected card, `Media -> Cover / Gallery / Body` works from the embedded bank, and gallery reorder / gallery-to-cover reassignment remain local. However, this path is not treated as closed shipped truth until live browser verification reconfirms target activation, drop result, and post-drop continuity after the shell-ownership and root-contract repairs.
- **Bank-only visibility model** - Imported media is in the bank whether assigned or unassigned. Assignment and unassigned filtering use `referencedByCardIds` and `GET /api/media?assignment=unassigned|assigned` (`mediaAssignmentSeek.ts`). No separate media publication status or reader-discovery visibility flag is planned for v1 unless real use shows a need.
- **Studio media route status** - `**/admin/media-admin`** now redirects to **Studio**. Embedded Studio media is the real working surface for media administration; the legacy route remains only as a redirect.
- **Import Metadata** - Import reads embedded metadata (caption + keyword paths from XMP/IPTC/EXIF via ExifTool) and resolves keywords to app tag IDs in the import path.
- **Import metadata policy** - For scoped import paths, embedded captions/keywords are the app contract; JSON sidecars are out of scope (decision closeout 2026-04-20; regression via `readMetadataCaption` in integrity tests).

⭕1 **Planned**

- **PhotoPicker convergence in Media admin** - Add operator flows in `**/admin/media-admin`** (and Studio-embedded **Media admin**) to **import local images into the bank** and to pick library media with **PhotoPicker-grade** filtering (dimensions, search), so **PhotoPicker** in card edit becomes **optional** then **eliminable** for Studio and long-term for full-page card edit (see 📐 **Studio media & body (2026-04-22)**).
- **Manual phone aggregation** - Support the simple phone-origin authoring path: select a group of imported images, assign them to a card, then flesh out the story and tags. Phone-origin metadata can reduce `When` / `Where` and sometimes `Who` labor, leaving `What` plus aggregation as the main author step.
- **Media-management gap (import + duplicate triage)** - Media management remains a meaningful product hole relative to Cards/Studio authoring. The missing area is broader than filename collision checks: the app still needs a real import-facing bank workflow plus a trustworthy duplicate-triage path grounded in source-aware identity signals (starting with `sourcePath` and exact-file/source overlap rather than naive filename matching). Keep duplicate review scoped as one part of the larger import/media-management problem rather than treating it like a normal tag/filter feature.
- **Media editor control stacking** - In the Studio media editor, stack the horizontal/vertical adjustment controls vertically so the edit surface stays readable and predictable at the current modal width.
- **Grid admin ergonomics** - Filename is removed from the grid tile body, identity strings live on image hover, and the current bulk-select checkbox target sizes are accepted as sufficient for now. Further checkbox-size work is not active unless real usage shows a need.
- **Grid tagging UX + empty-dimension filter** - **Pane-level** per-dimension modes (`Any` / `Has any` / `Is empty` / `Matches tag`) ship in Media admin and Studio-embedded media. **Done:** per-tile inline add/search parity is now in place across Cards and Media, using the shared compact suggestion treatment. No further list/table alignment work is planned while those surfaces remain on the retirement path.
- **Infinite-scroll hardening** - Continue the append-style media working set toward a fully smooth infinite-scroll feel, with no obvious paging seams during normal admin use.
- **Cards/media workspace parity** - Bring Media and Cards closer to one shared operator contract for layout, overlays, selection, drag affordances, and edit entry points.
- **Media caption clamp** - Clamp media captions to two lines unless the item is in focus or explicitly opened.
- **Inline caption editing** - Allow media captions to be edited directly from the admin working surfaces with a clear blank-vs-filled state instead of forcing the operator through the full media editor for routine caption entry.
- **External-editor replace loop** - Smooth the replace-in-place workflow for assets edited outside the app (for example GIMP) so the operator can round-trip an image back into the same media record with minimal friction.
- **Spike** - End-to-end on a fixed folder: ingest -> embeddings -> candidate clusters -> simple review UI -> export JSON of confirmed groups and proposed tags (no production auth required) (`docs/05-Guided-Archive-Assistance.md`).
- **Evaluation set** - Curated subset with human-labeled "true events" to score precision/recall of clustering variants (`docs/05-Guided-Archive-Assistance.md`).
- **Heuristic pre-clustering** - Cheap, explainable first pass: time windows, folder boundaries, burst detection, optional GPS buckets—outputs **candidate segments** for ML refinement (`docs/05-Guided-Archive-Assistance.md`).
- **Review UI** - Grid of **candidate stacks** with merge/split, keyboard-friendly for large sets (`docs/05-Guided-Archive-Assistance.md`).

⭕2 **Future**

- **Search without Typesense** - Today non-empty text search returns 503 when Typesense is unset; consider degraded search (capped Firestore scan / clearer admin affordance) for small corpora or dev machines.
- **Rename types module** - `src/lib/types/photo.ts` -> `media.ts` (throughout)
- **Append to Gallery** - Bulk add selected banked media to another **existing** card's gallery from Media admin (parked). **Today** images still reach cards after import via **Create card from selection** (draft gallery + edit), **PhotoPicker** / gallery in card edit, **inline images** in rich text, and **replace-in-place** on media rows-no need to block on this bulk-append flow.
- **Video** - Support on **cover**, **inline (body)**, and **gallery** like stills-as far as product parity allows. **Size / "normalization"** (typical approach): **server-side transcoding** (e.g. FFmpeg) to a max resolution/bitrate and web-friendly format-same *class* of work as image normalization; not automatic in-app today.
- **Browser Upload** - Replace or supplement server-side folder read (`ONEDRIVE_ROOT_FOLDER`) with browser-based upload flow. Required for hosted deployment where the server has no local filesystem access.
- **Google Photos Adapter** - Import from Google Photos API. Most accessible cloud photo API. Requires OAuth consent, album/media listing, download-and-process flow.
- **OneDrive Adapter** - Import from OneDrive via Microsoft Graph API. Similar shape to Google Photos adapter.
- **Apple iCloud** - Most restricted API access. May require workaround (export from Photos app, then local/browser upload). Lowest priority.
- **Post-Import Maintenance** - Cropping, cleanup, sharpening in GIMP/Topaz after import. Use replace-in-place in Media admin to preserve media IDs and card references.
- **Import pipeline job** - **Async queue/worker** for large folder import (normalize + writes) complementing `IMPORT_FOLDER_MAX_IMAGES` and serverless timeouts.
- **Import metadata precedence** - Prefer **embedded XMP/IPTC** read **at import** for captions/keywords; use **JSON sidecars** as optional/supplementary when files are authoritative on disk.
- **Multi-Author** - Second author voice, shared media pool, intertwined feeds, cross-author comments. **Today:** one admin author + family readers; another author implies a separate instance. **Hard problems:** identity/roles, author-scoped cards vs shared media/dedup, tag "lens," merged vs parallel feeds, moderation. Stays **private / curated / archival**-not public social scale.

📐 **Entry Paths** - Two import paths: (1) **Import -> Card** - import from source as card + images concurrently, assign tags from folder/metadata, edit after. (2) **Import -> Bank -> Card** - bulk import images with tags into the bank unassigned, then create cards and assign from the bank.
📐 **Source Adapter Architecture** - The existing service layer (import, process, return mediaId) is the right shape for multiple source adapters. Current: local filesystem (hard drives / OneDrive mirror). Future adapters add alongside, not replacing, the local drive path.
📐 **Authoring Pipeline (digiKam -> mass import)** - Organize folders/tags in digiKam; one leaf folder -> one card; tags follow dimensional branches (WHO, WHAT, etc.); phased import with verification; post-import refinement via GIMP/Topaz + replace-in-place. See `IMPORT_FOLDER_MAX_IMAGES` for folder size cap.
📐 **Commercial import bar** - Import is a core product capability, not a side utility. A commercially credible import flow must support trustworthy ingestion, understandable review/correction, and smooth progression from imported media to structured card-based storytelling.

📐 **Assignment Model** - References only; hydrated from media at read time. No embeds.

- **Cover** -> `coverImageId`, `coverImageFocalPoint` (single image)
- **Gallery** -> `galleryMedia[]` - `{ mediaId, caption, order, objectPosition }`
- **Inline (rich text)** -> `contentMedia[]` - IDs extracted from HTML (`data-media-id`)

📐 `**referencedByCardIds` (referrer list)** - Denormalized convenience for assignment filters and delete orchestration. `cardService.getCardsReferencingMedia` now performs an authoritative scan across cover, gallery, `contentMedia`, and inline HTML references, then reconciles `referencedByCardIds` to that result; delete uses this same scan and fails safe when references remain.

📐 **Display identity vs canonical identity** - `filename` is presentation metadata and is not unique. Canonical identity is `media.docId`; duplicate detection/triage should rely on stable source/content signals (`sourcePath`, hash/checksum, dimensions/size), not filename alone.

📐 **Cross-entity sync** - Firestore is authoritative; Typesense and denormalized fields follow these entry points:


| Relationship                           | Primary maintenance                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card ↔ media `referencedByCardIds`     | `createCard` / `updateCard` (transaction `arrayUnion` / `arrayRemove`); `removeMediaReferenceFromCard` + `deleteMediaWithCardCleanup`                                                                                                                                |
| Card ↔ Typesense                       | `syncCardToTypesense` after create/update paths; `removeCardFromTypesense` on card delete                                                                                                                                                                            |
| Media ↔ Typesense                      | `syncMediaToTypesenseById` / `syncMediaToTypesense` on media writes; `removeMediaFromTypesense` on media delete                                                                                                                                                      |
| Card ↔ tag `cardCount` (and ancestors) | `updateTagCountsForCard` inside card transactions (tag changes, publish state, `deleteCard`)                                                                                                                                                                         |
| Card ↔ questions                       | `unlinkCardFromAllQuestions` after `deleteCard`; link/unlink APIs update `usedByCardIds` + `usageCount`                                                                                                                                                              |
| Drift / bulk repair                    | Ad hoc: `npm run sync:typesense` / `sync:typesense:media`; `npm run reconcile:media-cards`; other scripts under `src/lib/scripts/`. CRUD paths are the **happy path** for consistency, not a formal proof-use scripts when drift is suspected or after bulk imports. |


📘 `normalize-images-README.md`
📘 `METADATA_EXTRACTION_README.md`
📘 `docs/IMPORT-REFERENCE.md`
📘 `docs/05-Guided-Archive-Assistance.md` - Guided archive assistance (dual intake, clustering, review stacks, promotion); sequencing in `docs/03-Implementation.md` -> 📐 **Guided archive program (2026-04-24)** and **Section  Guided archive assistance**.

---

### **User Management**

*Intent*

- **Access Control** - Control access to the app.

*Principles*

- **Credential-based** - Password entry via NextAuth Credentials provider.
- **Manual onboarding** - Send link with username and password to new users.
- **Private by default** - Reader access is intentionally scoped and no user should see admin affordances or unrelated private content by accident.
- **Simple roles, strict boundaries** - v1 keeps role complexity low, but the boundary between author/admin and family reader must stay clear.

*Features*
✅ **Complete**

- **Data Model** - Firestore `journal_users` collection. Schema: `src/lib/auth/journalUsersFirestore.ts`.
- **Authentication** - `authorize` in `authOptions.ts` (DB first, legacy env fallback when no row for that username). Bcrypt passwords.
- **Admin View** - Users tab at `/admin/journal-users`. APIs: `/api/admin/journal-users`, `/api/admin/journal-users/[id]`.
- **Roles** - Viewers only from UI/API; single admin rule. Seed script: `npm run seed:journal-users`.
- **Login Redirect** - `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense`).

⭕1 **Planned**

- **User surface polish** - Restore the `User Management` title, normalize `All Users` casing, and left-align the section heading beneath `Add User` so the page chrome matches the rest of the admin vocabulary.
- **Credential-sharing policy audit** - Confirm and document whether multiple simultaneous sign-ins with the same username/password are acceptable in v1, and whether user creation/update should enforce stricter uniqueness or session expectations.

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
- **Professional + journal** - Aim for a UI that reads as **well-crafted and mobile-centric** while still allowing a **warm, journal/history** personality-usually via tokens (color, type roles, spacing), not ad hoc CSS.
- **Reader immersion** - Theme work exists primarily to make long-form family stories readable, aesthetically pleasing, and worth staying with-not merely to expose more admin controls.

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
- **Reader semantic layer (narrowed)** - Reader-facing CSS still uses a smaller semantic family (`--reader-page-`*, `--reader-chrome-`*, `--reader-solid-*`, `--reader-card-*`, `--reader-detail-*`, `--reader-body/title-*`, `--reader-meta/caption-*`, `--reader-media/lightbox-*`, `--reader-discovery-*`), but much of the earlier bridge-only layer has been collapsed in favor of concrete app-consumed variables. The remaining semantic layer exists to keep role-backed recipe resolution understandable rather than to hide actual styling decisions from the editor.
- **Component recipe direction** - The current editing model is moving from flat role names toward **component + variant + element** recipes so Story, Gallery, Question, Quote, Callout, sidebar, discovery rails, and lightbox surfaces can diverge cleanly while still using the shared atomic token set underneath. The next editor redesign step is to expose that to the author as **Component -> Attribute -> Value** rather than mixed recipe names plus token-bucket terminology.
- **Three-tier theme model (direction)** - Theme work is now grounded in three explicit layers: **atomic tokens** (palette, type scale, spacing, radii, shadows, raw component primitives), **semantic token classes** (tonal surface/text, contrast-on-fill, overlay/media contrast, borders, accent, focus, state families), and **recipes** (UI-job assignments such as story title, gallery lightbox caption, sidebar active tab, admin notice). App surfaces should consume recipes through semantic classes rather than binding directly to raw atomic token refs.
- **Live draft application (direction)** - The intended loop is now **tokens -> semantic classes -> recipes -> live draft app -> Save -> applied app**. Unsaved theme edits should apply immediately to the real app for the current session, with explicit Save to persist and explicit discard/reset to restore the last saved theme.
- **Primitives remain the base layer** - The underlying token and recipe system remains the exact value source/reference layer. The current right-side values panel is beginning to expose that layer more honestly by showing the named value behind the selected attribute and, where resolvable, the actual underlying value; broader direct system-value editing is still a later refinement rather than the current primary interaction.
- **Reader feedback theming (partial consumer coverage)** - Reader **general feedback** and **error feedback** are now wired to real reader surfaces. Reader **success / warning / info** feedback-panel values still exist in the theme contract, but the current reader UI does not yet render matching message surfaces for them.
📐 **Theme role** - Theme is part of the reader value proposition: clarity, tone, and immersion for family storytelling.
📐 **AI assist role** - `AI Story Assist` is editorial and voice-preserving: improve clarity, pacing, and reader interest without inventing facts or replacing author voice. Named guides such as `Bob` and `Sandra` may influence tone, but they must not change the factual contract or become roleplay that overrides the author. Write-style modes may return a single suggested draft for selective apply, while coaching modes such as `Make this story stronger` should return structured observations, follow-up prompts, and brief example lines instead of replacing the author's story.

⭕1 **Planned**

- **CSS Tokenization** - Move **design-affecting** values-colors, typography scale, spacing rhythm, radii, shadows, and key surfaces-into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a "theme" concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.
- **Theme contract inventory** - Complete an inventory-driven semantic theme contract before treating Journal / Editorial as finished themes: enumerate reader/admin surfaces, visible elements, current token use, required semantic token families, and migration status.
- **Theme schema** - Define the structured Firestore theme document shape that stores atomic tokens, semantic token-class assignments, and reader/admin recipe assignments for live draft application and saved runtime themes, with Theme Management as the editing interface; do not expose raw Firestore editing as the product workflow.
- **Preset completion** - Expand Journal / Editorial from partial preset bundles into coherent light/dark design packages only after the semantic surface inventory and schema are defined.
- **Theme workspace chrome simplification** - Remove unnecessary background shading from the floating Theme workspace so the editor feels lighter and keeps more attention on the actual reader/workbench surface beneath it.
- **Theme workspace fit and height** - Fit the active editor controls within common desktop windows more cleanly and increase the effective workspace height by roughly 20% so the floating editor shows more useful content before inner scrolling.
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

- **Gallery Styles Management** - Devise preconfigured card styles for selection - masonry, mosaic, etc.
📐 **Improvement intake** - Capture new improvement needs as concise, structured feature bullets in the owning section (`⭕1`, `⭕2`, or `❓`) with clear title + one-line description, instead of long prose blocks.

