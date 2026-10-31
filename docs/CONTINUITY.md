# Continuity

This file is the concise operational handoff for the next project session. It is not product canon and must not override `01`, `02`, or `03`. Replace it at the next deliberate handoff rather than accumulating history.

## Canon checkpoint

- `01` remains the owner of product vision, architecture, technical principles, and stable invariants.
- `02` now records the shipped durable Collection authority and placement-native Studio/Reader behavior separately from still-planned multi-Collection creation, audience, sharing, distribution, and Book editions.
- `03` records the completed first durable Collection activation and the read-only publication-readiness evidence. Active structure is not publication.
- The accepted deployed main revision is `f4d8c7e6780aec33be5821131cfe4c2969db0247`, following PR #22 and the earlier durable-Collection, Needs Attention, exact handoff, and Card publication-integrity slices. The present local branch combines the sequential mobile Author destinations, truthful Author Home handoffs, selected-device-photo Story intake, and a direct Start a Story entry; it makes no production-data mutation.

## Local implementation checkpoint

- `codex/mobile-author-destinations` at `54ba53fb` is the verified sequential mobile Studio foundation: Cards, Media, Prompts, Collections, and Tags appear one at a time at phone width, while desktop keeps its configurable simultaneous panes.
- `codex/mobile-author-dashboard-handoffs` at `422c5537` is based on `54ba53fb`. It adds Cards, Media, and Collections destination hints from Author Home, preserves the exact existing Card-status preference, and leaves general Continue unqualified so prior work resumes.
- `codex/published-card-working-revision-foundation` at `42ae7c2e` is a separate sibling branch based on `54ba53fb`. It contains an inactive, verified private working-revision persistence foundation for published Cards. It is deliberately not wired to routes or UI.
- `codex/story-first-practical-publication` is the current successor branch based on `422c5537`. It carries selected-device-photo Story intake for cover, Gallery, and body composition (`3177aafe`), direct Start a Story entry (`52e9a786`), the practical live published-Card policy plus warning (`2df07a90`), archive-wide classification requirements (`f8bde6ec`), explicit Reader Feed inclusion, private raw-Media browsing removal, the local authenticated Reader Media-delivery application boundary (`df7cda69`), the shared Reader audience evaluator (`c3e3e90b`), and the verified audience-group persistence plus route-specific Story/Collection audience authoring checkpoint, without the inactive working-revision foundation.
- `codex/story-first-selective-revisions` preserves the later working-revision, publication-route, audience-grant, and immutable-presentation experiments. Those experiments are not part of the active implementation direction and must not be represented as delivered publication protection.
- None of these local branches is merged into or deployed from `origin/main`. No GitHub push is authorized by the current approval record. Preserve the sibling branches as recoverable topology rather than rewriting their history.
- The current bounded publication policy keeps a published Card as one live object: saved edits may become visible to readers immediately. An author who needs privacy while changing it must explicitly return it to Draft first. Private working revisions remain deferred unless demonstrated use warrants the additional mutation-owner coverage and version infrastructure.
- Classification requirements are now an archive-wide pair of Settings choices: Require Media and Require Stories/other Cards. Existing settings documents normalize to both required so the deployed strict behavior cannot loosen silently. Drafts remain open; publication applies only the selected classification requirements while missing references and Media readiness remain inherent. Unreviewed dimensions display as blank, not as an `Unreviewed` tag; Unknown and Not applicable remain explicit searchable decisions. This implementation has not changed the production author settings or any content record.

## Durable Collection state

- `My Life` (`my-life`) is the first active durable Collection authority.
- It remains lifecycle `draft`, structure revision 0, and authority revision 1.
- Immutable activation operation `authority-my-life-1-active` changed only the authority selector after a successful production dry run and explicit approval.
- The active graph contains 197 placements: one Part, 23 Chapters, 15 Sections, and 158 Cards.
- The frozen source fingerprint is `6ea81530a28e36f43dc79b48c3dfcba88d822139be9dc98a4589e519dc29d11b` and the target fingerprint is `4a88c5dcd0ae245cd555e600281be736e9100c9d41a14f35aae9233eb3e6adda`.
- Post-activation readback reported exact fingerprints, zero parity or source issues, and `ready: true` for structural authority.
- Studio and Reader now use placement identity when an active durable Collection exists. The untouched legacy root/nested Card structure remains the compatibility and rollback source.
- Activation did not change Card content or status, Media, Tags, legacy hierarchy fields, publication, audience, sharing, distribution, or Storage.

