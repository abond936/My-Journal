# Theme design contract (semantic tokens & presets)

**Status:** Living specification — authoritative for *what* we tokenize and *why*, before code-only audits; and for **reader shell layout, responsive behavior, and navigation affordances** that must stay consistent with tokens (§10).
**See also:** `01-Vision-Architecture.md` (Frontend principles, visual direction), `02-Application.md` → Theme Management, Navigation, Layouts, `03-Implementation.md` (CSS Tokenization sequencing, responsive chrome).

**Current implementation status (2026-04-30):** Theme infrastructure exists and the structural overhaul phase is now effectively complete. Runtime CSS variables are generated from theme data and injected by the app, with `theme-data.json` / `theme.css` fallbacks. Theme Management is now a **floating, draggable, resizable live-draft workspace** with one unified editor, a component-first left side, and a value-library right side. The primary component structure is now **Foundation** and **Content** rather than separate Reader / Workbench navigation tracks. Journal / Editorial are still not “final themes,” but they are now real preset bundles on top of a far more truthful editor/runtime contract rather than partial styling experiments. The reader semantic layer has working role groups for page, chrome, controls, cards, detail, body/title, meta/caption, tags, media/overlay, discovery, support UI, and type treatments. Closed-card backgrounds are now authorable more truthfully as **General** plus per-card `Use General` / curated override choices for the main reader card families. Selected filled/active controls now resolve through one shared contrast-text path instead of splitting sidebar selected tabs from selected support controls. Theme Management now operates from the real admin theme scope, and its Values pane can be collapsed so more of the live app surface remains visible while styling.

**Reader surface addendum (2026-05-03):** Reader chrome and card surfaces now rely more visibly on the shared support/chrome/tag roles: top-navigation light/dark switching uses compact sun/moon iconography; the Freeform sidebar uses a denser sticky Explore header with adjacent mode/clear controls; selected tag state is more explicit in the tree; and closed/open reader cards now expose reader-facing type badges plus dimensional context chips as part of the live themed surface inventory. These additions do not change the token model, but they do expand the set of reader surfaces that should be judged during live theme validation.

**Runtime reconciliation status (2026-04-29):** The generator path is now materially reconciled with the editor for foundations, chrome, controls, cards, overlays, discovery, media/lightbox surfaces, and most reader typography. Earlier runtime bypasses and bridge-only CSS outputs have been reduced significantly, broken fallback alias paths have been repaired, and scoped reader/admin draft generation now follows the same compile path guarded by canaries. The remaining explicit reader gap is **feedback success / warning / info panels**: those values are generated and editable, but the current reader UI does not yet render matching success/warning/info panel surfaces.

The current editor structure is now:
- the **left side** is the component editor: section navigation, component selection, variant selection, attribute selection, direct editing of the selected attribute, and inline light/dark/shared-use information beside the active choice
- the **right side** is the **Values** panel: it is the value library for **Colors**, **Type**, and **Structure**, and it can be collapsed when the author wants more of the underlying app surface visible during live tuning

The system is still transitional. The next theme phase is still not just more token wiring; it remains an author-facing model correction toward **Component -> Attribute -> Value** on top of the existing three-tier technical system (**atomic tokens**, **semantic token classes**, and **recipes**), with special focus on compile-path truthfulness, vocabulary clarity, and the relationship between selected attributes and the values shown beside them.

---

## 1. Why this document exists

Theme work has two legs:

1. **Design contract (this file)** — Define semantic *roles* (surfaces, text, accents, type), how they behave on **mobile**, and how **named presets** express “journal / archival” vs “professional / editorial” without exposing 200 unrelated sliders first.
2. **Implementation** — `theme.css` generation (`themeService.ts`), Theme admin UI, component CSS using `var(--…)`, live draft application, and deploy-safe persistence.

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

### 4.3 Token classes vs recipe roles

The biggest source of theme confusion is mixing **what a value is** with **what job a surface is doing**.

- **Tokens define behavior class**. A token should answer “what kind of value is this?” Examples: tonal surface color, ordinary text color, border color, contrast-on-fill text, overlay/media contrast text, accent color, radius, spacing.
- **Recipes define UI meaning**. A recipe should answer “what job is this element doing?” Examples: story title, selected sidebar control, lightbox control text, body copy, tag label, page surface.

This contract relies on that split:

| Layer | Question it answers | Examples |
| ----- | ------------------- | -------- |
| Tokens | “What class of value is this?” | `Text1`, `Text2`, `Background1`, `Border1`, solid-button text, overlay text |
| Recipes | “What job is this element doing?” | story title, selected control, overlay caption, discovery meta, tag label |

**Selected-control text rule:** Text used on filled / selected controls is a distinct token class. It is not ordinary body text and it is not allowed to fall back to muted text. Sidebar active tabs, selected support controls, chips, and similar filled controls should resolve through the same **contrast-on-fill text** role, which currently maps to the light side of Theme Color 2.

This is now the required architecture direction for Theme Management:

| Layer | Responsibility | Examples |
| ----- | -------------- | -------- |
| Atomic tokens | Raw editable source values | palette entries, theme-color families, type scale, spacing, radius, shadows, primitive component tokens |
| Semantic token classes | Behavior-aware reusable meaning | tonal text primary, tonal surface raised, contrast-on-fill text, overlay/media contrast text, border subtle, accent primary, focus ring |
| Recipes | UI-job assignment | story closed title, gallery lightbox caption, sidebar active tab, support control selected, admin grid badge |

**Rule:** app surfaces should not bind directly from component code to raw atomic token refs where a semantic class is required. Recipes should target semantic token classes; semantic token classes may resolve to atomic values.

### 4.4 Author-facing editing model

The technical three-tier system above is still the correct implementation architecture, but it is **not** the clearest author-facing editing vocabulary on its own. Theme Management should present a simpler model to the author:

| Author-facing layer | Question it answers | Examples |
| ------------------- | ------------------- | -------- |
| **Component** | "What part of the app am I styling?" | Canvas, Header, Sidebar, Story Card, Gallery Card, Lightbox, Field, Feedback Panel |
| **Attribute** | "What aspect of that component am I defining?" | background color, text color, border color, width, padding, radius, shadow, font family, font size |
| **Value** | "What should that attribute be?" | `Canvas Surface`, `Overlay Contrast Text`, `320px`, `shadow-md`, `#f4efe6`, `serif` |

The editing sentence should read:

`[Component]` has `[Attribute]` = `[Value]`

Examples:

- `Canvas` has `background color` = `Canvas Surface`
- `Sidebar` has `width` = `320px`
- `Story Card` has `border radius` = `lg`

This is the required authoring direction for Theme Management:

