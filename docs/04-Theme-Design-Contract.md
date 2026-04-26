# Theme design contract (semantic tokens & presets)

**Status:** Living specification — authoritative for *what* we tokenize and *why*, before code-only audits; and for **reader shell layout, responsive behavior, and navigation affordances** that must stay consistent with tokens (§10).
**See also:** `01-Vision-Architecture.md` (Frontend principles, visual direction), `02-Application.md` → Theme Management, Navigation, Layouts, `03-Implementation.md` (CSS Tokenization sequencing, responsive chrome).

**Current implementation status (2026-04-25):** Theme infrastructure exists and the core save/load path is now live. Runtime CSS variables are generated from theme data and injected by the app, with `theme-data.json` / `theme.css` fallbacks. Theme Management is still a **workbench**, but it is now a saving workbench: scoped reader/admin preview, Journal / Editorial reader preset toggles, light/dark preview controls, raw Advanced tokens, and a component-based **Reader Theme System** editor with preview on the left and component inventory / recipe editing on the right. The reader preview now covers the closed card set, open story/gallery/question detail, sidebar chrome, discovery/child rails, lightbox/state samples, and support UI so theme work can be judged against real reader surfaces rather than swatches alone. Journal / Editorial are still partial preset bundles, not finished themes. The reader semantic layer now has working role groups for page, chrome, solid controls, cards, detail, body/title, meta/caption, tags, media/overlay, discovery, support UI, and type treatments, and the current editing model is moving from flat role names toward **component + variant + element** recipes backed by the existing atomic token set. The next finish line is not persistence; it is full **preview <-> role** truthfulness.

---

## 1. Why this document exists

Theme work has two legs:

1. **Design contract (this file)** — Define semantic *roles* (surfaces, text, accents, type), how they behave on **mobile**, and how **named presets** express “journal / archival” vs “professional / editorial” without exposing 200 unrelated sliders first.
2. **Implementation** — `theme.css` generation (`themeService.ts`), Theme admin UI, component CSS using `var(--…)`, and deploy-safe persistence.

**Inventorying literals in `*.module.css` alone** optimizes consistency but does not guarantee a coherent product look. This contract is the checklist: new or migrated styles should map to a **role** (or be explicitly out of scope).
Theme decisions are in service of the reading experience: comfort, tone, and willingness to keep reading a family story to the end.

---

## 2. Product constraints (non-negotiable tensions)


| Constraint            | Implication for tokens                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Journal / history** | Warm surfaces, optional *display* typography (e.g. handwriting) for **titles or section labels only** — not for dense UI or long body text.                              |
| **Professional**      | Legible **UI + body** type, consistent spacing scale, restrained saturation on chrome; accents used deliberately (links, primary actions, dimensional tags).             |
| **Mobile-centric**    | Touch-friendly min sizes, readable **base** font size on small viewports, horizontal rails and cards that respect tokenized spacing and radii — not one-off `px` stacks. |
| **Reading stamina**   | Long-form stories should feel inviting rather than fatiguing; presets should improve immersion and readability before they increase configurability.                     |


Resolve conflicts with **type roles** and **presets**, not by mixing display fonts into every label.

---

## 3. Typography roles


| Role        | Job                                     | Typical use                                    | Map today (approx.)                             | Direction                                                                        |
| ----------- | --------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| **UI**      | Chrome, tags, buttons, nav, form labels | Admin + reader chrome                          | `--font-family-sans`, `--font-size-sm` / `base` | Keep neutral and highly legible.                                                 |
| **Body**    | Long reading (stories, answers)         | TipTap content, narrative                      | `--body-font-family` → usually `sans`           | Slightly larger than UI on mobile if needed — via scale tokens, not ad hoc `px`. |
| **Title**   | Card titles, section headers            | Feed tiles, detail headers                     | Often `sans` or `serif` via component rules     | Presets may switch title to **serif** for editorial feel.                        |
| **Display** | “Journal personality”                   | Optional: hero titles, home hero, few headings | `--font-family-handwriting`                     | Use sparingly; **off** or **subtle** in “Editorial” preset.                      |


**Rule:** Handwriting is a *display* choice bound to a preset or explicit component token — not the default `--body-font-family` for the whole app.

### 3.1 Admin grid thumbnail overlays (card + media)

Dense metadata on **card** and **media** admin **grid** thumbnails (type, status, source, assignment, dimensional tag rail) uses **dedicated tokens** — **not** `--font-size-xs` / global admin UI scale. **Runtime:** `buildThemeTokensCss()` in `themeService.ts` emits these on `:root` with the rest of the theme (Firestore / `theme-data.json`). `**theme1.css`** mirrors the same names for authoring reference; `**theme.css**` includes fallbacks if injection is empty.


| Token                            | Role                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `--font-size-admin-grid-overlay` | Rem-only size for that layer only (~8px at 16px root unless changed).                         |
| `--admin-grid-overlay-font`      | Shorthand: **medium** weight + overlay size + **1.2** line-height + `**--font-family-sans`**. |


