# Theme design contract (semantic tokens & presets)

**Status:** Living specification — authoritative for *what* we tokenize and *why*, before code-only audits; and for **reader shell layout, responsive behavior, and navigation affordances** that must stay consistent with tokens (§9).  
**See also:** `01-Vision-Architecture.md` (Frontend principles, visual direction), `02-Application.md` → Theme Management, Navigation, Layouts, `03-Implementation.md` (CSS Tokenization sequencing, responsive chrome).

**Current implementation status (2026-04-25):** Theme infrastructure exists, but the theme system is not complete. Runtime CSS variables are generated from theme data and injected by the app, with `theme-data.json` / `theme.css` fallbacks. Theme Management is currently a **preview lab**: scoped reader/admin preview, Journal / Editorial reader preset toggles, light/dark preview controls, raw Advanced tokens, and **Save intentionally paused**. Journal / Editorial are partial preset bundles, not finished themes. Initial semantic aliases exist for reader cards, detail surfaces, rich text, meta/caption, and quotes; many reader/admin surfaces remain unmapped pending the inventory-driven contract/schema pass below.

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

**Rule:** A reader component may use primitive tokens for mechanical layout (`--spacing-*`, `--z-index-*`, literal media-query pixels per §9), but design-affecting color, type, radius, elevation, and content hierarchy should prefer the reader aliases below.

| Role group | Token family | Scope | Status |
| ---------- | ------------ | ----- | ------ |
| Reader page | `--reader-page-*` | `/view` canvas, feed background, detail page surround | Planned |
| Reader chrome | `--reader-chrome-*` | reader header/nav, sidebar/drawer, filter panels, mode controls | Planned |
| Feed cards | `--reader-card-*` | closed feed/discovery cards only | Initial |
| Detail page | `--reader-detail-*` | open card reading surface and cover frame | Initial |
| Rich text | `--reader-body-*`, `--reader-title-*` | story bodies, Q&A answers, TipTap headings/lists | Initial |
| Subtitle/excerpt | `--reader-subtitle-*`, `--reader-excerpt-*` | card/detail subtitles and feed/detail excerpts | Planned |
| Meta text | `--reader-meta-*`, `--reader-caption-*` | dates, captions, attributions, secondary metadata | Initial |
| Quote/Q&A | `--reader-quote-*`, `--reader-question-*`, `--reader-answer-*` | quote tiles/details and question/answer emphasis | Partial |
| Discovery | `--reader-discovery-*` | Explore More, Similar, child-card rails, related sections | Planned |
| Tags | `--reader-tag-*` plus dimension tokens | reader tag chips and active filter chips | Planned |
| Media | `--reader-media-*` | gallery frames, image backgrounds, lightbox affordances | Planned |

Initial aliases emitted by `buildThemeTokensCss()`:

| Alias group | Initial mapping |
| ----------- | --------------- |
| `--reader-title-*` | Title color/family/size/weight/line-height map to `--text1-color`, `--body-font-family`, `--font-size-base`, `--font-weight-semibold`, and `--line-height-tight`. |
| `--reader-subtitle-*` | Planned: subtitle color/family/size/weight/style/line-height for detail subtitles and card subtitles. Until emitted, subtitles use meta/body tokens. |
| `--reader-excerpt-*` | Planned: excerpt color/family/size/line-height for feed teasers, Q&A teasers, and detail summaries. Until emitted, excerpts use meta/body tokens. |
| `--reader-body-*` | Body color/family/size/line-height map to `--text1-color`, `--body-font-family`, `--font-size-sm`, and `--line-height-relaxed`. |
| `--reader-meta-*` | Metadata scale maps to `--text2-color` and `--font-size-sm`. |
| `--reader-caption-*` | Captions and attributions map to `--text2-color` and `--font-size-sm`. |
| `--reader-card-*` | Closed-card surface, border, radius, shadow, hover shadow, and padding map to existing `--card-*`; flat reader tiles map to `--layout-background1-color`. |
| `--reader-detail-*` | Open-card surface, cover background, border, radius, shadow, and horizontal/bottom padding map separately so detail pages do not inherit feed-tile assumptions. |
| `--reader-quote-*` | Quote text family/size/line-height/color maps to body/text primitives while preserving later preset-specific treatment. |

Planned aliases before presets are considered complete:

| Alias group | Intended controls |
| ----------- | ----------------- |
| `--reader-page-background-color`, `--reader-page-text-color` | Overall reader canvas and default text contrast. |
| `--reader-chrome-background-color`, `--reader-chrome-panel-color`, `--reader-chrome-border-color`, `--reader-chrome-text-color`, `--reader-chrome-muted-color` | Header, sidebar, drawer, filter chrome, and mode controls. |
| `--reader-card-title-*`, `--reader-card-excerpt-*`, `--reader-card-meta-*` | Feed-card-specific hierarchy where tile titles/excerpts diverge from detail headings/body text. |
| `--reader-detail-title-*`, `--reader-detail-subtitle-*`, `--reader-detail-excerpt-*`, `--reader-detail-meta-*` | Open-card header hierarchy, including subtitles, summaries/excerpts, and status/date-like text. |
| `--reader-question-*`, `--reader-answer-*` | Q&A prompt and answer treatment, including no-cover Q&A tiles and open answer content. |
| `--reader-discovery-background-color`, `--reader-discovery-title-*`, `--reader-discovery-card-*` | Explore More, Similar, child-card rails, and related sections. |
| `--reader-tag-background-*`, `--reader-tag-text-color`, `--reader-tag-border-color`, `--reader-tag-active-*` | Tag chips, active filters, and dimension-specific scanability. |
| `--reader-media-frame-background-color`, `--reader-media-caption-*`, `--reader-lightbox-*` | Gallery/detail media frames, captions, overlays, and lightbox surfaces. |