## Publication-readiness assessment

The new `audit:collection-publication` command is read-only. Its 2026-10-30 production assessment of `my-life` found:

- 196 unique required Cards including the introduction; all 196 records load.
- 109 published Cards and 87 draft Cards.
- Zero Cards with all four dimensions reviewed.
- Zero Cards with both reviewed What and a meaningful What assignment.
- 313 Media reference occurrences covering 295 unique Media IDs.
- 278 Media records load; 17 referenced Media IDs are missing.
- All 278 loaded Media records have unassessed rendition readiness; 77 have all four dimensions reviewed.
- No audience-, visibility-, access-, recipient-, or sharing-like Collection field.

These results are backlog evidence, not proof that four-dimensional classification is undesirable or that the application model failed. In particular, zero Cards passing the new review gate means the existing Cards have not yet been reviewed under that gate. The assessment does not establish how many Cards or Media the author ultimately wants fully classified. Full archival classification remains a distinct benefit for authors who want more precise freeform exploration than device-library search provides.

The ordinary Reader already requires a published Collection, every required Card published, and no missing required Card. Draft-to-Published Card mutations now enforce the implemented Card-level integrity core: dimensional review, meaningful What, referenced-Media existence and review, and Media readiness. Cards now also own an explicit Feed-inclusion choice: legacy Cards without the field remain included for compatibility, while an authored exclusion removes the Card from freeform Feed, Reader search, and random discovery without changing Collection placement. The complete canon publication contract is still unfinished because requiring at least one Collection-or-Feed destination, Collection publication, audience groups, guest recipients, and distribution notifications are not implemented. `My Life` is therefore not publication-ready and remains draft.

## Current product direction

- Reader and Author are role-aware entrances into the same product. Bare Reader entry offers Continue when meaningful plus Collections and Feed; direct authorized Collection or Card links bypass intermediate selection.
- Reader Home has no contextual sidebar before a reading path is selected. After selection, Collection navigation preserves nested hierarchy with generous full-row targets, while Feed keeps authorship separate from Who/What/When/Where filters.
- Card is the durable authored content object; Story is one Card type. Collection is the approachable name for the durable reading work, and a Book is a later print/export edition.
- Parts, Chapters, and Sections are bounded Collection-local placement roles. A canonical Card may be reused through distinct placements without copying its content.
- Desktop remains the configurable simultaneous Studio. The delivered mobile foundation presents sequential Cards, Media, Prompts, Collections, and Tags destinations, with Cards list → Compose and safe return; complete destination-specific touch workflows remain unfinished, and archive-scale administration remains desktop-primary.
- Author Home's general Continue resumes existing work. Its Cards status, generic Media, and generic Collections actions now carry truthful mobile destination hints; desktop retains the saved simultaneous Studio, and no Collection-specific attention count is mislabelled as a reproducible filter.
- Author Home also offers Start a Story, which opens the existing unsaved new-Card Compose state whose default type is Story. It does not create a record until the author saves.
- Collection Needs Attention now reports the authored Collection audience state instead of the obsolete `Not yet available`: missing legacy data means all enabled readers, explicit all-readers and selected-recipient states remain distinct, and an explicit empty selection is called out as no readers selected. This is read-only configuration truth, not combined effective-audience calculation or publication enforcement.
- AI assistance is optional and author-invoked except for quiet integrity validation. Machine evidence remains provisional until author-confirmed.
- Draft saving stays permissive. Publishing is a deliberate integrity boundary; access, sharing, and distribution are separate decisions.
- Media remains private archive material by default. The target Reader shares Cards and Collections plus only their referenced Media; unrestricted Media-bank browsing is not a reader entitlement. Curated Shared Media Collections are a later, separately authorized capability.
- Ordinary reader accounts no longer receive the raw Media-bank tab or `/api/view/media` enumeration; administrators retain that archive view. On the current local branch, Reader Card, search, random, direct-page, and Collection responses now replace hydrated and authored-HTML Media URLs with authenticated application delivery. Reader Media payloads are display-only and omit Storage/source paths and private archive metadata. The byte route permits a viewer only when a published Card's maintained reverse reference and actual cover, Gallery, or body reference agree. Studio and administrator Card payloads retain current delivery.
- Read-only production verification found that one stored Media URL has no token and returns HTTP 200 to an anonymous HEAD request. Media delivery is therefore publicly reachable at the bucket/object layer despite the checked-in deny-all Storage rule. Audience activation must couple proxy/Reader URL rewriting with an explicitly authorized Storage/IAM closure and both anonymous-denial and authorized-delivery readback; application filtering alone must never be called protected.
- The application-side Media boundary is verified locally by 31 focused tests plus production typecheck, lint, and build. It has not been pushed or deployed, and the production bucket/object bypass remains open. No production record, Storage object, or IAM policy changed.
- The current local branch also has one audience evaluator across Feed/list, search, random, direct Card API and page, Collection list/detail, child Cards, and referenced Media. Missing audience data preserves all-enabled-reader access. Explicit Card and Collection selections use all contacts, reusable group IDs, and individual contact IDs; a Card's Feed route and reader-valid published Collection routes form its access union, while Collection navigation requires that Collection's own audience. A Collection marked Published but containing any missing or draft required Card now fails closed for inherited direct-Card and Media access as well as Collection navigation. Reusable groups now have an administrator persistence owner and User Management controls, and Story/Collection authoring has explicit selectors that list the exact enabled readers granted through the route being edited before Save. Saved Stories additionally preview the complete enabled-reader union across the proposed standalone route and all reader-valid published Collection routes, naming each contributing route. Placement-wide Collection impact preview, publication enforcement, protected production activation, guests, and distribution remain absent. This is verified local infrastructure, not completed protected sharing.

