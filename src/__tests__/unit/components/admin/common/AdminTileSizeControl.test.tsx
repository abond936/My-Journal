import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminTileSizeControl from '@/components/admin/common/AdminTileSizeControl';

describe('AdminTileSizeControl', () => {
  it('keeps the slider in a compact popover and reports changes', () => {
    const onChange = jest.fn();
    render(
      <AdminTileSizeControl
        value={240}
        min={228}
        max={360}
        step={10}
        defaultValue={228}
        onChange={onChange}
        surfaceLabel="Cards"
      />
    );

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cards tile size' }));

    const slider = screen.getByRole('slider', { name: 'Cards tile size' });
    fireEvent.change(slider, { target: { value: '280' } });
    expect(onChange).toHaveBeenCalledWith(280);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('can restore the surface default', () => {
    const onChange = jest.fn();
    render(
      <AdminTileSizeControl
        value={280}
        min={228}
        max={360}
        step={10}
        defaultValue={228}
        onChange={onChange}
        surfaceLabel="Cards"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cards tile size' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset cards tile size' }));
    expect(onChange).toHaveBeenCalledWith(228);
  });
});
