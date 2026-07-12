# PLANNING DRAFT — Integrated Commercial Reassessment

**Status:** **NOT CANON.** Placeholder capture from chat (2026-07-12). Do not treat as product truth, sequencing, or approval to implement. When durable, reconcile into `docs/00-Project-Framework.md`, `docs/01-Vision-Architecture.md`, `docs/02-Application.md`, and `docs/03-Implementation.md` per normal governance.

**Purpose:** Single integrated plan from current state through holistic reassessment — preserves author input, assessment questions, additive analysis, and proposed planning structure if this chat is lost.

**Sources:** Author messages (2026-07-11/12); agent holistic reassessment passes; verified closes from session (DnD, Compose scroll, child rail, children reorder repaint, question flicker); canon skim (`00`, `01`, `02`, `03`, `05`).

---

## 1. Executive summary

The app has crossed from **“make it work”** to **“make it coherent, fast, and commercially legible.”** Family-demo engineering is largely credible. The old `03` tactical backlog is **stale, fragmented, and mis-prioritized** for the next era.

**Core finding:** The product built the **storytelling ends** (Studio, reader, integrity) well but under-invested in the **commercial bottleneck** — organizing and tagging media at scale between import and card authoring. Face recognition, async processing, person/event intelligence, and archive-first UX are **structurally missing**, not polish items.

**This document is assessment and planning only.** No implementation implied.

---

## 2. Where we are right now (author-verified, 2026-07-11)

| Area | Status |
|------|--------|
| Studio runtime / browser verification | Closed |
| Gallery reorder DnD (Studio + reader Compose modal) | Closed |
| Reader-modal children reorder (+ no full-card repaint on drop) | Closed |
| DnD hardening (no further issues in normal use) | Closed — reopen on new defect |
| Compose pane scroll containment | Closed |
| Child rail → feed-grid tiles | Closed |
| Questions create/open → Compose flicker | Closed — reopen if resurfaces |
| Active demo-first engineering blockers | None reported |
| Review program steps 1–12 | Closed 2026-07-10 |
| Firestore + Storage restore drill | Proven 2026-07-10 |

**Author stance (2026-07-12):** Not ready to implement. Still assessing and planning. No other demo issues at the moment. Wants macro replan, not tick-box Phase 3/4 items.

---

## 3. Why a replan (author-raised macro themes)

Author identified systemic issues beyond tactical backlog:

1. **Theme** — Intended colors/fonts customization; devolved into token system not universally useful; code/CSS works around theme.
2. **Code bloat / dead code** — Removed features (e.g. tables), 3500-line modules, legacy paths, lint hundreds unaddressed for weeks.
3. **Presentation / tiles** — No consistent contracts; each surface built with different architectural method; performance drag from iteration patches.
4. **Tag system** — Evolved with legacy cruft; missing overarching **media ↔ card tagging philosophy**, assignment, inheritance, display.
5. **DnD** — Working now but likely convoluted across reconstructed surfaces; efficiency unknown.
6. **Tables** — Product surface removed; unclear how much code/docs remain.
7. **Lint / API envelope / TS strict / backup scripts** — Engineering hygiene not productized.
8. **Backup** — Should be menu/Settings, not PowerShell.
9. **Filtering/sorting consistency** — Panes evolved different semantics.
10. **Video** — Not supported; needed.
11. **AI** — Tagging help, content creation, in-app cover generation; integration points undefined.
12. **Replace/repair images** — Needs planned operator flow.
13. **Facial recognition** — Mature technology; biggest tagging win; **not in active plan** (author addition).
14. **New user taxonomy** — Starter set vs build-your-own vs templates — open product question.
15. **Print/books** — Not priority now but lucrative; architecture implications?
16. **Holistic product rethink** — Is anything fundamentally wrong with the product shape?

**Agent additive themes (from codebase/canon read):**