- **Components are the primary navigation model.** The left side of Theme Management should let the author think in terms of Canvas, Sidebar, Header, Story Card, Gallery Card, Lightbox, Field, Feedback Panel, and similar app pieces.
- **Attributes are the editable contract for a component.** Each component should expose only the attributes that are meaningful for it. Example: Sidebar may expose width, surface, text, border, and active-control styling; it should not expose unrelated token buckets.
- **The left side is the active editor.** After selecting a component and variant, the author should also select the attribute and edit it there, rather than treating the right side as the primary editor surface.
- **Values are typed selections and value truth.** The right side should offer the valid values for the selected attribute and show the named value(s) currently in use plus the resolved underlying values where possible: colors for color attributes, lengths for width/padding/radius, typography values for type attributes, shadows for shadow attributes, and so on.
- **Storage names are not the editing model.** Internal token/storage names such as `layout`, `background1`, `border1`, or other implementation-era buckets may remain in code and persistence, but they should not be the primary author-facing concepts.
- **Semantic classes remain important, but as values.** In the author-facing model, `Canvas Surface`, `Chrome Surface`, `Contrast On Fill Text`, and `Overlay Contrast Text` should appear as reusable values that satisfy an attribute - not as competing parallel navigation structures.
- **Metric families must stay distinct.** `Padding`, `Spacing`, `Margin`, `Gap`, `Width`, `Height`, `Radius`, `Border Width`, and similar layout metrics are separate concepts in the editing model. If implementation currently reuses one numeric substrate behind the scenes, that is a temporary storage shortcut - not the author-facing contract.

#### Author-facing typing rule

Theme Management should eventually enforce typed matching between attributes and values:

- background color -> color values only
- text color -> color values only
- width -> width values only
- height -> height values only
- padding -> padding values only
- spacing / gap / margin -> spacing values only
- radius -> radius values only
- border width -> border-width values only
- font family -> font-family values only
- font size / line height -> typography scale values only
- shadow -> shadow values only

This prevents the author from having to reason about unrelated token buckets while editing.

#### Shared vs local role map

Theme Management must tell the author whether a control is changing one thing or a deliberately shared family:

- **Local** - owned by one component or one explicit variant. Example: `Story Card -> Closed -> Overlay Text`.
- **Shared** - intentionally reused across multiple surfaces that are meant to stay in sync. Example: `General -> Covered Fade`.

The editor should describe shared impact in plain language before the value is changed:

- `Covered Fade` - shared by **Story cards** and **Question cards with a cover image**
- `Gallery Overlay` - shared by **covered Gallery cards** and **gallery overlay chips**
- `Lightbox Backdrop` - shared by the **fullscreen gallery lightbox**
- `Field Label / Meta / Hint / Control` - shared by **reader fields and nearby support chrome**

This is the required rule going forward: a shared role may exist only when all consumers are doing the **same visual job**.

Examples:

- `fade` and `wash` are different jobs and may not share one role
- covered-card overlays and lightbox backdrops are different jobs and may not share one role
- a control that appears local in the editor may not secretly edit a broader shared role without that shared impact being shown

The authoring model must therefore prefer a few truthful shared roles over broad abstract buckets such as `cardStrong` that hide multiple visual intentions behind one name.

#### Metric-family rule

For layout-like attributes, Theme Management should not collapse everything into one generic `length` bucket. The editor contract should distinguish:

- **Padding values** - inset values for the inside of a component
- **Spacing values** - rhythm values between items, sections, or repeated content
- **Margin / gap values** - explicit separation values where those concepts are product-facing
- **Sizing values** - width and height families
- **Radius values** - corner curvature
- **Border-width values** - stroke thickness

If two attributes temporarily point to the same stored numeric scale in code, the editor should still preserve the distinct concept and naming. The author should not have to think "padding is really spacing" or "width is just another length."

#### Transitional rule

The current workspace is allowed to remain a transitional bridge while the refactor is underway, but all future editor redesign work should move **toward** `Component -> Attribute -> Value`, not further into token-bucket terminology.

### 4.5 Initial component inventory

The table below is the **first-pass canonical author-facing component inventory** for Theme Management. It is intentionally product-facing rather than storage-facing. This is the inventory the editor should gradually converge on before more token-bucket expansion.

#### Reader-first component set

| Component | What it means | First-pass attributes |
| --------- | ------------- | --------------------- |
| **Canvas** | The overall reader shell and page framing behind content | background color, text color, muted text color, border color, link color, focus ring color |
| **Header** | The top app header/chrome band | background color, text color, icon color, border color, height |
| **Sidebar** | Reader navigation/filter/support column or drawer | background color, icon color, border color, width, active control background color, active control text color |
| **Window** | Floating reader windows and dialog shells that must read clearly above the page | surface, frame/border color, radius, elevation/shadow |
| **Field / Support UI** | Shared inputs, selectors, chips, helper labels, helper text, and neutral form-like controls | title color, label color, meta color, hint color, neutral control background color, neutral control text color, neutral control border color, selected background color, selected text color, selected border color, chip background color, chip text color, border radius, padding |
| **Feedback Panel** | Neutral and stateful informational surfaces such as empty/loading/info/success/warning/error panels | background color, title color, text color, border color, action background color, action text color, action border color |
| **Story Card** | Story card in closed state, open reading state, and supported discovery treatment | surface, title, subtitle, body, meta, border, radius, shadow, card padding, discovery title/excerpt treatment |
| **Gallery Card** | Gallery card in closed state, open reading state, supported discovery treatment, and media-adjacent framing | surface, title, subtitle, body, meta, border, radius, shadow, card padding, media frame background color, media frame border color |
| **Question Card** | Question card in closed state, open reading state, and supported discovery treatment | surface, question, answer preview/body, meta, border, radius, shadow, card padding |
| **Quote Card** | Quote card in closed state only | surface, quote text, attribution, watermark treatment |
| **Callout Card** | Callout card in closed state only | surface, title, subtitle, body/excerpt, watermark treatment |
| **Lightbox** | Fullscreen or overlay media-viewing surface | scrim color, text color, control background color, control text color, control border color, caption color |

#### Variant and discovery rules

- **Closed-state rule** - All card types participate in Theme Management in their **closed** state.
- **Open-state rule** - Only `Story Card`, `Gallery Card`, and `Question Card` participate in **open** state editing because those are the only card types that open in the reader.
- **Discovery rule** - Discovery is one **shared support surface** across the app, not a separate design system per card type. It may vary in bounded ways for `Story Card`, `Gallery Card`, and `Question Card` (for example title, excerpt, or framing treatment), but it should not become a different discovery UI per type.
- **Discovery exclusions** - `Quote Card` and `Callout Card` do **not** participate in discovery.

#### Attribute typing for the initial set

The initial inventory above should map to typed value groups as follows:

