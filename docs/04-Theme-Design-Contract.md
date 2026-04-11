# Theme design contract (semantic tokens & presets)

**Status:** Living specification — authoritative for *what* we tokenize and *why*, before code-only audits.  
**See also:** `01-Vision-Architecture.md` (Frontend principles, visual direction), `02-Application.md` → Theme Management, `03-Implementation.md` (CSS Tokenization sequencing).

---

## 1. Why this document exists

Theme work has two legs:

1. **Design contract (this file)** — Define semantic *roles* (surfaces, text, accents, type), how they behave on **mobile**, and how **named presets** express “journal / archival” vs “professional / editorial” without exposing 200 unrelated sliders first.
2. **Implementation** — `theme.css` generation (`themeService.ts`), Theme admin UI, component CSS using `var(--…)`, and deploy-safe persistence.

**Inventorying literals in `*.module.css` alone** optimizes consistency but does not guarantee a coherent product look. This contract is the checklist: new or migrated styles should map to a **role** (or be explicitly out of scope).

---

## 2. Product constraints (non-negotiable tensions)

| Constraint | Implication for tokens |
|------------|-------------------------|
| **Journal / history** | Warm surfaces, optional *display* typography (e.g. handwriting) for **titles or section labels only** — not for dense UI or long body text. |
| **Professional** | Legible **UI + body** type, consistent spacing scale, restrained saturation on chrome; accents used deliberately (links, primary actions, dimensional tags). |
| **Mobile-centric** | Touch-friendly min sizes, readable **base** font size on small viewports, horizontal rails and cards that respect tokenized spacing and radii — not one-off `px` stacks. |

Resolve conflicts with **type roles** and **presets**, not by mixing display fonts into every label.

---

## 3. Typography roles

| Role | Job | Typical use | Map today (approx.) | Direction |
|------|-----|-------------|---------------------|-----------|
| **UI** | Chrome, tags, buttons, nav, form labels | Admin + reader chrome | `--font-family-sans`, `--font-size-sm` / `base` | Keep neutral and highly legible. |
| **Body** | Long reading (stories, answers) | TipTap content, narrative | `--body-font-family` → usually `sans` | Slightly larger than UI on mobile if needed — via scale tokens, not ad hoc `px`. |
| **Title** | Card titles, section headers | Feed tiles, detail headers | Often `sans` or `serif` via component rules | Presets may switch title to **serif** for editorial feel. |
| **Display** | “Journal personality” | Optional: hero titles, home hero, few headings | `--font-family-handwriting` | Use sparingly; **off** or **subtle** in “Editorial” preset. |

**Rule:** Handwriting is a *display* choice bound to a preset or explicit component token — not the default `--body-font-family` for the whole app.

---

## 4. Semantic color & surface roles (reader-first)

These are the **meanings** the UI must express. Implementations today use the listed `theme.css` variables; future work may introduce shorter **alias** names (e.g. `--surface-page`) that *point to* these — without duplicating sources of truth in components.

| Semantic role | Meaning | Primary variables today | Notes |
|-----------------|---------|-------------------------|--------|
| **Page** | App canvas behind content | `--body-background-color`, `--layout-background1-color` | Same family; cards sit on `--layout-background2` / `--card-background-color`. |
| **Raised / panel** | Sidebar, secondary panels | `--layout-background2-color` | |
| **Card** | Primary content tile | `--card-*` (background, border, radius, shadow) | Feed and detail should not hardcode competing grays. |
| **Text primary** | Main reading text | `--text1-color` | |
| **Text secondary** | Meta, captions, de-emphasized | `--text2-color` | |
| **Border subtle** | Dividers, hairlines | `--border1-color` | |
| **Border strong** | Emphasis, scrollbars | `--border2-color`, scrollbar vars | |
| **Accent / primary action** | Primary button, key links | `--color3`, `--button-solid-*`, `--link-text-color` | Presets tune hue/saturation, not random new hex in modules. |
| **Semantic feedback** | Success, warning, error, info | `--state-*-background-color`, `--state-*-border-color` | Tied to palette ids 11–14 in generator. |
| **Dimensional tags** | Who / What / When / Where | `--tag-who-bg-color`, … | Content language; keep distinct per dimension. |
| **Overlay / scrim** | Modals, lightbox, media overlays | `--lightbox-*`, gradients `--gradient-bottom-overlay*` | Gradients still contain raw `rgba` in places — **tokenization candidate** aligned to roles. |
| **Raster watermark** | Flat tile watermarks (e.g. callout) | `--card-watermark-raster-filter` | Theme-aware (light vs dark). |