- Product optimized for **digiKam → folder → card → mass import**; commercial default is **unsorted phone photos → help me organize → then stories**.
- **`05` Guided Archive** is the right thesis for archive intelligence but **inactive seed**, not active spine.
- **`Media` schema** has no `processingState`, video, face embeddings, or provisional suggestion store — blocks faces/video/AI at scale.
- **Face recognition** buried in `02` ⭕2; **zero implementation** in `src` (no personId, faceId, embeddings).
- **Who tag ≠ person registry** — face merge/split needs explicit decision.
- **Canon drift** — e.g. `02` still mentions media table headers, full-page card admin grid/table paths after retirement.
- **Theme Management breadth** = engineering asset, weak commercial “pick a look” product.

---

## 4. Milestones (unchanged framing)

| Milestone | Meaning |
|-----------|---------|
| **Family demo** | Guided + freeform reader; dependable author prep; no trust failures — **largely met** |
| **Hosted alpha** | Repeated family use; import/authoring dependable; duplicates manageable — **partial** |
| **Commercial v1** | Security, testing, backup/restore in product, no brittle core paths — **not met** |

**Demo-first stance (from `03`):** Reader stability, access/privacy, author prep, import coherence — before aesthetic expansion. **Author now adds:** commercial **organize-at-scale** path is the missing middle of the funnel.

---

## 5. Commercial user journey (macro features)

```text
ONBOARD → IMPORT → ORGANIZE → AUTHOR → PUBLISH → OPERATE → EXTEND
```

| Stage | Commercial expectation | Today (honest) |
|-------|------------------------|----------------|
| **Onboard** | Safe, private, oriented | Auth works; no Settings hub; empty taxonomy |
| **Import** | Batch + steady drip; phone/cloud | Strong local folder; weak phone/cloud; sync import caps |
| **Organize** | AI + faces + events; human corrects | Manual tags + EXIF keywords; `05` seed only |
| **Author** | Cards inherit truth; Studio refine | Studio strong; inheritance philosophy incomplete |
| **Publish** | Beautiful mobile family read | Reader V2 strong; some typography/surface parity gaps |
| **Operate** | Backup, restore, repair in app | Scripts proven; **no admin UI** |
| **Extend** | Video, AI, print | Principles in `01`; not productized |

**Jobs-to-be-done (one line):**

> Turn a lifetime of photos into a private, beautiful family story without becoming a full-time librarian.

**Differentiation vs Apple/Google Photos:** Not “better face search.” **Faces → curated family stories** with editorial control, dimensional narrative (Who/What/When/Where), private hosting, and reader experience.

---

## 6. Fundamental product tensions (rethink options — not decisions)

These are **architecture-of-the-product** choices to resolve in planning:

### 6.1 Two-mode product?

| Mode | Focus | Today |
|------|-------|-------|
| **Archive mode** (media-first) | Bank, faces, events, duplicates, review queues | Underbuilt |
| **Story mode** (card-first) | Studio, collections, Compose, reader | Strong |

**Option:** Make mode explicit in IA — default landing for new commercial user may need to be **Media / needs review**, not Cards.

### 6.2 Card-centric UI vs photo-centric reality

Media count ≫ card count at scale. Highest commercial leverage may be **intelligent media bank**, not more Compose polish.

### 6.3 Tag model doing too many jobs

Tags currently represent: people, events, places, time, digiKam import paths, operational sentinels (`zNA`), future aggregation states.

**Needs decision:** Person = first-class entity linked to Who tags **vs** person = Who tag only (weaker for face merge/split).

Canon hint: unified tag edges `(subjectType, subjectId, tagId)` — ⭕2, marked uncertain.

### 6.4 Presentation contract missing

Four tile implementations (`V2ContentCard`, `AdminClosedCardTileShell`, utility previews, rails) — symptom of no single **Card Presentation Spec** owner.

**Planning rule:** Freeze new visual work until spec exists (geometry, chips, typography per density: main / rail / admin / preview).

### 6.5 Theme: product vs engineering

**Commercial:** 3–5 presets + bounded overrides (colors, type families).  
**Today:** Theme Management workbench + token pipeline; surfaces still bypass tokens.

