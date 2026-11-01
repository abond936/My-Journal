import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCollectionControl from '@/components/admin/collections/CreateCollectionControl';

describe('CreateCollectionControl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a private draft Collection and returns it to the owning surface', async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn();
    const collection = {
      docId: 'family-stories',
      title: 'Family Stories',
      lifecycle: 'draft',
      recordState: 'active',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, collection }),
    }) as jest.Mock;
    render(<CreateCollectionControl onCreated={onCreated} />);

    await user.click(screen.getByRole('button', { name: 'New Collection' }));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Family Stories');
    await user.type(screen.getByRole('textbox', { name: 'Description (optional)' }), 'Shared memories');
    await user.click(screen.getByRole('button', { name: 'Create Collection' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(collection));
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/collections', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Family Stories', description: 'Shared memories' }),
    }));
  });
});