Components: `AdminGridCellChrome.module.css` (meta badges), `DimensionalTagVerticalChips`, `DirectDimensionChips` (rail + triage row chips). **Dimensional tag fills** on thumbnails use `**color-mix(..., 50%, transparent)`** on `--tag-*-bg-color` with **white** label text where applicable; **draft / published / assigned / unassigned** badges use the same translucent + **white** text pattern. Adjusting overlay density is done **only** via these tokens and the shared chrome modules so reader and full-page admin typography stay unchanged.

---

## 4. Semantic color & surface roles (reader-first)

These are the **meanings** the UI must express. Implementations today use the listed `theme.css` variables; future work may introduce shorter **alias** names (e.g. `--surface-page`) that *point to* these — without duplicating sources of truth in components.


| Semantic role               | Meaning                             | Primary variables today                                 | Notes                                                                                       |
| --------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Page**                    | App canvas behind content           | `--body-background-color`, `--layout-background1-color` | Same family; cards sit on `--layout-background2` / `--card-background-color`.               |
| **Raised / panel**          | Sidebar, secondary panels           | `--layout-background2-color`                            |                                                                                             |
| **Card**                    | Primary content tile                | `--card-*` (background, border, radius, shadow)         | Feed and detail should not hardcode competing grays.                                        |
| **Text primary**            | Main reading text                   | `--text1-color`                                         |                                                                                             |
| **Text secondary**          | Meta, captions, de-emphasized       | `--text2-color`                                         |                                                                                             |
| **Border subtle**           | Dividers, hairlines                 | `--border1-color`                                       |                                                                                             |
| **Border strong**           | Emphasis, scrollbars                | `--border2-color`, scrollbar vars                       |                                                                                             |
| **Accent / primary action** | Primary button, key links           | `--color3`, `--button-solid-*`, `--link-text-color`     | Presets tune hue/saturation, not random new hex in modules.                                 |
| **Semantic feedback**       | Success, warning, error, info       | `--state-*-background-color`, `--state-*-border-color`  | Tied to palette ids 11–14 in generator.                                                     |
| **Dimensional tags**        | Who / What / When / Where           | `--tag-who-bg-color`, …                                 | Content language; keep distinct per dimension.                                              |
| **Overlay / scrim**         | Modals, lightbox, media overlays    | `--lightbox-*`, gradients `--gradient-bottom-overlay*`  | Gradients still contain raw `rgba` in places — **tokenization candidate** aligned to roles. |
| **Raster watermark**        | Flat tile watermarks (e.g. callout) | `--card-watermark-raster-filter`                        | Theme-aware (light vs dark).                                                                |


**Dark mode:** Same roles; values switch under `[data-theme="dark"]` (generated with light `:root` in the same token sheet). Presets must define **paired** light/dark assignments or derived rules.

### 4.1 Base palette (colors 3–14)


| Range     | Role                       | Notes                                                                                                            |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **3**     | Principal / primary accent | Links, solid primary button, focus accents — maps to `--color3` and related component tokens.                    |
| **4**     | Secondary accent           | Highlights, secondary emphasis.                                                                                  |
| **5–8**   | Dimensional alts           | Default mapping to Who / What / When / Where tag chips (`--tag-*-bg-color`); keep distinct hues for scanability. |
| **9–10**  | Extra palette slots        | Spares or future semantic uses; avoid hardcoding in modules without a token.                                     |
| **11–14** | Status                     | Success, error, warning, info — wired to `--state-*` tokens in the generator.                                    |


Values are edited in Theme Management and stored in structured theme data; components should reference **semantic / component variables**, not raw `--hex7`, except where the generator already centralizes mapping.

### 4.2 Reader semantic aliases

The reader semantic layer is the contract between design intent and component CSS. It is intentionally role-based: components should ask for "reader detail surface" or "reader card title," not a raw color slot. Early implementation may alias these names to existing primitive/component tokens, but the role names are the stable vocabulary Theme Management will eventually expose.

**Rule:** A reader component may use primitive tokens for mechanical layout (`--spacing-*`, `--z-index-*`, literal media-query pixels per §10), but design-affecting color, type, radius, elevation, and content hierarchy should prefer the reader aliases below.

| Role group | Token family | Scope | Status |
| ---------- | ------------ | ----- | ------ |
| Reader page | `--reader-page-*` | `/view` canvas, feed background, detail page surround | Initial |
| Reader chrome | `--reader-chrome-*` | reader header/nav, sidebar/drawer, filter panels, mode controls | Initial |
| Reader support UI | `--reader-support-*` | sidebar titles/labels/hints, toolbars, selectors, helper states, support controls | Initial |
| Solid controls | `--reader-solid-*`, `--reader-contrast-text-color` | active tabs/chips/buttons, badge/control contrast on strong fills | Initial |
| Feed cards | `--reader-card-*` | closed feed/discovery cards only | Initial |
| Detail page | `--reader-detail-*` | open card reading surface and cover frame | Initial |
| Rich text | `--reader-body-*`, `--reader-title-*` | story bodies, Q&A answers, TipTap headings/lists | Initial |
| Subtitle/excerpt | `--reader-subtitle-*`, `--reader-excerpt-*` | card/detail subtitles and feed/detail excerpts | Initial |
| Meta text | `--reader-meta-*`, `--reader-caption-*` | dates, captions, attributions, secondary metadata | Initial |
| Type treatments | `--reader-quote-*`, `--reader-question-*`, `--reader-callout-*` | quote tiles/details, Q&A emphasis, callout watermark/text treatment | Partial |
| Discovery | `--reader-discovery-*` | Explore More, Similar, child-card rails, related sections | Initial |
| Tags | `--reader-tag-*` plus dimension tokens | reader tag chips and active filter chips | Initial |
| Media / overlay | `--reader-media-*`, `--reader-lightbox-*`, overlay aliases | gallery frames, image backgrounds, overlay text, and gallery lightbox affordances | Initial |

