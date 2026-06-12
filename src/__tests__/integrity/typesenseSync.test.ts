import {
  clearRecentTypesenseSyncFailures,
  getRecentTypesenseSyncFailures,
  recordTypesenseSyncFailure,
  withTypesenseRetry,
} from '@/lib/services/typesenseSync';

describe('typesenseSync', () => {
  beforeEach(() => {
    clearRecentTypesenseSyncFailures();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries transient failures before succeeding', async () => {
    let attempts = 0;
    const promise = withTypesenseRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary outage');
        return 'ok';
      },
      { entity: 'card', id: 'card-1', operation: 'upsert' }
    );

    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe('ok');
    expect(attempts).toBe(3);
    expect(getRecentTypesenseSyncFailures()).toHaveLength(0);
  });

  it('records a failure after retries are exhausted', async () => {
    const promise = withTypesenseRetry(
      async () => {
        throw new Error('permanent outage');
      },
      { entity: 'media', id: 'media-1', operation: 'delete' }
    );

    const rejection = expect(promise).rejects.toThrow('permanent outage');
    await jest.runAllTimersAsync();
    await rejection;

    const failures = getRecentTypesenseSyncFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0]?.entity).toBe('media');
    expect(failures[0]?.id).toBe('media-1');
    expect(failures[0]?.operation).toBe('delete');
  });

  it('stores manually recorded failures for operator status', () => {
    recordTypesenseSyncFailure({
      entity: 'card',
      id: 'card-9',
      operation: 'upsert',
      message: 'timeout',
    });
    expect(getRecentTypesenseSyncFailures()[0]?.message).toBe('timeout');
  });
});