## Next definition gate

Do not attempt to publish `My Life` by flipping existing Card statuses or the Collection lifecycle. The read-only Collection Needs Attention foundation is now implemented: unfinished work remains valid draft work while Author Home reports separate Card, Media, review, readiness, and audience-infrastructure areas. The remaining publication-integrity sequence is:

1. Preserve the author-selected classification standard and its blank/unreviewed distinction. Do not auto-assign Unknown or Not applicable, create silent per-Story exceptions, or interpret optional classification as complete search coverage.
2. Preserve the shared read-only readiness result as the owner for dashboard and diagnostic evidence; do not convert attention counts into automatic repair. Collection attention must follow the selected requirements.
3. Preserve the delivered exact Collection-to-Studio handoff. Add other attention links only when their owning surface can reproduce the represented population; do not label broader global filters as Collection-scoped work.
4. Preserve the delivered Card publication-integrity core separately from unrestricted draft authoring. Keep published Cards live in the current stage, warn that saved edits may be reader-visible, and retain the explicit return-to-Draft path for private editing. Do not revive partial working-revision protection. Preserve explicit Feed inclusion independently from Collection placement; the consequence of publishing with no Reader destination and the Collection publication owner still require definition before expanding enforcement.
5. Repair or explicitly resolve missing Media references and establish how historical Media readiness is assessed without silently approving it.
6. Complete the approved audience gate in dependency order. The local application-side private Media delivery, raw-browse removal, shared legacy-compatible Card/Collection evaluator, reusable group owner, route-specific selectors, and saved-Story all-route impact preview are ready. Next add placement-wide Collection impact preview and publication-time destination/audience enforcement. Protected activation then requires an explicitly authorized coordinated deployment that closes effective Storage/IAM public access and proves anonymous denial plus authorized application delivery across the complete route matrix. Missing audience fields preserve current all-enabled-reader access until explicitly restricted. Do not claim protected audience behavior through UI-only, application-only, or partial route interception.
7. Add author-reviewable exception queues and exact consequence previews; do not turn the readiness assessment into automatic bulk reconciliation.

Further bounded, reversible implementation may continue against the approved experience architecture, but no production lifecycle, Card-status, audience, sharing, distribution, repair, or bulk-reconciliation mutation is authorized without its own explicit gate.

## Workspace and verification notes

- Preserve the unrelated untracked `.next-stale-20260725-192102/` directory in the primary checkout.
- The diagnostic script is `src/lib/scripts/cards/audit-collection-publication-readiness.ts`; package command: `npm run audit:collection-publication -- --collection-id=my-life`. It reads and reports the saved classification requirements so its required-review attention agrees with Author Home; its raw review inventory remains visible as evidence regardless of the selected mode.
- The script performs Firestore reads only and emits JSON. It must remain non-mutating.
- Before release, run touched-file lint, production typecheck, the diagnostic readback, and diff checks. Use the repository integrity gate for any pushed PR.