Initial aliases emitted by `buildThemeTokensCss()`:

| Alias group | Initial mapping |
| ----------- | --------------- |
| `--reader-title-*` | Title color/family/size/weight/line-height map to `--text1-color`, `--body-font-family`, `--font-size-base`, `--font-weight-semibold`, and `--line-height-tight`. |
| `--reader-subtitle-*` | Subtitle color/size/style currently map to secondary text plus preset-controlled style (`italic` vs `normal`). |
| `--reader-excerpt-*` | Excerpt color/size/line-height currently map to secondary text and relaxed reading rhythm for teasers/summaries. |
| `--reader-body-*` | Body color/family/size/line-height map to `--text1-color`, `--body-font-family`, `--font-size-sm`, and `--line-height-relaxed`. |
| `--reader-meta-*` | Metadata color maps to `--text2-color`; metadata size currently reuses caption/body sizing rather than a separate semantic scale. |
| `--reader-caption-*` | Captions and attributions map to `--text2-color` and `--font-size-sm`. |
| `--reader-card-*` | Closed-card surface, border, radius, shadow, hover shadow, and padding map to existing `--card-*`; flat reader tiles map to `--layout-background1-color`. |
| `--reader-detail-*` | Open-card surface, cover background, border, radius, shadow, and horizontal/bottom padding map separately so detail pages do not inherit feed-tile assumptions. |
| `--reader-solid-*` | Strong-fill controls derive from button-solid tokens so sidebar active states, tag/filter chips, and similar controls share one semantic contrast path. |
| `--reader-quote-*` | Quote text family/size/line-height/color maps to body/text primitives while preserving later preset-specific treatment. |
| `--reader-media-*`, `--reader-lightbox-*`, overlay aliases | Media frame/control/lightbox and overlay contrast roles map to the current reader chrome/contrast primitives so media affordances stop depending on scattered hardcoded black/white values. |

Planned aliases before presets are considered complete:

| Alias group | Intended controls |
| ----------- | ----------------- |
| `--reader-card-title-*`, `--reader-card-excerpt-*`, `--reader-card-meta-*` | Feed-card-specific hierarchy where tile titles/excerpts diverge from detail headings/body text. |
| `--reader-detail-subtitle-*`, `--reader-detail-excerpt-*`, `--reader-detail-meta-*` | Open-card header hierarchy where detail needs more than the shared title/subtitle/excerpt/meta roles. |
| `--reader-discovery-background-color`, `--reader-discovery-title-*`, `--reader-discovery-card-*` | Explore More, Similar, child-card rails, and related sections. |
| `--reader-support-title-*`, `--reader-support-label-*`, `--reader-support-meta-*`, `--reader-support-hint-*`, `--reader-support-control-*` | Shared reader-adjacent support UI such as sidebars, selectors, toolbars, helper states, and neutral/active utility controls. |
| `--reader-tag-active-*` | Extra tag/filter state roles only if active/filter chips need to diverge from the current shared solid-control role. |
| `--admin-*` aliases parallel to reader | Dense authoring-specific semantics once admin leaves “shared where useful” and needs a separate saved contract. |

Migration status:

| Surface | Contract target | Status |
| ------- | --------------- | ------ |
| `V2ContentCard` | `--reader-card-*`, shared title/body/meta/quote/caption aliases | Initial migration complete |
| `CardDetailPage` | `--reader-detail-*`, shared title/body/meta/quote/caption aliases | Initial migration complete |
| `TipTapRenderer` | reader body/title/quote/caption aliases | Initial migration complete |
| `DiscoverySection`, `ChildCardsRail` | `--reader-discovery-*` plus card aliases | Initial migration complete |
| `InlineGallery`, media figures, gallery lightbox | `--reader-media-*` plus caption aliases | Initial migration complete |
| `GlobalSidebar`, reader filters, reader header/nav | `--reader-chrome-*`, `--reader-tag-*`, `--reader-solid-*` | Initial migration complete |
| Shared support UI (`ImageToolbar`, `TagSelector`, sidebar controls/helper states) | `--reader-support-*` plus `--reader-chrome-*` where the container itself is chrome | Initial migration complete |
| Admin content tooling | `--admin-*` aliases separate from reader personality | Planned |

Theme presets are not complete until each preset supplies enough underlying values to make the role groups above coherent in light and dark mode. Until then, Journal and Editorial are starting points, not finished themes.

---

## 5. Two-tier authoring model

The app needs a middle layer between:

