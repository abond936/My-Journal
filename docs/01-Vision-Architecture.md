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
- **Variable starting points** — Intake must accommodate differently organized folders, exports, filenames, dates, embedded metadata, existing tags, captions, duplicates, and missing information without assuming one clean source structure.
- **Learnable without the designer** — A first-time reader and a first-time administrator must understand the next meaningful action from the product itself; essential workflows cannot depend on oral explanation from the original author.
- **Private first** — An author's workspace and imported media are private and author-controlled; any future family sharing is explicit and limited to selected stories and their referenced media.
- **Mobile reading** — Reader is mobile-first; Administration may remain desktop-primary.
- **Author control** — Assistance may suggest; it never silently publishes, deletes, tags, or replaces author judgment.
- **Durability** — Backup, restore, and integrity are product requirements.

### Product shape

- **Customer** — v1 serves one author first, then others with similar archive and storytelling needs.
- **Roles** — One author-administrator; individual reader accounts for family and friends.
- **Hosting** — Initial commercial shape is a private hosted application.
- **Tenancy** — v1 is one private author-controlled archive with named readers. Personal workspaces, shared family spaces, and multi-tenant isolation are Future and must not expand the active v1 scope.
- **v1 boundary** — Establish a stable, recoverable authoring and reading baseline before adding onboarding, face assistance, new media types, external-library adapters, commercial packaging, or platform expansion. Once that baseline is released, authoring the archive's content takes precedence over discretionary product expansion.

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

- **Tenancy** — Isolate private personal workspaces and shared family spaces without weakening current integrity guarantees.
- **Sharing** — Let an author explicitly publish selected Cards and only their referenced Media into an authorized family space; never treat the author's complete Media library as shared by default.
- **Family feed** — Present recently published family stories chronologically as one view of the durable shared archive, not as an engagement-ranked social network or the product's primary authority.
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
- **Identity** — Each person or named animal used as a Who subject has one stable identity; names and aliases describe that identity rather than creating duplicates. Employers, schools, teams, and other named organizations do not become Who identities merely because they matter to a story; reusable broad meaning belongs in What, while the specific name can remain in the title, caption, or narrative.
- **Family structure** — Stable Who identities may be connected by parent and partner facts to support a family-tree view. Father, grandmother, cousin, and similar perspective-relative words are optional derived descriptions, not assignable tags, story truth, or a reason to reorganize authored content for each viewer.
- **Migration** — Existing assignments remain authoritative until an author-approved, auditable migration replaces them.
- **Subject** — Subject is metadata on an assigned tag, not a fifth dimension or separate count source.
- **Subject removal** — Removing the assigned subject tag clears the subject in the same authoritative write.
- **Inheritance** — Gallery-to-card inheritance updates card work truth only through the explicit per-dimension policy in `02`.
- **Face evidence** — Face regions, embeddings, provider person clusters, and proposed matches may be imported from supported exports or generated by an approved recognition service, but remain provisional evidence until the author confirms a stable Who identity.
- **Role separation** — Face recognition may suggest a person identity; it must not infer or assign Mother, Father, Grandparent, spouse, or another perspective-relative role as identity truth.

❓ **Open**

- **Suggestion storage** — The bounded schema, retention, deletion, provider provenance, and reprocessing rules for per-media tag suggestions and face evidence remain undefined beyond the delivered provisional cluster model.

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

✅ **Complete**

- **Services** — Card and Theme responsibilities use explicit domain operations without duplicated integrity rules; later service seams must extend that ownership model only when proven.
- **Components** — `StudioWorkspace`, `MediaAdminContent`, and `CardForm` separate coordination, domain operation, and presentation responsibilities through focused controllers and components.
- **Reader edit** — Focused Reader editing reuses the authoring capability contract without loading Studio shell architecture.
- **Theme service** — Theme schema, transformation, compilation, persistence, and workspace composition have explicit owners.
- **Legacy routes** — Compatibility paths are retained only when they remain intentional entry points; obsolete service facades are retired after zero-caller proof.

### Operations

✅ **Complete**

- **Backups** — Paired Firestore and Storage backups with manifests and status.
- **Source** — Remote Git is the code source of truth; secrets are backed up outside Git.
- **Recovery** — Restore procedures and drills are documented in `docs/NPM-SCRIPTS.md`.

- **Closeout** — Backup, guarded restore, account recovery, release/rollback, and incident procedures are verified at the operating-system level. Each release revision must still pass those gates on its exact committed and pushed revision.

⭕2 **Future**

- **Hosted operations** — Adapt backup and recovery to hosted deployment without weakening safeguards.

📘 **Resources** — `docs/NPM-SCRIPTS.md` · `docs/IMPORT-REFERENCE.md` · `docs/04-Theme-Design-Contract.md`
