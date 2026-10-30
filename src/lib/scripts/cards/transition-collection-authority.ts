/**
 * Read-only by default. A write requires --apply plus the exact Collection ID confirmation.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import { transitionCollectionAuthority } from '@/lib/services/collections/collectionAuthorityService';
import { getCollectionProjectionReadModel } from '@/lib/services/collections/collectionProjectionReadService';
import { collectionSchema, type CollectionRecordState } from '@/lib/types/collection';

function readArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1).trim() || undefined;
}

function parseNonnegativeInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a nonnegative integer.`);
  return parsed;
}

async function main() {
  const collectionId = readArg('--collection-id');
  if (!collectionId) throw new Error('--collection-id is required.');
  const desiredState = readArg('--desired-state');
  if (desiredState !== 'active' && desiredState !== 'shadow') {
    throw new Error('--desired-state must be active or shadow.');
  }
  const firestore = getAdminApp().firestore();
  const collectionSnap = await firestore.collection('collections').doc(collectionId).get();
  if (!collectionSnap.exists) throw new Error(`Collection ${collectionId} was not found.`);
  const collection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });
  const readModel = await getCollectionProjectionReadModel(collectionId, firestore);
  if (!readModel) throw new Error(`Collection ${collectionId} could not be read.`);

  if (!process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      dryRun: true,
      collectionId,
      currentState: collection.recordState,
      desiredState,
      structureRevision: collection.structureRevision,
      authorityRevision: collection.authorityRevision,
      authorityEstablishedAt: collection.authorityEstablishedAt ?? null,
      readiness: readModel.readiness,
      placementCount: readModel.projection.nodesByPlacementId.size,
    }, null, 2)}\n`);
    return;
  }

  if (readArg('--confirm-collection-id') !== collectionId) {
    throw new Error('Refusing to write without --confirm-collection-id matching --collection-id.');
  }
  const expectedStructureRevision = parseNonnegativeInteger(
    readArg('--expected-structure-revision'),
    '--expected-structure-revision'
  );
  const expectedAuthorityRevision = parseNonnegativeInteger(
    readArg('--expected-authority-revision'),
    '--expected-authority-revision'
  );
  const result = await transitionCollectionAuthority({
    collectionId,
    desiredState: desiredState as CollectionRecordState,
    expectedStructureRevision,
    expectedAuthorityRevision,
    firestore,
  });
  const afterSnap = await firestore.collection('collections').doc(collectionId).get();
  const after = collectionSchema.parse({ docId: afterSnap.id, ...afterSnap.data() });
  if (after.recordState !== desiredState || after.authorityRevision !== result.nextAuthorityRevision) {
    throw new Error('Post-write authority readback does not match the committed transition.');
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    dryRun: false,
    collectionId,
    recordState: after.recordState,
    lifecycle: after.lifecycle,
    structureRevision: after.structureRevision,
    authorityRevision: after.authorityRevision,
    authorityEstablishedAt: after.authorityEstablishedAt ?? null,
    operationId: result.operation?.docId ?? null,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
