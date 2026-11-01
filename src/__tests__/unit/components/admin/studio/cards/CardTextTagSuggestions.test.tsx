import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CardTextTagSuggestions from '@/components/admin/studio/cards/CardTextTagSuggestions';
import type { Tag } from '@/lib/types/tag';

const tags: Tag[] = [
  { docId: 'charlie', name: 'Charlie', dimension: 'who', path: [], cardCount: 0, mediaCount: 0 },
  { docId: 'birthday', name: 'Birthday', dimension: 'what', path: [], cardCount: 0, mediaCount: 0 },
];

describe('CardTextTagSuggestions', () => {
  it('waits for author invocation and assigns only an explicitly accepted suggestion', async () => {
    const onAccept = jest.fn().mockResolvedValue(undefined);
    render(
      <CardTextTagSuggestions
        allTags={tags}
        selectedTagIds={[]}
        getSource={() => ({ title: "Charlie's Birthday" })}
        onAccept={onAccept}
      />
    );

    expect(screen.queryByLabelText('Suggested existing Tags')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest existing Tags from this Card' }));
    expect(screen.getByText('Review each match. Nothing is assigned until you choose Add.')).toBeInTheDocument();
    expect(onAccept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Add Charlie' }));
    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('charlie'));
  });
});
