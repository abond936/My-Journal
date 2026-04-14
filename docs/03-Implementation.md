# IMPLEMENTATION



**See also:** `01-Vision-Architecture.md` · `02-Application.md`



Legend:

✅`Implemented`

⭕`Planned (1)`

❓`Open`

📐`Decision`

📘`Resource`



---



*App Status*

- **Architecture** - Core architecture (cards, media, tags) in place.

- **v1 Refinements** - Lock and solidify v1.

- **Content** - Prepare content for import.



---



## Execution Plan



*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. This document lists only `⭕1 Planned` items, grouped by phase. Wording of each item must match its source in `02-Application.md` or `01-Vision-Architecture.md` verbatim (see Document Governance in `01-Vision-Architecture.md`).*



**Open questions to resolve before starting:**

*(None blocking.)*



### Phase 1 — Pre-Import

*Complete*



### Phase 2 — Admin Productivity

⭕1 **Planned**

*Card Management (`02-Application.md`)*

- **Writing Assist** - In card edit, provide a simple AI assist for selected text in title/subtitle/excerpt/content with explicit actions (`Make concise`, `Make engaging`, `Elaborate`, `Fix grammar`) and suggestion-only outcomes (`Replace`, `Insert below`, `Dismiss`)—never auto-apply.

- **Context Assist** - Keep historical/background context as a separate, explicit AI request from writing rewrites; return context as an independent suggestion block that can be accepted or dismissed without affecting the base rewrite.

- **Admin Ordering** - Remove random ordering from admin lists and expand deterministic order controls (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with predictable tie-break behavior so sparse `When` coverage does not collapse into one large undated block.



### Phase 3 — Reader experience

⭕1 **Planned**



*Theme Management (`02-Application.md`)*

- **CSS Tokenization** - Move **design-affecting** values—colors, typography scale, spacing rhythm, radii, shadows, and key surfaces—into `theme.css` variables (and Theme Management where appropriate) so literals in modules do not block **plug-and-play designs**. Not every numeric value in the app is a “theme” concern (e.g. one-off layout math); scope is what should change when switching designs. Grow coverage incrementally toward named presets.



*Content Page (`02-Application.md`)*

- **Layout `@media` hardening** - Replace `var(--breakpoint-*)` inside `@media` where it affects layout (`V2ContentCard`, `Navigation`, `ViewLayout`, `ContentCard`, `ThemeAdmin`, `TagTree`, etc.) so breakpoints match `docs/04-Theme-Design-Contract.md` §9.2 (literal `px`).

*Left Navigation (`02-Application.md`)*

- **Reader Order Model** - Split ordering by mode: **Freeform** keeps Random plus deterministic order options (`When`, `Created`, `Title`, `Who`, `What`, `Where`) with `Asc/Desc`; **Curated** ignores sort controls and always follows curated tree/TOC order.

- **Sort Semantics** - Define deterministic ordering rules for all reader order modes: explicit tie-break chain, consistent undated policy for `When` (undated at end), and normalized dimension ordering behavior for `Who/What/Where`.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Content Page (`02-Application.md`)*

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).



*Tag Management (`02-Application.md`)*

- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."


*Backend (`01-Vision-Architecture.md`)*

- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations.

- **Quality** - QA app.



❓ **Open**

- *(None currently.)*