- the **broad stored theme document** (`palette`, `themeColors`, `typography`, `spacing`, `borders`, `shadows`, `layout`, `components`, `states`, `gradients`) that already exists in Firestore / `theme-data.json`, and
- the **component CSS** that needs a much smaller, stable vocabulary (`reader-title`, `reader-card`, `reader-detail`, `reader-solid`, etc.).

That middle layer should be **two-tiered**, not a replacement system:

### 5.1 Tier 1: summary roles (what the app is trying to style)

These are the author-facing, app-facing summary elements. They should be understandable without opening CSS files.

| Group | Summary role | Example consumers |
| ----- | ------------ | ----------------- |
| Typography | `Title` | full feed cards |
| Typography | `Title Small` | Explore More, child rails, other constrained cards |
| Typography | `Detail Title` | open card header |
| Typography | `Subtitle` | story/gallery subtitles |
| Typography | `Body` | story body, Q&A answer, callout body |
| Typography | `Excerpt` | card summary text |
| Typography | `Meta` | dates, small supporting metadata |
| Typography | `Caption` | figure captions, gallery captions, quote attribution |
| Typography | `Quote` | quote cards and quote detail |
| Typography | `Question` | Q&A prompt treatment |
| Typography | `Callout Title` | callout heading |
| Surface | `Page` | reader canvas |
| Surface | `Chrome` | sidebar, nav, filter panels |
| Surface | `Card` | standard feed cards |
| Surface | `Detail` | open card container |
| Surface | `Discovery` | Explore More / Similar / child rails shell |
| Surface | `Media Frame` | gallery frame, inline media frame |
| Control | `Solid Control` | active tabs, chips, primary controls |
| Control | `Filter Chip` | selected filters |
| Control | `Media Control` | gallery buttons |
| Control | `Lightbox Control` | lightbox buttons/caption chrome |
| Overlay | `Card Overlay` | story/gallery image overlays |
| Overlay | `Strong Overlay` | gallery/lightbox stronger scrims |
| Tag | `Who / What / When / Where / Muted` | dimensional and neutral chips |
| Icon | `Chrome / Solid / Overlay / Accent` | sidebar, pills, overlay badges, accent icons |

### 5.2 Tier 2: atomic token recipes (how each summary role is defined)

Each summary role is expressed using the exact tokens that already exist in Advanced/theme data. Examples:

- `Title` -> `Sans`, `Base`, `Semibold`, `Tight`
- `Title Small` -> `Sans`, `SM`, `Semibold`, `Tight`
- `Detail Title` -> `Sans`, `3XL`, `Bold`, `Tight`
- `Body` -> `Sans`, `SM`, `Normal`, `Relaxed`
- `Quote` -> `Serif`, `LG`, `Normal`, `Relaxed`
- `Solid Control` -> button solid background/text/border tokens
- `Card` -> card background/border/radius/shadow/padding tokens

This preserves **exact control**. The summary layer is not "warmer / looser / editorial" hand-waving; it is a named recipe built out of the precise font, size, weight, line-height, color, radius, and shadow tokens the app already has.

### 5.3 Boundary between theme and component logic

This is the part that caused the most confusion and needs to stay explicit:

- Theme defines the **recipe** for `Title` and `Title Small`.
- Component logic decides **when** to use `Title Small` (for example in Explore More or a narrower rail cell).
- Theme defines the recipe for `Card` and `Detail`.
- Component logic still owns layout triggers, aspect ratio handling, card width, rail width, breakpoints, and open/closed structure.

So "small card title" belongs in the theme system as a **named variant**, but "this card is in a constrained rail, use the small title recipe" belongs in component code.

### 5.2a Component-oriented authoring surface

The current implementation direction is more concrete than a single flat list of summary roles. Theme authoring is now being organized around **real components and variants**, because that maps better to how the app is actually designed and reviewed.

Examples:

- `storyCard.closed.title`
- `storyCard.open.subtitle`
- `galleryCard.closed.title`
- `galleryCard.open.caption`
- `qaCard.closed.question`
- `qaCard.discovery.question`
- `quoteCard.closed.quote`
- `calloutCard.closed.title`
- `sidebar.chrome.solidControl`
- `lightbox.default.caption`

This is still the same two-tier model:

- **Tier 1** = named component recipes the author can understand and edit
- **Tier 2** = exact atomic token selections (`Sans`, `SM`, `Semibold`, `color3`, `shadow/md`, etc.)

The important distinction is that component-oriented recipes avoid false sharing. A Story title and a Gallery title may start with the same recipe, but they must be able to diverge without fighting a single global `Title` control.

Theme Management should reflect that directly:

- the **preview stays visible while editing**
- the **component inventory is the main authoring surface**
- each component row should identify the **element** being styled and the **recipe** it uses
- the **Advanced** token area remains below as the primitive reference / exact-value layer, not a competing second theme system

### 5.4 Current implementation target

The current reader work should converge on this flow:

