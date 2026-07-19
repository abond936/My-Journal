# VISION & ARCHITECTURE

**See also:** `02-Application.md` for product capabilities and contracts; `03-Implementation.md` for readiness, sequence, and implementation slices.

## Document model

- **01 — Vision & Architecture** owns enduring intent, principles, technical boundaries, and project-specific constraints.
- **02 — Application** owns user capabilities, their status, and only the consequential contracts that could reasonably be implemented differently.
- **03 — Implementation** owns active sequence, Definition Gates, implementation slices, and Completion Gates.
- Support documents provide detail but do not change product truth unless reconciled into `01`–`03`.
- Agent behavior belongs in `AGENTS.md` and `.cursor/rules/`, not in product canon.

### Nomenclature

- **Capability** — What a reader or author can accomplish. Capabilities are `✅ Complete`, `⭕1 Planned`, or `⭕2 Future` in `02`.
- **Contract** — A consequential product or integrity rule that implementation must preserve.
- **Constraint** — A project-specific technical boundary owned by `01`.
- **Implementation slice** — A bounded unit of work required to deliver a capability; owned by `03`.
- **Ready** — The capability has passed the Definition Gate in `03`.
- **Complete** — The agreed outcome and contracts have passed the Completion Gate; code presence alone is insufficient.

### Placement

- Record a fact once in its owning document; cross-reference instead of repeating detail.
- Do not document ordinary engineering competence or code facts that are cheap to inspect unless they protect a project-specific decision.
- Move a capability to Complete only from verified evidence, never inference.
- Preserve unresolved product questions explicitly; do not convert ambiguity into implementation policy.

---

## Product vision

Digitized family media is often disorganized, disconnected from its stories, and difficult to enjoy or share. My Stories solves the parts that digitization alone does not:

- **Organize** — Make large personal archives understandable with author-controlled structure and assistance.
- **Integrate** — Connect media with the stories, questions, people, places, and moments behind it.
- **Deliver** — Let family and friends relive, enjoy, and learn from those moments through a private, mobile reading experience.

It is not a generic journal, a photo manager with captions, or public social media.

### Product principles

- **Two halves** — Administration and Reader must both be strong; neither carries the product alone.
- **Story purpose** — Import and organization exist to help create and preserve stories, not to become a digital asset manager.
- **Layered storytelling** — Media carry concise story through their captions; Cards carry longer-form story through optional authored content. Media-led and narrative-led cards may share a reading structure without requiring the same amount of prose.
- **Archive scale** — Large archives should feel manageable through clear workflows, immediate feedback, and honest background progress.
- **Private** — The archive is family-private and author-controlled.
- **Mobile reading** — Reader is mobile-first; Administration may remain desktop-primary.
- **Author control** — Assistance may suggest; it never silently publishes, deletes, tags, or replaces author judgment.
- **Durability** — Backup, restore, and integrity are product requirements.

### Product shape

- **Customer** — v1 serves one author first, then others with similar archive and storytelling needs.
- **Roles** — One author-administrator; individual reader accounts for family and friends.
- **Hosting** — Initial commercial shape is a private hosted application.
- **Tenancy** — v1 is single-tenant; multi-tenant isolation is Future.

---

## Architecture

### Platform

✅ **Complete**

- **Application** — Next.js App Router, React, and TypeScript.
- **Data** — Firestore is authoritative structured data; Firebase Storage is authoritative media storage.
- **Identity** — Auth.js with Firestore-backed administrator and reader accounts.
- **Search** — Typesense indexes cards and media; Firestore remains authoritative.
- **Validation** — Shared TypeScript and Zod contracts with service-layer validation.
- **Reader** — Mobile-first delivery using surface-appropriate payloads and renditions.
- **Studio** — Desktop-primary authoring for Cards, Compose, Media, Questions, Tags, and Collections.
- **Theme** — Structured theme data, semantic recipes, generated variables, and live author preview.
- **Operations** — Reconciliation, import, seed, backup, and restore tooling indexed in `docs/NPM-SCRIPTS.md`.

⭕2 **Future**

- **Tenancy** — Isolate multiple customer archives without weakening current integrity guarantees.
- **Sharing** — Expand access models beyond private named readers.
- **History** — Add content versioning and recovery beyond operational backups.
- **Observability** — Add tracing and operational dashboards beyond baseline monitoring.
- **Storage** — Abstract storage operations when migration or multi-provider needs justify it.

### Authority and integrity