| Attribute kind | Allowed value type |
| -------------- | ------------------ |
| `background color`, `text color`, `muted text color`, `border color`, `icon color`, `link color`, `scrim color`, `caption color` | color values |
| `width`, `height`, `padding`, `border radius` | length values |
| `shadow` | shadow values |

The point is not to expose every possible value immediately. The point is to make the editing contract understandable: if the author selects `Sidebar -> width`, the system should offer width values; if the author selects `Canvas -> background color`, the system should offer color values.

#### Initial attribute rules

- **Canvas is about the overall shell, not every reader card.** Its job is the app framing, global body text, links, and focus contrast.
- **Header and Sidebar are chrome components.** They are not generic “layout” buckets; they are concrete components with visible jobs.
- **Field is a reusable component class.** It should own neutral controls, selected controls, labels, hints, and input-like behavior instead of hiding inside a vague support bucket.
- **Feedback Panel owns stateful messaging surfaces.** Neutral/info/success/warning/error may later become variants of this component rather than unrelated recipe keys.
- **Story Card and Gallery Card are separate components.** They may share many values, but they must be able to diverge without fighting a single generic card contract.
- **Lightbox is its own component because overlay contrast is a different problem from ordinary tonal surfaces.**

#### Internal mapping note

The inventory above does **not** mean the persistence schema must stop using atomic tokens, semantic token classes, and recipes. It means the editor should translate from these author-facing components and attributes into the existing technical layers underneath.

Examples:

- `Canvas -> background color` may resolve to a semantic value such as `Canvas Surface`, which in turn resolves to atomic tokens like `layout/background1Color`.
- `Sidebar -> width` may resolve directly to a length token or stored literal.
- `Lightbox -> scrim color` may resolve to an overlay semantic class rather than a raw gradient token name.

### 4.6 Current-system mapping for the initial inventory

The table below maps the initial author-facing component inventory to the current theme system as it exists today. This is the bridge between the target editor model and the live implementation.

| Target component | Current editor/component ids | Current recipe bindings | Current semantic/value families | Main mismatch to resolve |
| ---------------- | ---------------------------- | ----------------------- | ------------------------------- | ------------------------ |
| **Canvas** | `canvas -> reader` | `surfaces.canvasPage`, `typography.body`, `typography.meta`, `controls.inlineLink`, `controls.focusRing` | `semantic/reader/canvas-surface`, `semantic/reader/canvas-border`, tonal text, accent, focus ring | Fairly close already, but the current editor still exposes this as recipe bindings rather than a single component with explicit attributes like background color and text color. |
| **Header** | `header -> main` | `surfaces.chromeToolbar`, plus direct header tokens for text/icon color and structural tokens for height/logo max height | `--reader-header-*`, layout/header atomic tokens, shared chrome values | Now first-class in both the authoring layer and the live runtime split. Header text/icon remain direct header-owned values rather than being borrowed from the sidebar/support families. |
| **Sidebar** | `sidebar -> main` | `surfaces.chromeSidebar`, `typography.chromeText`, `typography.chromeMeta`, `controls.chromeActiveTab`, `controls.inlineLink`, `iconography.chrome`, plus width tokens | `semantic/reader/chrome-surface`, `semantic/reader/chrome-border`, explicit chrome text/meta roles, contrast-on-fill text, accent | Now first-class in the authoring layer and less coupled to support/discovery typography. Sidebar-specific chrome text and meta now drive the live sidebar title, section labels, navigation copy, and secondary count/meta text instead of borrowing support copy roles. |
| **Window** | `window -> floating` | `surfaces.windowSurface`, `surfaces.windowFrame`, `surfaces.windowElevation` | shared surface, frame/border, radius, and elevation/shadow values | Now split into separate visual jobs so authors can change the panel fill, its edge contrast, and its lift above the page independently without guessing which part they are actually editing. |
| **Field** | `field -> controls` | `typography.supportTitle`, `typography.supportLabel`, `typography.supportMeta`, `typography.supportHint`, `controls.supportControl`, `typography.supportControlText`, `controls.supportControlStrong`, `controls.supportChip` | `semantic/reader/field-surface`, `semantic/reader/field-border`, tonal text, contrast-on-fill text | Much more truthful now: support copy and control styling are grouped together as one shared support family instead of borrowing chrome typography names. |
| **Feedback Panel** | `feedback -> states/success/warning/error/info` | `surfaces.feedbackPanel`, `surfaces.feedbackSuccessPanel`, `surfaces.feedbackWarningPanel`, `surfaces.feedbackErrorPanel`, `surfaces.feedbackInfoPanel`, `typography.feedbackTitle`, `typography.feedbackMeta`, `typography.feedbackHint`, `controls.feedbackAction` | `semantic/reader/feedback-surface`, `semantic/reader/feedback-border`, plus explicit `state/*` backgrounds/borders for state variants | Strong start. The main redesign task is vocabulary: this should become one component with variants and attributes rather than a cluster of recipe groups and panel keys. |
| **Story Card** | `storyCard -> closed/open/discovery` | `surfaces.card`, `surfaces.canvasDetail`, `surfaces.canvasMediaFrame`, `typography.storyTitle`, `typography.storyDetailTitle`, `typography.subtitle`, `typography.body`, `typography.meta`, `typography.caption`, `overlays.coveredFade` | Card/detail/media semantic families, tonal text, overlay contrast text | Present but spread across closed/open/discovery variants, which is technically correct but still not presented as one coherent component with shared attributes and variant-specific overrides. |
| **Gallery Card** | `galleryCard -> closed/open/discovery` | `surfaces.card`, `surfaces.canvasDetail`, `surfaces.canvasMediaFrame`, `typography.galleryTitle`, `typography.galleryDetailTitle`, `typography.galleryHeaderTitle`, `typography.discoveryMeta`, `typography.caption`, `typography.body`, `controls.lightboxControl`, `overlays.galleryOverlay`, `overlays.lightboxBackdrop` | Card/detail/media/lightbox semantic families, overlay contrast text, media-control/lightbox-control semantics | Strong functional coverage, but it currently mixes card, media frame, and lightbox concerns across multiple recipe families instead of reading as one component with nested attributes. |
| **Question Card** | `qaCard -> closed/open/discovery` | `surfaces.qaCardClosed`, `surfaces.canvasDetail`, `typography.question`, `typography.questionOverlay`, `typography.body`, `typography.excerpt`, `typography.caption` | Card/detail semantic families, tonal text, overlay contrast text | Functionally present, but still described partly in Q&A language and still needs the same component-first treatment as Story and Gallery. |
| **Quote Card** | `quoteCard -> closed` | `surfaces.card`, `typography.quote`, `typography.caption`, `treatments.quoteWatermarkOpacity` | Shared card surface, quote/caption typography, treatment values | Closed-state-only contract is clear, but it should remain outside discovery and should not be forced into the same open/detail model as other reader cards. |
| **Callout Card** | `calloutCard -> closed` | `surfaces.card`, `typography.calloutTitle`, `typography.subtitle`, `typography.excerpt`, `typography.calloutBody`, `treatments.calloutWatermarkOpacity` | Shared card surface, callout typography, treatment values | Closed-state-only contract is clear, but it should remain outside discovery and should not inherit open/detail assumptions. |
| **Lightbox** | `lightbox -> fullscreen` | `controls.lightboxControl`, `overlays.lightboxBackdrop`, shared `typography.caption` | `semantic/reader/lightbox-control-surface`, `semantic/reader/lightbox-control-border`, `semantic/reader/overlay-scrim`, `semantic/reader/overlay-border`, overlay contrast text | Now promoted to a first-class editor component so fullscreen media is no longer hidden under Gallery authoring. Caption remains intentionally shared with the broader media-caption role. |

