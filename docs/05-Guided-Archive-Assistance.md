# GUIDED ARCHIVE ASSISTANCE (seed spec)

**See also:** `01-Vision-Architecture.md` · `02-Application.md` · `03-Implementation.md` · `04-Theme-Design-Contract.md`

**Status:** Supplementary **seed** specification. This document begins a parallel **Vision → Architecture → Application → Implementation** thread for a **guided memory-ingestion and storytelling** product or service layer. It does not yet replace or duplicate the core trio; when priorities harden, items here may migrate into `02`/`03` or stand alone as a sibling product brief.

Legend:
✅`Shipped / in production`
⭕1`Next plausible slice`
⭕2`Future`
❓`Open`
📐`Decision`
📘`Resource`

---

## Document role

- **Purpose** - Capture **intent**, **principles**, and a **rational approach** for helping people with **large, disorganized photo archives** (including decades of prints and scans) move from **overwhelm** to **meaningful stories**, without pretending automation removes human judgment.
- **Audience** - Product owner, future designers, and engineers evaluating **AI-assisted clustering**, **dimensional tagging (Who / What / When / Where)**, and **narrative elicitation** as a commercial or integrated offering.
- **Scope boundary** - Describes **what** the system should do and **how** it should behave; it does not commit this repo to a build order until mirrored into `03-Implementation.md`.

---

## **Product Vision**

*Intent*
- **Reduce overwhelm** - Meet users where they are: “decades of photos in a box or on disks,” mass scans, partial metadata, and fatigue before they reach storytelling.
- **Preserve authorship** - The family’s **memory and naming** remain authoritative; machine output is **suggestion**, not silent truth.
- **Dimensional clarity** - Reduce paralysis about **Who / What / When / Where** by **ordering attention** (what to answer first, what can be inferred, what must be human).
- **Event-first grouping** - Help users see **plausible “piles”** (same afternoon, same venue, same occasion) before asking for fine-grained tags on every single frame.
- **Story-forward** - Turn confirmed structure into **draft captions and narratives** through **guided conversation**, minimizing typing and blank-page anxiety.

*Principles*
- **Suggest, confirm, edit** - Every aggregation or tag proposal requires **explicit acceptance** or correction; easy **split**, **merge**, and **undo**.
- **Progressive disclosure** - Do not surface all four dimensions at once as equal-weight homework; use a **framework** (e.g. cluster → occasion → people → place → time refinement).
- **Honest limits** - Face recognition is a **hint**, not identity; scans lack reliable EXIF; same-looking places on different days **will** confuse models—design for **low shame** and **fast correction**.
- **Trust & privacy** - Treat photos and voice/text as **sensitive**; be explicit about what leaves the device, retention, and who can see derived tags and stories.
- **Commercial realism** - Differentiate from “infinite library” apps by addressing the **“I’d love to do something with 30 years of photos”** job (articulated widely in forums such as Reddit): **structure first**, then **meaning**, then **sharing**—optional and user-controlled.

Many people complete **digitization** (scanning, basic cleanup) and stall at **organization and meaning**. Storage and face grouping alone rarely answer: *What event is this? Who must be named? What single caption would help my family in ten years?* A product that **proposes piles**, **asks in plain language**, and **maps answers into a consistent dimensional model** addresses a **large, underserved** pain point—especially when paired with an existing **journal / card** consumption surface (as in my-journal).

---

## **TECHNICAL** (architecture & rational approach)

### **Ingestion & representation**

*Intent*
- Accept **batches** (folders, uploads, import jobs) with heterogeneous metadata: camera EXIF, scan defaults, none, or inconsistent dates.

*Principles*
- **Provenance** - Preserve original files and **source metadata**; store **derived** features (embeddings, thumbnails, cluster ids) separately from canonical user-confirmed tags.
- **Idempotent pipelines** - Re-running clustering after new uploads should **extend** or **refine**, not destroy prior human work.

*Features*
⭕2 **Future**
- **Batch ingest API** - Register assets, extract available EXIF, generate preview thumbnails, queue feature extraction.
- **Feature store** - Per-image **visual embeddings**, optional **face embeddings** / face-group ids from a provider or library, **timestamp** and **geo** when present.
⭕1 **Planned**
- **Heuristic pre-clustering** - Cheap, explainable first pass: time windows, folder boundaries, burst detection, optional GPS buckets—outputs **candidate segments** for ML refinement.
❓ **Open**
- **On-device vs cloud** - Whether first-pass embedding runs on client, server, or hybrid for privacy and cost.

### **Intelligence: similarity & event clustering**

*Intent*
- Propose **“same occasion”** groupings analogous to human reasoning (same setting, overlapping people, repeated objects, clothing continuity)—**without** claiming ground truth.

*Principles*
- **Multi-signal fusion** - Combine **time proximity**, **visual similarity**, **face co-occurrence**, and weak **sequence** cues; expose **confidence** or **why suggested** in human-readable form where feasible.
- **Failure-tolerant UX** - Wrong merges are expected; **split** must be one gesture.