1. **Advanced / Firestore remains the exact value source** for atomic tokens.
2. A **summary-role mapping layer** defines `Title`, `Title Small`, `Detail Title`, `Card`, `Detail`, `Solid Control`, etc.
3. A **component recipe layer** assigns those roles or token recipes to concrete app surfaces such as Story closed title, Gallery open caption, Q&A discovery question, Sidebar active tab, and gallery lightbox caption.
4. Theme CSS generation emits the resulting semantic/component variables.
5. Components consume those variables and still own layout/context decisions such as compact rails, open vs closed structure, and responsive behavior.
3. Reader components consume those summary roles through semantic CSS variables.
4. Only missing controls get added to the atomic token set.

The first concrete version of this mapping now lives in:

- `src/lib/theme/readerThemeSystem.ts`

That file is the working inventory of the "middle layer" for the current theme. It is intentionally reader-first and does not replace the Advanced tab.

Current workbench behavior:

- Theme Management preview sits beside the component inventory/editor so recipe changes can be judged immediately.
- The preview uses the same reader CSS generation path as the app and now includes an explicit coverage ledger mapping each reader component variant to its preview surface.
- The current editor is component-oriented rather than primitive-oriented: select a component, then a variant, then an element recipe.
- The Advanced token area remains the exact-value reference/source layer and is not replaced by the component editor.

Current wiring inventory (2026-04-25):

| Surface | Runtime / preview owner today | Current state |
| ------- | ----------------------------- | ------------- |
| Root runtime token sheet | `src/app/layout.tsx` + `src/lib/services/themeService.ts` | **Live runtime** - SSR injects generated token CSS from Firestore-resolved theme data with `theme-data.json` fallback. |
| Reader semantic aliases | `buildThemeTokensCss()` | **Live runtime** - Reader alias families (`--reader-page-*`, `--reader-card-*`, `--reader-detail-*`, etc.) are emitted from atomic theme data plus reader recipes. |
| Reader preview canvas | `src/app/admin/theme-admin/ThemeReaderPreview.tsx` | **Live-aligned preview** - Uses scoped CSS built from the same generator path, exercises real reader components rather than swatches only, and now documents preview coverage per component variant. |
| Reader preset application | `src/lib/theme/themePresets.ts` + `ThemeAdminPage.tsx` | **Workbench-wired + persisted** - Journal / Editorial now apply to the working draft as concrete theme-data transforms plus the active preset id, and Save persists the resolved scoped document. |
| Reader recipe editor | `src/lib/theme/readerThemeSystem.ts` + `ThemeAdminPage.tsx` | **Workbench-wired** - Component/variant/element recipes edit the same draft that drives preview CSS. |
| Advanced token editor | `ThemeAdminPage.tsx` | **Workbench-wired** - Atomic palette/token edits still act as the exact-value layer beneath recipes and move the draft to `custom`. |
| Legacy reader cards | `src/components/view/ContentCard.module.css` + `CardGrid.module.css` | **Legacy-aligned** - Older reader card/grid files are being remapped to the semantic system for consistency, but `V2ContentCard` / `CardFeedV2` remain the canonical active reader path. |
| Admin preview | `ThemeReaderPreview.tsx` scoped admin panel | **Preview-only / partial** - Validates basic authoring chrome, but admin does not yet have its own semantic alias family comparable to reader. |
| Preset persistence | `/api/theme` + Firestore `app_settings/theme` | **Live** - Save persists the scoped version 2 document through Firestore first, then updates `theme-data.json` as a backup/fallback artifact. |

Alignment gaps still to close:

- **Legacy reader holdouts** - Some older reader files still sit outside the current semantic migration, especially legacy card/list styling such as `src/components/view/ContentCard.module.css`; treat those as explicit follow-up inventory, not as silent cleanup attached to active-path work.
- **Admin semantics** - Admin uses preview/runtime tokens, but not yet a full `admin-*` semantic contract parallel to the reader layer.
- **Preset completeness** - Journal / Editorial are real draft transforms now, but they are still partial bundles rather than complete light/dark design packages.
- **Preview truthfulness** - Every reader role must have an obvious preview surface, and every previewed surface must map to a role or be explicitly classified as component-owned.

### 5.5 What should stay atomic vs summary vs component-owned

| Layer | Belongs here |
| ----- | ------------ |
| Atomic tokens | font families, size scale, weights, line heights, palette slots, theme colors, radii, shadows, spacing scale, button/card/tag/input primitives |
| Summary roles | title, title small, detail title, body, excerpt, meta, caption, quote, question, callout title/body, page/chrome/card/detail/discovery/media surfaces, solid/filter/media/lightbox controls |
| Component-owned | whether a card is compact, rail width, feed grid layout, detail structure, breakpoint-triggered layout changes, image aspect-ratio decisions |

### 5.6 Preview-role reconciliation matrix

The reader preview is no longer allowed to be an approximate mood board. It is the working contract for which live reader surfaces each component recipe is expected to drive.