#### What this mapping tells us

- **Canvas, Header, Sidebar, Field, and Feedback Panel are now the closest to the target model today.** They already have recognizable editor groups and semantic families.
- **Story Card and Gallery Card are structurally present, but still recipe-first.** Their current model is organized around variants and bindings rather than explicit component attributes.
- **Lightbox is now structurally first-class.** The remaining work is to keep its shared caption/control relationships visible rather than hiding them behind Gallery terminology.
- **Header is now first-class in the authoring layer.** The remaining question is whether it needs more dedicated runtime roles or whether shared chrome semantics remain sufficient.

#### First implementation interpretation

The first editor refactor should **not** try to invent everything from scratch. It should reuse the parts of the current system that already map cleanly:

- `Canvas` can be built from the current `canvas -> reader` binding set.
- `Sidebar` now uses its own author-facing component, while still binding to the shared chrome/sidebar runtime roles plus width values.
- `Field` can be built from the current `field -> controls` binding set.
- `Feedback Panel` can be built from the current `feedback` variants.
- `Story Card`, `Gallery Card`, and `Question Card` can be built by grouping their current closed/open/discovery bindings under a component-first wrapper.
- `Quote Card` and `Callout Card` should remain explicit closed-only components and should stay out of discovery.
- `Lightbox` should remain split out from `galleryCard -> open` as its own author-facing component.
- `Header` should remain a dedicated component entry rather than collapsing back into generic chrome naming.

#### Implementation warning

Do **not** read this mapping as permission to keep the current editor vocabulary and just rename tabs. The point of the mapping is to make the refactor incremental while preserving the new author-facing model:

- the current recipe system remains the technical substrate
- the editor should translate that substrate into `Component -> Attribute -> Value`
- gaps beyond the current authoring layer should be treated as explicit schema work, not hidden under existing buckets

### 4.7 First editor-structure plan

This section defines the **first concrete Theme Management editor structure** that should be built on top of the component inventory and mapping above.

#### Left side: component-first navigation

The left side of the workbench should stop behaving like a mixed recipe browser and instead present a component list in this order:

1. `Canvas`
2. `Header`
3. `Sidebar`
4. `Field`
5. `Feedback Panel`
6. `Story Card`
7. `Gallery Card`
8. `Question Card`
9. `Quote Card`
10. `Callout Card`
11. `Lightbox`

This ordering is intentional:

- start with app framing first
- then structural chrome
- then shared controls/feedback
- then content components
- then overlay/media-specific behavior

#### Left side: first visible attributes per component

Each component should open with a **small first-pass attribute list**, not every possible sub-binding at once.

| Component | First attributes to show |
| --------- | ------------------------ |
| **Canvas** | background color, text color, muted text color, link color, focus ring color |
| **Header** | background color, text color, icon color, border color, height |
| **Sidebar** | background color, title color, label color, meta color, hint color, icon color, width, active control background color, active control text color |
| **Field** | label color, hint color, background color, text color, border color, selected background color, selected text color, padding, border radius |
| **Feedback Panel** | background color, title color, text color, border color, action background color, action text color |
| **Story Card** | closed/open surface, title color, subtitle color, body color, meta color, border color, border radius, shadow, card padding |
| **Gallery Card** | closed/open surface, title color, subtitle color, body color, meta color, media frame background color, media frame border color, border radius, shadow, card padding |
| **Question Card** | closed/open surface, question color, answer preview/body color, meta color, border color, border radius, shadow, card padding |
| **Quote Card** | closed surface, quote text color, attribution color, watermark treatment |
| **Callout Card** | closed surface, title color, subtitle color, body/excerpt color, watermark treatment |
| **Lightbox** | scrim color, text color, control background color, control text color, control border color, caption color |

These are the attributes the author should see first. Lower-frequency or more technical controls can still exist, but they should live under an explicit “More” or “Advanced component details” posture rather than being the default experience.

#### Left side: variants without losing component-first structure

Some components legitimately need variants. The editor should still keep the component as the primary unit and let variants sit **inside** it.

- `Story Card`, `Gallery Card`, and `Question Card` should expose `Closed`, `Open`, and `Discovery` variants.
- `Quote Card` and `Callout Card` should expose `Closed` only.
- `Discovery` remains one shared support surface family across the app and should not add separate quote/callout variants.

First-pass variant structure:

| Component | Variant model |
| --------- | ------------- |
| **Canvas** | no variant at first |
| **Header** | no variant at first |
| **Sidebar** | desktop / drawer only if behavior truly diverges visually |
| **Field** | neutral / selected |
| **Feedback Panel** | neutral / success / warning / error / info |
| **Story Card** | closed / open / discovery |
| **Gallery Card** | closed / open / discovery |
| **Lightbox** | no variant at first |

Rule:

- variants are secondary
- the author selects a component first
- then sees the relevant variant selector only if that component actually needs it

This avoids the current feeling that the editor is organized around implementation variants rather than app parts.

#### Right side: value groups, not token buckets

The right side should no longer default to categories such as `Layout`, `Components`, or other persistence-era buckets as the primary mental model. Instead, the right side should expose **typed value groups** based on the selected attribute.

First-pass value groups:

| Value group | Used for |
| ----------- | -------- |
| **Color Values** | background color, text color, border color, icon color, scrim color, caption color |
| **Padding Values** | padding, inset, internal content padding |
| **Spacing Values** | spacing between items, gaps, vertical rhythm, stack spacing |
| **Sizing Values** | width, height |
| **Radius Values** | border radius |
| **Border Width Values** | border width |
| **Typography Values** | font family, font size, line height, font weight |
| **Shadow Values** | shadow |
| **Semantic Values** | reusable meaning-based choices such as Canvas Surface, Chrome Surface, Contrast On Fill Text, Overlay Contrast Text |

#### Right side: what appears for each attribute

The right side should filter itself based on the selected attribute:

