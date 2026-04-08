# Decisions Log

Use this as a short ADR-style log. Keep entries concise and outcome-focused.

## Entry Format

- Date:
- Decision:
- Context:
- Why:
- Impact:
- Status: accepted | superseded | reverted

---

## 2026-04-13

- Date: 2026-04-13
- Decision: Keep post-v1 performance/platform items explicitly separated from v1 requirements.
- Context: Product and engineering backlog contained both ship-critical and future optimization items.
- Why: Reduce delivery confusion and preserve focus on core functional completion.
- Impact: Future optimization items are tracked as lower-priority backlog categories.
- Status: accepted

## 2026-04-12

- Date: 2026-04-12
- Decision: Collections are structural via `childrenIds`; `curatedRoot` designates top-level curated inclusion.
- Context: Collection semantics were ambiguous across type and structure.
- Why: Clarify data behavior and admin interaction model.
- Impact: Collection logic should reference structure (`childrenIds`/`curatedRoot`) over legacy type assumptions.
- Status: accepted

## 2026-04-10

- Date: 2026-04-10
- Decision: Folder import uses `__X` marker with in-memory WebP normalization; no required xNormalized disk output for app import.
- Context: Disk-heavy normalization workflows increased friction and complexity.
- Why: Streamline import and reduce storage/process overhead.
- Impact: Import and scripting references align to marked-file behavior and in-memory optimization path.
- Status: accepted

## 2026-04-08

- Date: 2026-04-08
- Decision: Multi-author archival model is parked.
- Context: Core single-author/card-media-tag workflows are still stabilizing.
- Why: Avoid major identity/permission complexity before foundational stability.
- Impact: Architecture and backlog prioritize single-author reliability first.
- Status: accepted