| Component | Variant | Preview surface | Contract status |
| --------- | ------- | --------------- | --------------- |
| Canvas | Reader shell | Reader shell canvas + inline-link sample + focus-state sample | Canonical preview for page surface, body/meta text, inline links, and focus ring |
| Story card | Closed | Story column -> closed `V2ContentCard` | Canonical |
| Story card | Open | Story column -> open `CardDetailPage` | Canonical for story detail title, subtitle, body, figure frame, and caption |
| Story card | Explore More | `Explore More` section -> compact story card | Canonical |
| Gallery card | Closed | Gallery column -> closed `V2ContentCard` | Canonical |
| Gallery card | Open | Gallery column -> open `CardDetailPage` plus `Gallery media state` sample | Canonical for gallery detail title, inline gallery header/count, caption, lightbox controls, and overlay behavior |
| Gallery card | Explore More | `Explore More` section -> compact gallery card | Canonical |
| Discovery and rails | Discovery section | `Explore More` section heading + group/meta copy | Canonical |
| Discovery and rails | Child-card rail | Quote column -> `ChildCardsRail` sample | Canonical |
| Question card | Closed | Question column -> closed `V2ContentCard` | Canonical |
| Question card | Open | Question column -> open `CardDetailPage` | Canonical |
| Question card | Explore More | `Explore More` section -> compact Q&A card | Canonical |
| Quote card | Closed | Quote column -> closed `V2ContentCard` | Canonical |
| Callout card | Closed | Callout column -> closed `V2ContentCard` | Canonical |
| Sidebar and controls | Reader chrome | Sidebar open sample | Canonical for sidebar surface, support typography, filter chips, icon color, active controls, and neutral controls |
| Support UI | Tooling and selectors | `Support UI` sample with `SearchBar`, `PhotoPicker`, `TagSelector`, and `ImageToolbar` | Canonical |
| Support UI | Empty, loading, and error states | `Feed empty` + `Discovery loading/error` samples | Canonical |

Preview coverage rule:

- Every component/variant in `CURRENT_READER_THEME_COMPONENTS` must have an explicit preview surface in `ThemeReaderPreview.tsx`.
- The preview surface should use the real live reader component where possible, not a generic swatch.
- If a role cannot be judged from the current preview, that is a contract gap and should be fixed before more role proliferation.

### 5.7 Component-owned exclusions

The following decisions should remain component-owned unless product explicitly promotes them into the theme contract:

- feed/grid layout width, column count, and compact-card placement
- breakpoint-triggered drawer/sidebar placement behavior
- image aspect ratios, crop behavior, and media-sizing math
- hit-target sizing, pointer affordance, and disabled interaction behavior
- animation timing, gesture behavior, and non-token layout offsets

These may still be **previewed** so we can judge the surface in context, but they are not reader theme roles and should not quietly borrow the nearest typography/surface token label.

### 5.8 Firestore implication

Firestore is now the live persistence boundary for Theme Management. The saved document is the scoped version 2 reader/admin shape, while the semantic summary layer continues to be defined in code and proven in preview/live reader behavior.

That means:

- **no loss of precise control**
- **no need to discard the existing Advanced token set**
- **no need to save a separate vague preset model first**
- **reader roles stay a code-level semantic layer over fully materialized atomic theme data**

---

## 6. Spacing, radius, elevation, motion


| Role              | Meaning                 | Primary variables today                                               | Notes                                                                                                         |
| ----------------- | ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Spacing scale** | Consistent rhythm       | `--spacing-unit`, `--spacing-xs` … `--spacing-4xl`                    | Layout math in modules should prefer these over magic `px` where it affects *design*.                         |
| **Radius**        | Roundness language      | `--border-radius-*`, `--card-border-radius`                           | “Journal” preset: slightly softer; “Editorial”: slightly tighter — expressed here, not per-component guesses. |
| **Elevation**     | Depth on cards / chrome | `--shadow-sm` … `--shadow-xl`, `--card-shadow`, `--card-shadow-hover` |                                                                                                               |
| **Motion**        | Short transitions       | `--transition-short`                                                  | Respect `prefers-reduced-motion` at implementation time.                                                      |


---

## 7. Named presets (v1 intent)

Presets are **bundles** of assignments to the roles above (plus typography roles). Theme Management should eventually offer **preset selection** first, then **advanced overrides** for the author.

### Preset A — **Journal** (working name)

- **Intent:** Warm, personal, archival; feels like a family journal without looking like a draft.
- **Typography:** Body/UI stay **neutral sans**; **display** available for select titles or marketing surfaces; optional **serif** for titles if contrast helps.
- **Color:** Slightly warmer neutrals for `--color1-*`; accent (`--color3`) restrained but friendly.
- **Shape:** Softer `--border-radius-lg` / card radius; moderate shadow.

### Preset B — **Editorial** (working name)

- **Intent:** Calm, “designed product,” newspaper/magazine clarity on phone.
- **Typography:** **No handwriting** on chrome; titles may use **serif**; UI/body **sans** with strict scale.
- **Color:** Cooler or purely neutral backgrounds; accent more disciplined; higher reliance on `--text1` / `--text2` hierarchy.
- **Shape:** Tighter radii; flatter or lighter elevation.

**Deliverable for engineering:** Each preset = structured data (subset of `StructuredThemeData` or a new `presetId` + overrides) that compiles to the same variable set — not a separate CSS fork per preset.

---

## 8. What Theme Management must do (target)


