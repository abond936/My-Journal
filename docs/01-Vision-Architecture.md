# VISION & ARCHITECTURE

**See also:** `02-Application.md` for product capabilities and contracts; `03-Implementation.md` for readiness, sequence, and implementation slices.

## Document model

- **01 — Vision & Architecture** owns enduring intent, principles, technical boundaries, and project-specific constraints.
- **02 — Application** owns user capabilities, their status, and only the consequential contracts that could reasonably be implemented differently.
- **03 — Implementation** owns active sequence, Definition Gates, implementation slices, and Completion Gates.
- Support documents provide detail but do not change product truth unless reconciled into `01`–`03`.
- Agent behavior belongs in root `AGENTS.md`, not in product canon. Tool-specific rule files may point to that shared authority but must not duplicate or redefine it.

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
- **Human destination** — The living archive and private Reader are where people rediscover, relive, understand, and share memories; Administration is the essential authoring and stewardship experience that makes that destination trustworthy.
- **Story purpose** — Import and organization exist to help create and preserve stories, not to become a digital asset manager.
- **Layered storytelling** — Media carry concise story through their captions; Cards carry longer-form story through optional authored content. Media-led and narrative-led cards may share a reading structure without requiring the same amount of prose.
- **Archive scale** — Large archives should feel manageable through clear workflows, immediate feedback, and honest background progress.
- **Bounded progress** — Show meaningful completion and unfinished work only where the product has an honest denominator: drafts, publication readiness, import processing, Media review, unresolved identities, and Collection work. Encourage continuation through real accomplishment and useful next actions rather than points, streak pressure, or a fictitious percentage of a life.
- **Variable starting points** — Intake must accommodate differently organized folders, exports, filenames, dates, embedded metadata, existing tags, captions, duplicates, and missing information without assuming one clean source structure.
- **Learnable without the designer** — A first-time reader and a first-time administrator must understand the next meaningful action from the product itself; essential workflows cannot depend on oral explanation from the original author.
- **Private first** — An author's workspace and imported media are private and author-controlled; any future family sharing is explicit and limited to selected stories and their referenced media.
- **Mobile reading** — Reader is mobile-first; Administration may remain desktop-primary.
- **Complete mobile Story authorship** — A phone author can create, resume, edit, classify, place, preview, and publish one Story without being redirected to desktop. Desktop remains primary for archive-scale import, dense comparison, bulk classification, taxonomy and identity correction, Collection restructuring, backup, and recovery.
- **Adaptive Author workspace** — Desktop retains Cards, Media, the delivered Questions pane evolving to a Prompt Library, Collections, and Tags simultaneously through the configurable Studio; mobile presents Cards, Media, Prompts, Collections, and Tags sequentially as focused full-screen destinations. Story is one Card type rather than a synonym for the shared content object. Both surfaces use the same canonical objects and services, while touch actions replace cross-pane drag-and-drop.
- **Card-owned authorship** — Authored content begins in a new or existing draft Card and remains Card content throughout. A structured Prompt Library may guide that work, but it creates no separate answer, interview-response, or draft-material layer. One or many prompts may contribute to one Card, and the author decides when another Card is warranted.
- **Author control** — Assistance may suggest; it never silently publishes, deletes, tags, or replaces author judgment.
- **Invited assistance; inherent integrity** — AI writing, classification, identity, Media, and placement help is contextual and author-invoked or quietly offered according to preference. Validation and publication-integrity rules remain active independently of AI preferences.
- **Durability** — Backup, restore, and integrity are product requirements.

### Product shape

