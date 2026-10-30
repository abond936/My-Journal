import {
  getAuthorDashboardSummary,
  summarizeCardCounts,
  summarizeCardDocuments,
  summarizeMediaCounts,
  summarizeMediaDocuments,
  summarizeOperationDocuments,
} from '@/lib/services/authorDashboardService';

const document = (data: Record<string, unknown>) => ({ data: () => data });

describe('authorDashboardService', () => {
  it('counts missing and non-published card statuses as drafts', () => {
    expect(
      summarizeCardDocuments([
        document({ status: 'published' }),
        document({ status: 'draft' }),
        document({}),
      ] as never)
    ).toEqual({ total: 3, draft: 2, published: 1 });
  });

  it('derives draft totals from aggregate Card counts', () => {
    expect(summarizeCardCounts(12, 5)).toEqual({ total: 12, draft: 7, published: 5 });
  });

  it('treats Unknown and Not applicable dimension resolutions as completed review', () => {
    expect(
      summarizeMediaDocuments([
        document({
          dimensionReview: {
            who: { reviewed: true },
            what: { reviewed: false, resolution: 'unknown' },
            when: { reviewed: false, resolution: 'not_applicable' },
          },
          readiness: { overall: 'failed' },
        }),
        document({
          dimensionReview: { where: { reviewed: true } },
        }),
      ] as never)
    ).toEqual({
      total: 2,
      unreviewed: { who: 1, what: 1, when: 1, where: 1 },
      failedReadiness: 1,
    });
  });

  it('derives unresolved Media totals from aggregate completed-review counts', () => {
    expect(
      summarizeMediaCounts(20, { who: 14, what: 15, when: 19, where: 10 }, 2)
    ).toEqual({
      total: 20,
      unreviewed: { who: 6, what: 5, when: 1, where: 10 },
      failedReadiness: 2,
    });
  });

  it('separates active and failed durable operations', () => {
    expect(
      summarizeOperationDocuments([
        document({ status: 'pending' }),
        document({ status: 'running' }),
        document({ status: 'failed' }),
        document({ status: 'complete' }),
      ] as never)
    ).toEqual({ attention: 3, active: 2, failed: 1 });
  });

  it('uses aggregate counts without downloading document populations', async () => {
    const whereCallByCollection = new Map<string, number>();
    const aggregateCounts: Record<string, number[]> = {
      cards: [12, 5],
      media: [20, 14, 15, 19, 10, 2],
      media_tag_reconciliation_operations: [0, 1, 2],
      card_bulk_tag_operations: [0, 3, 4],
      tag_mutation_operations: [0, 5, 6],
    };
    const select = jest.fn();
    const collection = jest.fn((name: string) => {
      if (name === 'collections') {
        return {
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
        };
      }
      const query = (count: number) => ({
        count: () => ({
          get: jest.fn().mockResolvedValue({ data: () => ({ count }) }),
        }),
      });
      const root = {
        ...query(aggregateCounts[name][0]),
        where: jest.fn(() => {
          const index = (whereCallByCollection.get(name) ?? 0) + 1;
          whereCallByCollection.set(name, index);
          return query(aggregateCounts[name][index]);
        }),
        select,
      };
      return root;
    });

    const summary = await getAuthorDashboardSummary({ collection } as never);

    expect(summary.cards).toEqual({
      status: 'ready',
      data: { total: 12, draft: 7, published: 5 },
    });
    expect(summary.media).toEqual({
      status: 'ready',
      data: {
        total: 20,
        unreviewed: { who: 6, what: 5, when: 1, where: 10 },
        failedReadiness: 2,
      },
    });
    expect(summary.operations).toEqual({
      status: 'ready',
      data: { attention: 21, active: 9, failed: 12 },
    });
    expect(summary.collections).toEqual({
      status: 'ready',
      data: { total: 0, items: [] },
    });
    expect(select).not.toHaveBeenCalled();
  });

  it('degrades a failed section without hiding successful sections', async () => {
    const cardGet = jest.fn().mockResolvedValue({ docs: [document({ status: 'published' })] });
    const mediaGet = jest.fn().mockRejectedValue(new Error('media unavailable'));
    const operationGet = jest.fn().mockResolvedValue({ docs: [] });
    const select = jest.fn().mockImplementation(function (this: { get: jest.Mock }) {
      return this;
    });
    const where = jest.fn().mockImplementation(function (this: { select: jest.Mock }) {
      return this;
    });
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'cards') return { select, get: cardGet };
        if (name === 'media') return { select, get: mediaGet };
        return { where, select, get: operationGet };
      }),
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const summary = await getAuthorDashboardSummary(firestore as never);

    expect(summary.cards).toEqual({
      status: 'ready',
      data: { total: 1, draft: 0, published: 1 },
    });
    expect(summary.media).toEqual({ status: 'unavailable' });
    expect(summary.operations).toEqual({
      status: 'ready',
      data: { attention: 0, active: 0, failed: 0 },
    });
    expect(summary.collections).toEqual({
      status: 'ready',
      data: { total: 0, items: [] },
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });
});
