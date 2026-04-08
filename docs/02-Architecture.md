# Architecture (Current State)

## Stack Summary

- Frontend: Next.js App Router, React, TypeScript, CSS Modules.
- Backend: Next.js API routes, Auth.js, Firebase Admin SDK, Firestore, Firebase Storage.
- Validation: Zod schemas for shared server/client contracts.
- Rich content/editor: TipTap.
- Media processing: Sharp-based image normalization/import paths.

## Core Domain Model

- `Card`: primary narrative unit and display surface.
- `Tag`: dimensional + hierarchical taxonomy for discovery.
- `Media`: imported assets referenced by cards by ID.
- `User`: admin + viewer auth model.

## Architectural Rules

- Strict client/server separation for business logic and data operations.
- Server-side validation and authorization on write/read boundaries.
- Cards store media references, not embedded media payloads. ??How does YouTube serve so quickly???
- Tag data is denormalized for query performance where needed.

## Key Product-Technical Behaviors

- Curated collections are structural (`childrenIds` and `curatedRoot` patterns).
- Freeform discovery uses type/dimension/tag filtering and sort behavior.
- Folder import uses `__X` marker and in-memory optimization path.
- Media replace-in-place preserves references while updating media content.

## Known Constraints

- Some collection list flows have scale caveats (recent-window behavior). ??What does this mean??
- Search/filter UX consistency requires ongoing refinement.
- Large-library authoring workflows need better query-driven selection tools.
- Technical hardening remains: lint debt, QA breadth, deployment operations.

## Implementation Source Pointers

- Product canonical legacy source: `docs/Project.md`.
- Import technical reference: `docs/IMPORT-REFERENCE.md`.
- Scripts and maintenance ops: `docs/NPM-SCRIPTS.md`.