**Option:** Presets-only product surface; keep token pipeline internal.

### 6.6 Async processing platform gap

`01` promises readiness states, video, identity work. **`Media` has no processingState, no job queue, no video fields.** Faces, video, AI tagging, large import need background jobs — not yet a platform.

### 6.7 Operator features script-shaped

Backup, restore, maintenance, Typesense status, integrity reconcile — proven in CLI, absent as **Settings + Operations** surface.

### 6.8 Canon/backlog drift as planning risk

`03` mixed shipped, deferred, and zombie items. Replan must include **archaeology**: retire dead bullets before sequencing new work.

---

## 7. Facial recognition — elevated program (not ⭕2 footnote)

**Canon today:** `02` ⭕2 lists cloud/client options; `05` treats faces as hints; `02` Reader mentions face-led Who chips — **no code** (no personId, faceId, embeddings, face regions on Media).

**Cannot bolt on to tag picker alone.** Needs layers:

| Layer | Today | Required |
|-------|-------|----------|
| Person identity | Who **tag** only | Person entity (merge/split, aliases) |
| Detection storage | None | Boxes/embeddings per media (provisional) |
| Review queue | None | Suggest → confirm → propagate |
| Browse | Tag tree | People gallery (“all photos of X”) |
| Downstream | Manual | Proposals → media tags → card aggregation |

**Privacy/product:** Faces are **hints**, not identity truth until author confirms (`05` aligns).

**Planning implication:** Face program forces person model + tag inheritance + async processing decisions **before** most UI polish.

---

## 8. Tag & media truth (author + canon gap)

**Agreed architecture direction (`02`, 2026-07-11) — not fully built:**

- **Frame truth** — dimensional tags on each **media** item.
- **Work truth** — dimensional tags on **card** (curatorial intent).
- **Tile presentation** — four fixed slots; empty `-` or one label; no `+N` on chips.
- **Aggregation (future)** — suggest card tags from gallery/media tags (unanimous, subject, LCA, When span, mixed).
- **Subject tag** — optional marker on one assigned tag per card/media.

**Missing for commercial scale:**

- Provisional vs confirmed assignments (for AI/faces).
- Inheritance rules: media → card on attach; parent → child? (undecided).
- Person/event objects vs tags-only.
- Display rules across feed, rail, admin, open card — **utility typography parity still open**.

---

## 9. AI integration map (where it belongs)

Not one “AI program.” Four touchpoints, different trust:

| Touchpoint | Role | Trust model |
|------------|------|-------------|
| **Ingest** | Cluster time/face/similarity; propose stacks | Provisional only |
| **Tag** | Suggest Who/What/When/Where | Never auto-publish to reader |
| **Compose** | Draft excerpt/body (Story Assist exists) | Author edits |
| **Cover** | Generate illustration | Optional, labeled |

**Architecture rule:** Provisional store ≠ canonical tags until author confirms. **Schema gap today.**

---

## 10. Video, print, settings (planning notes)

**Video:** Platform program — transcoding, poster frames, readiness states, parity on cover/gallery/body where possible. Not a card-field tweak.

**Print/books:** `01` archive + renditions correct direction. Need print-safe crops, min DPI awareness in presentation contract eventually. v1 UI optional; **don’t crop only for screen**.

**Settings (commercial minimum):** Backup run/status, guarded restore, theme preset entry, user admin, optional search/index health. Wraps existing scripts.

**Replace/repair:** External-editor round-trip + in-app replace-in-place — operator workflow, not one-off script.

---

## 11. Engineering hygiene (symptoms, not the strategy)

Author and canon both note:

- ESLint backlog (hundreds; historical; not PR-blocking) — **ratchet on touch + directory slices**, not big-bang.
- API route envelope migration — incremental.
- TypeScript strict rollout — incremental (`strict-api` started).
- `cardService` / giant modules (`StudioWorkspace`, `CollectionsAdminClient`, `CardForm`, `themeService`) — **module boundary map** in archaeology pass.
- Dead table era — docs mention table headers; `tableEmbed` on tag command bar; journal-users HTML table is legitimate.
- DnD — behavior closed; **simplification audit** optional when planning consolidation phase.

