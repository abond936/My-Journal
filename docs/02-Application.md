# APPLICATION

**See also:** `01-Vision-Architecture.md` · `03-Implementation.md`

Legend:
✅`Implemented`
⭕1`Planned (next)`
⭕2`Future`
❓`Open`
📐`Decision`
📋`Contract`
📌`Vision migrate (integrate when section is reviewed)`
📘`Resource`

---

### Document Structure (Application)

- Under each *Features* block, use plain status headings (no list bullet): `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open`.
- Items under each heading are bullets: `- **Title** - description`.
- Keep `📐`, `📋`, and `📘` outside the status buckets. Use standalone lines when the items are few or should remain individually referenceable; use a grouped label (`📐 Decisions`, `📋 Contracts`, `📘 Resources`) with bullets underneath when a section has a cohesive local cluster.
- `**📐` vs `📋` vs `⭕`:** `📐` records a **product or design choice** (why we chose a direction). `📋` records a **cross-surface behavior contract** agents must preserve when building or changing features (what must stay true at boundaries). `⭕` records **backlog work**. Do not rely on `📐` or `📋` alone to imply scheduled implementation—add `⭕1` / `⭕2` when a gap needs code.
- `**✅` wording:** Describe **what is implemented and wired today**. Avoid implying stronger guarantees than the code provides (e.g. treating a denormalized field as a proven invariant).
- This document is the **canonical application/product behavior spec by surface**. It should state what the user can do, how the surface is expected to behave, and what quality/trust bar applies.
- Keep migration notes, dated stabilization history, and execution sequencing out of `02` unless they materially define current product behavior. Put sequencing in `03`.

---

## **Application**

*Intent*

- **Content Consumption** - Private, read-oriented browsing of stories, images, and related content; optimized primarily for mobile, with tablet and desktop support.
- **Content Administration** - Authoring and organization of cards, media, tags, and relationships; optimized primarily for desktop, with only minor or supporting mobile edits.

*Principles*

- **Two halves** - Reader and admin must both be strong; neither carries the product alone.
- **Surface separation** - Consumption and administration stay distinct top-level surfaces (routes, roles, editing context), even when admin quick-edit reaches into the reader.
- **Core model** - The product centers on cards, media, tags, and relationships—not parallel entity types or extra admin surfaces.
- **Organize to tell** - Organization between import and story-building is core product work, not a side utility; large heterogeneous libraries are the normal case.
- **Media-native operation** - Browsing and lightweight edits should feel like a modern media app, not a slow CRUD console.
- **Author control** - Family-private audience; author publishes; the system may suggest but never auto-publishes or auto-deletes over author judgment.

*Features*
✅ **Complete**

- **Surface split** - Distinct reader and admin routes with explicit editing context.
- **Role boundary** - Viewers consume; one primary author/admin maintains the archive; admin-only operational routes stay restricted to administrators.
- **Reader shell stability** - Protected reader routes keep shell chrome and navigation context stable during client session hydration.
- **Reader mobile text edit** - Card detail and feed tiles support mobile quick-edit (metadata, eligible plain-prose body, gallery captions) via narrow PATCH paths; desktop keeps lazy full Compose for deeper edits.
- **Reader bundle separation** - Viewer sessions do not load admin authoring bundles (Theme Management, Studio, full Compose) until an admin explicitly opens an edit affordance.

⭕2 **Future**

- **Reader-to-Admin Entry Points** - Add admin-only quick-edit or deep-link affordances from reader surfaces.
- **Accessibility Hardening** - Strengthen typography, contrast, tap-target, keyboard, alt-text, and reduced-motion support for the family-reader audience.
- **Print / Export to Book**

📐 **Decisions**

- **Architecture split** - Keep consumption and administration as separate top-level surfaces to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
- **Future editing path** - Keep the top-level split, but add admin-only on-the-fly editing affordances from reader surfaces as a later optimization.
- **Mobile v1 scope** - Mobile-first launch is reader-only; Studio/admin are not a mobile target in v1.
- **Product shape** - v1 is a **private hosted app** for one author and family/friends readers. Customer promise: **organize -> integrate stories -> deliver** for private re-experience. Not a generic journal category, photo manager with captions, or public social product.
- **Starter taxonomy direction** - Optional **Tag Set 0 — Generic** skeleton installed from **Settings** (not forced at first run). Detail: **Studio Tags** 📐 **Tag Set 0**.

📋 **Contracts**

- **Session & route boundary** - Authenticated app throughout. Viewers read published content only. Admins author and may access reader plus admin surfaces. Admin mutations, catalog operations, and import helpers reject viewer and anonymous callers. Operational detail: **User Management** and `01` TECHNICAL auth decisions. API route classification and automated boundary tests: **`03` Phase 4** and `src/lib/auth/apiRouteAccessAudit.ts`.
- **Reader edit boundary** - Reader quick-edit covers narrow mobile-safe corrections; structural authoring, taxonomy, media bank work, and full Compose live in admin/Studio paths.
- **Integrity verification** - Card-media graph, derived tag fields, and tag-count invariants are guarded by project integrity tests and CI. Operational detail: **`03` Phase 4** and `npm run test:integrity`.
- **Shared admin feedback** - Dialogs, toasts, and loading states use one shared contract (**Administration** ✅ **Shared feedback**). No browser-native alerts on migrated surfaces; no second inline status pattern on the same action.
- **Filters & populations (reader)** - Reader discovery filters define which cards appear; they do not mutate catalog truth. Full population and stable sort rules: **Administration** 📋 **Filtered populations**, **Navigation** 📋.
- **AI touchpoints** *(horizontal summary)* - **Story Assist** (Compose/Cards): suggestion-only text, never auto-apply. **Tag/cluster/face proposals**: **Provisional suggestions** layer only. **Cover generation** *(future)*: suggestion or draft asset until author sets cover—never silent replace of confirmed cover. **Ingest classify** *(future)*: metadata/tag hints land provisional until accept.

📘 **Platform engineering status** - Backend hardening, CI gates, monitoring, and slice closeout narration live in `docs/03-Implementation.md` and `01` TECHNICAL—not in Application *Features*.

## **Navigation**

*Intent*

- **Discovery** - Help readers move through content, collections, and filters without losing context.
- **Control Surface** - Keep primary navigation and filtering reachable across mobile and desktop.

*Principles*

- **Canonical filter surface** - Filtering and discovery live in one left sidebar/drawer—not competing chrome or bottom-nav patterns.
- **Mode clarity** - Guided and Freeform are different browse models, not interchangeable skins.
- **Continuity** - Navigation preserves reading flow rather than interrupting it.
- **Responsive parity** - Mobile and desktop may differ in presentation, but the task model stays recognizable; layout rules in `docs/04-Theme-Design-Contract.md` Section 9.

---

### **Landing Page**

*Intent*

- **Public entry** - Explain the product to prospective and invited family users before sign-in.
- **Path to access** - Make **Sign in** obvious; credential entry lives on a dedicated route, not mixed into marketing scroll.
- **Honest promise** - Reflect the real workflow: **organize → integrate stories → deliver** for private family re-experience—not a photo manager, generic journal, public social network, or DAM.
- **Commercial front door** - v1 private hosted app for one author and invited family readers; set expectations before account exists.

*Principles*

- **Scannable** - Section-based page readable on mobile first; short blocks, clear headings, one primary action per viewport region.
- **Honest scope** - Digitization and heavy organization may happen outside the app; **Resources** points outward without implying integrations. Do not claim in-app scanning, Google/Apple import, or face recognition until shipped.
- **Trust-forward** - Privacy, author control, family-private access, and backup posture visible before sign-in—not legal policy, but plain-language trust.
- **Not a competitor clone** - Do not position as Google Photos with stories or Lightroom for families. Differentiation: private editorial storytelling, dimensional discovery, mobile reader.
- **Same story as canon** - Copy aligns with `01` Product Vision and **Application** 📐 **Product shape**; landing does not invent a second product narrative.

*Features*
✅ **Complete**

