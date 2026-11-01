import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TagSplitModal } from '@/components/admin/studio/tags/TagSplitModal';

describe('TagSplitModal', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'operation-1' }, configurable: true });
    global.fetch = jest.fn(async (_input, init) => {
      if (!init?.method) return {
        ok: true,
        status: 200,
        json: async () => ({
        source: { docId: 'source', name: 'Combined', dimension: 'who' },
        candidates: [
          { id: 'card-1', kind: 'card', label: 'Selected story', directAssignment: true, subjectAssignment: true },
          { id: 'media-1', kind: 'media', label: 'Unselected photo', directAssignment: true, subjectAssignment: false },
        ],
        directChildCount: 1,
        canSplit: true,
      }),
      } as Response;
      return { ok: true, status: 200, json: async () => ({ operationId: 'operation-1', targetTagId: 'target' }) } as Response;
    }) as jest.Mock;
  });

  it('starts with no inferred partition and submits only the author-selected record', async () => {
    const complete = jest.fn(async () => undefined);
    const close = jest.fn();
    render(<TagSplitModal
      source={{ docId: 'source', name: 'Combined', dimension: 'who' }}
      onClose={close}
      onComplete={complete}
    />);
    expect(await screen.findByText('Selected story')).toBeInTheDocument();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    fireEvent.change(screen.getByLabelText('New Tag name'), { target: { value: 'Separated' } });
    fireEvent.click(boxes[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed split' }));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const post = (global.fetch as jest.Mock).mock.calls.find((call) => call[1]?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({
      operationId: 'operation-1',
      newName: 'Separated',
      selection: { cardIds: ['card-1'], mediaIds: [], questionIds: [] },
    });
    expect(close).toHaveBeenCalled();
  });
});