*Features*
⭕2 **Future**
- **Embedding similarity graph** - Cluster or community-detection over nearest neighbors with **temporal constraints** to reduce “same backyard, different year” false merges.
- **Cross-subject linking** - Suggest that image A (person X) and image B (cake, no X) belong to one occasion when **time and scene** align—mirroring manual “same cake” reasoning.
⭕1 **Planned**
- **Review UI** - Grid of **candidate stacks** with merge/split, keyboard-friendly for large sets.

### **Intelligence: elicitation & language**

*Intent*
- **Minimize effort** through **voice or chat** (“What was this?” “When do you think this was?”) and convert answers into **structured tag proposals** and **draft prose**.

*Principles*
- **Constrained outputs** - Map language to **controlled vocabulary** where the product uses hierarchical tags (e.g. pick from existing **Who** paths; propose **new** leaves only with confirmation).
- **Draft layers** - Store **AI drafts** of captions and stories separately until **published** to the canonical archive.

*Features*
⭕2 **Future**
- **Multimodal prompting** - Image + cluster context + known partial tags → **question generation** (“You haven’t named anyone in these three—are they the same gathering?”).
- **Style shaping** - User-selectable tone (brief caption vs narrative) with **human edit** as final step.
⭕1 **Planned**
- **Structured extraction** - LLM returns **JSON** (proposed When range, Where string, What label, Who ids) validated against schema before UI shows chips.

### **Privacy, safety, and operations**

*Intent*
- Align technical choices with **family-archive trust** and **regulatory expectations** if offered as SaaS.

*Principles*
- **Data minimization** - Send **thumbnails or embeddings** to external models when full-resolution upload is unnecessary; support **region / zero-retention** provider options where available.
- **Auditability** - Log **what was suggested** and **what was accepted** for support and user confidence (not for surveillance).

*Features*
⭕2 **Future**
- **Tenant isolation** - If multi-user SaaS: strict partition of media, features, and model calls per account or family space.
📐 **Decision** - Whether this capability ships **inside** my-journal, as a **separate onboarding product** that exports into it, or as **API-only**—to be decided when commercial shape is chosen.

### **Integration with my-journal (conceptual)**

*Intent*
- Reuse the **dimensional tag model**, **media** entities, and **cards** as the **destination** for confirmed work—avoid a second silo.

*Principles*
- **One canonical tree** - Tags applied after confirmation should match **existing hierarchy rules** (e.g. N/A sentinels, dimension paths) documented in `02-Application.md` and import references.

*Features*
⭕2 **Future**
- **Export bridge** - Push confirmed clusters to **new or existing cards** (e.g. Gallery or Story) with attached media order and proposed captions as editable body.
- **Idempotent sync** - Re-sync when user changes tags in either direction without duplicate assets.

---

## **APPLICATION** (user-facing capability)

*Intent*
- Describe **surfaces** and **behaviors** the product exposes, independent of this repo’s current ship state.

*Principles*
- **Framework over blank canvas** - Always show **recommended next step** (“Review 12 suggested events,” “Name people in this stack”).
- **Visible progress** - Users should see **archive coverage** (e.g. % of items in at least one confirmed occasion) to sustain motivation.

*Features*
✅ **Complete**
- *(none — seed spec only)*

⭕1 **Planned**
- **Cluster review** - Accept / split / merge suggested groups; optional “why grouped” hint.
- **Per-cluster interview** - Short scripted flow: occasion → people → place → time → caption; output **tag + text drafts**.

⭕2 **Future**
- **Voice-first mode** - Hands-free answers while flipping through a TV or tablet carousel.
- **Collaborative labeling** - Invite relative to **confirm faces** or **add one sentence** (permissions model TBD).
- **Print / book prep** - Ordered spreads from confirmed stories for export vendors.

❓ **Open**
- **Pricing** - Per-GB, per-month, or one-time “archive rescue” package; tied to model cost and support load.

📘 **Market signal** - Recurring public sentiment: large backlogs of digitized or digital photos with **aspiration without a path**; positioning should emphasize **guided outcome**, not **more storage**.

---

## **IMPLEMENTATION** (beginning sequence)

*Intent*
- Order work so **value** appears before **scale**: prove cluster usefulness and interview flow on **one author’s archive**, then harden pipeline and integration.

*Principles*
- **Measure correction rate** - Track split/merge and tag rejections; high rates mean UX or model tuning, not user error.
- **Cost caps** - Gate expensive vision calls per batch and per user tier.

*Features*
⭕1 **Planned**
- **Spike** - End-to-end on a fixed folder: ingest → embeddings → candidate clusters → simple review UI → export JSON of confirmed groups and proposed tags (no production auth required).
- **Evaluation set** - Curated subset with human-labeled “true events” to score precision/recall of clustering variants.

⭕2 **Future**
- **Background workers** - Queue-based embedding and re-clustering for 10k+ assets.
- **Production integration** - OAuth, billing, and my-journal **card/media** write APIs.

📐 **Decision** - **Spike stack** (embedding model vendor, vector store vs brute-force NN for v0, LLM provider)—choose after spike budget and privacy stance are set.

---

## **Revision history**

| Date | Change |
|------|--------|
| 2026-04-10 | Initial seed: vision, principles, architecture threads, application skeleton, implementation starters, relationship to my-journal. |
