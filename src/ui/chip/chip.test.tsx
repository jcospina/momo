import { fireEvent, render, screen } from '@testing-library/react';
import { Chip } from './chip';

describe('Chip', () => {
  it('is a plain button by default so it never submits a form', () => {
    render(<Chip>Groceries</Chip>);
    expect(screen.getByRole('button', { name: 'Groceries' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('paints the leading dot with the given colour', () => {
    render(<Chip dot="var(--category-groceries)">Groceries</Chip>);
    const chip = screen.getByRole('button', { name: 'Groceries' });
    expect(chip.style.getPropertyValue('--chip-dot')).toBe(
      'var(--category-groceries)',
    );
    expect(chip.querySelector('[aria-hidden]')).not.toBeNull();
  });

  it('has no dot when no colour is given', () => {
    render(<Chip>All</Chip>);
    const chip = screen.getByRole('button', { name: 'All' });
    expect(chip.querySelector('[aria-hidden]')).toBeNull();
    expect(chip.style.getPropertyValue('--chip-dot')).toBe('');
  });

  it('hands the click event to onClick', () => {
    const targets: EventTarget[] = [];
    render(
      <Chip onClick={event => targets.push(event.currentTarget)}>Dining</Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Dining' });
    fireEvent.click(chip);
    expect(targets).toEqual([chip]);
  });

  it('ignores clicks while disabled', () => {
    const onClick = jest.fn();
    render(
      <Chip disabled onClick={onClick}>
        Dining
      </Chip>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dining' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