- **Public landing at /** - Living Album marketing page at root; scoped marketing theme/fonts via `(marketing)` layout; app shell hidden on marketing routes (`/`, `/login`, `/my-stories/*`).
- **Route split** - Sign-in at `/login`; CTAs on landing link to `/login`; `/` stays on the public landing even when a session exists; `/my-stories/4` redirects to `/`.
- **Hero & how-it-works (v1)** - Living Album hero, problem, three-step flow, promise, and sign-in CTAs shipped.
- **Full page sections (v1)** - About, Features, How it works (in-app steps + honest pipeline), Pricing (three-tier placeholder cards; no numeric prices), Resources (outbound pointers + disclaimer), Privacy & trust, FAQ, Contact/access placeholder (disabled form), closing Sign in CTA.

⭕1 **Planned**

- **Pricing tiers** - Enable pricing interest form and publish tiers when packaging is locked (**❓ Open**).
- **Contact / access channel** - Wire request-access form to operator contact when channel is chosen (**❓ Open**).

❓ **Deferred (copy-only placeholders shipped)**

- **Brand assets** - Final product name treatment, logo, and hero artwork source (current Title mark + phone mock retained).

📋 **Contracts**

- **Route & session** - `/` is **public** (no auth required; no auto-redirect when signed in). `/login` (or equivalent) is **credential entry**; signed-in session hitting `/login` → redirect **`/view`**. Signed-in user may open landing via hamburger **Home** (**Top Navigation** 📋) without signing out.
- **Page structure (v1 sections, top to bottom)** - **Hero** → **About** → **Features** → **How it works** → **Pricing** → **Resources** → **Privacy & trust** → **FAQ** → **Contact / access** → footer with repeat **Sign in**. Sections may collapse on narrow widths; order preserved.
- **Primary CTA** - **Sign in** in hero and footer; no competing primary action (no Start free trial until pricing exists).
- **Refuse list (copy guardrails)** - Must not claim: public social feed, DAM/lightroom replacement, unlimited cloud sync from Google/Apple Photos, automatic story publishing, in-app photo scanning, professional print fulfillment unless shipped.
- **Feature honesty** - Organization copy reflects assist + author control (suggest-and-confirm, not silent AI takeover). Story copy reflects cards/collections reader, not generic blog.
- **Resources** - External links open in new tab with disclaimer; no vendor logos implying partnership unless explicitly approved later.
- **Pricing placeholder** - Until tiers locked: three plan-shape cards (Personal, Family, Legacy) describe private hosted, one author, and family readers without numeric price commitment; **Request access** CTAs scroll to **Contact / access** (form still disabled until channel locked).
- **Visual & theme** - Public page uses reader-adjacent branding (Journal/Editorial feel) but does not load Theme Management workbench or admin bundles on anonymous visit. Responsive layout follows `04` §9 spirit where applicable.
- **SEO & sharing** - Basic title/description for private product; no indexed user content on public routes.

📐 **Decisions**

- **Route split** - `/` owns the public landing; sign-in moves off the root route when the landing program ships.
- **Public landing** - `/` always shows the marketing page; returning users enter the app via `/login` or direct `/view`.
- **Resources boundary** - Resource links are outbound references only; no in-app integration or vendor partnership implied.
- **Invitation model** - v1 access is operator-granted accounts (**User Management**); landing explains invitation/request-access, not open signup, unless product decision changes.
- **Pricing & contact (deferred)** - Pricing tiers, trial, packaging, and request-access contact channel remain **TBD**; landing ships with honest placeholder copy until locked.

❓ **Open**

- **Brand assets** - Final product name treatment, logo, and hero artwork source.
- **Pricing & contact wiring** - Enable placeholder forms when tiers and operator contact channel are locked.

📘 **Resources** - In-app Help and FAQ depth: **Top Navigation** ⭕1 **In-app Help**; canon promise: `01` Product Vision.

---

### **Sign-in**

*Intent*

- **Credential entry** - Authenticate invited users with low friction.
- **Post-auth routing** - Send successful sign-in to `/view` (reader entry).

*Principles*

- **Simple** - Obvious form, clear errors, no competing chrome.
- **Lightweight** - Branding present but subordinate to the form.

*Features*
✅ **Complete**

- **Sign-in form** - Email/password against Firestore-backed users; redirects to `/view` after success.
- **Sign-in route** - Credential entry at `/login`; landing CTAs and unauthenticated reader/admin redirects hand off here with `callbackUrl` preserved.

⭕1 **Planned**

- *(none — route split shipped with **Landing Page**.)*

📋 **Contracts**

- **Landing handoff** - Minimal chrome; link back to public `/` for product info optional; no marketing sections on login route.
- **Post-auth** - Success always routes to **`/view`**; failed auth stays on login with clear error; no admin auto-redirect.

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

- **Header** - Centered logo, contextual Back button, hamburger menu (content, admin, theme, sign out).
- **Hamburger** - Content links for all authenticated users; admin links for admin sessions only; primary admin entry from reader chrome.
- **Theme toggle** - Compact sun/moon icon in header for light/dark switching.
- **Density** - Reduced header height and menu spacing to preserve vertical room for content.

📐 **Decisions**

- **Header light/dark** - Keep a one-tap sun/moon control in the header while reading; hamburger repeats theme controls for menu users.
- **Theme row semantics** - **Theme…** opens Theme Management (admin only). **Preset** control switches named design packages (Journal / Editorial) when exposed to the current role. **Sun/moon** toggles light/dark mode only—never preset or management.
- **Viewer vs admin chrome** - Viewers get light/dark (and preset if product exposes it); Theme Management stays admin-only.

📋 **Contracts**

- **Hamburger sections (target IA)** - Order: **Home** (public landing at `/`) -> reader content links -> admin links (admin only) -> **Settings** -> **Help** -> **Theme row** -> **Sign out**. Home returns to the landing page without signing the user out.
- **Settings** - Account-oriented and authoring preferences per **Settings v1 scope** below—not Theme Management, not Help.
- **Settings v1 scope (admin)** - **Tag inheritance** — four toggles (Who, What, When, Where) per **Studio Tags** 📋 **Gallery→card inheritance**; all default **off** at first install. **Taxonomy** — install/remove **Tag Set 0 — Generic**. **Theme (reader)** — preset package (Journal / Editorial) and light/dark when exposed to admin as reader. **Operations** — run backup, show last backup status/time, link to guarded restore flow (admin-only, confirm-heavy). **Index health** — read-only Typesense/fallback status when available. **Account** — link to **User Management**; password change when supported. Not in v1 Settings: Theme Management workbench, Studio layout, cloud import configuration.
- **Help** - In-app help entry per **Help v1 scope** below; grows into FAQ/workflows—not a dump of canon docs.
- **Help v1 scope** - Guided vs Freeform overview; mobile reading tips; link to landing FAQ; pointer to Studio for authoring (admin).
- **Theme row layout** - One labeled row: **Theme…** | **Preset** (when enabled) | **Light/Dark** icon; three distinct actions, not one ambiguous control.

✅ **Complete**

- **Settings (inheritance)** - `/admin/settings` + hamburger **Settings** link (admin): four gallery→card inheritance toggles, default off, persisted in `app_settings/author`.
- **Settings (Tag Set 0)** - **shipped** — optional **Tag Set 0 — Generic** install/remove from Settings; **additive only** (skips name conflicts; never replaces existing tags); marked with `tagSetId` for clean removal.
- **Settings (operations)** - **shipped** — `/admin/settings` shows last paired backup status, **Run paired backup** when `ONEDRIVE_PATH` is set locally (not on hosted Vercel), read-only Typesense index health, and guarded restore CLI guidance.

⭕1 **Planned**

- **Top-nav refinement** - Logo prominence, Back-button clarity, chrome density; minimal reader control surface unless a named reader theme becomes a real option.
- **Hamburger restructure** - Implement target IA: Home, Settings, Help, Theme row separation, admin/content grouping per **Hamburger sections** contract.
- **In-app Help** - First Help surface (reader basics + link to landing FAQ); admin authoring help as follow-up.
- **Settings surface (remainder)** - Theme reader prefs per **Settings v1 scope** (inheritance, Tag Set 0, backup/index health shipped).

⭕2 **Future**

- **Help depth** - Contextual help from reader/admin surfaces; optional guided tours.

---

### **Left Navigation**

*Intent*

- **Primary Doorway** - Serve as the main doorway into the reader experience: the place readers enter guided structure, freeform discovery, and filter-driven exploration.
- **Discovery Filters** - Support content discovery through one consistent filter and browse surface.
- **Mode Navigation** - Make Guided and Freeform browsing reachable without losing context.

*Principles*

- **Core surface** - Left navigation is a primary product surface, not a secondary utility panel.
- **Reachable** - Filter and browse controls stay accessible across desktop and mobile.
- **Compact** - Dense controls must remain scannable and tappable.

*Features*
✅ **Complete**

- **Drawer vs sidebar** - Narrow widths use a drawer with overlay/backdrop; wider widths use a persistent sidebar. Filter access stays visible per `04` Section 9.
- **Browse modes** - Distinct Guided and Freeform modes; Guided default on open; selected mode persists locally.
- **Local tree controls** - Expand all / collapse all with browser-persisted expansion state on reader and admin tag trees.

📐 **Decisions**

- **One filter surface** - The left sidebar/drawer remains the canonical discovery and filtering surface.
- **Primary reader control surface** - Refinements should prioritize clarity, flow, and confidence over decorative chrome.
- **Admin reader variant** - Admins may get additional reader-side library affordances; viewer navigation stays filter-first and read-oriented.

📋 **Contracts**

- **Guided browse** - Curated collections tree as a read-only navigable outline with expand/collapse—not Freeform filter controls. Collection roots come from real curated structure. Draft collection roots hidden from viewers; admins see warning-styled draft entries in the same tree. Feed order follows curated tree order; text search stays relevance-first. **Multi-parent:** a card linked under multiple collection parents may appear **once per path** in the Guided tree and feeds reached through each path (**Collections Management** 📐 **Multi-parent reader display**).
- **Freeform browse** - Dimensional filtering on Who | What | When | Where (Who default). Five card-type toggles (Story, Gallery, Question, Quote, Callout); all active means no type filter. Tag checkbox includes descendants when enabled, exact tags when disabled. Tag search narrows the visible tree without dropping selections; chips group selections by dimension. Clearing filters stays on the Freeform feed path. Cards | Media browse-target toggle sets scope before filtering. Sort by and Group by available behind compact disclosure; grouped sections render in-feed when enabled. Control stack pinned; tree region scrolls. Sort options include seeded Random plus deterministic When, Created, Title, Who, What, and Where.
- **Admin sidebar on `/view`** - In Freeform mode, admins switch between Filter and Tag library; viewers remain filter-only. Tag-library behavior detail: **Studio Tags**.

⭕1 **Planned**

- **Left-nav refinement**
  - Continue simplifying control order. - Current preferred direction: keep `Cards | Media` visibly above taxonomy browsing and make the Freeform header row feel more intuitive without adding competing controls.
  - Browse-target clarity
  - Mobile ergonomics so Guided and Freeform remain easy to understand across widths.

⭕2 **Future**

- **Guided tree mobile ergonomics** - Increase practical finger usability of the guided/tag tree rows and controls beyond the current desktop-acceptable baseline where needed in real mobile use.
- **Drawer gesture refinement** - Keep improving narrow-width drawer-open and drawer-close behavior so in-app navigation wins cleanly over browser-history gestures without changing the core drawer model.
- **Episodic discovery** - Recency, unread, or "what's new" filters for family readers after one-off publishes (spec TBD).
- **Tag Tree Counts** - Fix numbering and add media counts "(x/y)" on tag tree nodes.
- **Collection Metadata** - Implement collection metadata (child counts).
- **Chron Tree** - Provide tree in chronological order (Year / Month / What) for browsing.
- **Reader filter modality by dimension** - Reader filtering does not need one identical control pattern for all four dimensions. The strongest future visual candidate is `Who` (for example, person tiles / face-led chips when that capability exists). `What`, `Where`, and especially `When` should be free to use the interaction model that best fits the data rather than being forced into the same visual language.
- **Chronological aggregation** - `When` should eventually support chronological aggregation and step-down browsing rather than only exposing a flat tag tree. The target direction is expandable time buckets such as decade -> year -> month -> day where data quality supports it, similar in spirit to modern photo-library year grouping, while still fitting the `when/date/...` tagging model and reader sidebar contract.

❓ **Open**

- **Group by default** - Keep in advanced disclosure vs remove (product preference).
- **Created sort visibility** - Primary sort list vs advanced-only (product preference).
- **Guided tree performance** - Confirm first-load vs selection latency before contract change (investigation).
- **Messy-archive Studio entry** - Whether new/import-heavy sessions should open **Studio Media** first vs remember last pane (product preference).

---

## **Content**

*Intent*

- **Story Consumption** - Present stories, images, and related content as a coherent reading experience.
- **Mixed Media** - Support narrative, gallery, question, quote, and callout content within one reader surface.

*Principles*

- **One feed** - One card schema supports multiple content families in one continuous reader surface.
- **Matrix-governed** - `type`, `displayMode`, and context (feed grid, detail, rail) define presentation and interaction.
- **Navigation-driven subset** - Active Guided/Freeform/filter state controls which cards appear; browse-mode contracts: **Navigation** 📋.
- **Author-authored** - Mixing, ordering, and publish state stay author-controlled, not opaque inference.
- **Reader trust** - Stable, intentional reader behavior with no admin leakage or confusing dead ends.

*Features*
✅ **Complete**

- **Mixed feed** - Reader `/view` presents mixed card families in one responsive grid (single column at mobile breakpoint per `04` §9.4).
- **Display modes** - Cards use `static`, `inline`, or `navigate` per family and context.
- **Guided and Freeform** - Same feed components serve both browse modes; mode-specific behavior: **Navigation** and **Content Page** 📋.
- **Feed continuity** - Position and focused-card restoration when returning from detail to `/view`.

---

### **Content Page**

*Intent*

- **Immersive reading** - Fluid scroll through stories on `/view`.

*Principles*

- **Equal browse modes** - Guided and Freeform are equal-priority consumption paths.
- **Reader-first trust** - No accidental admin leakage, dead ends, or random interaction models.

*Features*
✅ **Complete**

- **Feed grid** - Responsive grid with search, type chips, and card mentions; feed edits patch visible cards in place without reordering.
- **Card interaction** - Navigate tiles open `/view/[id]` for `story`, `gallery`, and `qa`; other type/mode pairs render non-link tiles. Collections use `childrenIds` on any type.
- **Closed tiles** - Uniform **1:1 square shell** for `Story`, `Gallery`, `Question`, and `Quote` (non-inline): cover or type-native upper band, title band where applicable, fixed bottom **four-slot chip strip** on main grid tiles. `Callout` keeps utility portrait shell. Type badges on closed `Story` and `Gallery` only; excerpts excluded from reader closed tiles.
- **Open headers** - Open `Story`, `Gallery`, and `Question` retain type + tag/context badges in deliberate header placement.
- **Gallery feed** - Inline gallery swipes with slide count and active-image caption overlay on closed navigate tiles.
- **Cover truth** - Compose is authoring source for primary cover; open Reader matches authored crop; focal data guides bounded crops on closed tiles, rails, and Explore More.
- **Discovery rails** - Detail structural children in `More...` rail (medium square tiles matching main grid); Similar / Explore (three compact cards each); Guided detail suppresses generic discovery.
- **Guided feed** - TOC-style collection browsing with sticky guided title bar, direct-children feed, and explicit transition state on collection change.
- **Performance paths** - Inline closed tiles use static HTML; feed queries use cover-only hydration; reader renditions preferred for tiles; offscreen tiles use CSS containment.

📋 **Contracts**

- **V1 Matrix** - Presentation contract for each `type` + `displayMode` by context:


| Type    | Display mode | Feed (default grid)                                                               | Feed (rail variant)                                               | Open card (`/view/[id]`)                              | Excerpt behavior                                          | Cover framing                                                          |
| ------- | ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| story   | navigate     | Interactive square tile opens detail; title band; bottom dimensional chip strip; type badge on cover | Optional curated horizontal sequence tile; opens detail           | Full narrative page with title/subtitle/cover/content | Truncate in feed; optional `Read more` expansion in-place | 1:1 square shell; cover crops inside upper band using stored focal data |
| story   | inline       | Non-interactive tile with title + excerpt/content preview                         | Optional only when explicitly curated; non-interactive by default | N/A (not used as open behavior)                       | Allow `Read more` for long preview text                   | Orientation-aware ratio bucket per variant (legacy inline path)                             |
| gallery | navigate     | Interactive square tile with cover-first media; title band; bottom chip strip     | Primary rail candidate; horizontal sequence of gallery tiles      | Detail page with gallery and related blocks           | No excerpt requirement; title-first                       | 1:1 square shell; cover/slides crop inside upper band                                     |
| gallery | inline       | Non-interactive tile; inline gallery preview allowed                              | Optional curated rail for quick browse                            | N/A (not used as open behavior)                       | Not excerpt-driven                                        | Orientation-aware ratio bucket per variant (legacy inline path)                             |
| qa      | navigate     | Interactive square tile; optional cover upper band; centered question; bottom chips | Optional themed rail (for grouped Question runs)                  | Question + answer detail structure                    | Teaser optional; no `Read more` requirement in v1         | 1:1 square shell; optional cover in upper band                                            |
| qa      | inline       | Non-interactive tile with question + answer preview                               | Optional curated rail                                             | N/A (not used as open behavior)                       | Preview-first; no `Read more` requirement in v1           | Orientation-aware ratio bucket per variant when cover exists (legacy inline path)           |
| quote   | static       | Non-interactive square tile; centered headline + watermark; bottom chip strip     | Optional quote rail for themed runs                               | Render quote body + attribution when opened directly  | Not excerpt-driven                                        | 1:1 square shell; hidden cover metadata does not change tile shell                        |
| callout | static       | Non-interactive callout tile                                                      | Optional callout rail                                             | Render callout content when opened directly           | Not excerpt-driven                                        | Closed feed stays on the utility portrait frame; hidden cover metadata must not change the tile shell |


- **Matrix rules** - The matrix is source of truth for feed/detail behavior; new display modes or variants must be added here before implementation.
- **Closed-tile dimensional chips** - Main grid closed tiles (`Story`, `Gallery`, `Question`, `Quote`) render a fixed **Who | What | When | Where** bottom row. Empty slots show dimension-colored `-` placeholders (never operational sentinels like `zNA`). Filled slots show **one label per dimension**: the **subject** tag label when set; **`Mixed`** when multiple confirmed tags exist and no subject; a single tag name when only one. **Hover** on a filled slot shows the **full list** of confirmed tags for that dimension on the card. Compact rails (`size="small"`) omit the chip row.
- **Unified closed-tile shell** - Reader feed, Studio Cards grid, and Compose feed preview share one shell geometry: cover/type band -> title band -> bottom chip row; internal proportions stay fixed as tile width scales. Surface chrome (Reader edit, Studio checkbox/delete, Compose framing controls) sits outside the shell.
- **Guided feed and detail** - Collection selection shows authored children only; generic Explore More / Related suppressed in Guided; internal label `Collection` not shown to readers; status visibility respects reader vs admin role.
- **Freeform feed** - Standard feed grid and filters from **Navigation**; generic discovery on Freeform detail pages.
- **Utility closed tiles** - Closed `Question` and `Quote` are title-driven; closed `Callout` renders bounded rich text clipped inside the utility portrait shell; `Quote` and `Callout` ignore hidden cover metadata for shell selection.

📐 **Decisions**

- **Reader priority** - Guided and Freeform are equal-priority for demo and early validation.
- **Excerpt omission** - Story excerpts omitted from reader closed-tile presentation; open/detail may still show excerpt when authored.
- **Horizontal open** - Prefer horizontal open for long-form on mobile where implemented.

⭕1 **Planned**

- **Feed presentation refinement** - Enforce matrix across all contexts; orientation-aware ratio buckets for inline paths; overlay legibility on varied imagery.
- **Rail variant** - Curated horizontal sequence for qualifying runs with explicit eligibility and sizing separate from main grid.
- **Read more** - Optional in-feed progressive disclosure for story excerpts with stable scroll behavior.
- **Question cover cue** - Evaluate question-mark or type-native cover treatment for closed Question tiles.
- **Utility typography parity** - Rail vs grid Quote/Question headline and watermark scale mismatch; blocked until unified utility tokens (see `03`).
- **Trivia card** - Evaluate flip prompt/answer family distinct from full Question cards.
- **Quote attribution** - Clarify attribution modeling (content vs subtitle/excerpt).
- **Questions / Quotes sourcing** - Import/source material paths (Word, books, Notion).

⭕2 **Future**

- **Bundle / next/image tuning** - Code-split heavy routes; feed image priority.
- **Gallery slider polish** - Dots, desktop arrows, child rails.
- **Feed types / display strategy** - Alternate layouts post-v1.

📘 **Resources** - Responsive layout: `docs/04-Theme-Design-Contract.md` §9; reader card components under `src/components/view/`.

---

### **View Page**

*Intent*

- **Open-card continuity** - Seamless transition from feed tile to full card reading.

*Principles*

- **Mobile-first detail** - Touch-friendly detail layout and navigation.
- **Detail vs feed** - Open pages own full narrative, gallery, and structural children; feed owns closed-tile contract (**Content Page** 📋).

*Features*
✅ **Complete**

- **Open flow** - Navigate cards open detail via server fetch; components render by card type and field presence.
- **Detail structure** - Title, subtitle, cover, then body (TipTap). Question: kicker + Answer; Quote: blockquote + attribution from subtitle/excerpt; Callout: standard title/subtitle/body.
- **Structural children** - Server-rendered child rail (`More...`) with cover-only hydration; Similar / Explore hydrate client-side after mount.
- **Guided boundary** - Guided detail suppresses generic discovery; Freeform retains it.
- **Reader access** - `/view`, `/view/*`, `/search` require authenticated session; viewers see published content only; shell stable during client hydration; server enforces boundary on root reader routes.
- **Embedded media** - Figures collapse empty caption chrome; preserve real captions and edit affordances for admins.

⭕1 **Planned**

- **Detail presentation refinement** - Consistent optional kicker/subhead; discovery block typography and hierarchy.
- **Drop cap** - Evaluate for long-form story openings.

⭕2 **Future**

- **Audience-based access** - Adult/child or collection-specific sharing rules.
- **View mosaic** - Gallery mosaic on detail page.
- **Social features** - Out of scope until revisited.

📋 **Contracts**

- **Open vs closed** - Detail page is **open** presentation per **Content Page** 📋 **V1 Matrix**; does not reuse closed-tile shell geometry for body layout.
- **Mobile quick-edit** - Admins may use narrow PATCH quick-edit on eligible fields; structural edits open Studio/Compose paths (**Application** 📋 **Reader edit boundary**).
- **Discovery blocks** - **More...** (structural children), **Similar**, **Explore** on Freeform only; suppressed on Guided detail per **Content Page** 📋.
- **Gallery detail** - Swiper/lightbox behavior for gallery-type cards; captions editable on admin quick-edit where implemented.

---

## **Administration**

*Intent*

- **Archive administration** - Author, organize, and maintain cards, media, tags, relationships, and supporting admin settings.
- **Organize at scale** - Organization between import and story-building is core product work, not optional utility. Messy heterogeneous libraries (zero, mixed, or rich metadata) are the normal case; large personal archives must stay manageable without expert operator maintenance.
- **Desktop-primary workflow** - Optimize administration for desktop use; mobile limited to narrow supporting actions where explicitly allowed.

*Principles*

- **Studio-first** - Day-to-day content administration converges on **Studio** at `/admin/studio` rather than parallel legacy routes.
- **Organize to tell** - Tagging, structure, and media-to-card relationships create the archive the reader experiences; admin optimizes for that work at volume.
- **Bulk and individual** - Support high-volume batch operations and precise single-item edits.
- **Grid-first** - Prefer one strong grid/working-set interaction model per job over parallel table/list/modal variants when capability is preserved.
- **Integrity-owned mutations** - Data-integrity rules enforced at service/API layer, not UI alone.
- **Interaction economy** - Each major surface has a plain-language contract: what feels instant, what may hydrate progressively, what must never block routine authoring.
- **Single-author first** - v1 optimized for one primary author/operator, not collaborative authoring.
- **No operator traps** - Destructive or irreversible actions stay explicit; routine edits preserve integrity.
- **Import-critical media** - Importing and structuring large libraries is core capability. Phone-origin, cloud, and scanned sources are normal inputs. System-derived organization aids (heuristics, provisional suggestions, later faces/clusters) assist through suggest-and-confirm flows-never silent publish or delete.

*Features*
✅ **Complete**

- **Studio shell** - `/admin/studio` is the primary workspace: **Organize** (tags + collections), **Cards**, **Compose**, **Questions**, **Media**. Persisted pane sizing, preview-first card handoff, shell-owned active-card selection, app sidebar closed by default.
- **Specialist surfaces** - **User Management** and **Theme Management** remain outside Studio.
- **Legacy demotion** - Standalone card/media/tag/question admin routes redirect to Studio; embedded shell is the product truth.
- **Shared feedback** - Migrated admin surfaces use shared dialog/loading/toast contract, not browser-native alerts.
- **Local-first reconciliation** - Routine saves patch local catalog/state where integrity allows instead of broad full-catalog refetch.
- **Relationship editing** - In-shell Compose accepts cover, gallery, children, and body drops from embedded media bank; structural tree DnD in Organize/Cards (author-verified for gallery reorder and children reorder).
- **Inline tags in Compose** - Compact dimensional tag bar in Studio Compose; deeper taxonomy in Organize tag rail and `/view` admin Tag library.
- **Operator tooling** - Backup, restore, reconcile, and import scripts remain part of the lifecycle. Operational detail: `docs/NPM-SCRIPTS.md`, `docs/03-Implementation.md` step **12**, `01` TECHNICAL durability.
- **Integrity gate** - Project verification guards card-media edges, denormalized references, and derived tag/count correctness.
- **Studio naming** - Product chrome uses `Content Studio` vocabulary (legacy `Content Management` language retired).
- **Bulk bar and selection** - Bulk bar hidden when nothing selected; selection copy aligned with growing-list / select-visible semantics.

⭕1 **Planned**

- **Interaction contract alignment** - Document and enforce user-visible latency/feedback contracts for browse, selection, DnD, and filter persistence across Studio panes.
- **Code path simplification** - Retire deprecated surfaces, duplicate loaders, and dead compatibility paths that no longer support the Studio workflow.
- **Operator message pruning** - Remove low-value shell noise (for example ambient `working in...` messages).
- **Studio light-mode hierarchy** - Collapse header/workspace seam and reduce stacked pale planes without changing pane ownership or DnD structure.

⭕2 **Future**

- **Maintenance UI** - Admin surface over secured maintenance APIs when in-app diagnose/fix outweighs CLI.
- **Admin SWR deduping** - Bounded deduping on admin catalog fetches where safe.
- **Legacy list-surface audit** - Remove list-only remnants that no longer support real workflows.

📋 **Contracts**

- **Studio shell layout** - Multi-pane workspace with independently collapsible/resizable panes and persisted widths. One shell-selected active card drives Compose; media multiselect is pane-local. Selection seeds Compose from best available preview immediately, then enriches via background hydration without blanking first.
- **State domains** - Studio coordinates separate domains, not one shared list: **taxonomy** (full tag tree), **structure** (collections tree), **cards workspace** (filtered card working set), **media workspace** (filtered media bank), **active card** (Compose context), **questions** (prompt bank). Pane-local filters must not silently redefine global structural truth.
- **Filtered populations** - Card and media filters apply to the full server-query population; UI shows contiguous slices of one stable-sorted result. Typesense `per_page` capped at 250; larger sets use chunked fetches along the same order (`01` TECHNICAL Typesense list limits).
- **DnD platform** - One `@dnd-kit` platform with bounded classes: **Structural** (tree/root/parent-child), **Assignment** (cover/gallery/body), **Local reorder** (gallery/children within surface), **Taxonomy** (tag reorder/reparent), **Upload drop** (files only), **Editor-integrated** (TipTap body precision). Shell owns cross-pane routing and collision policy; services own mutations and rollback. **Cross-pane append rules:** `Cards -> Children` appends to end of children list; `Media -> Content` appends to end of body/content-media; `Media -> Cover` and `Media -> Gallery` are direct assignment. Structural drag keeps **on-row** nest vs **between-row** insert/reorder semantics. No DnD path closed from code/tests alone-browser verification required for target activation, drop result, and post-drop editing continuity.
- **Studio navigation hygiene** - Curated structure, tagging, card work, media work, collections maintenance, and question authoring live in Studio. Users and Themes stay outside.
- **Selection & bulk** - Multiselect (shift/control range) is pane-local in Cards and Media workspaces. Shared bulk bar appears when selection non-empty; bulk tag and bounded batch ops use server batched paths. **Select visible** semantics on growing lists—bulk targets loaded visible rows unless explicit select-all-in-filter ships later.
- **Interaction economy** - Browse/filter/DnD: optimistic or acknowledged within ~100ms where integrity allows; save paths show in-flight state; destructive actions confirm; failed mutations roll back or show recoverable error—no silent partial success.
- **Search & index (admin)** - Typesense when configured for text search on cards/media; Firestore seek/fallback for unfiltered and dimension-filter paths; 503 when text search requested without Typesense. Admin lists obey **Filtered populations** and 250/page chunking (`01` TECHNICAL).
- **Provisional suggestions** *(Phase 1.a horizontal — platform suggest-and-confirm layer)*  
  - **Purpose** - Hold **machine-generated proposals** separately from **confirmed** tags, groupings, and assignments until the author accepts, edits, or dismisses. Powers organize-at-scale (clusters, tag hints, later faces) without polluting reader truth or **Studio Tags** confirmed assignments.  
  - **Confirmed boundary** - **Confirmed** state lives on media and card documents (tag assignments, gallery membership, published fields). Provisional records **never** update `cardCount` / `mediaCount`, `filterTags`, reader filters, closed-tile chips, or **gallery→card inheritance** inputs (**Studio Tags** 📋). Accept is the only path from provisional → confirmed.  
  - **Trust bar** - **Never** auto-publish to reader. **Never** auto-delete assets or confirmed tags. **Never** silently overwrite confirmed assignments. Dismiss/reject removes provisional only.  
  - **Proposal kinds (v1 contract)**  
    - **Tag suggest** - Proposed dimensional tag on a **media** or **card** subject (Who / What / When / Where), from heuristics, import metadata, or AI.  
    - **Cluster / stack** - Proposed group of media (time window, folder, burst, similarity, review stack per `docs/05-Guided-Archive-Assistance.md`) for author split/merge/confirm before promotion to cards or bulk tag apply.  
    - **Face hint** *(future)* - Proposed face region + optional Person / Who link; stays provisional until author confirms (**Studio Tags** 📐 **Person model**).  
  - **Sources** - Heuristic ingest (time, folder, burst, geo when present); import metadata mapping; AI tag/classify endpoints; face API (later). **Compose Story Assist** and **cover generation** are **authoring suggestions**, not provisional tag/cluster records—separate trust path (**Studio Cards**).  
  - **Accept** - **Individual** — accept one proposal on one subject. **Bulk** — accept matching proposals on a selection, cluster, or review stack. Accept runs through the same server assignment/mutation paths as manual tag apply (counts, derived fields, index sync).  
  - **Reject / dismiss** - Drops provisional record(s) only; confirmed state unchanged.  
  - **Edit before accept** - Author may change proposed tag target, split/merge clusters, or correct Who link before accept; no confirmed write until explicit confirm.  
  - **Idempotence** - Re-running ingest or clustering may add or refresh proposals but must **not** destroy prior **confirmed** work; stale provisional may be superseded or expired by policy (implementation detail).  
  - **Review surfaces** - Primary UX in **Studio Media** **Browse | Review** mode (**Studio Media** 📋 **Review mode IA**); card-level tag suggestions may appear in **Studio Cards** / **Compose** with the same accept contract.  
  - **Storage** - Provisional records are **not** embedded as normal tag assignments on media/card docs. **Shipped v1 (Review slice 1):** Firestore collection **`provisional_clusters`** — one document per **cluster/stack** with `lens` (`suggested` | `when` | `where` | `who` | `what`), `status` (`pending` | `accepted` | `dismissed`), `title`, `reason`, optional `occasionLabel`, `memberMediaIds[]`, dimensional `suggestedTagIds` (`who`/`what`/`when`/`where` id arrays), optional `coverageNote`, timestamps. Per-media or per-card **tag suggest** rows and **face hint** payloads remain **❓ Open** for later slices. Indexes: composite on `status` + `lens` for Review queue reads.
  - **Promotion to stories** - Confirming a cluster may **offer** create/attach card, apply tags to media, and open Compose—author confirms each promotion step; no automatic card publish.

📐 **Decisions**

- **Suggest-and-confirm platform** - All organize intelligence (clusters, tag hints, faces) uses the **Provisional suggestions** contract; confirmed catalog and reader truth change only on author accept.
- **Admin simplification** - Grid-first, studio-first; reduce parallel views while keeping tagging speed and card-media relationship editing first-class.
- **Data integrity** - Write paths must match `01` TECHNICAL Backend (*Card-media integrity*, *Delete graph*, *Durability boundary*). Cross-entity sync detail: **Studio Media** 📋 **Cross-entity sync**; drift repair via `npm run reconcile:media-cards` and related scripts in `docs/NPM-SCRIPTS.md`.
- **Errors and operator messaging** - Shared backend error shape (domain code + user-safe message) and consistent UI channels. Align card PATCH stale-cover edges with `docs/04-Theme-Design-Contract.md` Section 10.

❓ **Open**

- **Provisional schema (follow-on)** - Per-media tag-suggest documents, face-hint payloads, retention/TTL policy, and card-level provisional rows (`01` TECHNICAL owner).

📘 **Resources** - `docs/NPM-SCRIPTS.md` · `docs/IMPORT-REFERENCE.md` · `docs/05-Guided-Archive-Assistance.md` · Platform engineering status and slice closeout: `docs/03-Implementation.md` Phase 2–4.

---

### **Studio Cards**

*Intent*

- **Card population management** - Browse, filter, tag, and select cards at archive scale.

*Principles*

- **Tagging first** - Optimize for tag assignment and quick relationship editing; structure depends on both.
- **Continuous browsing** - Large populations stay fluid to browse, resize, sort, and filter without repetitive paging rituals.
- **Grid-first** - Grid is the canonical working surface; legacy table/list layouts are retired from product use.

*Features*
✅ **Complete**

- **Card model** - Types `story|gallery|qa|quote|callout`; status; `displayMode`; cover, gallery, TipTap body, dimensional tags, `childrenIds`; server-side rules in `cardService`.
- **Studio Cards pane** - Search, type, display mode, status, sort, Clear, and one on-card dimensional tag filter (OR within dimension, AND across). Defines pane-local card workspace, not global shell state.
- **Grid layout** - Shared `AdminClosedCardTileShell`: 1:1 square closed tile with reader-parity four-slot chip strip, type/status overlay, checkbox/delete/drag chrome, search-only tag bar under tile.
- **Multiselect and bulk** - Shift/Ctrl range/toggle selection; shared bulk bar; bulk tag apply via batched API; narrow PATCH routes for bounded edits.
- **Media-derived tag suggestions** - Full-page card admin grid shows per-dimension suggestions from gallery/media tags with apply path (primary workflow when metadata lived on media first).
- **AI Story Assist** - Admin-only suggestion endpoint; named guides (`Bob`, `Sandra`); modes include draft, tighten, expand, retitle, strengthen. Suggestion-only, no auto-apply.
- **Import and discovery** - Folder-as-card import; PhotoPicker library tab mirrors media filters during card edit.

📋 **Contracts**

- **Filtered population** - Filters apply to full server-query population; UI shows contiguous slices of one stable-sorted result. Typesense capped at 250 per request; larger sets chunked along same order (`01` TECHNICAL).
- **Pane-local filters** - Cards workspace filters do not redefine global taxonomy or structure truth.
- **Card model** *(horizontal)* - **Types** `story | gallery | qa | quote | callout`. **Status** draft/published. **displayMode** `static | inline | navigate` per **Content Page** 📋 **V1 Matrix**. **Media edges** — `coverImageId`, `galleryMedia[]`, body `content` + `contentMedia[]`, ordered `childrenIds`. **Tags** — confirmed dimensional assignments + derived `filterTags`; gallery→card inheritance per **Studio Tags** 📋. **Question link** — optional `questionId` for `qa` type. **Collections** — any card may be root or child; structural truth in `childrenIds` / root flags (**Collections Management**).
- **AI Story Assist boundary** - Suggestion-only text transforms; never auto-writes card fields without author action. Not provisional tag storage (**Administration** 📋 **Provisional suggestions**).
- **Closed tile in grid** - Uses **Unified closed-tile shell** (**Content Page** 📋); admin chrome (checkbox, delete, drag) outside shell.

📐 **Decisions**

- **Card-first orchestration** - Primary workflow is card-centric; media and tags operate as relationship panels around active card context.
- **Question-linked type** - Cards with valid `questionId` remain eligible for `Question` type in edit UI.

⭕1 **Planned**

- **Grid-first convergence** - Finish retiring table/list code paths and stale CSS where grid covers identity, tagging, selection, and relationships.
- **Grid density** - Reduce tile footprint ~25% while preserving legibility and selection affordances.
- **Context Assist** - Keep historical/background context a distinct output from writing rewrites in AI assist.
- **Tag picker polish** - Keyboard-first tree interaction and search disambiguation if needed after current compact picker.
- **Dimension filter evolution** - Searchable tree popover for single-dimension `Matches` without replacing full `MacroTagSelector` for advanced work.
- **Narrative development backlog** - Consolidate story runs, year coverage, question-backed stories, callout/quote expansion.

⭕2 **Future**

- **Subject-tag filtering** - Mark one tag as subject; priority render on tiles; `Subject only` filter mode.
- **Studio cards bulk parity** - Full bulk operations in Studio Cards pane matching deep admin when needed.
- **Card Edit Mosaic** - Mosaic gallery manager in edit.
- **Card linkage** - Non-hierarchical `linkedCardIds` see-also references.
- **Relationship DnD polish** - Keyboard parity and indicator polish across assignment surfaces.

📐 **Structural collections** - Collection parent = any card with `childrenIds`. Top-level roots use `isCollectionRoot` + `collectionRootOrder`; multi-parent allowed; cycles blocked server-side.

---

### **Studio Compose**

*Intent*

- **Active authoring context** - Edit the shell-selected card for narrative, media, structure, and metadata.

*Principles*

- **Selection continuity** - Keep active card visible through changes, deletes, and cross-pane handoffs.
- **Relationship-ready editing** - Cover, gallery, children, and body-media edits stay in-shell without disconnected routes.
- **Save continuity** - Routine saves acknowledge quickly without freezing unrelated panes.

*Features*
✅ **Complete**

- **In-shell editing** - Compose embeds full card form for shell-selected card; delete, duplicate, and deep chrome available where needed.
- **Handoff behavior** - Preview-first selection; delete clears stale state and selects next sensible card from Cards view when possible.
- **Media relationships** - Cover, gallery, children, and TipTap body accept bounded drops from embedded media bank; gallery reorder local to gallery rows; cross-pane append rules per **Administration** 📋.
- **Cover and framing** - Fill vs Fit persisted; collapsible feed tile preview beside framing controls (see **Content Page** 📋).
- **Inline tags** - Compact dimensional tag bar in Compose shell.
- **AI Story Assist** - Suggestion-only; named guides; collapses when idle.

📋 **Contracts**

- **Active card** - One shell-selected card; Compose form binds to it until selection changes or delete.
- **Relationship targets** - Cover, gallery rows, children list, TipTap body accept drops per **Administration** 📋 **DnD platform** append rules.
- **Gallery source of truth** - Compose gallery order is authoritative for card; Studio Media bank is default add path; inheritance reads **gallery** media tags only (**Studio Tags** 📋).
- **Inline tags** - Compact bar edits **work truth** on card; does not edit media frame truth.
- **Preview parity** - Feed tile preview in Compose uses same closed-shell contract as reader/admin grid (**Content Page** 📋).

⭕1 **Planned**

- **Compose authoring refinement** - Excerpt guidance reacts to body changes; reader admin editing styled as Compose-grade surface where practical.
- **Compose framing refinement** - Broader parity across Compose, reader feed, reader detail, and admin preview surfaces.
- **Editor presentation** - Optional drop-cap styling in rich-text editor.

⭕2 **Future**

- **Compose subject-tag authoring** - Mark one assigned tag as card subject from existing tag flow.
- **Compose relationship hardening** - Continue browser verification for edge cases (unpaged media bank resolve, caret after image insert).

---

### **Studio Organize**

*Intent*

- **Taxonomy and structure** - Manage dimensional tags and curated collection trees in one workspace column.

*Principles*

- **Taxonomy separate from structure** - Tags and collections share Organize workspace but remain distinct systems.
- **One workspace, distinct subsections** - **Studio Tags** owns taxonomy; **Collections Management** owns curated structure.

*Features*
✅ **Complete**

- **Organize split** - **Tags | Collections** tabs; when import tags need reconciliation, **Map import tags (N)** opens a second pane beside the full tag tree (not a separate tab).
- **Subsection ownership** - Detailed behavior in **Studio Tags** and **Collections Management** below.

📋 **Contracts**

- **DnD architecture** - Admin DnD uses bounded classes (Structural, Assignment, Local reorder, Taxonomy, Upload drop, Editor-integrated). Shell owns cross-pane routing; panes own targets; services own mutations. Detail: **Administration** 📋 **DnD platform**.
- **Column layout** - Tag rail above or beside collections tree in Organize column; resizing persists with shell layout; no merged tag/structure document model.

---

### **Studio Tags**

*Intent*

- **Dimensional taxonomy** - Who, What, When, Where hierarchy for cards and media.
- **Tag authority** - Single product rules for how tags are **created**, **assigned**, **inherited or not**, **aggregated**, and **displayed** across media bank, cards, Studio, and reader—so surfaces stop inventing local behavior.

*Principles*

- **Server-side truth** - Business logic and count maintenance on server (`tagService`).
- **Universal tagging** - Same dimensional library for cards and media; card `filterTags` derived on save.
- **Two truths** - **Frame truth** on each media item (what the asset depicts); **work truth** on each card (curatorial intent for the story). They may diverge until author apply.
- **Suggest and confirm** - System may propose tags or aggregations; author accept (individual or bulk) writes confirmed assignments. Never auto-publish tag changes to reader-facing truth.
- **Per-dimension rules** - Create, assign, inherit, and aggregate behavior may differ by Who / What / When / Where—not one global rule for all dimensions.

*Features*
✅ **Complete**

- **Model** - Four dimensions; Reflections under What; operational `zNA` roots for import (not author/tile vocabulary).
- **Studio tag rail** - Full add/delete/edit/reorder/reparent in Organize; optimistic local updates; Shift-drag reparent.
- **Sidebar integration** - Viewers: filter tree only. Admins on `/view`: Filter vs Tag library tabs; Tag library matches Studio stack.
- **Usage on cards/media** - Shared picker patterns; compact tag editor with author-facing suppression of legacy `z-*` branches.
- **Counts** - `cardCount` and `mediaCount` on tag docs; incremental updates on mutations; full recompute via scripts. Viewer API omits operational count fields.
- **Tag admin routes** - `/admin/tag-admin` redirects to Studio.
- **Import tag Map (v1)** - **Map import tags** side pane (alongside tag tree) lists import/operational tags with `mediaCount > 0`; rules-aware suggestions (no dimension labels / bucket names); row select opens **Map preview** in **Media** (transient filter + banner, not the tag bar); target preview highlights in tree; **Choose target** + confirm before bulk remap.
- **Gallery→card inheritance (v1)** - Settings toggles (default off) at `/admin/settings`; when on, gallery membership or gallery-media tag changes auto-update card **work truth** for that dimension via `updateCardTags` (counts, derived fields, index). Gallery-only input; unanimous/union rules per 📋.
- **Reader filter scope** - Sidebar **Tag match** control on `/view` and `/search`: **Any assigned** (default, `tagScope=all`) vs **Subject only** (`tagScope=subject` on card and media list APIs). Persisted in localStorage; cleared by **Clear filters**.

⭕1 **Planned**

- **Tag recomp** - Queue hierarchical count recomputation when increment semantics insufficient.
- **Node strategy** - Raw tag overlay to created aggregations.
- **Organize shortcuts** - Direct Who/What/When/Where jump buttons in Organize tree.
- **Tag tree density** - Tighter vertical spacing without weakening DnD hit targets.
- **Tag-edit iconography** - Tag-specific affordance instead of generic pencil.

⭕2 **Future**

- **DnD interaction contract** - Keyboard parity and indicator polish for taxonomy drag surfaces.
- **Face recognition** - Cloud or client-side detection options for Who suggestions.
- **Relationship tagging** - Kinship inference from primitives; deferred.
- **Subject-tag authoring and filtering** - One subject marker per object; `Subject only` filter mode.
- **Tag aggregation apply pipeline** - Cached summaries; suggest/apply in Compose and card admin; chip popover for full dimension lists.
- **Reader/admin filter exclude semantics** - Per-dimension include/exclude aligned with aggregation states.

📋 **Contracts**

- **Tag authority** *(Phase 1.a horizontal — owner for tag system-of-record rules)*  
  - **Taxonomy shape** - Four dimensions (Who, What, When, Where); Reflections under What. Operational **`zNA`** import roots and legacy **`z-*`** branches are import/operator vocabulary—not author tile vocabulary. Optional starter: **Tag Set 0 — Generic** (**📐 Decisions**).  
  - **Create** - Tags are created in Organize tag rail (add, reparent, reorder, delete). Import may create or map tags from embedded metadata (XMP/IPTC, digiKam keyword paths). In-app tagging is preferred; digiKam remains optional external prep when metadata prep is faster.  
  - **Assign — surfaces** - Same library assigned on **media** (bank, Studio Media pane, bulk) and **cards** (Studio Cards, Compose inline bar, reader admin Tag library, bulk tag apply). Pickers suppress operational branches from author-facing lists.  
  - **Assign — mechanics** - Assignment is an explicit author or accepted-suggestion action on `(subjectType, subjectId, tagId)` edges. Bulk apply is bounded batch work on server. Removing an assigned tag updates counts and derived fields in the same mutation path.  
  - **Confirmed vs provisional** - **Confirmed** tags live on media and card documents and drive counts, `filterTags`, and reader filters. **Provisional** proposals (heuristic, AI, face) live in a separate layer until accept—see **Administration** 📋 **Provisional suggestions**. Provisional never counts as assigned for tiles, filters, or aggregation input.  
  - **Frame truth vs work truth** - Media holds **frame truth** (tags describing the asset). Cards hold **work truth** (tags describing curatorial intent). Gallery inheritance (below) updates card work truth only when enabled for that dimension.  
  - **Gallery→card inheritance** - Author controls **four independent Settings toggles** (Who, What, When, Where). **Default: all off** at first install (**Settings v1 scope**). When a dimension's toggle is **on**, confirmed tags on **gallery** media drive that dimension on the card **automatically** whenever gallery membership or relevant media tags change. When **off**, that dimension on the card is **manual only**. Per enabled dimension: if all gallery media share **one** confirmed tag → card gets that tag; if not → card gets the **deduped union** of all confirmed tags from gallery media; author may mark one assigned tag as **subject** for display or leave unset. Author may edit inherited card tags at any time. Same rule for all four dimensions in v1 (no separate When-span algorithm yet).  
  - **Reader dimensional filters** - **Default:** reader sidebar tag picks use **`tagScope=all`** — a card or media item matches if the selected tag is among its **confirmed assignments** for that dimension (`filterTags` / dimensional arrays). **Subject-only mode (shipped):** sidebar **Tag match → Subject only** sets **`tagScope=subject`** so only the marked **subject** tag satisfies a dimensional filter chip; applies to card feed (`/api/cards`) and freeform media browse (`/api/view/media`). Subject markers are authored in Studio/Compose today (reader quick-edit path TBD). **Multi-tag without subject:** **`all`** preserves match-any-assigned behavior; closed tiles may still show **`Mixed`** per 📋 **Tile display**. Do **not** force subject scope globally without the user choosing **Subject only**.  
  - **Card↔card** - **No** parent/child tag inheritance in v1. Optional parent rollup **display** may come later; it must not become silent filter truth.  
  - **Tile display (inheritance)** - Per dimension on closed tiles: show **subject** label if subject set among assigned tags; else **`Mixed`** if multiple assigned tags; else the single tag name; empty slot shows `-`. **Hover** lists all confirmed tags for that dimension on the card (**Content Page** 📋 **Closed-tile dimensional chips**). **`Mixed`** and **empty** are computed presentation states, not library tags.  
  - **Derived card fields** - On card save/tag mutation, server maintains dimensional arrays and `filterTags` from **confirmed** card assignments—UI does not invent parallel filter truth.  
  - **Counts** - `cardCount` / `mediaCount` on tag docs reflect **confirmed** assignments only; incremental on mutation; hierarchical recompute when needed.  
  - **Subject marker** - Optional marker on one **already-assigned** tag per card or media (not a fifth dimension). Used for tile label when multiple tags exist in a dimension. Clearing the assigned tag clears subject in the same write path.  
  - **Question vs answer tags** - Question prompts carry classification tags; linked Question **cards** carry answer-specific tags. Tags copy to new card at creation only, then diverge (**Studio Questions**).  
  - **Person / face downstream** - Who tags are author-facing identity today. When faces ship: **Person entity** linked to Who tags; detections provisional until confirm (**📐 Decisions** below, `docs/05-Guided-Archive-Assistance.md`).

- **Subject tag** - Optional marker on one already-assigned tag per card or media item (not a fifth dimension). Removing assigned tag clears subject. Counts stay unique per subtree.

- **Tag display vs aggregation** - **Frame truth** on media; **work truth** on card. With inheritance enabled, gallery confirmed tags **write** card assignments per rules above; with inheritance off, card tags are manual. Tile chip rules: **Content Page** 📋 **Closed-tile dimensional chips**.

📐 **Decisions**

- **Authoring vocabulary** - Mirror dimensional paths in digiKam keywords and app tag tree for predictable import mapping.
- **When** - `when/date/...` chronological sortable paths.
- **What** - Events, activities, Reflections for journal themes (card-centric).
- **Who** - Stable person identities; subject marker replaces separate subject path.
- **Where** - Administrative nesting; venues as children.
- **Gallery→card inheritance** - Four independent Settings toggles (Who, What, When, Where). **Default off** at first install. When on: auto-sync from gallery media confirmed tags on gallery change; unanimous → single tag; else deduped union + optional subject; tile shows subject or **Mixed**. When off: manual only for that dimension. Author may edit card tags after inherit.
- **Subject marker (authoring)** - **`subjectTagId`** can be set in Studio (Compose inline bar, Cards grid tag UI, Media grid) on assigned tags; not yet exposed on reader quick-edit. Required before subject-only reader filter mode is useful at scale.
- **Reader filter scope** - Sidebar **Tag match** control: **match any assigned** by default; **Subject only** is explicit user choice (`tagScope=subject`), not a silent default (**Tag authority** 📋 **Reader dimensional filters**).
- **Tag Set 0 — Generic** - Optional skeleton installed from **Settings** (not forced at signup): **Who** — family roles (Grandparents, Parents, Siblings, …); **What** — General → Activities, Education, …; **When** — years and months; **Where** — US states and cities (select from list). **Install is additive** — existing tags are never replaced; conflicting names are skipped; **Remove** deletes only tags created by the install (`tagSetId`).
- **Card↔card inheritance** - **No** parent/child tag inheritance in v1; optional parent rollup display may come later—not silent filter truth.
- **Person model** - When faces ship: **Person entity** linked to Who tags (merge/split, aliases); Who tags alone are insufficient for face operations.
- **Face processing** - Prefer quality **cloud API** for v1 private family use; self-host only if quality or privacy requires.
- **Organize sequence** - Heuristic clustering and review spine before face-led Who UI; face detections stay provisional until author confirms (`docs/05-Guided-Archive-Assistance.md`).

---

### **Collections Management**

*Intent*

- **Curated structure** - Shape intentional structural trees and ordered collections for reader-facing narrative paths.

*Principles*

- **Structural, not type-based** - Parent/child via `childrenIds`, not `type: 'collection'`.
- **Manual ordering** - Author controls curated sequence; no automatic sort replacing intent.
- **Shared structural runtime** - Collections tree is the structural DnD backbone other Studio domains attach to.

*Features*
✅ **Complete**

- **Curated tree** - Attach/detach/reorder; promote to explicit top-level roots; multi-parent with cycle blocking.
- **Tree expandability** - Expand/collapse keyed off `childrenIds`, not only resolved child objects during catalog streaming.
- **Structural DnD** - Explicit nest vs insert-before cues; optimistic commits before reconciliation; `Cards -> Compose/Children` attach keeps parent selected.
- **Root model** - Top-level entries are explicit root cards (`isCollectionRoot`) ordered by `collectionRootOrder`.

⭕2 **Future**

- **TOC and ordering** - Manual sibling reorder as primary curated narrative mechanism.

📐 **Decisions**

- **Structural model** - `childrenIds` store ordered edges; cards may be roots and children elsewhere.
- **IA** - Collections live inside Studio Organize, not a separate day-to-day route.
- **Multi-parent (v1)** - Allowed in Studio with cycle prevention.
- **Multi-parent reader display** - In **Guided** mode, a card attached under multiple collection parents appears **once per collection path** (same card document, separate tree/feed placement under each parent)—not deduped to a single tree node.

📋 **Contracts**

- **Discovery vs structure** - Collections drive **Guided** reader navigation (**Navigation** 📋); they do not replace dimensional tags (**Studio Tags**).
- **Ordering** - Sibling order under a parent is author-defined and respected in Guided feed/detail child rails.
- **Draft visibility** - Draft subtrees hidden from viewers; admins see warning styling in Guided tree.
- **Per-path placement** - Multi-parent cards render under each parent branch independently; opening the card from any path is the same detail document.

---

### **Studio Questions**

*Intent*

- **Prompt bank** - Journal-style question prompts that seed Question cards.

*Principles*

- **Prompts drive cards** - Questions are prompts; answers live on linked Question cards.
- **Dimensional grouping** - Prompts use Who/What/When/Where tag tree, not a separate taxonomy.
- **Prompt vs answer tags** - Question tags classify the prompt (generic); card tags classify the answer (specific). Tags copy to new card at creation only, then diverge.

*Features*
✅ **Complete**

- **Studio pane** - Collapsible pane for tree browse, Untagged cleanup, Assigned/Unassigned filter, add/edit/delete, open or create linked card in Compose.
- **Compact filters** - Search, inclusion mode, Clear, inline tag editing with Save/Cancel on destructive flows.
- **Tree scope** - Default closed tree; `Include children` toggle with matching counts.
- **Link lifecycle** - Create card from prompt copies tags and tracks usage; unlink converts linked card to draft Story and clears `questionId`.
- **APIs** - Admin CRUD, link/unlink, create-from-prompt.

⭕2 **Future**

- **Grouping level** - Eligible tag levels for question grouping.
- **Answer workflow** - Analytics, templates, validation beyond cards.
- **Auto-clustering** - Group short prompts automatically.

📋 **Contracts**

- **Prompt vs answer** - Question document tags classify the prompt; linked **qa** card carries answer-specific **work truth** after create; copy-at-create only (**Studio Tags** 📋).
- **Compose handoff** - Create/open from prompt selects linked card in shell; flicker/repaint on open is a defect, not accepted behavior (closed unless regresses).

---

### **Studio Media**

*Intent*

- **Media bank** - Import, browse, tag, and assign media at archive scale; bridge from raw library to card relationships.

*Principles*

- **Imported and referenced** - Media lives in bank; cards reference by id and hydrate on read.
- **Derivative-aware** - Browse/edit against fit-for-surface renditions; preserve originals for recovery and export.
- **Import trust** - Preserve source meaning and metadata; recoverable replace/delete; no silent corruption.
- **Relationship-ready** - Move from banked assets to cover/gallery/body/children without mode switching.
- **Suggest-and-confirm organization** - Heuristics, clusters, and future face suggestions assist the author via **Administration** 📋 **Provisional suggestions**; never silent publish or delete.
- **Reader discovery** - Assignment is not a reader visibility boundary; unassigned media may appear in reader media browse.

*Features*
✅ **Complete**

- **Core bank** - Import, process, replace-in-place, dimensional tagging, bulk operations, multi-select to draft gallery card.
- **Studio embedded media** - Same bank in Studio Media pane with drag handles to Compose targets; debounced search, caching, prefetch.
- **Search** - Typesense when configured; non-empty text search returns 503 without Typesense; Firestore seek serves unfiltered and dimension-filter paths.
- **Import** - Local `__X` folder workflow, PhotoPicker, paste-drop; embedded XMP/IPTC metadata at import (see `docs/IMPORT-REFERENCE.md`); each local batch import assigns a shared **`importBatchId`** on created/reused media rows for Browse batch filter and **Recent import**.
- **Grid workspace** - Natural-aspect thumbnails, inline tag rail + search-only tag bar, growing working set with Load more, select-visible semantics; **Browse group-by** (none / folder / day / import batch / suggested piles), import-folder filter, **Recent import** batch shortcut, and tile-size slider (persisted in local filter prefs).
- **Assignment model** - Cover, gallery, inline body references; authoritative delete scan across all card surfaces; blocked delete when references remain.
- **Per-dimension filters** - Any / Has any / Is empty / Matches tag on pane and tiles.
- **Renditions** - Reader and studio WebP tiers for tiles; originals for lightbox/zoom.
- **Legacy routes** - `/admin/media-admin` and media-triage redirect to Studio.
- **Review mode (v1 shell)** - **Browse | Review** toggle in Studio Media; **Suggested** default lens (**day + import folder** composite grouping — pile title matches membership; When lens auto-splits oversized day groups by folder); lens dropdown for When / Where / Who / What (occasion-shaped pile names); editable suggested tag chips (remove via chip ×); **Accept tags only**, **Accept & create card** (apply tags → draft gallery card → accept pile), **Accept pile**, **Split**, **Dismiss** (Merge deferred). Large piles (>40) show an explicit warning. Import appends suggested piles for new media; full **Refresh piles** rebuilds the active lens queue. Same photo may appear in multiple piles until accept or dismiss. Coverage hints (scenery vs people) — no forced 4D completeness gate.
- **Media stacks (manual v1)** - Firestore **`media_stacks`** collection (`kind`: `manual` | `burst` | `motion_pair`; `status`; `heroMediaId`; `memberMediaIds[]`); media denorm **`stackId`** / **`stackRole`** (`hero` | `member`). Browse grid **collapsed by default** (one hero tile per stack); **+N** badge expands in place; **Show all stacks** toggle (persisted local pref); **Unstack** on expanded hero; bulk **Create stack** from 2+ unstacked selection; **Create card** resolves one gallery slot per stack (`galleryMedia[].stackId` optional). Auto burst detection, Review burst lens, reader in-stack paging, and motion pairs deferred.

⭕1 **Planned**

- **PhotoPicker convergence** - Bank import and library pick in Media admin so card edit PhotoPicker becomes optional.
- **Import and duplicate triage** - Trustworthy bank workflow and source-aware duplicate review (not filename-only).
- **Manual phone aggregation** - Select imported phone group, assign to card, flesh out story/tags.
- **Media derivative architecture** - Surface-specific derivatives; video and phone as first-class inputs.
- **Media readiness pipeline** - Background ingest/processing states so imports appear quickly with truthful status.
- **Workspace parity** - Shared operator contract with Cards for layout, selection, and drag affordances.
- **Caption workflow** - Inline caption edit and two-line clamp on grid tiles.
- **Gallery override posture** - Studio Media defaults primary; Compose overrides explicit exceptions.
- **External-editor replace loop** - Smooth GIMP/Topaz round-trip via replace-in-place.
- **Guided archive spikes** - Merge piles, auto burst stacks + Review burst lens, Apple metadata adapter, evaluation set — extend Review v1 shell per `docs/05-Guided-Archive-Assistance.md`.

⭕2 **Future**

- **Apple Photos adapter** - First native cloud source adapter (priority **📐**); architecture and unit economics before product promise beyond export→upload interim.
- **Cloud source adapters (follow-on)** - Google Photos, OneDrive after Apple Photos.
- **Video parity** - Cover, inline, gallery with server-side transcoding.
- **Similar-shot stacking** - Non-destructive burst collapse in bank browse.
- **Search without Typesense** - Degraded search for small corpora/dev.
- **Subject-tag workflow on media** - Priority render and Subject-only filter.

📋 **Contracts**

- **Filtered population** - Same as **Administration** 📋; media may use cursor/seek/Typesense list modes per active query.
- **Media bank** *(horizontal)* - Canonical row per asset (`media.docId`); originals in Storage; renditions for tile/studio/reader tiers. **Frame truth** tags on media document. **Import** preserves embedded metadata where present (`docs/IMPORT-REFERENCE.md`).
- **Import paths (v1)** - Local folder `__X` workflow; paste/drop upload; PhotoPicker; future adapter layer for phone batches. **Interim commercial path** for cloud: honest **export from source → upload here** until native adapters ship. **First native adapter target: Apple Photos** (**📐 Decisions** below).
- **Duplicate identity** - Triage uses `sourcePath`, content hash/size signals, and metadata—not filename alone.
- **Assignment surfaces** - Cover (`coverImageId` + focal), gallery (`galleryMedia[]`), inline (`contentMedia[]` / `data-media-id` in HTML). Assignment does not hide media from bank browse.
- **Delete & replace** - Delete blocked while referenced on any card surface; replace-in-place preserves `docId` where product allows; graph scan authoritative over `referencedByCardIds` alone.
- **Captions** - Optional per-media caption field; inline edit in grid; two-line clamp on tiles.
- **Processing & readiness** *(target)* - Each media row exposes **readiness state** (e.g. uploaded, thumbnailed, indexed, failed) so UI stays truthful during background work. Video/transcode fields deferred (**❓ Open** depth).
- **Archive intelligence** - Heuristic clusters and review stacks land as **Provisional suggestions**; **Review** mode in this pane for accept/split/merge (**Administration** 📋). Spikes per `05` and ⭕1 **Guided archive spikes**.
- **Review mode IA** - Toggle **Browse | Review** in Media pane: Browse = grid/filter UX plus **Group by** (folder, day, import batch, suggested piles), folder filter, tile size, **Show all stacks**, and **Recent import**; Review = provisional cluster queue. **Suggested** lens groups by **day + import folder** (title matches members); **When** may sub-split large same-day groups by folder. Author may switch lens via dropdown (When / Where / Who / What). **What** = author **occasion** mental model (birthday, day at the lake). Actions: **Accept tags only** (confirmed bulk tag apply, pile stays pending), **Accept & create card** (tags + draft gallery card + accept pile), **Accept pile** (apply tags + mark cluster accepted), **Split** (select members → new pending pile), **Dismiss** (provisional only). **Merge** deferred. Overlap across piles allowed until accept. Optional dimensions OK — **coverage notes** and **large pile** warnings; not completeness gates.
- **Studio Media view layers** - Three explicit scopes: **Population** — **Whole library** (default bank) vs **This card** (selected Compose card media only); optional **Map preview** banner when Organize Map selects an import tag (transient server filter, not persisted, does not populate the tag bar). **Refinement** — search, source, shape, **tag bar**, tag scope, **any-card assignment** status (hidden in **This card** mode), browse group-by. **Card overlay** — **Highlight on this card** (Whole library only; non-destructive badge). Filter-X clears refinements and Map preview; population unchanged unless user switches view.
- **Media stacks IA** - Canonical stacks in **`media_stacks`** (distinct from provisional **`provisional_clusters`**). Browse shows **hero-only** collapsed tiles with **+N** expand; **Show all stacks** reveals every member row; **Unstack** dissolves stack and clears media denorm. Bulk **Create stack** requires 2+ unstacked items. Gallery **Create card** emits one `galleryMedia` entry per stack (hero + optional `stackId`). Auto burst, motion pairs, and reader in-stack paging deferred.
- **Referrer list** - `referencedByCardIds` is denormalized convenience; delete and reconcile use authoritative card-surface scan.
- **Cross-entity sync** - Firestore authoritative; Typesense and denormalized fields follow card/media CRUD paths; drift repair via `npm run reconcile:media-cards` and related scripts (`docs/NPM-SCRIPTS.md`).

📐 **Decisions**

- **Entry paths** - Import-to-card (folder + images together) vs import-to-bank then assign.
- **Source adapters** - Import service layer accepts future adapters alongside local filesystem. **Apple Photos first** for native cloud adapter work; Google Photos and OneDrive follow.
- **Commercial import bar** - Trustworthy ingestion, review/correction, progression to structured storytelling.

❓ **Open**

- **Video readiness depth** - Playback-only vs authoring parity on first video slice.

📘 **Resources** - `docs/IMPORT-REFERENCE.md` · `docs/NPM-SCRIPTS.md` · `docs/05-Guided-Archive-Assistance.md`

---

### **User Management**

*Intent*

- **Access control** - Manage who can read and who can administer the private archive.

*Principles*

- **Credential-based auth** - NextAuth Credentials against Firestore `journal_users`.
- **Manual onboarding** - Author creates accounts and shares credentials out of band.
- **Private by default** - Readers never see admin affordances or unrelated private content.
- **Simple roles, strict boundaries** - Viewer vs admin only in v1; boundary must stay clear in UI and API.

*Features*
✅ **Complete**

- **Model and auth** - Firestore `journal_users` with bcrypt; seed via `npm run seed:journal-users` when empty.
- **Admin UI** - `/admin/journal-users` for user CRUD; viewers creatable from UI/API only; single admin rule.

⭕1 **Planned**

- **User surface polish** - Page title, `All Users` casing, heading alignment with rest of admin chrome.

⭕2 **Future**

- **Credential delivery** - Automated username/password delivery to new users.
- **Rename collection** - `journal_users` -> `users`.

📋 **Contracts**

- **Roles** - Exactly one **admin** (author/operator); all other accounts **viewers**. Admin-only: Studio, Theme Management, User Management, import helpers, backup/restore triggers, maintenance APIs.
- **Manual onboarding** - Author creates **one account per reader** in **User Management** or seed scripts; credentials shared out of band; no self-service signup in v1 (**Landing Page** 📐 **Invitation model**).
- **Session** - Auth.js credentials against Firestore `journal_users`; viewers cannot invoke admin API routes (enforced server-side and audited).

📐 **Decisions**

- **One account per reader** - Each family reader has their own credentials; shared viewer accounts are **not** acceptable in v1.

📘 **Resources** - `01` TECHNICAL auth 📐; `docs/NPM-SCRIPTS.md` seed users.

---

### **Theme Management**

*Intent*

- **Design packages** - Customizable light/dark modes and, over time, coherent reader design presets the author can switch between.

*Principles*

- **Author-controllable presets** - Parameters adjust in Theme Management; presets stay coherent as wholes.
- **Reader-first polish** - Reader experience is the primary aesthetic target; admin shares tokens where parity helps previews.
- **Professional and warm** - Mobile-centric craft with journal/history personality via tokens, not ad hoc module CSS.
- **Reader immersion** - Theme serves long-form family reading, not admin control for its own sake.

*Features*
✅ **Complete**

- **Live-draft workspace** - Floating, draggable, resizable editor; unsaved edits apply to the real app in-session; **Save** persists, **Discard** restores last saved theme.
- **Mode and preset controls** - Light/Dark and Journal/Editorial in workspace toolbar; switch prompts when draft is dirty.
- **Editor model** - Left: component + attribute selection (Foundation, Chrome, Controls, Story, Gallery, Lightbox, etc.). Right: Colors, Typography, Structure values. Target contract: **Component -> Attribute -> Value**.
- **Reader / Workbench scope** - Reader edits and Workbench (admin) edits persist separately; live app consumes both scopes appropriately.
- **Workbench coverage** - Direct targets for Header, Sidebar, Shell, Tabs, Controls, Feedback.
- **Runtime pipeline** - Atomic tokens -> semantic token classes -> recipes -> emitted CSS variables; `theme-data.json` / Firestore document with `theme.css` fallback.
- **Closed-card surfaces** - Shared General baseline plus per-family overrides for Story, Gallery, Question, Quote, Callout.
- **Reader feedback theming** - General and error feedback wired to reader surfaces; success/warning/info panel tokens exist but lack matching reader UI yet.
- **Admin-only loading** - Theme workbench lazy-loads for admin sessions only (not in viewer bundle).

📋 **Contracts**

- **Live draft loop** - Edit -> live app preview -> Save (durable) or Discard (revert). No separate preview surface as source of truth.
- **Three-tier model** - **Atomic tokens** (palette, type, spacing, radii, shadows) -> **semantic classes** (surface, text, border, accent, state) -> **recipes** (story title, sidebar tab, lightbox caption, etc.). Surfaces consume recipes, not raw token refs directly.
- **Metric families** - Padding, Spacing, Sizing, Radius, and Border Width stay distinct in the editor contract.

📐 **Decisions**

- **Theme role** - Theme is part of reader value: clarity, tone, immersion for family storytelling.
- **Reader theme surface (v1)** - Family readers switch **named presets** (Journal / Editorial) and light/dark via **Settings** / header controls. **Theme Management** workbench is admin-only deep editing—not a reader-facing product surface in v1.
- **AI Story Assist** - Editorial, voice-preserving, suggestion-only; named guides shape tone not facts. Detail: **Studio Cards** AI Story Assist.

⭕1 **Planned**

- **CSS tokenization** - Move design-affecting literals into theme variables incrementally so presets can plug in without module rewrites.
- **Theme contract inventory** - Enumerate reader/admin surfaces, elements, token use, and migration status before calling Journal/Editorial finished.
- **Theme schema** - Formalize Firestore theme document shape (atomic + semantic + recipes); Theme Management remains the only product editing path.
- **Preset completion** - Journal/Editorial as coherent light/dark packages after inventory and schema.
- **Workspace chrome** - Lighter floating panel shading; ~20% more effective height before inner scroll on common desktop windows.

❓ **Open**

- **Italic** - Right-leaning ink font for editorial accent?

📘 **Resources** - Semantic roles, preset intent, reconciliation order: `docs/04-Theme-Design-Contract.md`. Platform slice closeout: `docs/03-Implementation.md` Phase 3 Theme.

---

### **Gallery Management**

*Intent*

- **Gallery layout presets** - Optional preconfigured gallery presentation styles beyond current swiper/detail patterns.

*Principles*

- **Card-owned gallery** - Gallery membership and order live on the card (`galleryMedia[]`); reader/detail swiper consumes that order (**Studio Compose** 📋).
- **Presets, not parallel model** - Layout presets change presentation only; they do not replace card gallery data.

📋 **Contracts**

- **v1 baseline** - Closed navigate tiles and open detail use existing swiper/lightbox patterns (**Content Page** 📋, **View Page** 📋); no separate Gallery Management route in v1.
- **Future presets** - Masonry/mosaic/etc. selectable per card or theme when product warrants distinct gallery presentation modes.

⭕2 **Future**

- **Gallery styles** - Preset layouts (masonry, mosaic, etc.) selectable where product warrants distinct gallery presentation modes.

---