| Selected attribute | Right-side value groups to show first |
| ------------------ | ------------------------------------- |
| background color | Semantic Values, then Color Values |
| text color / title color / meta color / hint color | Semantic Values, then Color Values |
| link color | Semantic Values, then Color Values |
| icon color | Semantic Values, then Color Values |
| scrim color | Semantic Values, then Color Values |
| border color | Semantic Values, then Color Values |
| width | Sizing Values |
| height | Sizing Values |
| padding / inset | Padding Values |
| spacing / gap / margin | Spacing Values |
| border radius | Radius Values |
| border width | Border Width Values |
| shadow | Shadow Values |
| font family / size / line height / weight | Typography Values |

This is the key to making the workbench feel understandable:

- the left side says what part of the app and what property is being edited
- the right side shows the kinds of values that are valid for that property

#### Transitional accommodation

The current token system still has to exist underneath this new structure. So the first refactor does **not** need to delete the old token buckets immediately. Instead:

- keep the underlying token data model
- keep semantic token classes
- keep the recipe layer
- but interpose a new editor presentation layer that translates them into component attributes and typed values

In other words:

- old buckets remain implementation storage
- new groups become author-facing navigation

#### First implementation cut

The first UI refactor should be intentionally narrow:

1. replace the current left-side navigation with the component list above
2. show the first-pass attributes for `Canvas`, `Sidebar`, `Field`, and `Feedback Panel`
3. filter the right side into typed value groups for those attributes
4. finish the remaining card, lightbox, and header surfaces only after the shared/local ownership model is truthful and testable

That order matches the current mapping strength and gives the editor the best chance of becoming understandable quickly.

#### Token classes

| Token class | Meaning | Typical examples | Light/dark behavior |
| ----------- | ------- | ---------------- | ------------------- |
| **Tonal** | Participates in the theme’s overall mood and should shift with mode | `color1-*`, `color2-*`, page/chrome/card surfaces, ordinary text, muted text, most borders | **Mode-aware** |
| **Contrast-on-fill** | Must remain readable on strong fills such as solid buttons or selected chips | solid button text, selected control text, filled badge/chip text | Usually **mode-stable** |
| **Overlay/media contrast** | Must remain readable on dark scrims, media overlays, lightbox chrome, or gradient overlays | lightbox control text, overlay labels, media captions on scrims | Usually **mode-stable** |
| **Accent / palette** | Stable palette values not derived from the light/dark theme families | `color3`–`color14` | Usually **stable** |

#### Assignment rule

- Use **tonal tokens** for ordinary text, surfaces, and borders that should participate in the light/dark family shift.
- Use **contrast-on-fill tokens** for text/icons on strong filled controls.
- Use **overlay/media contrast tokens** for lightbox/media/overlay text and icons.
- Do **not** use `color1-*` or `color2-*` for a job whose real requirement is “always readable on a strong fill” or “always readable on a dark overlay.”

#### Light/dark vs contrast rule

Light/dark switching and contrast safety are **different concerns** and must not be handled as one generic “color role” problem.

- **Mode-aware tonal classes** shift with light/dark and establish the app’s mood.
- **Contrast classes** exist to preserve readability against a known background context (strong fill, media overlay, scrim) and may remain substantially stable across modes.
- **Recipes choose context**. A selected sidebar tab, a solid chip, a lightbox control label, and a story body paragraph should not all point at the same text source merely because they are all “text.”

If a role’s real requirement is contrast safety rather than tonal participation, solve it in the semantic token-class layer, not with local component overrides.

#### Practical implication

`color1-*` and `color2-*` are not fixed colors; they are generated families that change between `:root` and `[data-theme="dark"]`. That makes them appropriate for background and ordinary text systems, but risky for contrast-critical jobs like filled-button text or overlay labels. When a surface needs stable readability rather than tonal participation, the fix belongs in the **token class** and **recipe assignment**, not only in ad hoc component CSS.

#### Adaptive vs fixed values

The editor must distinguish between two different kinds of choices:

- **Adaptive semantic values** change between light and dark mode because their job is contextual, not literal.
- **Fixed raw values** stay exactly the same in both modes because they represent a literal color, gradient, shadow, or measurement.

Mode behavior must also be defined by **value family**, not by one blanket rule:

- **Contrast-sensitive colors and overlays** usually need adaptive semantic handling.
- **Typography roles** are usually semantic by job because hierarchy and contrast must remain readable across modes.
- **Shadows** should normally stay as shared shadow values (`SM`, `MD`, `LG`, `XL`) with global mode adaptation driven by `Strength Light` and `Strength Dark`, not by a second adaptive-vs-fixed shadow picker family.
- **Spacing, radius, sizing, and similar structural values** should normally stay fixed shared values.

Examples:

- `Overlay Wash (Adaptive)` is semantic and may resolve differently in light and dark mode.
- `Covered Fade (Adaptive)` is semantic and is the preferred role for story/question cover fades that must remain readable across modes without becoming a one-mode-only raw gradient.
- `Gradient Fade (Fixed)` is a literal gradient and will remain the same in both modes unless the theme model explicitly stores separate mode variants.
- `Shadow LG` is a shared elevation value. Its light/dark behavior should come from the theme’s global shadow-strength handling, not from a separate semantic shadow toggle.

Rule:

- Use **adaptive semantic values** when the visual job is contextual and must remain readable across modes.
- Use **fixed raw values** when the design intent is a literal reusable treatment that should not automatically shift with mode.
- Never present a fixed raw value as though it were mode-aware.
- Do not treat shadows like overlays: components choose a shared shadow size, while the theme’s light/dark shadow strengths control how strongly that elevation renders in each mode.

This distinction must remain visible in Theme Management labels and help text so the author can predict whether a choice will adapt or stay literal.

### 4.8 Regression and canary verification

Theme refactors are only complete when the same role map is verified across a small set of canary surfaces. Lint alone is not enough; the system needs semantic regression checks that catch hidden coupling and draft/runtime drift.

#### Canary surfaces

Every structural theme change should be checked against these surfaces:

1. `Page / Canvas background`
2. `Reader header / chrome`
3. `Sidebar support labels and controls`
4. `Story covered card`
5. `Question covered card`
6. `Gallery covered card`
7. `Lightbox backdrop`
8. `Floating window / modal surface, frame, and elevation`
9. `Feedback panel states`

#### Verification rules

- **Compiler canaries** should assert that explicit current roles win over legacy aliases during normalization.
- **Compiler canaries** should assert that split shared roles emit distinct CSS variables for covered fades, gallery overlays, and lightbox backdrops.
- **Compiler canaries** should assert that shared support roles, feedback-action roles, and window roles emit the expected runtime variables.
- **Visual canaries** should be reviewed whenever role ownership changes so an unrelated surface does not silently restyle.

#### Safety rule