- **Customer** — v1 serves one author first, then others with similar archive and storytelling needs.
- **Roles** — One author-administrator; individual reader accounts for family and friends.
- **Role-aware entry** — A reader account enters the Reader. The author-administrator may enter either the same Reader experience or Author Home; author privileges add the second path rather than creating a different Reader. Fresh Author entry presents the central progress dashboard, and Continue in Studio restores the prior Studio configuration rather than resetting it. Safe direct links open their authorized Collection, Card, or authoring destination without forcing an intermediate choice.
- **Reader paths** — Ordinary Reader entry begins from a Reader Home that offers Continue when meaningful and two reading paths: Collection for authored hierarchical reading and Feed for freeform published-Card discovery. Account and appearance remain utilities rather than reading destinations.
- **Durable Collections** — A Collection is a durable authored reading work composed of ordered Card placements, optionally organized by explicitly assigned Collection-local Part, Chapter, and Section placement roles. Part is one optional bounded level for broad divisions such as life stages; it is not arbitrary recursion. A parent Card may supply the title and optional introductory content for one of those roles. Story is one Card type; every approved Card type may participate according to its Reader contract. Cards may be reused across Collections without copying content, while live shared-parent structural placement is excluded from the active model. Structural roles never change implicitly because content or child count changes.
- **Book editions** — Printed or exported Books are stable editions of a Collection's selected structure, Card versions, Media, order, presentation, and selected playback references. A printed QR code resolves through a durable edition-owned address rather than a temporary storage URL; the author chooses authenticated-audience access or possession-based book-holder access. The living Collection may continue changing without rewriting a previously generated edition.
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
- **Studio** — Desktop-primary simultaneous authoring for Cards, Compose, Media, Questions, Tags, and Collections, paired with focused mobile Author destinations over the same domain services.
- **Theme** — Structured theme data, semantic recipes, generated variables, and live author preview.
- **Operations** — Reconciliation, import, seed, backup, and restore tooling indexed in `docs/NPM-SCRIPTS.md`.

⭕2 **Future**

- **Tenancy** — Isolate private personal workspaces and shared family spaces without weakening current integrity guarantees.
- **Publishing and sharing** — Publishing releases an approved Card or Collection version to explicitly selected individuals or reusable audience groups. Groups may contain Reader accounts and lightweight invited recipients. Who identities and relationship facts may suggest recipients only when linked to access identities; they never grant access automatically. Sharing separately distributes or notifies, and a link never bypasses authorization unless the author explicitly enables bounded link or Book-holder access. Never treat the author's complete Media library as shared by default.
- **Family feed** — Present recently published family stories chronologically as one view of the durable shared archive, not as an engagement-ranked social network or the product's primary authority.
- **Extended history** — Add private working revisions, content-version browsing, recovery, and republish rollback only when demonstrated use justifies the additional version and mutation-owner infrastructure. The current living archive keeps a published Card as one live object; stable Book editions remain separate snapshots.
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
- **Responsive authoring** — An authoring mutation commits its authoritative record and immediately reconciles the visible working set. Dependent inheritance, Card media signals, and search projections may continue outside the interaction path only through a durable, retryable operation with truthful failure reporting.
- **Hydration** — Parent reads include relationship identifiers; full child hydration is optional and skipped when unnecessary.
- **Search limits** — Typesense requests respect its 250-hit page limit and page or chunk larger populations.
- **Collection authority** — A durable Collection owns its identity and ordered local placement tree. Each placement has one Collection, one optional parent placement, one explicit role, one order, and one referenced Card. The Card remains the sole owner of authored content and may be referenced by multiple placements without duplication. Legacy Card `childrenIds` remain compatibility truth only until a separately gated migration proves target parity and Reader cutover.

### Media integrity

