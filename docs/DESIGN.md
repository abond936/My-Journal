---
version: alpha
name: my-journal
description: >-
  Agent-readable design projection for my-journal. Canonical product contract
  remains docs/04-Theme-Design-Contract.md; YAML values mirror theme-data.json
  at commit time (runtime may follow Firestore theme overrides).
colors:
  principal: "#0f4c81"
  accent: "#c9a227"
  dimensional_who: "#8A3A0E"
  dimensional_what: "#0E3A4A"
  dimensional_when: "#2C5A1F"
  dimensional_where: "#5A1F4F"
  palette_alt5: "#6A4F29"
  palette_alt6: "#B08A3E"
  state_success: "#059669"
  state_error: "#dc2626"
  state_warning: "#d97706"
  state_info: "#2563eb"
  surface_page_light: "#eceef2"
  surface_page_dark: "#14161c"
  text_primary_light: "#16181d"
  text_primary_dark: "#eef0f4"
  on_principal_solid: "#ffffff"
  surface_raised_light: "hsl(220, 19%, 98%)"
typography:
  ui_sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: "1.5"
  body_sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 1.125rem
    fontWeight: "400"
    lineHeight: "1.5"
  title_serif:
    fontFamily: '"Georgia", "Times New Roman", serif'
    fontSize: 1.25rem
    fontWeight: "600"
    lineHeight: "1.25"
  display_handwriting:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 1.5rem
    fontWeight: "500"
    lineHeight: "1.25"
  scale_xs: 0.875rem
  scale_sm: 1rem
  scale_base: 1.125rem
  scale_lg: 1.25rem
  scale_xl: 1.5rem
rounded:
  sm: 0.125rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.625rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
  "4xl": 96px
components:
  button_solid:
    backgroundColor: "{colors.principal}"
    textColor: "{colors.on_principal_solid}"
    rounded: "{rounded.md}"
    padding: 12px
  card_default:
    backgroundColor: "{colors.surface_raised_light}"
    textColor: "{colors.text_primary_light}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  link_default:
    textColor: "{colors.principal}"
  tag_who:
    backgroundColor: "{colors.dimensional_who}"
    textColor: "#ffffff"
  tag_what:
    backgroundColor: "{colors.dimensional_what}"
    textColor: "#ffffff"
  tag_when:
    backgroundColor: "{colors.dimensional_when}"
    textColor: "#ffffff"
  tag_where:
    backgroundColor: "{colors.dimensional_where}"
    textColor: "#ffffff"
---

# Overview

**Single source of truth (product):** `docs/04-Theme-Design-Contract.md` — semantic roles, non-negotiable tensions, reader shell rules, status messaging, and reconciliation order live there unchanged.

