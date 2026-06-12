export type TypesenseSyncEntity = 'card' | 'media';
export type TypesenseSyncOperation = 'upsert' | 'delete';

export type TypesenseSyncFailureRecord = {
  at: number;
  entity: TypesenseSyncEntity;
  id: string;
  operation: TypesenseSyncOperation;
  message: string;
};

const MAX_SYNC_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RECORDED_FAILURES = 50;

const recentFailures: TypesenseSyncFailureRecord[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function recordTypesenseSyncFailure(input: Omit<TypesenseSyncFailureRecord, 'at'>): void {
  recentFailures.unshift({ ...input, at: Date.now() });
  if (recentFailures.length > MAX_RECORDED_FAILURES) {
    recentFailures.length = MAX_RECORDED_FAILURES;
  }
}

export function getRecentTypesenseSyncFailures(): TypesenseSyncFailureRecord[] {
  return [...recentFailures];
}

export function clearRecentTypesenseSyncFailures(): void {
  recentFailures.length = 0;
}

export async function withTypesenseRetry<T>(
  operation: () => Promise<T>,
  meta: {
    entity: TypesenseSyncEntity;
    id: string;
    operation: TypesenseSyncOperation;
  }
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_SYNC_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt >= MAX_SYNC_RETRIES) break;
      const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
      console.warn(
        `[Typesense] ${meta.operation} ${meta.entity} ${meta.id} failed (attempt ${attempt + 1}/${MAX_SYNC_RETRIES + 1}); retrying in ${delay}ms:`,
        err instanceof Error ? err.message : err
      );
      await sleep(delay);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  recordTypesenseSyncFailure({
    entity: meta.entity,
    id: meta.id,
    operation: meta.operation,
    message,
  });
  throw lastError instanceof Error ? lastError : new Error(message);
}
