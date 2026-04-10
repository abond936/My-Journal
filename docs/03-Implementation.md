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

*Complete*



### Phase 3 — Reader experience

⭕1 **Planned**



*Left Navigation (`02-Application.md`)*

- **Sort / Group** - Add user-selectable sort/group by event, Who, What, When, Where. Coherence.



*Content (`02-Application.md`)*

- **Suggestions** - Free form only--Children + 3 filtered + 3 random. 



*View Page (`02-Application.md`)*

- **Related Count** - Reduce size/number of Related and Explore More cards?



*Theme Management (`02-Application.md`)*

- **CSS Tokenization** - Ensure all CSS in app is tokenized via `theme.css` variables.



### Phase 4 — Scale & polish

⭕1 **Planned**



*Content Page (`02-Application.md`)*

- **Card Content** - Assess Title, Subtitle, Excerpt, Content.

- **Questions / Quotes** - Source material (Word, books, Notion).

- **Quote Card** - Attribution modeling (e.g. Content vs subtitle/excerpt).



*Media Management (`02-Application.md`)*

- **Temporary/Active.** Remove this status. No longer required. All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.

- **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).


*Tag Management (`02-Application.md`)*

- **Tag Tree Counts (model/UI)** - Add `mediaCount` on tag docs + UI `(x/y)` (cards vs media); align maintenance with recalc/jobs so counts stay trustworthy alongside incremental `cardCount` fixes.
- **Tag Recomp** - Schedule or queue recomputation for hierarchical counts (and media side) vs relying on `FieldValue.increment` alone when semantics are "unique per subtree."


*Backend (`01-Vision-Architecture.md`)*

- **Code** - Comment code.

- **Directory** - Cleanup directory.

- **ESLint** - Address ESLint violations.

- **Quality** - QA app.



❓ **Open**

- *(None currently.)*

