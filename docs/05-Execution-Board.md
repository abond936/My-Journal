# Execution Board (Doc-First PM)

This is the active operational tracker for planned and implemented work, grouped by major function.

Status values:
- `Planned`
- `In Progress`
- `Implemented`
- `Blocked`
- `Parked`

Priority values:
- `P1` = highest
- `P2` = medium
- `P3` = lower / later

## Current Focus (Top Queue)

| Function | Feature | Status | Priority | Notes |
|---|---|---:|---:|---|
| Navigation | Curated collections list completeness at scale | Planned | P2 | Address recent-window/truncation behavior |
| Card Admin | Scalable child-card linking and discovery UX | Planned | P2 | Replace search-only linking model |
| Tagging | Media tagging parity with cards (no merge into card filter tags) | Planned | P1 | Core model integrity |
| Technical | Lint and QA hardening pass | Planned | P2 | Reduce operational risk |

## Feature Inventory by Function

### Navigation & Discovery

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| Dimension/tab/tag filtering baseline | Implemented | P2 | `docs/Project.md` |
| Curated mode and collections browsing | Implemented | P2 | `docs/Project.md` |
| Search tags reliability | Planned | P2 | `docs/Project.md` |
| Sort/group coherence for multi-constraint filters | Planned | P2 | `docs/Project.md` |
| Curated collections completeness at scale | Planned | P2 | `docs/Project.md` |
| Curated hierarchy admin tree scaling/polish | Planned | P2 | `docs/Project.md` |

### Card Management & Authoring

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| Core card CRUD and typed card model | Implemented | P2 | `docs/Project.md` |
| Collection management page (`/admin/collections`) partial | Implemented | P2 | `docs/Project.md` |
| TOC ordering as primary curated sequencing mechanism | Planned | P2 | `docs/Project.md` |
| Excerpt controls (empty default + optional auto excerpt) | Planned | P2 | `docs/Project.md` |
| Child-card discovery at scale (query-driven) | Planned | P2 | `docs/Project.md` |
| Edit exit UX (cancel/back flow) | Planned | P1 | `docs/Project.md` |

### Media Management & Import

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| In-memory normalize/import with `__X` marker | Implemented | P2 | `docs/Project.md` |
| Replace media content in place | Implemented | P2 | `docs/Project.md` |
| Assigned/unassigned media filtering | Implemented | P2 | `docs/Project.md` |
| Post-import aggregation UX from media bank | Planned | P2 | `docs/Project.md` |
| Media-card relationship integrity hardening | Planned | P2 | `docs/Project.md` |
| Orphaned media cleanup | Planned | P1 | `docs/Project.md` |

### Tagging

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| Hierarchical tag admin with DnD/reparent/edit | Implemented | P2 | `docs/Project.md` |
| Card and media tagging model parity | Planned | P1 | `docs/Project.md` |
| Remove image-tag merge into card-derived filter behavior | Planned | P1 | `docs/Project.md` |
| Face recognition-assisted tagging | Planned | P2 | `docs/Project.md` |
| Relationship/kinship inference model | Planned | P3 | `docs/Project.md` |

### Questions, Users, Theme

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| Questions CRUD and create-card flow | Implemented | P2 | `docs/Project.md` |
| Journal users model and admin user management | Implemented | P2 | `docs/Project.md` |
| Theme mode management baseline | Implemented | P3 | `docs/Project.md` |
| Post-MVP question workflow expansion | Planned | P3 | `docs/Project.md` |

### Technical Hardening & Platform

| Feature | Status | Priority | Source |
|---|---:|---:|---|
| Scripted maintenance/tooling references | Implemented | P2 | `docs/Project.md` |
| Code commenting and directory cleanup | Planned | P2 | `docs/Project.md` |
| ESLint debt reduction | Planned | P2 | `docs/Project.md` |
| QA hardening | Planned | P2 | `docs/Project.md` |
| Hosting/deployment operationalization | Planned | P2 | `docs/Project.md` |
| Post-v1 performance optimization set | Planned | P3 | `docs/Project.md` |

## Blocked / Risks

| Item | Blocker | Next Unblock Action |
|---|---|---|
| Scalable curated list behavior | Query/index strategy not finalized | Select data strategy and test on large sample |
| Tag model parity migration | Existing mixed behavior in current code paths | Define migration sequence and validation checks |

## Recently Completed (Seeded)

| Item | Notes |
|---|---|
| In-memory import normalize path | `__X` marker workflow adopted |
| Admin collections tree (partial) | Dedicated route established |
| Replace media-in-place API path | Post-import refinement supported |

## Update Rules

- Only this file tracks feature execution status.
- Keep rows short and practical; avoid narrative paragraphs.
- Update top queue first; inventory second.
- If an item is truly parked, mark `Parked` instead of leaving stale planned status.
