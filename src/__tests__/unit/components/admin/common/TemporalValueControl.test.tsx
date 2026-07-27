import { fireEvent, render, screen } from '@testing-library/react';
import TemporalValueControl from '@/components/admin/common/TemporalValueControl';

describe('TemporalValueControl', () => {
  it('supports partial manual dates without requiring month or day', () => {
    const onChange = jest.fn();
    render(
      <TemporalValueControl
        idPrefix="test"
        value={null}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Known'));
    expect(screen.getByLabelText('Year')).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1965' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByLabelText('Year'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      status: 'known',
      year: 1965,
      precision: 'year',
      source: 'manual',
    }));
  });

  it('uses mutually exclusive date states and direct partial-date fields', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <TemporalValueControl
        idPrefix="known"
        value={null}
        onChange={onChange}
      />
    );

    expect(screen.queryByLabelText('Decade')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Known'));
    expect(screen.getByLabelText('Decade')).toHaveValue('');
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toBeDisabled();
    expect(screen.getByLabelText('Day')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1965' } });
    fireEvent.blur(screen.getByLabelText('Year'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'known',
      year: 1965,
      precision: 'year',
    }));

    const known = onChange.mock.calls.at(-1)?.[0];
    rerender(
      <TemporalValueControl
        idPrefix="known"
        value={known}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText('Month')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '10' } });
    fireEvent.blur(screen.getByLabelText('Month'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      year: 1965,
      month: 10,
      precision: 'month',
    }));
    fireEvent.click(screen.getByLabelText('Unknown'));
    expect(onChange).toHaveBeenLastCalledWith({ status: 'unknown', source: 'manual' });
  });

  it('preserves decade text while typing and normalizes it on blur', () => {
    const onChange = jest.fn();
    render(
      <TemporalValueControl
        idPrefix="decade"
        value={null}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Known'));
    const decade = screen.getByLabelText('Decade');
    fireEvent.change(decade, { target: { value: '1' } });
    expect(decade).toHaveValue('1');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(decade, { target: { value: '1967s' } });
    expect(decade).toHaveValue('1967s');
    fireEvent.blur(decade);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      year: 1960,
      precision: 'decade',
    }));
  });

  it('offers an additive Any state on filter surfaces', () => {
    render(
      <TemporalValueControl
        idPrefix="filter"
        value={undefined}
        allowAny
        onChange={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Any')).toBeChecked();
  });

  it('supports an inclusive filter-only year range', () => {
    const onChange = jest.fn();
    render(
      <TemporalValueControl
        idPrefix="range"
        value={undefined}
        allowAny
        allowYearRange
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Year range'));
    fireEvent.change(screen.getByLabelText('From year'), { target: { value: '1960' } });
    fireEvent.blur(screen.getByLabelText('From year'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('To year'), { target: { value: '1965' } });
    fireEvent.blur(screen.getByLabelText('To year'));
    expect(onChange).toHaveBeenLastCalledWith({
      status: 'year_range',
      fromYear: 1960,
      toYear: 1965,
    });
  });
});