If a role change modifies one of the canary surfaces outside its declared ownership, the refactor is not done. That is a hidden-coupling failure, not a tuning issue.

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
| `--reader-solid-*` | Compatibility alias for the explicit chrome active-control role. Active sidebar/header navigation states should now bind through `--reader-chrome-active-control-*`, while the legacy `solid` names remain as a bridge for older consumers. |
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
| `GlobalSidebar`, reader filters, reader header/nav | `--reader-chrome-*`, `--reader-chrome-active-control-*`, `--reader-tag-*`, legacy `--reader-solid-*` bridge | Initial migration complete |
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
| Reader semantic aliases | `buildThemeTokensCss()` | **Live runtime / narrowed** - Reader alias families (`--reader-page-*`, `--reader-header-*`, `--reader-sidebar-*`, `--reader-card-*`, `--reader-detail-*`, etc.) are emitted from atomic theme data plus reader recipes. Earlier bridge-only surface aliases have been reduced; only a small semantic helper layer remains where recipe resolution still benefits from it. |
| Theme editor draft application | Theme Management + app theme resolver | **Live scoped draft** - Theme edits produce a scoped in-memory reader/admin draft document that applies to the real app immediately for the current session; the same resolver path feeds draft and saved runtime output. |
| Reader preset application | `src/lib/theme/themePresets.ts` + `ThemeAdminPage.tsx` | **Workbench-wired + persisted** - Journal / Editorial now apply to the working draft as concrete theme-data transforms plus the active preset id, and Save persists the resolved scoped document. |
| Reader recipe editor | `src/lib/theme/readerThemeSystem.ts` + `ThemeAdminPage.tsx` | **Workbench-wired** - Component/variant/element recipes edit the same draft that drives preview CSS, with first-class authoring targets for Header, Sidebar, Window, and Lightbox. |
| Advanced token editor | `ThemeAdminPage.tsx` | **Workbench-wired** - Atomic palette/token edits still act as the exact-value layer beneath recipes and move the draft to `custom`. |
| Legacy reader cards | `src/components/view/ContentCard.module.css` + `CardGrid.module.css` | **Legacy-aligned** - Older reader card/grid files are being remapped to the semantic system for consistency, but `V2ContentCard` / `CardFeedV2` remain the canonical active reader path. |
| Admin preview | `ThemeReaderPreview.tsx` scoped admin panel + Theme Management workbench target | **Workbench-wired / partial** - Admin/workbench now has an explicit authoring target and saved scoped CSS, while preview coverage still focuses on proving the main workbench shell and control families rather than every admin screen individually. |
| Preset persistence | `/api/theme` + Firestore `app_settings/theme` | **Live** - Save persists the scoped version 2 document through Firestore first, then updates `theme-data.json` as a backup/fallback artifact. |

Alignment gaps still to close:

- **Legacy reader holdouts** - Some older reader files still sit outside the current semantic migration, especially legacy card/list styling such as `src/components/view/ContentCard.module.css`; treat those as explicit follow-up inventory, not as silent cleanup attached to active-path work.
- **Admin semantics** - Admin now has live `admin-*` runtime aliases and an explicit workbench authoring target, but it still does not have a separate recipe layer parallel to the reader component recipe system.
- **Preset completeness** - Journal / Editorial are real draft transforms with preset-specific recipe direction now, but they are still not complete finished light/dark design packages.
- **Preview truthfulness maintenance** - Reader preview/role reconciliation is now largely in place; future surface additions must be entered into the preview ledger and explicitly classified as role-backed or component-owned instead of drifting ad hoc.
- **Reader feedback variants** - Reader **general feedback**, **error feedback**, and the shared **feedback action** role now have live consumers, but reader **success / warning / info** panel variants remain future-facing contract values until the reader UI exposes those message surfaces.

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
| Header | Reader chrome | Top navigation/header shell sample | Canonical for header surface and header-owned chrome framing |
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

### 5.9 Draft application rule

Theme Management should operate on a **draft** scoped theme document before persistence.

- Unsaved edits apply to the real app in-session.
- **Save** persists the current draft to Firestore and updates the JSON backup best-effort.
- **Discard / reset** restores the last saved theme.
- Draft state must be visible to the author and easy to abandon if readability collapses.
- The authoring surface may still provide focused editing panels, but the dedicated preview layer is no longer the source of truth for whether a theme “works.”

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
- **Typography:** Body/UI stay **neutral sans**, but Journal now leans more deliberately into **serif** for reader-facing story/gallery/detail hierarchy, with lighter title weight, roomier line height, and softer subtitle/support emphasis.
- **Color:** Warmer paper-like neutrals for `--color1-*` / `theme-color/1`, warmer text values, and a less cold principal/accent family than the earlier blue-led Journal starting point.
- **Shape:** Softer `--border-radius-lg` / card radius; moderate shadow, slightly roomier card/input padding, and gentler control density for a friendlier mobile feel.
- **Current implementation direction (2026-04-25):** Journal is now being tuned toward a **warm literary premium** read: lighter type pressure, warmer surfaces, softer support chrome, stronger editorial hierarchy, and roomier rhythm before any new presentational roles such as a kicker are introduced.

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
| **Presets**      | Pick **Journal** / **Editorial** (and future presets) on Theme Management; the live draft applies to the real app and Save persists `activePresetId` with full theme data (admin-chosen global design; no per-user theme yet). |
| **Overrides**    | Optional advanced panel: palette, fonts, spacing scale — same model as today, grouped by *role* where possible.                                                                                             |
| **Light / dark** | Keep global `data-theme` toggle; preset supplies **pairs** or derivation rules.                                                                                                                             |
| **Out of scope** | One-off layout math (e.g. a single modal width hack), animation keyframes that are not part of the design language — unless promoted to a token deliberately.                                               |


**Live draft application:** Theme editing should apply directly to the real app via an unsaved draft theme so “what I tune” matches the actual reader/admin experience rather than a parallel preview approximation.

**Draft/runtime convergence:** Draft CSS and saved runtime CSS must compile from the same **resolved scoped theme model** (reader/admin settings, active preset id, dark-mode shift, semantic token-class assignments, and recipes). Authoring must not use a looser ad hoc payload shape than runtime.

**Current save posture:** Theme Management now persists the scoped version 2 reader/admin document through the normal Save action. The remaining theme work is therefore about **truthful surface coverage and role mapping**, not about whether save exists.

**Workspace posture:** Theme Management should continue to behave as a focused editing workspace rather than a document page. The shell should behave like a **floating workbench window** over the app - large enough to reveal the primary columns on open, **draggable**, **resizable**, and non-blocking to the reader surface being evaluated.

The current editing split should now be treated as:
- **left = editor**
- **right = values**

The left side owns component selection, variant selection, attribute selection, direct editing controls, and the inline readout for the selected value. The right side owns the value library. The workspace is still transitional today, but the target author-facing model is `Component -> Attribute -> Value`, not "token buckets on one side and mixed recipe names on the other."