Migration status:

| Surface | Contract target | Status |
| ------- | --------------- | ------ |
| `V2ContentCard` | `--reader-card-*`, shared title/body/meta/quote/caption aliases | Initial migration complete |
| `CardDetailPage` | `--reader-detail-*`, shared title/body/meta/quote/caption aliases | Initial migration complete |
| `TipTapRenderer` | reader body/title/quote/caption aliases | Initial migration complete |
| `DiscoverySection`, `ChildCardsRail` | `--reader-discovery-*` plus card aliases | Planned |
| `InlineGallery`, media figures, lightbox | `--reader-media-*` plus caption aliases | Planned |
| `GlobalSidebar`, reader filters, reader header/nav | `--reader-chrome-*`, `--reader-tag-*` | Planned |
| Admin content tooling | `--admin-*` aliases separate from reader personality | Planned |

Theme presets are not complete until each preset supplies enough underlying values to make the role groups above coherent in light and dark mode. Until then, Journal and Editorial are starting points, not finished themes.

---

## 5. Spacing, radius, elevation, motion


| Role              | Meaning                 | Primary variables today                                               | Notes                                                                                                         |
| ----------------- | ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Spacing scale** | Consistent rhythm       | `--spacing-unit`, `--spacing-xs` … `--spacing-4xl`                    | Layout math in modules should prefer these over magic `px` where it affects *design*.                         |
| **Radius**        | Roundness language      | `--border-radius-*`, `--card-border-radius`                           | “Journal” preset: slightly softer; “Editorial”: slightly tighter — expressed here, not per-component guesses. |
| **Elevation**     | Depth on cards / chrome | `--shadow-sm` … `--shadow-xl`, `--card-shadow`, `--card-shadow-hover` |                                                                                                               |
| **Motion**        | Short transitions       | `--transition-short`                                                  | Respect `prefers-reduced-motion` at implementation time.                                                      |


---

## 6. Named presets (v1 intent)

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

## 7. What Theme Management must do (target)


| Layer            | User-facing behavior                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Presets**      | Pick **Journal** / **Editorial** (and future presets) on Theme Management; reader-scoped preview + Save persists `activePresetId` with full theme data (admin-chosen global design; no per-user theme yet). |
| **Overrides**    | Optional advanced panel: palette, fonts, spacing scale — same model as today, grouped by *role* where possible.                                                                                             |
| **Light / dark** | Keep global `data-theme` toggle; preset supplies **pairs** or derivation rules.                                                                                                                             |
| **Out of scope** | One-off layout math (e.g. a single modal width hack), animation keyframes that are not part of the design language — unless promoted to a token deliberately.                                               |


**Preview:** Authoritative preview should mirror `**/view`** (sample feed + one detail), not only swatches — so “what I tune” matches “what family sees.” Success criterion: the preview should make it easier to answer “Would someone want to keep reading this?”

**Current save posture:** Theme Management **must not** persist arbitrary preview/preset edits while the semantic contract and Firestore schema are incomplete. The visible Save control is paused; preview edits are diagnostic only.

**Persistence target:** Theme data lives in **Firestore** `app_settings/theme` (written on Theme admin **Save** and via `npm run seed:theme-firestore`). The app **injects** `buildThemeTokensCss()` output in **RootLayout** (`<style id="theme-tokens">`) so variables apply in serverless deploys without committing regenerated CSS. `**theme-data.json`** stays the git backup and fallback when Firestore is empty or unreadable. Theme Management should be the product interface for editing this document; raw Firestore editing is not the intended user workflow.

---

## 8. Reconciliation workflow (design-led, not code-led)

1. **Inventory surfaces first** - Build a table from actual reader/admin components: surface, file/component, visible elements (title, subtitle, excerpt, tags, controls, empty states, etc.), current token/CSS usage, required semantic token family, and migration status.
2. **Freeze the semantic contract** - Promote the inventory into role families (`reader-page`, `reader-card`, `reader-detail`, `reader-subtitle`, `reader-excerpt`, `reader-discovery`, `reader-media`, `reader-chrome`, `admin-*`, etc.). Iterate here when product intent changes.
3. **Define the theme schema** - Decide how semantic role values live in the Firestore theme document and preset bundles; keep `theme-data.json` as fallback/backup, not the product editing surface.
4. **Map generator output** - Map `themeService.ts` / `theme-data.json` fields to each role; add aliases only where they clarify ownership and reduce component confusion.
5. **Migrate surfaces in order** - Move reader surfaces (`src/components/view/`, shared rich text, discovery, media, chrome) to role-backed variables; grep for raw `hex` / `rgba` against this checklist.
6. **Admin separately** - Admin reuses shared tokens where useful, but dense tooling and status/control states need `admin-*` aliases separate from reader personality.
7. **Complete presets** - Only after the schema and surface coverage are coherent should Journal / Editorial be treated as complete data packages with preview + persistence.

---

## 9. Reader shell, responsive layout & navigation (contract)

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

## 10. In-app status messaging contract

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

## 11. Revision history


| Date       | Change                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-10 | Initial contract: semantic roles, type roles, two presets, Theme Management target, reconciliation order.                                             |
| 2026-04-10 | §4.1 base palette (3–14); persistence: Firestore + layout-injected tokens + `theme-data.json` fallback.                                               |
| 2026-04-11 | §9 reader shell & responsive layout (breakpoints, sidebar toggle, feed columns); literal `px` in `@media`; §10 revision history (renumber).           |
| 2026-04-16 | Added §10 in-app status messaging contract (message taxonomy, behavior, token/a11y rules, card-save narrow reference); moved revision history to §11. |