- **Identity** — Each media asset has one canonical record and stable identifier.
- **References** — Cover, gallery, and body media references are foreign keys to canonical media and Storage objects.
- **Visible Card use** — A Card references only Media deliberately used in its cover, Gallery, or body presentation. Related but unused occasion Media remains in the canonical Media library and is retrieved through confirmed classification, source evidence, search, and bounded suggestions rather than a hidden Card attachment.
- **Relationship separation** — Replacement concerns the same underlying Media item; a Stack groups near-duplicate or closely interchangeable captures; an occasion result gathers broader related Media through Who, What, When, Where, source evidence, and assistance. None silently creates Story meaning or a durable Event entity.
- **Delete** — Delete either reconciles every reference and projection or refuses with explicit blockers.
- **Replace** — Author-confirmed replacement of an existing Media file preserves the canonical Media ID, confirmed classification, captions, and Card relationships while refreshing file facts, readiness, search evidence, and generated renditions. Newly extracted metadata remains evidence and never silently overwrites confirmed truth. Replacement is recoverable until the new source and required derivatives are durable.
- **Durability** — Success is not reported until required Storage, media, and same-operation card writes are durable or safely recoverable.
- **Readiness** — Upload, rendition, metadata, indexing, and video processing expose truthful ready, pending, and failed states.
- **Renditions** — Preserve originals and generate surface-appropriate Reader and Studio derivatives.
- **Voice provenance** — Preserve an untouched original voice recording as canonical Media when speech contributes to a Story. Its transcript may be edited in the Card without rewriting what the recording represents. A cleaned authentic derivative may remove noise, filler, false starts, or excessive pauses without inventing speech. Narration of materially edited prose is a separate human or synthetic artifact with explicit provenance; any custom storyteller voice requires informed consent, disclosure, deletion controls, and a separately approved capability.
- **Editing boundary** — My Stories may provide nondestructive presentation framing and rotation where a Story uses Media, but it is not a general image editor. Cropping, sharpening, focus restoration, and other source changes may be completed externally and returned through author-selected replacement; AI restoration or enhancement remains outside the active product architecture.
- **External libraries** — The v1 web application cannot depend on continuous read or synchronization access to a user's complete Apple Photos or Google Photos library. Provider exports, explicitly selected assets, local folders, or future native companions are ingestion paths into the canonical media bank; imported assets must become durable application-owned media rather than remote-library references.

### Tags and suggestions

- **Layer separation** — Keep canonical media and source facts, imported or machine evidence, confirmed Who/What/When/Where understanding, contextual working organization, and Story/Reader meaning distinct. The four dimensions are the human-facing confirmed-classification language, not the entire knowledge model.
- **Card and Media meaning** — Direct Card tags express what the authored Card is about. Each Media item's confirmed tags describe its own visible contents and selected subject. Visible-Media tags may support discovery or suggest a Card tag, but never silently become authored Card meaning; Card tags likewise never silently rewrite Media truth.
- **Confirmed truth** — Confirmed tags drive counts, filters, presentation, and derived fields.
- **Provisional truth** — Machine suggestions remain separate until accepted; dismissing them never removes confirmed data.
- **Acceptance** — Accepted suggestions use the same accounting path as manual assignment.
- **Reviewed resolution** — Classification completeness means that each applicable dimension has an intentional reviewed resolution. A known or approximate value, Unknown, and Not applicable may all be complete outcomes; the system never requires invented certainty or a named tag merely to satisfy completeness.
- **Context separation** — Import batches, candidate occasions, similarity groups, working selections, stacks, and other contextual organization may help the author review or work with Media, but do not become confirmed taxonomy or Story meaning merely because they were inferred or grouped.
- **Collection assistance** — Assistance may analyze both Media and the organization of the archive, including unresolved dimensions, conflicts, likely duplicate identities or vocabulary, and high-leverage review opportunities. It presents affected objects, evidence, uncertainty, consequences, and exception paths rather than silently changing truth.
- **Assistance posture** — Each supported AI capability may be Off, On demand, or Offer suggestions. Offer suggestions uses restrained indicators rather than unsolicited interruption, and no setting permits AI to commit authorship, identity, taxonomy, placement, access, or publication decisions without author confirmation.
- **Integrity independence** — Required validity checks are application rules rather than optional AI behavior. AI may explain or help resolve a problem, but disabling assistance never disables reference, readiness, privacy, classification, or publication validation.
- **Evidence-aware questions** — Assistance asks only what its evidence supports. A likely existing person match may be confirmed; an unnamed face asks who the person is, whether to create or reuse an identity, and only the relationship context needed to distinguish that identity. Capture metadata, imported metadata, OCR, neighboring Media, visual evidence, and author statements retain their provenance and are not treated as interchangeable truth.
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
- **Natural-language retrieval** — A future Reader request may translate ordinary memory language into visible, correctable Who/What/When/Where and relationship criteria, but deterministic Browse and Filter remain foundational and no conversational layer may bypass publication, privacy, or direct-versus-derived search truth.

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