**Dark mode:** Same roles; values switch under `[data-theme="dark"]` (generated with light `:root` in the same token sheet). Presets must define **paired** light/dark assignments or derived rules.

### 4.1 Base palette (colors 3–14)

| Range | Role | Notes |
|-------|------|--------|
| **3** | Principal / primary accent | Links, solid primary button, focus accents — maps to `--color3` and related component tokens. |
| **4** | Secondary accent | Highlights, secondary emphasis. |
| **5–8** | Dimensional alts | Default mapping to Who / What / When / Where tag chips (`--tag-*-bg-color`); keep distinct hues for scanability. |
| **9–10** | Extra palette slots | Spares or future semantic uses; avoid hardcoding in modules without a token. |
| **11–14** | Status | Success, error, warning, info — wired to `--state-*` tokens in the generator. |

Values are edited in Theme Management and stored in structured theme data; components should reference **semantic / component variables**, not raw `--hex7`, except where the generator already centralizes mapping.

---

## 5. Spacing, radius, elevation, motion

| Role | Meaning | Primary variables today | Notes |
|------|---------|-------------------------|--------|
| **Spacing scale** | Consistent rhythm | `--spacing-unit`, `--spacing-xs` … `--spacing-4xl` | Layout math in modules should prefer these over magic `px` where it affects *design*. |
| **Radius** | Roundness language | `--border-radius-*`, `--card-border-radius` | “Journal” preset: slightly softer; “Editorial”: slightly tighter — expressed here, not per-component guesses. |
| **Elevation** | Depth on cards / chrome | `--shadow-sm` … `--shadow-xl`, `--card-shadow`, `--card-shadow-hover` | |
| **Motion** | Short transitions | `--transition-short` | Respect `prefers-reduced-motion` at implementation time. |

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

| Layer | User-facing behavior |
|--------|----------------------|
| **Presets** | Pick **Journal** / **Editorial** (and future presets) on Theme Management; reader-scoped preview + Save persists `activePresetId` with full theme data (admin-chosen global design; no per-user theme yet). |
| **Overrides** | Optional advanced panel: palette, fonts, spacing scale — same model as today, grouped by *role* where possible. |
| **Light / dark** | Keep global `data-theme` toggle; preset supplies **pairs** or derivation rules. |
| **Out of scope** | One-off layout math (e.g. a single modal width hack), animation keyframes that are not part of the design language — unless promoted to a token deliberately. |

**Preview:** Authoritative preview should mirror **`/view`** (sample feed + one detail), not only swatches — so “what I tune” matches “what family sees.”

**Persistence:** Theme data lives in **Firestore** `app_settings/theme` (written on Theme admin **Save** and via `npm run seed:theme-firestore`). The app **injects** `buildThemeTokensCss()` output in **RootLayout** (`<style id="theme-tokens">`) so variables apply in serverless deploys without committing regenerated CSS. **`theme-data.json`** stays the git backup and fallback when Firestore is empty or unreadable.

---

## 8. Reconciliation workflow (design-led, not code-led)

1. **Freeze v1 of this contract** (iterate here when product intent changes).
2. **Map** `themeService.ts` / `theme-data.json` fields to each **role** (table above); add aliases only where it reduces confusion.
3. **Migrate reader surfaces** (`src/components/view/`, shared chrome) to use role-backed variables; grep for raw `hex` / `rgba` against this checklist.
4. **Admin** reuses tokens for shared components; dense admin-only layouts may stay pragmatic but should not introduce new rogue brand colors.
5. **Implement presets** as data + preview + persistence.

---

## 9. Revision history

| Date | Change |
|------|--------|
| 2026-04-10 | Initial contract: semantic roles, type roles, two presets, Theme Management target, reconciliation order. |
| 2026-04-10 | §4.1 base palette (3–14); persistence: Firestore + layout-injected tokens + `theme-data.json` fallback. |
