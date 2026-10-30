# Continuity

This file is the concise operational handoff for the next project session. It is not product canon and must not override `01`, `02`, or `03`. Replace it at the next deliberate handoff rather than accumulating history.

## Canon checkpoint

- `01` remains the owner of product vision, architecture, technical principles, and stable invariants.
- `02` now records the shipped durable Collection authority and placement-native Studio/Reader behavior separately from still-planned multi-Collection creation, audience, sharing, distribution, and Book editions.
- `03` records the completed first durable Collection activation and the read-only publication-readiness evidence. Active structure is not publication.
- The accepted deployed activation baseline is `b13983589e17440d92ce427057620c74c102b4c9`, following merged PRs #15 through #18. The present branch adds only the diagnostic and documentation closeout described here.

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

The ordinary Reader already requires a published Collection, every required Card published, and no missing required Card. However, Card publication does not yet enforce the canon integrity contract, and Collection publication, audience groups, guest recipients, and distribution notifications are not implemented. `My Life` is therefore not publication-ready and remains draft.

## Current product direction

- Reader and Author are role-aware entrances into the same product. Bare Reader entry offers Continue when meaningful plus Collections and Feed; direct authorized Collection or Card links bypass intermediate selection.
- Reader Home has no contextual sidebar before a reading path is selected. After selection, Collection navigation preserves nested hierarchy with generous full-row targets, while Feed keeps authorship separate from Who/What/When/Where filters.
- Card is the durable authored content object; Story is one Card type. Collection is the approachable name for the durable reading work, and a Book is a later print/export edition.
- Parts, Chapters, and Sections are bounded Collection-local placement roles. A canonical Card may be reused through distinct placements without copying its content.
- Desktop remains the configurable simultaneous Studio. Mobile should support complete individual Card creation where practical through sequential Cards, Media, Prompts, Collections, and Tags destinations; archive-scale administration remains desktop-primary.
- AI assistance is optional and author-invoked except for quiet integrity validation. Machine evidence remains provisional until author-confirmed.
- Draft saving stays permissive. Publishing is a deliberate integrity boundary; access, sharing, and distribution are separate decisions.

## Next definition gate

Do not attempt to publish `My Life` by flipping existing Card statuses or the Collection lifecycle. The next bounded decision is the publication-integrity foundation:

1. Define one server-owned readiness result for a Card and a Collection using the canon Who/What/When/Where, Media, placement, and audience contracts.
2. Decide whether the first publishable unit should be the complete `My Life` Collection or a smaller deliberately selected Collection; do not infer this from the migrated hierarchy.
3. Repair or explicitly resolve the 17 missing Media references and establish how historical Media readiness is assessed without silently approving it.
4. Define audience/visibility separately from publication and distribution before any reader-facing activation.
5. Add author-reviewable exception queues and exact consequence previews; do not turn the readiness assessment into automatic bulk reconciliation.

Until that gate is approved, safe work is limited to read-only assessment, presentation of the existing evidence, and correction of diagnostic or documentation defects. No lifecycle, Card-status, audience, sharing, or distribution mutation is authorized.

## Workspace and verification notes

- Preserve the unrelated untracked `.next-stale-20260725-192102/` directory in the primary checkout.
- The diagnostic script is `src/lib/scripts/cards/audit-collection-publication-readiness.ts`; package command: `npm run audit:collection-publication -- --collection-id=my-life`.
- The script performs Firestore reads only and emits JSON. It must remain non-mutating.
- Before release, run touched-file lint, production typecheck, the diagnostic readback, and diff checks. Use the repository integrity gate for any pushed PR.