| Layer            | User-facing behavior                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Presets**      | Pick **Journal** / **Editorial** (and future presets) on Theme Management; reader-scoped preview + Save persists `activePresetId` with full theme data (admin-chosen global design; no per-user theme yet). |
| **Overrides**    | Optional advanced panel: palette, fonts, spacing scale — same model as today, grouped by *role* where possible.                                                                                             |
| **Light / dark** | Keep global `data-theme` toggle; preset supplies **pairs** or derivation rules.                                                                                                                             |
| **Out of scope** | One-off layout math (e.g. a single modal width hack), animation keyframes that are not part of the design language — unless promoted to a token deliberately.                                               |


**Preview:** Authoritative preview should mirror `**/view`** (sample feed + one detail), not only swatches — so “what I tune” matches “what family sees.” Success criterion: the preview should make it easier to answer “Would someone want to keep reading this?”

**Preview/runtime convergence:** Preview CSS and live runtime CSS must compile from the same **resolved scoped theme model** (reader/admin settings, active preset id, dark-mode shift, and recipes). Preview must not use a looser ad hoc payload shape than runtime, and the preview ledger should make the role-to-surface mapping explicit.

**Current save posture:** Theme Management now persists the scoped version 2 reader/admin document through the normal Save action. The remaining theme work is therefore about **truthful surface coverage and role mapping**, not about whether save exists.

**Persistence target:** Theme data lives in **Firestore** `app_settings/theme` (written on Theme admin **Save** and via `npm run seed:theme-firestore`). The app **injects** `buildThemeTokensCss()` output in **RootLayout** (`<style id="theme-tokens">`) so variables apply in serverless deploys without committing regenerated CSS. `**theme-data.json`** stays the git backup and fallback when Firestore is empty or unreadable, and it may contain either the legacy flat reader shape or the scoped persisted document shape. Theme Management should be the product interface for editing this document; raw Firestore editing is not the intended user workflow.

**Save-ready contract:** The persisted document is the scoped **version 2** shape:

- `reader.data` = full materialized atomic `StructuredThemeData`
- `reader.activePresetId` = `journal` | `editorial` | `custom`
- `reader.darkModeShift` = persisted numeric value
- `reader.recipes` = persisted reader recipe layer used for runtime CSS generation
- `admin.data` = full materialized atomic `StructuredThemeData`
- `admin.activePresetId` = `admin` | `custom`
- `admin.darkModeShift` = persisted numeric value

Preset ids are retained as **editing metadata / UX context**, but the saved document still stores the fully materialized atomic theme data needed to render immediately at runtime. `custom` means the saved draft no longer matches any shipped preset exactly; it does **not** mean preset context was lost or omitted.

**Save-path rule:** The save endpoint should accept only this scoped persisted document shape. Legacy flat theme payloads may remain readable through normalization for fallback / migration, but they are **not** the save contract going forward. Firestore is the live durability boundary; any `theme-data.json` write is a secondary backup update and must not be required for the runtime save to succeed.

---

## 9. Reconciliation workflow (design-led, not code-led)

1. **Inventory surfaces first** - Build a table from actual reader/admin components: surface, file/component, visible elements (title, subtitle, excerpt, tags, controls, empty states, etc.), current token/CSS usage, required semantic token family, and migration status.
2. **Freeze the semantic contract** - Promote the inventory into role families (`reader-page`, `reader-card`, `reader-detail`, `reader-subtitle`, `reader-excerpt`, `reader-discovery`, `reader-media`, `reader-chrome`, `reader-solid`, `admin-*`, etc.). Iterate here when product intent changes.
   Recurring support surfaces (selectors, toolbars, sidebar labels/hints, utility controls) should use the dedicated `reader-support-*` family rather than being assigned to the “closest” content/discovery role.
3. **Define the theme schema** - Decide how semantic role values live in the Firestore theme document and preset bundles; keep `theme-data.json` as fallback/backup, not the product editing surface.
4. **Map generator output** - Map `themeService.ts` / `theme-data.json` fields to each role; add aliases only where they clarify ownership and reduce component confusion.
5. **Migrate surfaces in order** - Move reader surfaces (`src/components/view/`, shared rich text, discovery, media, chrome) to role-backed variables; grep for raw `hex` / `rgba` against this checklist.
6. **Admin separately** - Admin reuses shared tokens where useful, but dense tooling and status/control states need `admin-*` aliases separate from reader personality.
7. **Complete presets** - Only after the schema and surface coverage are coherent should Journal / Editorial be treated as complete data packages with preview + persistence.

---

## 10. Reader shell, responsive layout & navigation (contract)

This section is the **single product contract** for how the signed-in reader chrome behaves across desktop, tablet, and phone. It complements §2–§7 (tokens and presets): layout and breakpoints are specified here so implementation does not drift session-to-session.

### 9.1 Strategic intent

- **Cross-device consistency** — The same tasks (open filters, read the feed, use top nav) must remain **obvious**; do not hide a primary control on one width without replacing it.
- **Mobile-first consumption** — Narrow viewports are first-class; touch targets and readable type follow §2 and `02-Application.md` (Accessibility ⭕2).
- **One control surface for filters** — The left tag/filter panel remains the discovery surface; narrow widths use a **slide-over drawer + backdrop**, not a second competing paradigm unless product explicitly changes.