**Save workflow posture:** The primary save mental model should remain document-like rather than implementation-heavy: one active draft, **Save** only when dirty, **Discard/reset** back to the last saved theme, and **Save As** for variant creation. Avoid top-level UI language such as “Started From,” “Current Draft,” or “Save Target” when those concepts make the editor harder to understand than the actual author workflow.

**Initial redesign scope:** The first editor refactor pass should target the initial component set in §4.5: `Canvas`, `Header`, `Sidebar`, `Field`, `Feedback Panel`, `Story Card`, `Gallery Card`, and `Lightbox`. Do not try to solve every possible reader/admin surface at once; stabilize this set first, then expand.

**First editor structure:** The first concrete workbench structure is defined in §4.7. The current implementation has now moved closer to the intended split: component-first editing on the left, values on the right. The next refinement is not to re-expand the old generic values lab, but to make the right-side values panel more truthful and complete about the underlying named values and real resolved values for the selected attribute.

**Persistence target:** Theme data lives in **Firestore** `app_settings/theme` (written on Theme admin **Save** and via `npm run seed:theme-firestore`). The app **injects** `buildThemeTokensCss()` output in **RootLayout** (`<style id="theme-tokens">`) so variables apply in serverless deploys without committing regenerated CSS. `**theme-data.json`** stays the git backup and fallback when Firestore is empty or unreadable, and it may contain either the legacy flat reader shape or the scoped persisted document shape. Theme Management should be the product interface for editing this document; raw Firestore editing is not the intended user workflow.

**Save-ready contract:** The persisted document is the scoped **version 2** shape:

- `reader.data` = full materialized atomic `StructuredThemeData`
- `reader.activePresetId` = `journal` | `editorial` | `custom`
- `reader.recipes` = persisted reader recipe layer used for runtime CSS generation
- `admin.data` = full materialized atomic `StructuredThemeData`
- `admin.activePresetId` = `admin` | `custom`

Preset ids are retained as **editing metadata / UX context**, but the saved document still stores the fully materialized atomic theme data needed to render immediately at runtime. `custom` means the saved draft no longer matches any shipped preset exactly; it does **not** mean preset context was lost or omitted.

**Save-path rule:** The save endpoint should accept only this scoped persisted document shape. Legacy flat theme payloads may remain readable through normalization for fallback / migration, but they are **not** the save contract going forward. Firestore is the live durability boundary; any `theme-data.json` write is a secondary backup update and must not be required for the runtime save to succeed.

**Operator note:** Because Save persists fully materialized scoped theme data, changing a preset definition in code does **not** automatically rewrite the currently saved live theme. To adopt a refreshed Journal or Editorial definition, the preset must be re-applied in Theme Management and then saved. If the current live reader theme is `custom`, preserve it as a backup/snapshot before testing preset changes.

**Reader/admin separation rule:** Reader and admin may share the same atomic token pool, but they should diverge where their UI jobs diverge. Admin should not be treated as a thin reader variant; it needs its own semantic families and recipes for dense controls, grid metadata, notices, focus states, and form-heavy authoring surfaces.

---

## 9. Reconciliation workflow (design-led, not code-led)

1. **Inventory components first** - Build a table from actual reader/admin components: component, visible elements, meaningful attributes, current token/CSS usage, required semantic token family, and migration status.
2. **Freeze the author-facing component model** - Decide the canonical component list (Canvas, Header, Sidebar, Story Card, Gallery Card, Lightbox, Field, Feedback, etc.) and the allowed attributes for each. The initial frozen set is defined in §4.5. Iterate here when product intent changes.
3. **Freeze the semantic contract** - Promote the inventory into semantic token-class families (`reader-page`, `reader-card`, `reader-detail`, `reader-subtitle`, `reader-excerpt`, `reader-discovery`, `reader-media`, `reader-chrome`, `reader-solid`, `admin-*`, etc.). Iterate here when product intent changes.
   Recurring support surfaces (selectors, toolbars, sidebar labels/hints, utility controls) should use the dedicated `reader-support-*` family rather than being assigned to the “closest” content/discovery role.
4. **Define typed value groups** - Decide the value families the editor exposes: colors, padding, spacing, sizing, border widths, radii, typography families, typography sizes, shadows, gradients, and reusable semantic classes. Attribute selection should constrain which value groups appear, and implementation shortcuts must not collapse distinct author-facing metric families into one generic length pool.
5. **Define the theme schema** - Decide how atomic tokens, semantic token classes, and recipe assignments live in the Firestore theme document and preset bundles; keep `theme-data.json` as fallback/backup, not the product editing surface.
6. **Map generator output** - Map `themeService.ts` / `theme-data.json` fields into semantic token classes first, then recipe outputs; add aliases only where they clarify ownership and reduce component confusion.
7. **Unify authoring/runtime compilation** - Apply the same resolver path to draft editing and saved runtime output; remove preview-only compile assumptions.
8. **Migrate surfaces in order** - Move reader surfaces (`src/components/view/`, shared rich text, discovery, media, chrome) to role-backed variables; grep for raw `hex` / `rgba` against this checklist.
9. **Admin separately** - Admin reuses shared tokens where useful, but dense tooling and status/control states need `admin-*` semantic families and recipes separate from reader personality.
10. **Complete presets** - Only after the schema and surface coverage are coherent should Journal / Editorial be treated as complete data packages with live draft application + persistence.

### 9.1 Canary verification rule

Theme work is not complete when lint passes. Structural theme changes must also pass a small canary set that verifies core role ownership and compile-path truthfulness.

The minimum canary surfaces are:

- page / canvas background
- reader header / chrome
- sidebar and support labels / controls
- story covered card
- question covered card
- gallery covered card
- lightbox backdrop
- floating window / modal surface, frame, and elevation
- feedback panel states

For structural theme refactors, these canaries should be checked at two levels:

- **compiler-level checks** - verify that normalization and CSS emission resolve the intended role names and do not let legacy aliases silently override newer explicit roles
- **surface-level checks** - verify that the main consumers still render the intended visual jobs without unrelated regressions

This is now a contract rule: if a role refactor changes one canary by accident while editing another, the refactor is incomplete.

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

### 10.6 Current implementation status (2026-04-27)

- **State styling is live** - The app already uses the shared `--state-*` families broadly for success / warning / error / info styling, so colored status treatments are not ad hoc.
- **Reader feedback contract is partly consumed** - Reader **general feedback** and **error feedback** now have live consumers, but reader **success / warning / info** feedback panel variants are still future-facing until the reader UI exposes those surfaces.
- **Messaging behavior is still mixed** - Themed state colors and some themed feedback panels are live, but broader behavior such as consistent notice components, confirmation dialogs, placement rules, and dismissal behavior is still only partially unified.
- **Theme implication** - The feedback/state color system is now trustworthy enough to style real message surfaces, but the product still needs a fuller message-component rollout before every status path uses one consistent app-level messaging contract.