**Hygiene is Program 4 (below), not the lead strategy.**

---

## 12. Integrated program structure (proposed next plan)

Replace “Phase 3/4 laundry list” as organizing frame. **Six programs** — each with product outcome; implementation comes only after planning closes.

| ID | Program | Commercial outcome | Planning gate (deliverable) |
|----|---------|-------------------|---------------------------|
| **P1** | **Product contracts** | Same look/behavior everywhere | Card Presentation Spec; Theme product scope; Filter contract |
| **P2** | **Tag & media truth** | Images findable; cards inherit sensibly | Tag authority + inheritance spec; Person model decision |
| **P3** | **Archive intelligence** | Organize thousands without exhaustion | Face/person architecture; `05` promoted or merged; review queue IA |
| **P4** | **Operator platform** | Trust without terminal | Settings IA; backup/restore UX spec |
| **P5** | **Media platform** | Video + readiness + import scale | Processing job model; adapter roadmap (phone/cloud) |
| **P6** | **Assisted authoring** | AI helps; human approves | AI touchpoint map + provisional data model |
| **P7** | **Platform hygiene** | Faster dev; less surprise | Canon archaeology; dead-code report; module map |

**Suggested dependency order for *planning* (not coding):**

1. Product thesis (1 page)  
2. Architecture decision register (forced choices)  
3. Codebase & canon archaeology  
4. P2 + P3 together (tags + faces + archive — coupled)  
5. P1 contracts (presentation, theme scope)  
6. P4 operator platform  
7. P5 media platform  
8. P6 AI  
9. P7 hygiene (continuous, not blocking thesis)

---

## 13. Architecture decision register (open — planning only)

| # | Decision | Options | Blocks |
|---|----------|---------|--------|
| D1 | Default user mode | Story-first vs archive-first landing | IA, onboarding |
| D2 | Person model | Entity + Who tag link vs tag-only | Face recognition |
| D3 | Face data processing | Cloud API vs self-hosted vs hybrid | Privacy, cost, ops |
| D4 | Provisional suggestions storage | Separate collection vs fields on media | AI, faces, import |
| D5 | Tag inheritance on attach | Copy all / dimensional only / suggest only | Aggregation, chips |
| D6 | Child card tag inheritance | Yes / no / partial | Collections, reader filters |
| D7 | Theme product surface | Presets-only vs full workbench | Commercial UX, eng cost |
| D8 | New user taxonomy | Empty / starter / templates / choose | Onboarding, import |
| D9 | Video v1 scope | Playback only vs full authoring parity | P5 scope |
| D10 | Print-ready | Explicit v2 revenue vs defer | Crop/rendition contract |
| D11 | Multi-tenant timing | Near-term vs after first paying customers | `01` tenant path |
| D12 | Guided Archive (`05`) | Promote to active plan vs stay seed | P3 scope |

---

## 14. Assessment questions (author — for planning, not implementation)

Consolidated from conversation. **No requirement to answer before planning continues** — but answers sharpen the decision register.

### Onboarding & taxonomy
- Q1: New commercial user — no tags, starter skeleton, or choose template (family archive, travel, memoir)?
- Q2: Taxonomy author-built over time vs guided first-run from first import?

### Import & organize
- Q3: v1 import — bulk historical, steady small batches, or both equally?
- Q4: AI v1 — suggest tags only, suggest clusters/events, suggest card groupings, or auto-apply with review queue?
- Q5: How wrong can AI be before it’s worse than no AI?

### Tag inheritance
- Q6: Media attached to card — copy all media tags, dimensional only, or suggest only?
- Q7: Child cards inherit parent tags for filter/display?
- Q8: Feed tile — one chip label enough long-term, or hover for full dimension detail?