**This file:** A [DESIGN.md](https://github.com/google-labs-code/design.md)-shaped projection so Stitch, Gemini, and other agents get **machine-readable tokens** (YAML above) plus **structured rationale** (sections below) aligned with `04`.

**Theme implementation:** CSS variables are generated from structured theme data (`themeService`, Firestore `app_settings/theme`, git fallback `theme-data.json`) and injected at runtime. Values in the YAML front matter reflect **`theme-data.json`** in the repo; production may differ if Theme Management has saved other data.

**Active preset (data):** `editorial` — see Named presets for how Journal vs Editorial intent maps to the same variable pipeline.

### Product constraints (from `04` §2)

| Constraint | Implication |
|-------------|-------------|
| Journal / history | Warm surfaces; optional *display* typography for titles or section labels only — not dense UI or long body. |
| Professional | Legible UI + body type, consistent spacing, restrained chrome saturation; accents for links, primary actions, dimensional tags. |
| Mobile-centric | Touch-friendly min sizes, readable base font on small viewports; rails and cards use tokenized spacing and radii. |

Resolve conflicts with **type roles** and **presets**, not by mixing display fonts into every label.

### Typography roles (from `04` §3)

| Role | Job | Typical use |
|------|-----|---------------|
| **UI** | Chrome, tags, buttons, nav, labels | Admin + reader chrome |
| **Body** | Long reading | TipTap content, narrative |
| **Title** | Card titles, section headers | Feed tiles, detail headers |
| **Display** | “Journal personality” | Optional hero / few headings; **sparingly** |

**Rule:** Handwriting is a *display* choice bound to a preset or explicit component token — not the default body font for the whole app.

**Admin grid overlays:** Dense metadata on card/media admin grid thumbnails use **dedicated tokens** (`--font-size-admin-grid-overlay`, `--admin-grid-overlay-font`), not the global `--font-size-xs` scale. Dimensional tag fills on thumbnails use translucent `color-mix` on tag background tokens with white label text where applicable.

# Colors

Semantic **meanings** the UI expresses (variables today — see `04` §4):

| Semantic role | Meaning | Primary variables today |
|---------------|---------|-------------------------|
| Page | App canvas behind content | `--body-background-color`, `--layout-background1-color` |
| Raised / panel | Sidebar, secondary panels | `--layout-background2-color` |
| Card | Primary content tile | `--card-*` |
| Text primary | Main reading text | `--text1-color` |
| Text secondary | Meta, captions | `--text2-color` |
| Border subtle / strong | Dividers vs emphasis | `--border1-color`, `--border2-color` |
| Accent / primary action | Primary button, key links | `--color3`, `--button-solid-*`, `--link-text-color` |
| Semantic feedback | Success, warning, error, info | `--state-*-background-color`, `--state-*-border-color` |
| Dimensional tags | Who / What / When / Where | `--tag-who-bg-color`, … |
| Overlay / scrim | Modals, lightbox | `--lightbox-*`, gradient overlays |
| Raster watermark | Flat tile watermarks | `--card-watermark-raster-filter` |

**Dark mode:** Same roles; values switch under `[data-theme="dark"]`. Presets supply **paired** light/dark assignments.

### Base palette (ids 3–14, from `04` §4.1)

| Range | Role |
|-------|------|
| 3 | Principal / primary accent |
| 4 | Secondary accent |
| 5–8 | Dimensional alts (default tag chip mapping) |
| 9–10 | Extra slots |
| 11–14 | Status — success, error, warning, info |

Hex values for the current `theme-data.json` appear in the YAML front matter under `colors.*`.

# Typography

- **UI / Body:** Neutral sans stack; body often slightly larger than UI on mobile via **scale tokens**, not ad hoc pixels.
- **Title:** Sans or serif via preset; Editorial may use serif on titles.
- **Display:** Optional handwriting face for marketing or rare headings; **off** or subtle in Editorial.
- **Weights / line heights:** Normal through bold; tight/relaxed line heights for hierarchy.

Fluid sizes (`clamp` presets for responsive type) exist in theme data as `fluidFontSizes.size1` … `size3`.

# Layout

### Spacing and rhythm (from `04` §5)

| Role | Variables |
|------|-----------|
| Spacing scale | `--spacing-unit`, `--spacing-xs` … `--spacing-4xl` |
| Radius | `--border-radius-*`, `--card-border-radius` |
| Elevation | `--shadow-sm` … `--shadow-xl`, `--card-shadow`, `--card-shadow-hover` |
| Motion | `--transition-short` — honor `prefers-reduced-motion` in implementation |

Spacing multipliers resolve against `--spacing-unit` (`4px` in current data): xs 4px, sm 8px, md 16px, lg 24px, xl 32px, 2xl 48px, 3xl 64px, 4xl 96px.

### Reader shell, responsive layout, navigation (from `04` §9)

- **Cross-device consistency** — Primary tasks stay obvious; do not hide a primary control on one width without replacing it.
- **Mobile-first** — Narrow viewports are first-class; touch targets and type follow the accessibility notes in `02-Application.md`.
- **One filter surface** — Left tag/filter panel is discovery; narrow widths use **slide-over drawer + backdrop**, not a competing paradigm unless product changes.

**Canonical narrow breakpoint:** **`768px`** — drawer treatment for the filter sidebar (fixed overlay, backdrop). Aligns with `--breakpoint-md: 768px` in generated theme / `theme1.css`.

**Critical implementation rule:** `@media` queries MUST use **literal pixel widths** (e.g. `max-width: 768px`), **not** `var(--breakpoint-md)` — custom properties in media queries are unreliable across browsers.

**Component alignment:** `AppShell`, `Navigation`, `CardFeedV2`, `V2ContentCard`, and related view CSS share the **same** breakpoint for the same behavior unless a documented exception exists.

**Sidebar toggle:** Remains **visible at all viewport widths** so filters can always be opened (including phones). Z-index uses `--z-index-sidebar` / header tokens so the toggle stays usable.

**Feed grid (`/view`):** At `max-width: 768px`, the primary feed is **single column**. Wider: multi-column with tokenized gaps; avoid `auto-fill` + large `minmax` floors that force two columns too early on narrow tablets.

**Layout tokens in data:** `layout.containerMaxWidth` 1200px, `sidebarWidth` 300px, `sidebarWidthMobile` 250px, breakpoints sm/md/lg/xl as in theme JSON.

# Elevation & Depth

- Card and chrome depth via **shadow tokens** (`shadow/sm` … `shadow/xl`, card default + hover).
- Shadow color uses theme-driven HSL with configurable strength (light vs dark).
- Lightbox and overlays use dedicated overlay / gradient tokens (some gradients still list raw `rgba` in CSS — tokenization candidate per `04`).

# Shapes

- **Journal preset (intent):** Softer large radii and card radius; moderate shadow.
- **Editorial preset (intent):** Tighter radii; flatter or lighter elevation.
- **Radii in data:** `sm` 0.125rem, `md` 0.375rem, `lg` 0.5rem, `xl` 0.625rem, `full` pill.

# Components

High-level patterns from `theme-data.json` `components` (paths are logical; runtime resolves color/spacing references):

| Area | Intent |
|------|--------|
| Header | Fixed height, surface + border from color1 scale |
| Button solid | Principal background, light text |
| Button outline | Transparent / subtle hover, border from neutrals |
| Card | Raised surface, padding, border, radius, sm → md shadow on hover |
| Tag chips | Pill radius, medium weight, sans; per-dimension backgrounds (who/what/when/where/reflection) |
| Link | Principal color; hover underline |
| Input | Light surface, neutral border, principal focus ring |

**Theme Management target (`04` §7):** Presets first (Journal / Editorial), then advanced overrides; global light/dark; preview mirrors **`/view`** where possible; persistence Firestore + injected CSS + `theme-data.json` fallback.

# In-app status messaging (from `04` §10)

Contract for system/status feedback (not browser chrome):

- **Outcome-first:** One primary save-state surface per action where possible; clear completion; migrate away from `alert`/`confirm` toward themed components.
- **Surfaces:** Blocking progress → overlay + spinner; inline progress → section row; success → auto-dismiss; warning → persistent banner; errors → local banner or blocking shell; confirm → themed dialog.
- **Tokens:** `--state-info-*`, `--state-success-*`, `--state-warning-*`, `--state-error-*` only for status chrome.
- **Text hierarchy:** Primary `--text1-color`, supporting `--text2-color`.
- **A11y:** `role="status"` for polite progress/success; `role="alert"` for urgent failures; dialogs trap focus and restore on close.

# Named presets (from `04` §6)

### Preset A — Journal (working name)

- Warm, personal, archival; body/UI neutral sans; display available for select titles; optional serif for titles.
- Warmer neutrals for color1 family; principal accent restrained but friendly.
- Softer radius; moderate shadow.

### Preset B — Editorial (working name)

- Calm “designed product,” newspaper/magazine clarity on phone.
- No handwriting on chrome; titles may use serif; strict UI/body sans scale.
- Cooler or neutral backgrounds; disciplined accent; strong text1/text2 hierarchy.
- Tighter radii; lighter elevation.

**Engineering deliverable:** Each preset = structured data compiling to the **same** CSS variable set — not a separate CSS fork per preset.

# Reconciliation workflow (from `04` §8)

1. Freeze or iterate the contract in `04` when product intent changes.
2. Map `themeService` / `theme-data.json` fields to each **role**; add aliases only to reduce confusion.
3. Migrate reader surfaces to role-backed variables; grep raw hex/rgba against the checklist.
4. Admin reuses tokens; dense admin-only layouts stay pragmatic without rogue brand colors.
5. Implement presets as data + preview + persistence.

# Do's and Don'ts

**Do**

- Map new styles to a **semantic role** or promote a deliberate new token.
- Keep the **768px** breakpoint literal in `@media` and consistent across shell, nav, feed, and cards.
- Keep the **sidebar toggle** visible at all widths.
- Use **state tokens** for status UI; respect live region / focus rules in §10.

**Don't**

- Put display / handwriting on **dense UI** or long body by default.
- Introduce competing filter UX on narrow viewports without a product decision.
- Rely on `var(--breakpoint-md)` inside media queries.
- Skip denormalized theme accounting in code paths (see `01` / `02` for data integrity — not visual, but part of shipped correctness).

# Stitch handoff & reader baseline (My Stories)

**Status:** Internal agreement for implementation and for future design prompts (Stitch or otherwise). **External mocks are visual guides, not acceptance specs** — engineering follows this section + `docs/04` + actual components.

## How we use external mocks

- Extract **layout rhythm**, **type roles**, **color mood**, and **interaction patterns** (e.g. horizontal icon+value chips).  
- **Ignore** unless explicitly product-scoped: footer flourishes (“end of…”), extra FABs, bottom app nav, placeholder branding, invented dates for indeterminate when, and copy that diverges from locked strings below.

## Lock list v2 — paste at top of design requests

**Identity & copy**

| Locked | Exact / rule |
|--------|----------------|
| Product name | **My Stories** |
| Child / related rail heading | **Explore More** (sentence case; caps only if entire preset uses all-caps labels consistently) |
| Gallery block heading | **Gallery** when a section title is shown (matches `InlineGallery` default `title="Gallery"`) |
| Gallery secondary line | **View all** + count — `N items` or `1 / N` (product will pick one); not “View Archive” unless approved |

**Chrome (reader Story / Navigate / narrow baseline)**

- **One** top pattern: **back** + **My Stories** + **bookmark** + **share** (adjust only with `[PROPOSED]`).  
- **No** bottom app navigation or floating story actions unless `[PROPOSED_FEATURE]`.

**Dimensional metadata (Who / What / When / Where)**

- **Icon + value** per shown dimension; **horizontal** row (wrap), under title or before first body paragraph (or one compact row above **Explore More**).  
- **Partial:** render only dimensions that exist; **no** ghost rows.  
- **Indeterminate when:** no fake calendar dates; use **General** (or product-chosen categorical label) when appropriate (e.g. `z-when`).  
- **Distinct** tints per dimension (design-led); map later to `--tag-*` tokens.  
- **No** “Story Attributes”-style unrelated pill blocks unless `[PROPOSED]`.  
- **No** vertical sidebar / rotated dimension rails on narrow viewports.

**Typography (two presets)**

- **Editorial (`editorial`):** **sans** long-form body; **serif** for title (and optional quote); **sans** for UI, gallery line, **Explore More** chrome.  
- **Journal / Manuscript (`journal`):** **serif** body allowed; **sans** for UI, counts, **View all**, small metadata.  
- **Capitalization:** may differ **between** presets; must be **consistent within** a preset.

**Presets in scope**

- **Two only:** **editorial** and **journal** (no third “neon” preset in design backlog).

**Implementation note for dark mode**

- Runtime uses **`data-theme="light"|"dark"`** on `html` (not necessarily Tailwind `class` dark mode in handoff HTML).

## Story `(navigate)` — patterns to keep from recent collaboration

- Horizontal **icon + value** metadata; **General** (or equivalent) for indeterminate when.  
- **Gallery** + optional **View all** + item count.  
- **Explore More** horizontal rail for `childrenIds` / related cards.  
- **Manuscript:** warm surface, quote styling, optional organic gallery framing **inside** the content column — not new global chrome.

## Display modes per card type (product truth)

From `src/lib/utils/cardDisplayMode.ts`: **`story`** → `navigate` only; **`gallery`** → `navigate` | `inline`; **`qa`** → `navigate` | `inline`; **`quote`** / **`callout`** → `static` only. Design triple-tags must respect this matrix.

## Gallery: `inline` vs `navigate` (authoritative)

**External mocks (e.g. Stitch) are non-binding** — engineering and `docs/02` matrix follow this subsection for **intent**; implementation lives in `V2ContentCard` (`GalleryCardContent`), `CardDetailPage`, `InlineGallery`, and related CSS.

### `inline` — feed card (swipe in place)

- **Purpose:** The feed shows a **compact gallery card**: dominant **image** (cover or first slide) + **title** (and optional **one** metadata row: icon+value dimensional chips, **General** for indeterminate when when needed).  
- **Peek / affordance:** Show **obvious continuation** to the right — a **sliver or thumbnail** of the next image(s), and/or **`1 / N`** (or chevrons) — so users understand the **media region is swipeable** without opening the card.  
- **Interaction:** **Horizontal swipe on the media region** advances slides **in the feed**; does not navigate to `/view/[id]` (tile remains non-navigating for `inline` per linking rules in `docs/02-Application.md`).  
- **Captions (choose per implementation; mix allowed):**  
  - **Default:** omit long captions in the **feed** strip to reduce noise.  
  - **Short only:** one line under the active slide, ellipsis, character cap.  
  - **Progressive:** tap caption or **“i”** opens **sheet** / expand for full caption + alt text.  
  - **Overlay:** only when caption is **very short**; do not obscure peek or swipe targets.  
  - **Empty:** no caption chrome.  
- **Data:** Captions come from **`galleryMedia`** items (see `getEffectiveGalleryCaption` in code). **Dedup:** when cover is also listed in `galleryMedia`, the feed swiper **omits** the duplicate slide — design counts should match that behavior.

### `navigate` — opened card / detail (masonry or structured grid)

- **Purpose:** Opening the card shows a **media-first** experience: **masonry**, **bento**, or other structured **grid** of **all** gallery items (plus optional hero treatment for cover).  
- **Header:** Section title **Gallery**; secondary line **View all** + **`N items`** or **`1 / N`** (product picks one canonical string).  
- **Captions:** Prefer **below tile** with truncation + expand; or **lightbox** on tap (full image, caption under/side); long captions should not force the main story column to duplicate gallery prose.  
- **Detail page** may also render **`InlineGallery`** for `galleryMedia` when present (`CardDetailPage.tsx`).

### Accessibility & motion

- Swipe regions need **visible focus** and **screen-reader** position (e.g. slide “3 of 8”); caption expanders need **accessible names**. Respect **`prefers-reduced-motion`** for parallax / auto-advance if added later.

## Q&A (`qa`) — feed vs detail (implementation summary)

**Fields:** **`title`** = question; **`content`** = answer (TipTap HTML); **`excerpt`** = optional teaser; optional **`coverImage`**; optional **`galleryMedia`** and **`childrenIds`** like other types.

**`inline` (feed):** `V2ContentCard` renders optional **cover**, **question** (`title`), **excerpt**, and **full answer** (`TipTapRenderer` on `content`) **in the feed** — high information density; design mocks should respect that answers can appear inline.

**`navigate` (feed tile):** Optional **cover**, **question** (`title`), **excerpt** only — tile **links** to `/view/[id]` for the full answer.

**Detail (`/view/[id]`):** `CardDetailPage` — cover, title, optional **subtitle**, then **`content`** in a section labeled **Answer** for accessibility (`aria-label` when `type === 'qa'`). Optional **InlineGallery** and **DiscoverySection** (**Explore More**) same as story.

**Design prompts:** Use triple-tags **`(qa, inline|navigate, editorial|journal)`** and the **lock list v2**; do not use **`static`** for Q&A comps.

## Reader polish backlog (decisions, 2026)

Synthesized from Stitch experiments and author review. **Lock list v2** + **`04`** remain normative for strings and type roles; this section captures **direction** for implementation and future design.

### Process

- **External mocks (e.g. Stitch)** are **visual guides**, not acceptance specs — easy to drift on branding, chrome, and copy.  
- **Engineering** implements from **this doc**, **`docs/04`**, and **code**; refresh mocks only when intentionally re-briefing.

### Typography

- Move toward a **clear scale** (display / title / body / UI) with **meaningful difference** between **`editorial`** (sans-forward body) and **`journal`** (serif body allowed), both using **sans for dense UI** — see **Lock list v2 → Typography**.

### Metadata & tags

- **Small chips:** **icon + value** for Who / What / When / Where where shown; **partial dimensions**; **General** (or product label) for indeterminate when — no ghost rows.  
- **Alignment:** audit reader detail and feed cards so **insets and baselines** match across title, body, rails, and media.

### Explore More & discovery spacing

- **Issue:** Explore More / discovery felt **too tight** to the main story column and to the **scroll end**.
- **Decision:** Increase **vertical separation** above the discovery block and **padding** below it and on the detail article container — implemented in `DiscoverySection.module.css` and `CardDetail.module.css` (see repo).

### Discovery / Explore More typography (deferred)

- **Observation:** Rails mostly shrink via **narrower cover / tile width** (`cardRailCell` clamp, `V2ContentCard` `small`), but **title and supporting type** do not step down **enough** relative to the main story — hierarchy feels weak.
- **Direction:** Handle in a **single typography pass** with explicit **compact-rail** token steps (or preset-aware scales), not one-off font tweaks per rail.

### Full-bleed media (optional)

- **Goal:** Hero or key media can **span full horizontal width** (no side gutter) on narrow viewports where product agrees — requires a **breakout** layout pattern from the padded article column; **not** defaulted everywhere until specified per block.

### Explore More presentation variants (future)

- Allow **variants** without one-off forks, e.g.: **(A)** compact replica of feed card, **(B)** thumb + title row, **(C)** title-only link — likely driven by **props** or rail context in `DiscoverySection` / child rails.

### Kickers (semi-automatic, future)

- **Problem:** Title-only detail pages feel flat.  
- **Direction:** Prefer **derived kickers** before the title when no author override: e.g. **type cue** (Story / Q&A / Quote), **first contextual tag** or dimension, **subtitle** when set, **curated parent** label, or **date bucket** (General vs formatted). Optional later: explicit **`kicker`** field on the card for full author control. **Fully ML-generated** kickers are not required for v1.

### Quote & callout (`static`)

- Feed/detail behavior stays tied to **`cardDisplayMode.ts`** (`static` only). Visual polish targets **`V2ContentCard`** + detail **quote/callout** modules (attribution, blockquote spacing, type badge) — same chip/kicker ideas as story where applicable.

---

*YAML and tables tuned to `theme-data.json` and `docs/04-Theme-Design-Contract.md` as of authoring. When they diverge, **`04` wins for product meaning;** refresh this file after material theme or contract changes.*
