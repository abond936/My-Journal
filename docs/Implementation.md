# IMPLEMENTATION

**See also:** `Vision-Architecture.md` · `Application.md`

Legend:
✅`Implemented`
⭕`Planned (1/2/3)`
🔵`Parked`
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

*Sequenced by dependency: what gates what on the path from personal use → mass import → family hosting. **Completed** Phase 1 and Phase 2 items are recorded in the feature sections above; they are not listed again below.*

**Open questions to resolve before starting:**
*(None blocking curated sidebar listing; legacy data needs index deploy + backfill once per environment.)*

### Phase 1 — Pre-Import
*Complete*

### Phase 2 — Admin Productivity
*Complete*

### Phase 3 — Reader experience
*Complete*

*Content & reader*
- ⭕2 **View Mosaic** — View Page. Gallery mosaic for readers.
- ⭕2 **Quote Content** — Content Page. Source material into quotes.
- ❓ **Related Count** — View Page. Size/count of Related / Explore More.

*Tags & navigation*
- ⭕2 **Sort / Group** — Left Nav. Coherent multi-filter ordering.
- ⭕2 **Coherence** — Content. Grouping/sort with Sort/Group.

*Theme & media (hosting enablers)*
- ⭕2 **CSS Tokenization** — Theme. Full token coverage for reader polish.
- ⭕2 **Browser Upload** — Media. Hosted deployment without server folder read.

### Phase 4 — Scale & polish
*After hosting; does not block v1. Grouped by function.*

*Tags & navigation*
- ⭕2 **Tag Tree Counts** — Left Nav. Correct counts + `(x/y)` media.
- ⭕2 **Collection Metadata** — Left Nav. Child counts.
- ⭕2 **Chron Tree** — Left Nav. Year / Month / What browsing.

*Content & reader*
- ⭕2 **Card Cues** — Content. Type badge on compact cards.

*Administration & authoring*
- ⭕2 **Card Edit Mosaic** — Card Mgmt. Mosaic in edit.
- ⭕2 **Edit on the Fly** — Application. Admin entry points from content.
- ⭕2 **Split Validation** — Application. Validate split vs author friction.
- ⭕2 **TOC & Ordering** — Collections. DnD TOC; reparent + order.

*Technical & platform*
- ⭕2 **Script Cleanup** — Scripts. Prune obsolete scripts.
- ⭕2 **Unused Dependencies** — Frontend. Package audit per body list.
- ⭕2 **Operational** — Backup. Verify end-to-end.
- ⭕2 **Directory** — Technical. Repo cleanup.
- ⭕ **Code / ESLint / QA** — Technical. Comments, lint, QA pass.

*Questions & media hygiene*
- ⭕2 **Assigned** — Questions. Assigned/Unassigned when linked to cards.
- ⭕2 **Question Content** — Content Page. Word doc / prompts into app.
- ⭕2 **Post-Import Maintenance** — Media. GIMP/Topaz + replace-in-place.
- ⭕1 **No temporary/active.** — Media. Remove status; assignment-based filtering only.

*Users*
- ⭕1 **Rename Collection** — Users. `journal_users` → `users`.

### Phase 5 — Future
*⭕3 and 🔵. Revisit after real family use. Grouped by function.*

*Tags & navigation*
- ⭕3 **Mobile Filter UX** — Left Nav. Mobile filter/drawer polish.
- ⭕3 **Single TagProvider** — Tags. One tree fetch for sidebar + admin.
- ⭕3 **Tag Tree Counts (model/UI)** — Tags. `mediaCount` + trustworthy recalc.
- ⭕3 **Tag Recomp** — Tags. Queued hierarchical recompute.
- ⭕3 **Unified tag edges (conceptual)** — Tags. `(subjectType, subjectId, tagId)` model.

*Content & reader*
- ⭕3 **Bundle / Images** — Content Page. Code splitting; `next/image` tuning.
- ⭕3 **Feed Types** — Content Page. Alternate feed layouts.
- ⭕3 **Feed hydration tiers** — View Page. Cover-only first paint option.

*Administration*
- ⭕3 **Admin SWR Deduping** — Administration. Bounded deduping for admin fetches.

*Media & imports*
- ⭕3 **Rename photo.ts** — Media. `photo.ts` → `media.ts` sweep.
- ⭕3 **Import pipeline job** — Media. Async worker for large imports.
- ⭕3 **Import metadata precedence** — Media. XMP/IPTC first; sidecars optional.

*Parked (🔵)*
- 🔵 **Gallery Styles** — Gallery. Masonry, mosaic, etc.
- 🔵 **Answer Workflow** — Questions. Analytics, templates, beyond cards.
- 🔵 **Auto-Clustering** — Questions. Short-question grouping.
- 🔵 **Google Photos Adapter** — Media.
- 🔵 **OneDrive Adapter** — Media.
- 🔵 **Apple iCloud** — Media. Lowest priority.
- 🔵 **Face Recognition** — Tags. Cloud, client, or native paths.
- 🔵 **Multi-Author** — Strategic. Parked.
- 🔵 **Relationship Tagging** — Tags. Parked.
- 🔵 **Video** — Media. Parked.
- 🔵 **Performance** — Backend. Post-v1 engineering review items.
- 🔵 **Tenant ID** — Backend. Multi-tenant SaaS scope only if needed.
- 🔵 **Storage Abstraction** — Backend. Unified storage module.
- 🔵 **Maintenance Management** — Administration. In-app maintenance UI.
- 🔵 **Social Features** — View Page. Like, comment, share — parked.
- 🔵 **Append to Gallery** — Media. Bulk append to an existing card's gallery (parked); create-from-selection + card edit + replace cover today.
- 🔵 **Accessibility** — Application. 16px/18px, WCAG AA, tap targets, caption→alt, keyboard, reduced motion, Lighthouse.