### 9.2 Breakpoints and CSS mechanics

- **Canonical narrow breakpoint** — `**768px`** is the width at which the app switches to the **drawer** treatment for the filter sidebar (fixed overlay, backdrop). This aligns with the design-token intent `--breakpoint-md: 768px` in `theme1.css` / generated theme data.
- **Literal values in `@media`** — Layout `@media` queries MUST use **literal pixel widths** (e.g. `max-width: 768px`), **not** `var(--breakpoint-md)`. Custom properties inside media queries are unreliable across browsers and have caused inconsistent layout behavior.
- **Component alignment** — `AppShell`, `Navigation`, `CardFeedV2`, `V2ContentCard`, and related view CSS should use the **same** breakpoint for the same behavioral change unless a documented exception exists.

### 9.3 Sidebar toggle (← / →)

- **Visibility** — The **sidebar toggle control stays visible at all viewport widths** so users can always open the filter panel, including on phones. (Narrow layouts continue to use overlay + backdrop; the toggle is not removed.)
- **Z-index and chrome** — Stacking order must keep the toggle usable (see `--z-index-sidebar` / header tokens); do not regress without updating this contract.

### 9.4 Main content feed grid (`/view`)

- **Narrow** — At `**max-width: 768px`**, the primary card feed uses a **single column** of cards (full-width tiles in the content area). This preserves a “story stream” feel and avoids two squeezed columns on phones and narrow tablets.
- **Wider** — Above that breakpoint, a multi-column grid may use tokenized gaps and radii; minimum column width and column count should be chosen deliberately, not only `auto-fill` with a large `minmax` floor that forces two columns too early on narrow tablets.

### 9.5 When to change this section

Changes to breakpoints, toggle visibility, or feed column rules are **product decisions**: update this § first, then `02-Application.md` (Navigation / Content) and `03-Implementation.md` if work is planned (`⭕1`).

---

## 11. In-app status messaging contract

This section defines the UX and token contract for system/status messaging so feedback appears as part of the app (not browser/system chrome).

### 10.1 Outcome-first behavior

- **Single save acknowledgement per action** - For card save, use one primary save-state surface (no competing local + global indicators for the same operation).
- **Clear completion signal** - After save, show a concise success or error acknowledgement in-app.
- **No native dialogs for product feedback** - Replace `alert`/`confirm` with themed components as migration scope expands.

### 10.2 Message types and intended surfaces


| Type              | Behavior                            | Preferred surface                                 |
| ----------------- | ----------------------------------- | ------------------------------------------------- |
| Blocking progress | User must wait; controls are inert  | Full-page or modal overlay with spinner + message |
| Inline progress   | Only one region is loading/saving   | Inline status row in that section                 |
| Success           | Operation completed                 | Auto-dismissing inline/banner notice              |
| Warning           | Recoverable issue / partial success | Persistent warning banner with guidance           |
| Error (local)     | Section failed, app continues       | Local error banner with retry action              |
| Error (blocking)  | Current flow cannot continue        | Error dialog or full-page error shell             |
| Confirmation      | Potentially destructive action      | Themed confirm dialog (not browser confirm)       |


### 10.3 Visual and token rules

- **Semantic tokens only** - Use `--state-info-`*, `--state-success-*`, `--state-warning-*`, `--state-error-*` for status backgrounds/borders.
- **Readable contrast by default** - Backdrops and panels must remain legible against media-rich content; avoid relying on low-opacity overlays alone.
- **Consistent hierarchy** - Primary status text uses `--text1-color`; supporting copy uses `--text2-color`.
- **Motion discipline** - Spinners should be visible and sized for context; provide reduced-motion fallback.

### 10.4 Accessibility rules

- **Live status** - Progress and success notices use `role="status"` with polite live region behavior.
- **Urgent failures** - Blocking/local failures use `role="alert"` where appropriate.
- **Dialog focus** - Confirm/error dialogs trap focus and restore focus to the invoking control on close.

### 10.5 Initial narrow implementation reference (card save)

- Card save feedback should present one clear saving state and one clear save result.
- Cover-local save overlays should not compete with a global card-save overlay during the same operation.
- This narrow implementation is the template for broader rollout across admin and reader surfaces.

---

## 12. Revision history


| Date       | Change                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-10 | Initial contract: semantic roles, type roles, two presets, Theme Management target, reconciliation order.                                             |
| 2026-04-10 | §4.1 base palette (3–14); persistence: Firestore + layout-injected tokens + `theme-data.json` fallback.                                               |
| 2026-04-11 | Reader shell & responsive layout section added (breakpoints, sidebar toggle, feed columns); literal `px` in `@media`. |
| 2026-04-16 | Added in-app status messaging contract (message taxonomy, behavior, token/a11y rules, card-save narrow reference). |
| 2026-04-25 | Added §5 two-tier authoring model: summary roles over existing atomic tokens, explicit compact-variant boundary, and reader-first middle-layer target. |
| 2026-04-25 | Updated current status and §5 to reflect the component-based Reader Theme System workbench, side-by-side preview/editor workflow, and the move toward component + variant + element recipes. |