- **Authority** — Firestore and Storage are truth; Typesense, counts, and derived fields are projections.
- **Server rules** — Authorization, validation, counts, tag derivation, and relationship integrity are enforced server-side.
- **Narrow writes** — Tag, status, and single-field changes use bounded paths; rich content, gallery, cover, and structure use wide paths.
- **No shortcuts** — Efficiency never permits inaccurate counts, tags, publication state, authorization, or reader truth.
- **Stable lists** — Filters apply to the full server-side population; chunked results preserve filters and deterministic ordering.
- **Bulk work** — Bulk mutations use bounded batch work rather than repeated full-card saves.
- **Targeted refresh** — Patch or invalidate the affected query when possible; do not reload full catalogs by default.
- **Hydration** — Parent reads include relationship identifiers; full child hydration is optional and skipped when unnecessary.
- **Search limits** — Typesense requests respect its 250-hit page limit and page or chunk larger populations.

### Media integrity

- **Identity** — Each media asset has one canonical record and stable identifier.
- **References** — Cover, gallery, and body media references are foreign keys to canonical media and Storage objects.
- **Delete** — Delete either reconciles every reference and projection or refuses with explicit blockers.
- **Replace** — Replace preserves identity and relationships unless the product explicitly says otherwise.
- **Durability** — Success is not reported until required Storage, media, and same-operation card writes are durable or safely recoverable.
- **Readiness** — Upload, rendition, metadata, indexing, and video processing expose truthful ready, pending, and failed states.
- **Renditions** — Preserve originals and generate surface-appropriate Reader and Studio derivatives.
- **External libraries** — The v1 web application cannot depend on continuous read or synchronization access to a user's complete Apple Photos or Google Photos library. Provider exports, explicitly selected assets, local folders, or future native companions are ingestion paths into the canonical media bank; imported assets must become durable application-owned media rather than remote-library references.

### Tags and suggestions

- **Confirmed truth** — Confirmed tags drive counts, filters, presentation, and derived fields.
- **Provisional truth** — Machine suggestions remain separate until accepted; dismissing them never removes confirmed data.
- **Acceptance** — Accepted suggestions use the same accounting path as manual assignment.
- **Hierarchy authority** — `parentId` owns taxonomy structure; stored paths, counts, dimensional fields, and search data are projections that must agree with it.
- **Identity** — Each named Who subject, human or non-human, has one stable identity; names and aliases describe that identity rather than creating duplicates.
- **Relationships** — Family roles between people are relationships interpreted from an explicit human perspective, not substitutes for stable identities.
- **Migration** — Existing assignments remain authoritative until an author-approved, auditable migration replaces them.
- **Subject** — Subject is metadata on an assigned tag, not a fifth dimension or separate count source.
- **Subject removal** — Removing the assigned subject tag clears the subject in the same authoritative write.
- **Inheritance** — Gallery-to-card inheritance updates card work truth only through the explicit per-dimension policy in `02`.

❓ **Open**

- **Suggestion storage** — Per-media tag suggestions, face payloads, and retention remain undefined beyond the delivered provisional cluster model.

### Authentication

- **Bootstrap** — Environment administrator credentials seed the first account only; they are not runtime login credentials.
- **Roles** — One administrator; all other accounts are readers.
- **Rollout** — At least one enabled administrator must exist before go-live.
- **Revocation** — Disabling an account must end existing authorization, not merely prevent the next sign-in.
- **Helpers** — Local import helpers are administrator-only operational surfaces.

### Theme boundary

- **One system** — Approved values flow through semantic roles and recipes to application surfaces.
- **No parallel CSS** — Design-affecting component CSS consumes an existing role or recipe.
- **New roles** — Adding a role requires coordinated contract, schema, editor, generator, runtime, and surface updates.
- **Scopes** — Reader and Administration share architecture but retain distinct presentation needs.
- **Packages** — Journal Light, Journal Dark, Editorial Light, and Editorial Dark are the required Reader outcomes.

### Structural boundaries

⭕1 **Planned**

- **Services** — Split responsibility-heavy `cardService` and `themeService` into explicit domain operations without duplicating integrity rules.
- **Components** — Split `StudioWorkspace`, `MediaAdminContent`, and `CardForm` by coordination, domain operation, and presentation responsibilities.
- **Reader edit** — Reuse focused editing capabilities without loading the full Studio form architecture.
- **Theme service** — Separate Theme workspace composition from schema, transformation, compilation, and persistence.
- **Legacy routes** — Retire redirect-only and compatibility paths after callers are verified.

### Operations

✅ **Complete**

- **Backups** — Paired Firestore and Storage backups with manifests and status.
- **Source** — Remote Git is the code source of truth; secrets are backed up outside Git.
- **Recovery** — Restore procedures and drills are documented in `docs/NPM-SCRIPTS.md`.

⭕1 **Planned**

- **Closeout** — Prove backup, restore, account recovery, release readiness, and incident response before commercial release.

⭕2 **Future**

- **Hosted operations** — Adapt backup and recovery to hosted deployment without weakening safeguards.

📘 **Resources** — `docs/NPM-SCRIPTS.md` · `docs/IMPORT-REFERENCE.md` · `docs/04-Theme-Design-Contract.md`