### 10.7 Current authoring-system status (2026-04-28)

- **Workbench alignment is now largely structural** - Theme Management, Studio, shared admin dialogs, import flows, and admin drag states now mostly consume the same `Window`, `chrome`, `support`, and `feedback` role families that the editor exposes, instead of styling themselves through raw layout and button primitives.
- **Most remaining reader meta usage is intentional** - Reader-facing content surfaces may still use reader meta or caption roles where that is the actual visual job. Those are no longer the same hidden admin/workbench coupling problem that drove this overhaul.
- **Compatibility fallbacks are now minimal and explicit** - The remaining modal-shell fallback path is the raw layout/token safety net under the `admin` layer, not a hidden bridge back through reader-shaped aliases. Treat it as delivery safety, not the authoring contract.
- **Shared foundation plus explicit admin/runtime aliases are now live** - The server runtime now emits an `admin` alias family for `Window`, `chrome`, `support`, and `feedback` roles. Admin/workbench shells can style against those explicit names instead of depending on reader-shaped aliases inside the admin scope.
- **Saved admin scope is now live, not draft-only** - The server-rendered theme injection now includes the saved admin-scoped CSS under the admin shell scope, so admin/workbench surfaces can diverge from the reader using the stored admin theme data even when Theme Management is closed.
- **Theme Management now has one authoring workspace** - The editor no longer asks the author to switch between Reader and Workbench tracks. The main navigation is now a single Theme workspace.
- **Foundation and Content are the top-level editor sections** - Shared surfaces such as Canvas, Header, Sidebar, Controls, Window, and Feedback live in **Foundation**. Reader-facing cards and Lightbox live in **Content**.
- **The values panel is now a plain library again** - The right side remains available for **Colors**, **Type**, and **Structure**, but it no longer carries the old “Relevant Values” layer.
- **Selected-value information now lives at the decision point** - Current value, light result, dark result, and shared use are shown on the left beside the active field instead of being explained in a separate panel.
- **Selected-button text now has one source of truth** - Sidebar active tabs and selected support controls both resolve through `contrast-on-fill text`; the old split where sidebar active tabs could still inherit muted text is no longer part of the intended contract.
- **Covered fades now have a safe adaptive default** - Story/question cover fades now default to `Covered Fade (Adaptive)` instead of a fixed raw gradient, while fixed gradient values remain available only for deliberate non-adaptive use.
- **Compile-path parity is now guarded directly** - The compiler canary suite now checks adaptive-vs-fixed overlay behavior, shipped preset compilation, and scoped reader/admin draft generation so the editor/runtime contract is less likely to drift silently.
- **The structural overhaul phase is complete** - Hidden shared-role cleanup, the reader/admin split, adaptive-vs-fixed overlay distinction, shipped fallback cleanup, and draft/runtime parity are now in place together.
- **The current reader-feed baseline is simpler than the old orientation split** - Closed `Story`, `Gallery`, and `Question` cards currently use a shared, landscape-leaning stacked composition with media on top and text below rather than the earlier portrait-overlay default. Treat this as the active reader baseline while the broader presentation matrix is still being finished and validated.
- **What remains is theme validation, not theme architecture repair** - The next steps are to validate multiple finished themes visually in both modes, tune any remaining role families that prove weak in live use, and remove compatibility fallbacks only after those validation passes are stable.

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
| 2026-04-25 | Updated Sections 5-8 to reflect live save, preview/role reconciliation, support-state classification, gallery/media preview consolidation, and the rule that future surfaces must be added to the preview ledger or explicitly marked component-owned. |
| 2026-04-25 | Refined the Journal preset contract to match the current warm-literary premium tuning work: warmer surfaces, lighter hierarchy, softer support chrome, roomier rhythm, and preset-specific recipe direction. |
| 2026-04-26 | Updated current status and §8 to reflect the consolidated Theme Management workspace, the denser Tokens pane, collapsed-by-default token posture, and the current editing workflow. |
| 2026-04-26 | Added §4.3 to clarify the mental model: tokens define value classes (tonal, contrast-on-fill, overlay/media contrast, accent), while recipes define UI jobs. This is now the contract for resolving light/dark and contrast assignment questions. |
| 2026-04-26 | Reframed Theme Management around live draft application instead of a dedicated preview layer, formalized the three-tier model (atomic tokens -> semantic token classes -> recipes), and updated reconciliation steps to target one compile path for draft and saved runtime output. |
| 2026-04-26 | Added §4.4 and updated §8-§9 to define the next author-facing refactor direction: `Component -> Attribute -> Value`, typed value groups, and the rule that internal token/storage bucket names are not the editing model. |
| 2026-04-26 | Added §4.5 with the initial canonical component inventory and first-pass attribute list for the upcoming Theme Management editor refactor. |
| 2026-04-27 | Updated current status, wiring inventory, and status-messaging notes to reflect the runtime reconciliation pass: editor-driven foundations/chrome/controls/cards/overlays/discovery/media surfaces now largely feed the live generator directly, earlier bridge-only outputs have been reduced, and the remaining explicit reader gap is success/warning/info feedback panels without live reader consumers yet. |
| 2026-04-28 | Split misleading shared overlay roles into `Covered Fade`, `Gallery Overlay`, and `Lightbox Backdrop`; promoted shared support UI and floating window roles in the reader theme model; and formalized the rule that shared roles must declare one visual job and disclose their shared impact in Theme Management. |
| 2026-04-28 | Promoted `Lightbox` to a first-class authoring component, split `Header` and `Sidebar` into direct authoring targets, wired separate header/sidebar runtime surfaces, documented adaptive-vs-fixed value behavior, and added regression/canary verification rules so legacy aliases, split shared roles, feedback actions, and core themed surfaces can be checked systematically during refactors. |
| 2026-04-28 | Split `Window` into explicit `surface`, `frame`, and `elevation` roles across the authoring model and runtime compiler so floating dialogs no longer hide those jobs inside one bundled window recipe. |
| 2026-04-29 | Simplified Theme Management back to one workspace with Foundation and Content sections, removed the Reader / Workbench split from the editor surface, removed the old Relevant Values layer, and moved selected-value information to the left beside the active field. |
| 2026-04-30 | Fixed the selected-button text contract so sidebar active tabs and selected support controls share the same contrast-on-fill text role, and documented `theme-color/2/dark` as the current concrete source for that filled-control contrast text path. |
| 2026-04-30 | Finished the first admin/theme wiring pass: Theme Management now renders inside the true admin theme scope, shared admin chips/buttons/grid chrome use the theme-driven variables in the primary paths, and the Values pane can collapse to keep more of the live app visible while styling. |
