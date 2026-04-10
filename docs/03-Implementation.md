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

*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. This document tracks only `⭕1 Planned` execution items from `02-Application.md`.*

**Open questions to resolve before starting:**
*(None blocking curated sidebar listing; legacy data needs index deploy + backfill once per environment.)*

### Phase 1 — Pre-Import
*Complete*

### Phase 2 — Admin Productivity
*Complete*

### Phase 3 — Reader experience
⭕1 **Planned**

*Tags & navigation*
- **Sort / Group** — Left Nav. Multi-filter ordering (pairs with Content **Display Types**).

*Content & reader*
- **Display Types** — Verify per-type + `displayMode` behaviors in reader (`V2ContentCard` / `CardDetailPage`).
- **Suggestions** — Freeform discover blocks (children + filtered + random).
- **Related Count** — View page: size/count of Related / Explore More.

*Theme*
- **CSS Tokenization** — Token coverage via `theme.css`.

### Phase 4 — Scale & polish
⭕1 **Planned**

*Content (authoring / copy)*
- **Card Content** — Title, Subtitle, Excerpt, Content assessment.
- **Questions / Quotes** — Source material into app.
- **Quote Card** — Attribution modeling.

*Media hygiene*
- **Temporary/Active** — Remove legacy status; assignment-based filtering only (`02-Application.md` Media).
- **Unassigned query** — `referencedByCardIds` + `GET /api/media?assignment=…` (`mediaAssignmentSeek.ts`).

*Technical & platform*
- **Code / ESLint / QA** — Comments, lint, QA pass (`01-Vision-Architecture.md` Backend).

❓ **Open**
- *(None currently.)*