### Authoring & reader
- Q9: Studio-only authoring for v1 commercial; reader edit-light only?
- Q10: Video v1 — reader playback, authoring reference only, or image parity?

### Operations & trust
- Q11: Backup — manual button, scheduled, or both? Restore admin-only?
- Q12: Settings — admin-only or anything for viewers later?

### Commercial & print
- Q13: Print/book export — architecture-ready now vs explicitly deferred?
- Q14: Multi-tenant — still near-term after v1 proof, or slip?

### AI boundaries
- Q15: Never auto-publish / never auto-delete / always review — any exceptions?
- Q16: In-app cover generation — v2 nice-to-have vs differentiator worth prioritizing?

### Faces (author-added)
- Q17: Face recognition priority vs other P3 items — equal to import clustering or primary?
- Q18: Accept cloud face API for v1 private family journal, or self-host requirement?

---

## 15. Three planning deliverables (before any implementation)

| # | Deliverable | Contents |
|---|-------------|----------|
| **1** | **Product thesis (1 page)** | Who is v1 customer; core job; what we refuse to be (not Google Photos clone, not public social) |
| **2** | **Architecture decision register** | Resolved D1–D12 with rationale |
| **3** | **Codebase & canon archaeology** | Dead surfaces; giant modules; schema gaps; stale `02`/`03` bullets to retire |

**Explicitly NOT next:** coding slices, answering all questions first, or ticking old Phase 3/4 items.

---

## 16. Stale backlog candidates (for archaeology pass)

**Likely closed / retire from active `03` handoff:**
- DnD hardening (author closed)
- Question flicker (author closed)
- Residual DnD browser proof (no reported gaps)
- Many reader matrix items shipped 2026-07-10/11

**Likely stale canon text (examples):**
- Media **table** header attachment (`02`)
- Full-page card admin **grid/table** as primary suggestion path vs Studio-only reality
- `03` items duplicated or contradicted by shipped notes

**Still real but re-home under programs:**
- Utility typography surface parity → P1
- Media-to-card tag aggregation → P2
- `05` spike/clustering/review UI → P3
- Face recognition → P3 (elevated from ⭕2)
- Backup UI → P4
- Video/readiness → P5
- Theme preset completion → P1 (narrow product scope)
- Lint / module split → P7

**Not a named Phase 5 in `03`.** `docs/05` = Guided Archive seed spec, not implementation phase.

---

## 17. Competitive framing (planning reference)

| Competitor class | They win on | We must win on |
|----------------|-------------|----------------|
| Apple/Google Photos | Faces, sync, scale | **Private story + editorial control + reader** |
| Storyworth / Artifact | Prompted writing | **Media-rich cards + family archive + your taxonomy** |
| digiKam / Lightroom | Power-user DAM | **Not competing** — import path for power users, not UI model |

---

## 18. Optional: second-model review prompt

If author wants another frontier model’s take, provide:

- This file
- `docs/01-Vision-Architecture.md` (Product Vision + Backend Principles)
- `docs/02-Application.md` (Tag Management, Media Management, Administration)
- `docs/05-Guided-Archive-Assistance.md`

**Ask specifically:**

1. Should **cards** remain the central primitive, or should **media intelligence** lead for commercial v1?  
2. Propose a **person/face data model** that fits private family journal.  
3. What would you **cut or defer** from current scope to ship commercial v1 faster?  
4. Fundamental product mistakes or missing jobs-to-be-done?

---

## 19. Suggested next step in this thread (when author ready)

Pick **one** lead planning pass (others can follow):

- **A)** Codebase & canon archaeology (Deliverable 3)  
- **B)** Product thesis + competitive framing (Deliverable 1)  
- **C)** Face / person / tag architecture options (D2, D3, D4, D5 + P2/P3)

**Author preference from last message:** integrated placeholder only — no canon reconciliation yet.

---

## 20. Change log (draft only)

| Date | Note |
|------|------|
| 2026-07-12 | Initial integrated draft from chat reassessment |
